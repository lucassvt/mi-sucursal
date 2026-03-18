#!/usr/bin/env python3
"""Create admin user in personales table"""

import paramiko

SSH_HOST = "vps-5611909-x.dattaweb.com"
SSH_PORT = 5695
SSH_USER = "root"
SSH_PASS = "lucas171115!Lamascotera"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=15)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    return stdout.read().decode('utf-8'), stderr.read().decode('utf-8')

print("=" * 60)
print("CREANDO USUARIO ADMIN EN PERSONALES")
print("=" * 60)

# Crear script Python en el servidor para evitar problemas con shell
script = '''
import bcrypt
import psycopg2

# Generar hash
password = "Mascotera2026!".encode('utf-8')
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password, salt).decode('utf-8')
print(f"Hash: {hashed}")

# Conectar
conn = psycopg2.connect(
    host="localhost",
    database="dux_integrada",
    user="dux_user",
    password="Pm2480856!"
)
cur = conn.cursor()

# Verificar si existe admin
cur.execute("SELECT id FROM personales WHERE usuario = 'admin'")
exists = cur.fetchone()

if exists:
    print("Usuario admin ya existe, actualizando password...")
    cur.execute(
        "UPDATE personales SET password_hash = %s, rol = 'gerencia', activo = true WHERE usuario = 'admin'",
        (hashed,)
    )
else:
    print("Creando usuario admin...")
    cur.execute("""
        INSERT INTO personales (usuario, nombre, apellido, password_hash, rol, activo, correo_corporativo)
        VALUES ('admin', 'Administrador', 'Sistema', %s, 'gerencia', true, 'admin@lamascotera.com')
    """, (hashed,))

conn.commit()
print(f"Filas afectadas: {cur.rowcount}")

# Verificar
cur.execute("SELECT id, usuario, nombre, rol, activo FROM personales WHERE usuario = 'admin'")
result = cur.fetchone()
print(f"Admin creado: {result}")

cur.close()
conn.close()
'''

out, err = run(f"cat << 'PYTHONSCRIPT' > /tmp/create_admin.py\n{script}\nPYTHONSCRIPT")
out, err = run("python3 /tmp/create_admin.py")
print(out or err)

# Probar login
print("\n2. Probando login con admin...")
out, err = run("""curl -s -X POST http://localhost:8005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","password":"Mascotera2026!"}' 2>&1""")
print(f"Resultado: {out}")

# Si falla, intentar con un usuario existente
if "incorrectos" in out.lower() or "error" in out.lower():
    print("\n3. Configurando usuario existente como admin...")
    script2 = '''
import bcrypt
import psycopg2

password = "Mascotera2026!".encode('utf-8')
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password, salt).decode('utf-8')

conn = psycopg2.connect(
    host="localhost",
    database="dux_integrada",
    user="dux_user",
    password="Pm2480856!"
)
cur = conn.cursor()

# Actualizar el primer usuario (capitalhumano) como admin
cur.execute("""
    UPDATE personales
    SET password_hash = %s, rol = 'gerencia', activo = true
    WHERE id = 11
""", (hashed,))
conn.commit()
print(f"Filas actualizadas: {cur.rowcount}")

cur.execute("SELECT id, usuario, nombre, rol FROM personales WHERE id = 11")
print(f"Usuario actualizado: {cur.fetchone()}")

cur.close()
conn.close()
'''
    out, err = run(f"cat << 'PYTHONSCRIPT' > /tmp/update_user.py\n{script2}\nPYTHONSCRIPT")
    out, err = run("python3 /tmp/update_user.py")
    print(out or err)

    print("\n4. Probando login con capitalhumano@lamascotera.com.ar...")
    out, err = run("""curl -s -X POST http://localhost:8005/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"usuario":"capitalhumano@lamascotera.com.ar","password":"Mascotera2026!"}' 2>&1""")
    print(f"Resultado: {out}")

ssh.close()
