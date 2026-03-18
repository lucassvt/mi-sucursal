#!/usr/bin/env python3
"""Deep debug of server issues"""

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
print("DEBUG PROFUNDO")
print("=" * 60)

# 1. Ver configuracion nginx completa
print("\n1. Configuracion nginx completa de dux-db-api:")
out, err = run("cat /etc/nginx/sites-enabled/dux-db-api | head -150")
print(out)

# 2. Verificar orden de las locations
print("\n2. Todas las locations en orden:")
out, err = run("grep -n 'location' /etc/nginx/sites-enabled/dux-db-api")
print(out)

# 3. Ver auth.py en el backend
print("\n3. Buscando codigo de autenticacion en el backend...")
out, err = run("find /root /opt /home -name 'auth*.py' 2>/dev/null | head -5")
print(out)

# 4. Ver como se verifica el password
print("\n4. Verificando password del admin manualmente...")
out, err = run("""python3 << 'EOF'
import bcrypt
# El hash guardado en la BD
import subprocess
result = subprocess.run([
    'psql', '-h', 'localhost', '-U', 'dux_user', '-d', 'dux_integrada',
    '-t', '-A', '-c', "SELECT password_hash FROM employees WHERE usuario = 'admin';"
], capture_output=True, text=True, env={'PGPASSWORD': 'Pm2480856!'})
stored_hash = result.stdout.strip()
print(f"Hash almacenado: {stored_hash}")

# Verificar con bcrypt
password = "Mascotera2026!".encode('utf-8')
try:
    is_valid = bcrypt.checkpw(password, stored_hash.encode('utf-8'))
    print(f"Password valido: {is_valid}")
except Exception as e:
    print(f"Error verificando: {e}")
EOF
""")
print(out or err)

# 5. Ver logs del backend para ver que pasa con el login
print("\n5. Logs del backend (ultimas 20 lineas):")
out, err = run("docker logs mi-sucursal-backend-1 --tail 20 2>&1")
print(out or err)

# 6. Ver codigo de autenticacion
print("\n6. Codigo de autenticacion del backend:")
out, err = run("docker exec mi-sucursal-backend-1 cat /app/app/routes/auth.py 2>/dev/null | head -100")
print(out or err)

ssh.close()
