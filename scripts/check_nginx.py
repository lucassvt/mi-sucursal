#!/usr/bin/env python3
"""Check nginx configuration and backend connectivity"""

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

print("=" * 60)
print("1. Buscando configuracion nginx para misucursal...")
print("=" * 60)
out, err = run("grep -r 'misucursal' /etc/nginx/ 2>/dev/null || echo 'No encontrado en /etc/nginx'")
print(out or err)

print("\n2. Contenido de sites-enabled...")
out, err = run("ls -la /etc/nginx/sites-enabled/ 2>/dev/null")
print(out or err)

print("\n3. Configuracion que menciona misucursal o puerto 3005...")
out, err = run("grep -l -r '3005\\|misucursal' /etc/nginx/ 2>/dev/null | head -5")
if out.strip():
    for f in out.strip().split('\n'):
        print(f"\n--- Archivo: {f} ---")
        o, e = run(f"cat {f}")
        print(o[:2000] if len(o) > 2000 else o)

print("\n4. Verificando que el backend responde...")
out, err = run("curl -s http://localhost:8003/health 2>&1 || echo 'Backend no responde en 8003'")
print(f"Puerto 8003: {out}")

out, err = run("curl -s http://localhost:8005/health 2>&1 || echo 'Backend no responde en 8005'")
print(f"Puerto 8005: {out}")

print("\n5. Docker network del backend...")
out, err = run("docker inspect mi-sucursal-backend-1 --format '{{.HostConfig.NetworkMode}}' 2>/dev/null")
print(f"Network mode: {out}")

out, err = run("docker inspect mi-sucursal-backend-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null")
print(f"IP Address: {out}")

print("\n6. Puertos expuestos del backend...")
out, err = run("docker port mi-sucursal-backend-1 2>/dev/null || echo 'Sin puertos mapeados'")
print(out or "Sin puertos mapeados")

print("\n7. Variables de entorno del frontend (API URL)...")
out, err = run("docker exec mi-sucursal-frontend-1 printenv | grep -i api 2>/dev/null || echo 'No encontrado'")
print(out or err)

ssh.close()
