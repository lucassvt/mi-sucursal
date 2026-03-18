#!/usr/bin/env python3
"""Fix nginx configuration properly"""

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

print("1. Eliminando archivo backup...")
out, err = run("rm -f /etc/nginx/sites-enabled/dux-db-api.bak")
print("Eliminado")

print("\n2. Verificando sintaxis de nginx...")
out, err = run("nginx -t 2>&1")
print(out or err)

print("\n3. Recargando nginx...")
out, err = run("systemctl reload nginx 2>&1")
print("OK" if not err else err)

print("\n4. Verificando orden de locations (misucursal-api debe ir antes de misucursal):")
out, err = run("grep -n 'location.*misucursal' /etc/nginx/sites-enabled/dux-db-api")
print(out)

print("\n5. Probando /misucursal-api/health:")
out, err = run("curl -s http://localhost/misucursal-api/health 2>&1")
print(f"Respuesta: {out[:200] if len(out) > 200 else out}")

# Si aun no funciona, el problema es el orden - misucursal-api debe ir ANTES de misucursal
if "404" in out or "html" in out.lower():
    print("\n6. El orden de locations es incorrecto. /misucursal-api debe estar ANTES de /misucursal")
    print("   Corrigiendo orden...")

    # Leer el archivo, modificar y guardar
    out, err = run("""python3 << 'EOF'
import re

with open('/etc/nginx/sites-enabled/dux-db-api', 'r') as f:
    content = f.read()

# Encontrar y guardar el bloque de misucursal-api
api_pattern = r'(\s*# API Mi Sucursal - ruta para frontend\s*\n\s*location /misucursal-api/.*?\n(?:\s+.*?\n)*?\s*\})'
api_match = re.search(api_pattern, content, re.DOTALL)

if api_match:
    api_block = api_match.group(1)
    # Remover el bloque de donde esta
    content = content.replace(api_block, '')

    # Encontrar donde esta "location /misucursal {" e insertar antes
    misucursal_pos = content.find('location /misucursal {')
    if misucursal_pos > 0:
        # Buscar el inicio de la linea anterior
        line_start = content.rfind('\\n', 0, misucursal_pos) + 1
        content = content[:line_start] + api_block + '\\n\\n    ' + content[line_start:]

        with open('/etc/nginx/sites-enabled/dux-db-api', 'w') as f:
            f.write(content)
        print("Orden corregido")
    else:
        print("No se encontro location /misucursal")
else:
    print("Bloque misucursal-api no encontrado, creandolo...")

    # Encontrar donde esta "location /misucursal {" e insertar antes
    misucursal_pos = content.find('location /misucursal {')
    if misucursal_pos > 0:
        api_block = '''
    # API Mi Sucursal - ruta para frontend
    location /misucursal-api/ {
        proxy_pass http://127.0.0.1:8005/;
        proxy_http_version 1.1;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

'''
        # Buscar el inicio de la linea anterior
        line_start = content.rfind('\\n', 0, misucursal_pos) + 1
        content = content[:line_start] + api_block + content[line_start:]

        with open('/etc/nginx/sites-enabled/dux-db-api', 'w') as f:
            f.write(content)
        print("Bloque agregado antes de /misucursal")
EOF
""")
    print(out or err)

    print("\n7. Verificando sintaxis nueva...")
    out, err = run("nginx -t 2>&1")
    print(out or err)

    print("\n8. Recargando nginx...")
    out, err = run("systemctl reload nginx 2>&1")
    print("OK" if not err else err)

print("\n9. Test final - /misucursal-api/health:")
out, err = run("curl -s http://localhost/misucursal-api/health 2>&1")
print(f"Respuesta: {out}")

ssh.close()
