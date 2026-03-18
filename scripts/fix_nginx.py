#!/usr/bin/env python3
"""Fix nginx configuration for misucursal-api"""

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
print("ARREGLANDO NGINX PARA /misucursal-api")
print("=" * 60)

# 1. Ver si ya existe la ruta
print("\n1. Verificando rutas existentes de misucursal en nginx:")
out, err = run("grep -n 'misucursal' /etc/nginx/sites-enabled/dux-db-api")
print(out)

# 2. Agregar la ruta /misucursal-api/ antes de location /misucursal
print("\n2. Agregando ruta /misucursal-api/...")

# Backup primero
out, err = run("cp /etc/nginx/sites-enabled/dux-db-api /etc/nginx/sites-enabled/dux-db-api.bak")

# La config actual tiene:
# location /misucursal { ... }
# location /api/misucursal/ { ... }
#
# Necesitamos agregar:
# location /misucursal-api/ { proxy_pass http://127.0.0.1:8005/; ... }

nginx_block = '''
    # API Mi Sucursal - ruta para frontend
    location /misucursal-api/ {
        proxy_pass http://127.0.0.1:8005/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
'''

# Insertar antes de "location /misucursal {"
out, err = run("""grep -q 'location /misucursal-api/' /etc/nginx/sites-enabled/dux-db-api && echo 'Ya existe' || echo 'No existe'""")
if 'No existe' in out:
    # Usar sed para insertar antes de "location /misucursal {"
    sed_cmd = """sed -i '/^[[:space:]]*location \\/misucursal {/i\\
    # API Mi Sucursal - ruta para frontend\\
    location /misucursal-api/ {\\
        proxy_pass http://127.0.0.1:8005/;\\
        proxy_http_version 1.1;\\
        proxy_set_header Host $host;\\
        proxy_set_header X-Real-IP $remote_addr;\\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\\
        proxy_set_header X-Forwarded-Proto $scheme;\\
    }\\
' /etc/nginx/sites-enabled/dux-db-api"""
    out, err = run(sed_cmd)
    print("Ruta agregada")
else:
    print("La ruta ya existe")

# 3. Verificar sintaxis
print("\n3. Verificando sintaxis de nginx:")
out, err = run("nginx -t 2>&1")
print(out or err)

# 4. Recargar nginx
print("\n4. Recargando nginx:")
out, err = run("systemctl reload nginx 2>&1")
print("Nginx recargado" if not err else err)

# 5. Probar
print("\n5. Probando /misucursal-api/health:")
out, err = run("curl -s http://localhost/misucursal-api/health")
print(out)

print("\n6. Probando /misucursal-api/api/auth/login:")
out, err = run("""curl -s -X POST http://localhost/misucursal-api/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","password":"Mascotera2026!"}' """)
print(out[:200] + "..." if len(out) > 200 else out)

# Ver la config final
print("\n7. Configuracion final de misucursal en nginx:")
out, err = run("grep -A 10 'misucursal' /etc/nginx/sites-enabled/dux-db-api | head -30")
print(out)

ssh.close()
