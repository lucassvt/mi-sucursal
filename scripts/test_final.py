#!/usr/bin/env python3
"""Test final del sistema"""

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
print("TEST FINAL DEL SISTEMA MI SUCURSAL")
print("=" * 60)

print("\n1. Test /misucursal-api/health:")
out, err = run("curl -s http://localhost/misucursal-api/health")
print(f"   {out}")

print("\n2. Test login via /misucursal-api/api/auth/login:")
out, err = run("""curl -s -X POST http://localhost/misucursal-api/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","password":"Mascotera2026!"}' """)
print(f"   {out[:150]}...")

print("\n3. Test desde IP externa (66.97.35.249):")
out, err = run("curl -s http://66.97.35.249/misucursal-api/health")
print(f"   {out}")

print("\n4. Test login desde IP externa:")
out, err = run("""curl -s -X POST http://66.97.35.249/misucursal-api/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","password":"Mascotera2026!"}' """)
if "access_token" in out:
    print("   [OK] Login exitoso")
else:
    print(f"   {out}")

print("\n" + "=" * 60)
print("CREDENCIALES DE ACCESO")
print("=" * 60)
print("\nURL: http://66.97.35.249/misucursal/login")
print("Usuario: admin")
print("Password: Mascotera2026!")
print("Rol: gerencia")

ssh.close()
