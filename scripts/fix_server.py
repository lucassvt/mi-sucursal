#!/usr/bin/env python3
"""Fix server configuration"""

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
print("CORRIGIENDO CONFIGURACION DEL SERVIDOR")
print("=" * 60)

# 1. Agregar ruta /misucursal-api en nginx
print("\n1. Agregando ruta /misucursal-api a nginx...")

nginx_block = '''
    # API Mi Sucursal (ruta alternativa para frontend)
    location /misucursal-api/ {
        proxy_pass http://127.0.0.1:8005/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
'''

# Verificar si ya existe
out, err = run("grep -c 'misucursal-api' /etc/nginx/sites-enabled/dux-db-api || echo '0'")
count = out.strip()

if count == '0':
    # Insertar despues de la linea "location /api/misucursal/"
    out, err = run("""sed -i '/location \\/api\\/misucursal\\// {
n; n; n; n; n;
a\\
    # API Mi Sucursal (ruta alternativa para frontend)\\
    location /misucursal-api/ {\\
        proxy_pass http://127.0.0.1:8005/;\\
        proxy_http_version 1.1;\\
        proxy_set_header Host $host;\\
        proxy_set_header X-Real-IP $remote_addr;\\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\\
    }
}' /etc/nginx/sites-enabled/dux-db-api""")
    print("Ruta agregada")
else:
    print("Ruta ya existe")

# 2. Verificar sintaxis nginx
print("\n2. Verificando sintaxis de nginx...")
out, err = run("nginx -t 2>&1")
print(out or err)

# 3. Recargar nginx
print("\n3. Recargando nginx...")
out, err = run("systemctl reload nginx 2>&1")
print(out or "Nginx recargado")

# 4. Probar la nueva ruta
print("\n4. Probando /misucursal-api/health...")
out, err = run("curl -s http://localhost/misucursal-api/health 2>&1")
print(f"Resultado: {out}")

# 5. Verificar y corregir password del admin
print("\n5. Verificando password del usuario admin...")

# Primero ver el hash actual
out, err = run("""PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -t -A -c "
SELECT password_hash FROM employees WHERE usuario = 'admin';
" """)
print(f"Hash actual: {out[:30]}..." if out else "Sin hash")

# Generar nuevo hash usando python en el servidor
print("\n6. Generando nuevo hash bcrypt en el servidor...")
out, err = run("""python3 << 'EOF'
import bcrypt
password = "Mascotera2026!".encode('utf-8')
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password, salt)
print(hashed.decode('utf-8'))
EOF
""")
new_hash = out.strip()
print(f"Nuevo hash: {new_hash[:30]}...")

if new_hash.startswith('$2'):
    print("\n7. Actualizando password...")
    out, err = run(f"""PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -c "
    UPDATE employees SET password_hash = '{new_hash}' WHERE usuario = 'admin';
    " """)
    print(out)

    # Probar login
    print("\n8. Probando login...")
    out, err = run("""curl -s -X POST http://localhost:8005/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"usuario":"admin","password":"Mascotera2026!"}' 2>&1""")
    print(f"Login: {out}")
else:
    print("Error generando hash, bcrypt no instalado en servidor")
    print("Instalando bcrypt...")
    out, err = run("pip3 install bcrypt")
    print(out or err)

ssh.close()
print("\n" + "=" * 60)
print("CORRECCION COMPLETADA")
print("=" * 60)
