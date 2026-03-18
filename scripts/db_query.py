import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115!Lamascotera')

query = sys.argv[1] if len(sys.argv) > 1 else "SELECT 1"
db = sys.argv[2] if len(sys.argv) > 2 else "mi_sucursal"

cmd = f"PGPASSWORD='M1Sucurs4l2025!' psql -U dux_user -d {db} -h localhost -c \"{query}\""
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print(err)

ssh.close()
