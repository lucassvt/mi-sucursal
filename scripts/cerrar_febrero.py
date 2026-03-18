import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115!Lamascotera')

# Generate token via docker exec
cmd_gen = 'docker exec mi-sucursal-backend python -c "from app.core.security import create_access_token; print(create_access_token(data={\'sub\': \'999\', \'sucursal_id\': 7}))"'
stdin, stdout, stderr = ssh.exec_command(cmd_gen, timeout=30)
token = stdout.read().decode().strip()
err = stderr.read().decode()

if not token:
    print('ERROR generating token')
    print(err)
    ssh.close()
    exit(1)

print(f'Token generado: {token[:30]}...')

# Call cerrar-mes endpoint
cmd_cerrar = f'curl -s -X POST "http://localhost:8005/api/recontactos/cerrar-mes?mes=2026-02" -H "Authorization: Bearer {token}" -H "Content-Type: application/json"'
stdin, stdout, stderr = ssh.exec_command(cmd_cerrar, timeout=120)
result = stdout.read().decode()
err = stderr.read().decode()

try:
    data = json.loads(result)
    print(json.dumps(data, indent=2, ensure_ascii=False))
except:
    print('Response:', result)
    if err:
        print('Error:', err)

ssh.close()
