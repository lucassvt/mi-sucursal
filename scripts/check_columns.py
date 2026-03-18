#!/usr/bin/env python3
"""Check columns in employees table"""

import paramiko

SSH_HOST = "vps-5611909-x.dattaweb.com"
SSH_PORT = 5695
SSH_USER = "root"
SSH_PASS = "lucas171115!Lamascotera"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=15)

cmd = """PGPASSWORD='Pm2480856!' psql -h localhost -U dux_user -d dux_integrada -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;
" """

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
print(stdout.read().decode('utf-8'))

ssh.close()
