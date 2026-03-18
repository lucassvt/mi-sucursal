#!/usr/bin/env python3
"""Check nginx misucursal configuration"""

import paramiko

SSH_HOST = "vps-5611909-x.dattaweb.com"
SSH_PORT = 5695
SSH_USER = "root"
SSH_PASS = "lucas171115!Lamascotera"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=15)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    return stdout.read().decode('utf-8'), stderr.read().decode('utf-8')

print("1. Configuracion completa de nginx para misucursal:")
out, err = run("grep -A 20 'misucursal' /etc/nginx/sites-enabled/dux-db-api")
print(out)

print("\n2. Probando /misucursal-api desde el servidor:")
out, err = run("curl -s http://localhost/misucursal-api/health 2>&1")
print(f"localhost/misucursal-api/health: {out}")

print("\n3. Probando /api/misucursal/ desde el servidor:")
out, err = run("curl -s http://localhost/api/misucursal/health 2>&1")
print(f"localhost/api/misucursal/health: {out}")

print("\n4. Probando puerto 8005 directo:")
out, err = run("curl -s http://localhost:8005/ 2>&1")
print(f"localhost:8005/: {out}")

out, err = run("curl -s http://localhost:8005/health 2>&1")
print(f"localhost:8005/health: {out}")

print("\n5. Probando login en el backend:")
out, err = run("""curl -s -X POST http://localhost:8005/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","password":"Mascotera2026!"}' 2>&1""")
print(f"Login response: {out}")

ssh.close()
