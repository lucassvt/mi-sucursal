#!/usr/bin/env python3
"""
Script para acciones en el servidor de Mi Sucursal.
"""

try:
    import paramiko
except ImportError:
    print("Instalando paramiko...")
    import subprocess
    subprocess.check_call(["pip", "install", "paramiko"])
    import paramiko

import sys

# Credenciales del .env
SSH_HOST = "vps-5611909-x.dattaweb.com"
SSH_PORT = 5695
SSH_USER = "root"
SSH_PASS = "lucas171115!Lamascotera"

def run_ssh_command(ssh, command):
    """Ejecuta un comando en el servidor remoto"""
    try:
        stdin, stdout, stderr = ssh.exec_command(command, timeout=60)
        return stdout.read().decode('utf-8'), stderr.read().decode('utf-8')
    except Exception as e:
        return "", str(e)

def connect():
    """Conecta al servidor"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=15)
    return ssh

def restart_backend():
    """Reinicia el contenedor backend de mi-sucursal"""
    print("Conectando al servidor...")
    ssh = connect()

    print("Reiniciando contenedor mi-sucursal-backend-1...")
    stdout, stderr = run_ssh_command(ssh, "docker restart mi-sucursal-backend-1")
    print(f"Resultado: {stdout or stderr}")

    print("\nEsperando 5 segundos...")
    import time
    time.sleep(5)

    print("\nVerificando estado...")
    stdout, stderr = run_ssh_command(ssh, "docker ps | grep mi-sucursal")
    print(stdout)

    ssh.close()
    print("Listo!")

def check_logs():
    """Muestra logs del backend"""
    print("Conectando al servidor...")
    ssh = connect()

    print("Ultimas 50 lineas del log del backend...")
    stdout, stderr = run_ssh_command(ssh, "docker logs mi-sucursal-backend-1 --tail 50")
    print(stdout)
    if stderr:
        print("STDERR:", stderr)

    ssh.close()

def reset_password(username, new_password):
    """Resetea la contrasena de un usuario"""
    print("Conectando al servidor...")
    ssh = connect()

    # Generar hash bcrypt
    hash_cmd = f"""python3 -c "
import bcrypt
password = '{new_password}'.encode('utf-8')
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password, salt)
print(hashed.decode('utf-8'))
" """

    print(f"Generando hash para nueva contrasena...")
    stdout, stderr = run_ssh_command(ssh, hash_cmd)

    if not stdout.strip().startswith('$2'):
        # Si no hay bcrypt en el servidor, intentar localmente
        print("bcrypt no disponible en servidor, generando localmente...")
        try:
            import bcrypt
            password = new_password.encode('utf-8')
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password, salt).decode('utf-8')
        except ImportError:
            print("Instalando bcrypt...")
            import subprocess
            subprocess.check_call(["pip", "install", "bcrypt"])
            import bcrypt
            password = new_password.encode('utf-8')
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password, salt).decode('utf-8')
    else:
        hashed = stdout.strip()

    print(f"Hash generado: {hashed[:20]}...")

    # Actualizar en la base de datos
    update_cmd = f"""PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -c "
    UPDATE employees SET password_hash = '{hashed}' WHERE usuario = '{username}';
    " 2>&1"""

    print(f"Actualizando contrasena de {username}...")
    stdout, stderr = run_ssh_command(ssh, update_cmd)
    print(f"Resultado: {stdout}")

    ssh.close()
    print(f"\nListo! Usuario: {username}, Nueva contrasena: {new_password}")

def list_users():
    """Lista usuarios disponibles"""
    print("Conectando al servidor...")
    ssh = connect()

    db_cmd = """PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -t -A -c "
    SELECT usuario, nombre, rol FROM employees WHERE activo = true ORDER BY usuario LIMIT 30;
    " 2>&1"""

    stdout, stderr = run_ssh_command(ssh, db_cmd)
    print("\nUsuarios disponibles:")
    print("Usuario | Nombre | Rol")
    print("-" * 60)
    for line in stdout.strip().split('\n'):
        if line and '|' in line:
            print(line.replace('|', ' | '))

    ssh.close()

def main():
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python server_actions.py restart    - Reiniciar backend")
        print("  python server_actions.py logs       - Ver logs del backend")
        print("  python server_actions.py users      - Listar usuarios")
        print("  python server_actions.py reset <usuario> <nueva_contrasena>")
        print("")
        print("Ejemplo:")
        print("  python server_actions.py reset diez.ricardo 123456")
        return

    action = sys.argv[1]

    if action == "restart":
        restart_backend()
    elif action == "logs":
        check_logs()
    elif action == "users":
        list_users()
    elif action == "reset":
        if len(sys.argv) < 4:
            print("Uso: python server_actions.py reset <usuario> <nueva_contrasena>")
            return
        username = sys.argv[2]
        new_password = sys.argv[3]
        reset_password(username, new_password)
    else:
        print(f"Accion desconocida: {action}")

if __name__ == "__main__":
    main()
