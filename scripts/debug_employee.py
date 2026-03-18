#!/usr/bin/env python3
"""Debug employee model"""

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

print("1. Modelo Employee del backend:")
out, err = run("docker exec mi-sucursal-backend-1 cat /app/app/models/employee.py 2>/dev/null")
print(out or err)

print("\n\n2. Security.py (verify_password):")
out, err = run("docker exec mi-sucursal-backend-1 cat /app/app/core/security.py 2>/dev/null")
print(out or err)

print("\n\n3. Datos del admin en la BD:")
out, err = run("""PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -c "
SELECT * FROM employees WHERE usuario = 'admin';
" """)
print(out)

ssh.close()
