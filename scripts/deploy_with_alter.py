import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115!Lamascotera')

commands = [
    # ALTER TABLE para agregar columna recontactos
    "PGPASSWORD='M1Sucurs4l2025!' psql -U dux_user -d mi_sucursal -h localhost -c \"ALTER TABLE auditoria_mensual ADD COLUMN IF NOT EXISTS recontactos FLOAT;\"",
    # Backup dashboard.py
    'cp /var/www/mi-sucursal/backend/app/routes/dashboard.py /tmp/dashboard_backup.py',
    # Git pull
    'cd /var/www/mi-sucursal && git pull origin master',
    # Restore dashboard.py
    'cp /tmp/dashboard_backup.py /var/www/mi-sucursal/backend/app/routes/dashboard.py',
    # Rebuild and restart
    'cd /var/www/mi-sucursal && docker compose build backend frontend 2>&1 | tail -5',
    'cd /var/www/mi-sucursal && docker compose up -d backend frontend 2>&1',
]

for cmd in commands:
    print(f'>>> {cmd[:80]}...' if len(cmd) > 80 else f'>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=180)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err: print(err)
    print()

ssh.close()
print('Done!')
