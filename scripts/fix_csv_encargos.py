#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115' + chr(33) + 'Lamascotera')

sftp = ssh.open_sftp()
with sftp.open('/opt/sistema_compras/app/templates/encargos.html', 'r') as f:
    content = f.read().decode('utf-8')

# The old broken downloadCSV uses literal newlines inside JS strings.
# Find it and replace with a working version that uses String.fromCharCode(10)
old_start = '        function downloadCSV() {'
old_end = '            URL.revokeObjectURL(url);\n        }'

idx_start = content.index(old_start)
idx_end = content.index(old_end, idx_start) + len(old_end)

old_fn = content[idx_start:idx_end]

new_fn = """        function downloadCSV() {
            if (allEncargos.length === 0) { alert('No hay encargos para descargar'); return; }
            var NL = String.fromCharCode(10);
            var SEP = ';';
            var headers = ['Sucursal','Producto','Cliente','Telefono','Cantidad','Vendedor','Fecha Encargo','Fecha Necesaria','Estado','Observaciones'];
            var csv = String.fromCharCode(0xFEFF) + headers.join(SEP) + NL;
            allEncargos.forEach(function(e) {
                var row = [
                    e.sucursal_nombre || '',
                    e.producto_nombre || '',
                    e.cliente_nombre || '',
                    e.cliente_telefono || '',
                    e.cantidad,
                    e.employee_nombre || '',
                    e.fecha_encargo ? new Date(e.fecha_encargo).toLocaleDateString('es-AR') : '',
                    e.fecha_necesaria ? new Date(e.fecha_necesaria).toLocaleDateString('es-AR') : '',
                    e.estado || '',
                    (e.observaciones || '').replace(/"/g, '""')
                ];
                csv += row.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(SEP) + NL;
            });
            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'encargos_' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            URL.revokeObjectURL(url);
        }"""

content = content[:idx_start] + new_fn + content[idx_end:]

with sftp.open('/opt/sistema_compras/app/templates/encargos.html', 'w') as f:
    f.write(content)
sftp.close()

print("OK - CSV function fixed")
ssh.close()
