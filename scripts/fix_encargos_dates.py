#!/usr/bin/env python3
"""Update encargos.html template to add date filters"""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115!Lamascotera')

sftp = ssh.open_sftp()

# Read current template
with sftp.open('/opt/sistema_compras/app/templates/encargos.html', 'r') as f:
    content = f.read().decode('utf-8')

# 1. Add date filter inputs after sucursal select
old_filters = '<select id="filtroSucursal">'
new_filters = '''<select id="filtroSucursal">'''

# Actually, replace the whole filters div area
old_block = '''<div class="filters">
                <select id="filtroSucursal">
                    <option value="">Todas las sucursales</option>
                </select>
                <div class="stats-row" id="filtroEstado">'''

new_block = '''<div class="filters">
                <select id="filtroSucursal">
                    <option value="">Todas las sucursales</option>
                </select>
                <select id="filtroFechaCampo" style="min-width:160px">
                    <option value="">Sin filtro de fecha</option>
                    <option value="fecha_encargo">Fecha de encargo</option>
                    <option value="fecha_necesaria">Fecha necesaria</option>
                </select>
                <div id="fechaInputs" style="display:none;gap:10px;align-items:center">
                    <label style="font-size:0.85em;color:var(--text-gray)">Desde</label>
                    <input type="date" id="fechaDesde" style="padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-family:inherit;font-size:0.9em">
                    <label style="font-size:0.85em;color:var(--text-gray)">Hasta</label>
                    <input type="date" id="fechaHasta" style="padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;font-family:inherit;font-size:0.9em">
                    <button onclick="loadEncargos()" style="padding:8px 20px;background:var(--primary-blue);color:white;border:none;border-radius:8px;font-family:inherit;font-weight:600;cursor:pointer;font-size:0.9em">Filtrar</button>
                </div>
            </div>
            <div class="filters" style="margin-top:-10px">
                <div class="stats-row" id="filtroEstado">'''

content = content.replace(old_block, new_block)

# 2. Update loadEncargos to include date params in URL
old_url = "let url = '/compras/api/mi-sucursal/encargos?';\n                if (currentSucursal) url += 'sucursal_id=' + currentSucursal + '&';\n                if (currentEstado) url += 'estado=' + currentEstado;"

new_url = """let url = '/compras/api/mi-sucursal/encargos?';
                if (currentSucursal) url += 'sucursal_id=' + currentSucursal + '&';
                if (currentEstado) url += 'estado=' + currentEstado + '&';
                const fechaCampo = document.getElementById('filtroFechaCampo').value;
                const fechaDesde = document.getElementById('fechaDesde').value;
                const fechaHasta = document.getElementById('fechaHasta').value;
                if (fechaCampo && fechaDesde) url += 'fecha_campo=' + fechaCampo + '&fecha_desde=' + fechaDesde + '&';
                if (fechaCampo && fechaHasta) url += 'fecha_hasta=' + fechaHasta + '&';"""

content = content.replace(old_url, new_url)

# 3. Update updateCounts to also include date params
old_counts = "fetch('/compras/api/mi-sucursal/encargos?' + (currentSucursal ? 'sucursal_id=' + currentSucursal : ''))"

new_counts = """(() => {
                    let countUrl = '/compras/api/mi-sucursal/encargos?';
                    if (currentSucursal) countUrl += 'sucursal_id=' + currentSucursal + '&';
                    const fc = document.getElementById('filtroFechaCampo').value;
                    const fd = document.getElementById('fechaDesde').value;
                    const fh = document.getElementById('fechaHasta').value;
                    if (fc && fd) countUrl += 'fecha_campo=' + fc + '&fecha_desde=' + fd + '&';
                    if (fc && fh) countUrl += 'fecha_hasta=' + fh + '&';
                    return fetch(countUrl);
                })()"""

content = content.replace(old_counts, new_counts)

# 4. Add fecha campo change listener in setupFilters (before the stat-pill listeners)
old_setup = "document.querySelectorAll('.stat-pill').forEach(pill => {"

new_setup = """document.getElementById('filtroFechaCampo').addEventListener('change', (e) => {
                const fechaInputs = document.getElementById('fechaInputs');
                if (e.target.value) {
                    fechaInputs.style.display = 'flex';
                    if (!document.getElementById('fechaDesde').value) {
                        const hoy = new Date();
                        const hace30 = new Date(hoy);
                        hace30.setDate(hace30.getDate() - 30);
                        document.getElementById('fechaHasta').value = hoy.toISOString().split('T')[0];
                        document.getElementById('fechaDesde').value = hace30.toISOString().split('T')[0];
                    }
                    loadEncargos();
                } else {
                    fechaInputs.style.display = 'none';
                    document.getElementById('fechaDesde').value = '';
                    document.getElementById('fechaHasta').value = '';
                    loadEncargos();
                }
            });

            document.querySelectorAll('.stat-pill').forEach(pill => {"""

content = content.replace(old_setup, new_setup, 1)  # Only first occurrence

# Write back
with sftp.open('/opt/sistema_compras/app/templates/encargos.html', 'w') as f:
    f.write(content)

sftp.close()
print("Template updated OK")

# Restart service
stdin, stdout, stderr = ssh.exec_command('systemctl restart compras.service')
stderr.read()

import time
time.sleep(3)

stdin, stdout, stderr = ssh.exec_command('systemctl is-active compras.service')
print("Service:", stdout.read().decode().strip())

ssh.close()
