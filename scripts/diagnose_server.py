#!/usr/bin/env python3
"""
Script para diagnosticar el servidor de Mi Sucursal y ver usuarios existentes.
Usa las credenciales SSH del archivo .env
Requiere: pip install paramiko
"""

try:
    import paramiko
except ImportError:
    print("Instalando paramiko...")
    import subprocess
    subprocess.check_call(["pip", "install", "paramiko"])
    import paramiko

# Credenciales del .env
SSH_HOST = "vps-5611909-x.dattaweb.com"
SSH_PORT = 5695
SSH_USER = "root"
SSH_PASS = "lucas171115!Lamascotera"

def run_ssh_command(ssh, command):
    """Ejecuta un comando en el servidor remoto"""
    try:
        stdin, stdout, stderr = ssh.exec_command(command, timeout=30)
        return stdout.read().decode('utf-8'), stderr.read().decode('utf-8')
    except Exception as e:
        return "", str(e)

def main():
    print("=" * 60)
    print("DIAGNOSTICO DEL SERVIDOR MI SUCURSAL")
    print("=" * 60)

    # Conectar via SSH
    print("\n1. Conectando al servidor via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=15)
        print("   [OK] Conexion exitosa")
    except Exception as e:
        print(f"   ERROR: No se pudo conectar. {e}")
        return

    # 2. Verificar si Docker está corriendo
    print("\n2. Verificando Docker...")
    stdout, stderr = run_ssh_command(ssh, "docker ps --format '{{.Names}}: {{.Status}}'")
    if stdout:
        print("   Contenedores activos:")
        for line in stdout.strip().split('\n'):
            if line:
                print(f"   - {line}")
    else:
        print(f"   No hay contenedores activos o error: {stderr}")

    # 3. Buscar contenedores de mi-sucursal
    print("\n3. Buscando contenedores de mi-sucursal...")
    stdout, stderr = run_ssh_command(ssh, "docker ps -a | grep -i sucursal || echo 'No encontrado'")
    print(f"   {stdout.strip()}")

    # 4. Verificar puerto 8003
    print("\n4. Verificando puerto 8003 (backend)...")
    stdout, stderr = run_ssh_command(ssh, "ss -tlnp | grep 8003 || echo 'Puerto 8003 NO en uso'")
    print(f"   {stdout.strip()}")

    # 5. Verificar puerto 3003
    print("\n5. Verificando puerto 3003 (frontend)...")
    stdout, stderr = run_ssh_command(ssh, "ss -tlnp | grep 3003 || echo 'Puerto 3003 NO en uso'")
    print(f"   {stdout.strip()}")

    # 6. Consultar usuarios en la base de datos
    print("\n6. Consultando usuarios en la base de datos...")
    db_cmd = """PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -t -A -c "
    SELECT id, usuario, nombre, sucursal_id, rol, activo
    FROM employees
    WHERE activo = true
    ORDER BY id
    LIMIT 20;
    " 2>&1"""
    stdout, stderr = run_ssh_command(ssh, db_cmd)
    if stdout and "ERROR" not in stdout and "psql" not in stdout.lower():
        print("   Usuarios activos encontrados:")
        print("   ID | Usuario | Nombre | Sucursal | Rol | Activo")
        print("   " + "-" * 50)
        for line in stdout.strip().split('\n'):
            if line:
                print(f"   {line.replace('|', ' | ')}")
    else:
        # Intentar con la otra contraseña
        print("   Intentando con contraseña alternativa...")
        db_cmd2 = """PGPASSWORD='DuxS3cur3P4ss2024' psql -h localhost -U dux_user -d dux_integrada -t -A -c "
        SELECT id, usuario, nombre, sucursal_id, rol, activo
        FROM employees
        WHERE activo = true
        ORDER BY id
        LIMIT 20;
        " 2>&1"""
        stdout, stderr = run_ssh_command(ssh, db_cmd2)
        if stdout and "ERROR" not in stdout:
            print("   Usuarios activos encontrados:")
            for line in stdout.strip().split('\n'):
                if line:
                    print(f"   {line}")
        else:
            print(f"   Error al consultar BD: {stdout or stderr}")

    # 7. Ver directorios relacionados con mi-sucursal
    print("\n7. Buscando instalación de mi-sucursal...")
    stdout, stderr = run_ssh_command(ssh, "find /root /home /opt -maxdepth 3 -name '*sucursal*' -type d 2>/dev/null | head -10")
    if stdout.strip():
        print("   Directorios encontrados:")
        for line in stdout.strip().split('\n'):
            if line:
                print(f"   - {line}")
    else:
        print("   No se encontraron directorios de mi-sucursal")

    # 8. Ver si hay docker-compose files
    print("\n8. Buscando archivos docker-compose...")
    stdout, stderr = run_ssh_command(ssh, "find /root /home /opt -name 'docker-compose*.yml' 2>/dev/null | head -10")
    if stdout.strip():
        for line in stdout.strip().split('\n'):
            if line:
                print(f"   - {line}")
    else:
        print("   No se encontraron archivos docker-compose")

    ssh.close()
    print("\n" + "=" * 60)
    print("DIAGNOSTICO COMPLETADO")
    print("=" * 60)

if __name__ == "__main__":
    main()
