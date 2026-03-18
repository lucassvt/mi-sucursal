#!/usr/bin/env python3
"""Fix admin password properly"""

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
print("CORRIGIENDO PASSWORD DEL ADMIN")
print("=" * 60)

# Generar y guardar el hash usando Python directamente en el servidor
# evitando problemas con el shell
script = '''
import bcrypt
import psycopg2

# Generar hash
password = "Mascotera2026!".encode('utf-8')
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password, salt).decode('utf-8')
print(f"Hash generado: {hashed}")

# Conectar a la BD
conn = psycopg2.connect(
    host="localhost",
    database="dux_integrada",
    user="dux_user",
    password="Pm2480856!"
)
cur = conn.cursor()

# Actualizar password
cur.execute(
    "UPDATE employees SET password_hash = %s WHERE usuario = %s",
    (hashed, 'admin')
)
conn.commit()
print(f"Filas actualizadas: {cur.rowcount}")

# Verificar
cur.execute("SELECT password_hash FROM employees WHERE usuario = 'admin'")
result = cur.fetchone()
print(f"Hash guardado: {result[0]}")

# Verificar que funciona
is_valid = bcrypt.checkpw(password, result[0].encode('utf-8'))
print(f"Verificacion: {is_valid}")

cur.close()
conn.close()
'''

# Crear archivo en el servidor y ejecutarlo
print("\n1. Creando y ejecutando script en el servidor...")
out, err = run(f"cat << 'PYTHONSCRIPT' > /tmp/fix_pass.py\n{script}\nPYTHONSCRIPT")
out, err = run("python3 /tmp/fix_pass.py")
print(out or err)

# Probar login
print("\n2. Probando login...")
out, err = run("""curl -s -X POST http://localhost:8005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","password":"Mascotera2026!"}' 2>&1""")
print(f"Resultado: {out}")

ssh.close()
