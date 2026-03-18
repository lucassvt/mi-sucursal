#!/usr/bin/env python3
"""Fix password in the correct table (personales)"""

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
print("CORRIGIENDO EN TABLA CORRECTA (personales)")
print("=" * 60)

# 1. Ver estructura de personales
print("\n1. Estructura de la tabla personales:")
out, err = run("""PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -c "
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'personales' ORDER BY ordinal_position;
" """)
print(out)

# 2. Ver si existe admin en personales
print("\n2. Buscando admin en personales:")
out, err = run("""PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -c "
SELECT id, usuario, nombre, apellido, rol, activo, password_hash IS NOT NULL as tiene_pass
FROM personales WHERE usuario = 'admin' OR nombre ILIKE '%admin%';
" """)
print(out)

# 3. Ver usuarios activos en personales
print("\n3. Usuarios en personales con usuario definido:")
out, err = run("""PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -c "
SELECT id, usuario, nombre, apellido, rol, activo
FROM personales
WHERE usuario IS NOT NULL AND usuario != ''
ORDER BY id
LIMIT 20;
" """)
print(out)

ssh.close()
