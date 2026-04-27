#!/usr/bin/env python3
"""
Script para migrar datos de employees a personales.
Ejecutar en el servidor con acceso a la base de datos dux_integrada.
"""
import os
import sys

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://dux_user:Pm2480856!@localhost:5432/dux_integrada")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def add_columns_if_not_exist():
    """Agregar columnas necesarias a la tabla personales"""
    columns_to_add = [
        ("usuario", "VARCHAR(100)"),
        ("password_hash", "VARCHAR(255)"),
        ("foto_perfil_url", "VARCHAR(500)"),
        ("telefono", "VARCHAR(50)"),
        ("rol", "VARCHAR(50)"),
        ("puesto", "VARCHAR(50)"),
        ("activo", "BOOLEAN DEFAULT true"),
        ("id_sucursal_dux", "INTEGER"),
        ("id_franquicia", "INTEGER"),
        ("pin_hash", "VARCHAR(255)"),
        ("rol_finanzas", "VARCHAR(50)"),
        ("activo_finanzas", "BOOLEAN DEFAULT false"),
    ]

    db = SessionLocal()
    try:
        for col_name, col_type in columns_to_add:
            # Verificar si la columna existe
            check_query = text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'personales' AND column_name = :col_name
            """)
            exists = db.execute(check_query, {"col_name": col_name}).fetchone()

            if not exists:
                print(f"Agregando columna: {col_name}")
                alter_query = text(f"ALTER TABLE personales ADD COLUMN {col_name} {col_type}")
                db.execute(alter_query)
                db.commit()
            else:
                print(f"Columna {col_name} ya existe")

        # Crear índice en usuario si no existe
        try:
            db.execute(text("CREATE INDEX IF NOT EXISTS idx_personales_usuario ON personales(usuario)"))
            db.commit()
            print("Índice idx_personales_usuario creado/verificado")
        except Exception as e:
            print(f"Error creando índice: {e}")
            db.rollback()

    finally:
        db.close()


def migrate_employees_data():
    """Migrar datos de employees a personales por coincidencia de nombre"""
    db = SessionLocal()
    try:
        # Contar empleados a migrar
        count_query = text("""
            SELECT COUNT(*)
            FROM employees e
            WHERE e.usuario IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM personales p
                WHERE p.usuario = e.usuario
            )
        """)
        count = db.execute(count_query).scalar()
        print(f"\nEmpleados pendientes de migrar: {count}")

        # Migrar por coincidencia de nombre
        update_query = text("""
            UPDATE personales p
            SET
                usuario = e.usuario,
                password_hash = e.password_hash,
                foto_perfil_url = COALESCE(p.foto_perfil_url, e.foto_perfil_url),
                telefono = COALESCE(p.telefono, e.telefono),
                rol = COALESCE(p.rol, e.rol),
                puesto = COALESCE(p.puesto, e.puesto),
                activo = COALESCE(p.activo, e.activo),
                id_sucursal_dux = COALESCE(p.id_sucursal_dux,
                    (SELECT s.dux_id FROM sucursales s WHERE s.id = e.sucursal_id))
            FROM employees e
            WHERE
                LOWER(TRIM(p.nombre)) = LOWER(TRIM(e.nombre))
                AND LOWER(TRIM(p.apellido)) = LOWER(TRIM(e.apellido))
                AND p.usuario IS NULL
                AND e.usuario IS NOT NULL
        """)
        result = db.execute(update_query)
        db.commit()
        print(f"Registros actualizados por coincidencia de nombre: {result.rowcount}")

        # Mostrar empleados que no se pudieron migrar
        orphan_query = text("""
            SELECT e.id, e.usuario, e.nombre, e.apellido, s.nombre as sucursal
            FROM employees e
            LEFT JOIN sucursales s ON s.id = e.sucursal_id
            WHERE e.usuario IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM personales p
                WHERE p.usuario = e.usuario
            )
        """)
        orphans = db.execute(orphan_query).fetchall()
        if orphans:
            print(f"\n{len(orphans)} empleados sin coincidencia en personales:")
            for o in orphans:
                print(f"  ID: {o.id}, Usuario: {o.usuario}, Nombre: {o.nombre} {o.apellido}, Sucursal: {o.sucursal}")

    finally:
        db.close()


def check_lucas_salvatierra():
    """Verificar si Lucas Salvatierra está en personales"""
    db = SessionLocal()
    try:
        query = text("""
            SELECT
                p.id,
                p.apellido,
                p.nombre,
                p.usuario,
                p.password_hash IS NOT NULL as tiene_password,
                p.id_sucursal_dux,
                p.activo,
                p.rol
            FROM personales p
            WHERE LOWER(p.nombre) LIKE '%lucas%'
               OR LOWER(p.apellido) LIKE '%salvatierra%'
               OR LOWER(COALESCE(p.usuario, '')) LIKE '%lucas%'
        """)
        results = db.execute(query).fetchall()

        print("\n=== Búsqueda de Lucas Salvatierra en personales ===")
        if results:
            for r in results:
                print(f"  ID: {r.id}")
                print(f"  Nombre: {r.nombre} {r.apellido}")
                print(f"  Usuario: {r.usuario}")
                print(f"  Tiene password: {r.tiene_password}")
                print(f"  Sucursal DUX: {r.id_sucursal_dux}")
                print(f"  Activo: {r.activo}")
                print(f"  Rol: {r.rol}")
                print()
        else:
            print("  No encontrado en personales")

            # Buscar en employees
            emp_query = text("""
                SELECT e.id, e.usuario, e.nombre, e.apellido, e.sucursal_id,
                       s.dux_id as sucursal_dux_id, s.nombre as sucursal_nombre
                FROM employees e
                LEFT JOIN sucursales s ON s.id = e.sucursal_id
                WHERE LOWER(e.usuario) LIKE '%lucas%'
                   OR LOWER(e.nombre) LIKE '%lucas%'
            """)
            emp_results = db.execute(emp_query).fetchall()
            if emp_results:
                print("\n  Encontrado en employees:")
                for e in emp_results:
                    print(f"    ID: {e.id}, Usuario: {e.usuario}")
                    print(f"    Nombre: {e.nombre} {e.apellido}")
                    print(f"    Sucursal: {e.sucursal_nombre} (dux_id: {e.sucursal_dux_id})")
                    print()

    finally:
        db.close()


def insert_employee_to_personales(usuario: str):
    """Insertar un empleado específico de employees a personales"""
    db = SessionLocal()
    try:
        # Verificar si ya existe en personales
        check_query = text("SELECT id FROM personales WHERE usuario = :usuario")
        exists = db.execute(check_query, {"usuario": usuario}).fetchone()

        if exists:
            print(f"Usuario {usuario} ya existe en personales con ID {exists.id}")
            return exists.id

        # Obtener datos de employees
        emp_query = text("""
            SELECT e.*, s.dux_id as sucursal_dux_id
            FROM employees e
            LEFT JOIN sucursales s ON s.id = e.sucursal_id
            WHERE e.usuario = :usuario
        """)
        emp = db.execute(emp_query, {"usuario": usuario}).fetchone()

        if not emp:
            print(f"Usuario {usuario} no encontrado en employees")
            return None

        # Insertar en personales
        insert_query = text("""
            INSERT INTO personales (
                apellido, nombre, correo, usuario, password_hash,
                foto_perfil_url, telefono, rol, puesto, activo, id_sucursal_dux
            )
            VALUES (
                :apellido, :nombre, :email, :usuario, :password_hash,
                :foto_perfil_url, :telefono, :rol, :puesto, :activo, :id_sucursal_dux
            )
            RETURNING id
        """)
        result = db.execute(insert_query, {
            "apellido": emp.apellido,
            "nombre": emp.nombre,
            "email": emp.email,
            "usuario": emp.usuario,
            "password_hash": emp.password_hash,
            "foto_perfil_url": emp.foto_perfil_url,
            "telefono": emp.telefono,
            "rol": emp.rol,
            "puesto": emp.puesto,
            "activo": emp.activo,
            "id_sucursal_dux": emp.sucursal_dux_id
        })
        new_id = result.scalar()
        db.commit()
        print(f"Usuario {usuario} insertado en personales con ID {new_id}")
        return new_id

    finally:
        db.close()


def show_sucursales():
    """Mostrar sucursales disponibles"""
    db = SessionLocal()
    try:
        query = text("SELECT id, dux_id, nombre FROM sucursales WHERE activo = true ORDER BY nombre")
        results = db.execute(query).fetchall()
        print("\n=== Sucursales disponibles ===")
        for r in results:
            print(f"  ID: {r.id}, DUX_ID: {r.dux_id}, Nombre: {r.nombre}")
    finally:
        db.close()


if __name__ == "__main__":
    print("=== Migración de employees a personales ===\n")

    # 1. Agregar columnas
    print("1. Verificando/agregando columnas...")
    add_columns_if_not_exist()

    # 2. Migrar datos
    print("\n2. Migrando datos por coincidencia de nombre...")
    migrate_employees_data()

    # 3. Verificar Lucas Salvatierra
    check_lucas_salvatierra()

    # 4. Mostrar sucursales
    show_sucursales()

    print("\n=== Migración completada ===")
    print("\nSi Lucas Salvatierra no está en personales, ejecuta:")
    print("  python migrate_employees_to_personales.py --insert lucassalvatierracentral")

    # Manejar argumento --insert
    if len(sys.argv) > 2 and sys.argv[1] == "--insert":
        usuario = sys.argv[2]
        print(f"\nInsertando usuario: {usuario}")
        insert_employee_to_personales(usuario)
