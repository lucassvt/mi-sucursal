"""Upload templates to sistema-compras on VPS"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('vps-5611909-x.dattaweb.com', port=5695, username='root', password='lucas171115' + chr(33) + 'Lamascotera')

# ==================== ENCARGOS.HTML ====================
encargos_html = r"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Encargos - Sistema de Compras</title>
    <link rel="icon" type="image/png" href="/imagenes/favicon.png">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-blue: #0066CC;
            --primary-dark: #004C99;
            --primary-light: #3399FF;
            --accent-orange: #FF6B35;
            --bg-light: #F8FAFC;
            --bg-white: #FFFFFF;
            --text-dark: #1E293B;
            --text-gray: #64748B;
            --text-light: #94A3B8;
            --border-color: #E2E8F0;
            --success: #10B981;
            --warning: #F59E0B;
            --danger: #EF4444;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-light);
            color: var(--text-dark);
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        header {
            background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-dark) 100%);
            color: white;
            box-shadow: 0 4px 20px rgba(0, 102, 204, 0.3);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 30px;
        }
        .logo-section { display: flex; align-items: center; gap: 15px; }
        .logo-section img { height: 60px; }
        .logo-text { display: flex; flex-direction: column; }
        .logo-text h1 { font-size: 1.3em; font-weight: 700; letter-spacing: 1px; }
        .logo-text .subtitle { font-size: 0.75em; opacity: 0.8; }
        nav { display: flex; gap: 5px; flex-wrap: wrap; }
        nav a {
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        nav a:hover { background: rgba(255,255,255,0.15); }
        nav a.active { background: rgba(255,255,255,0.2); }
        nav a svg { width: 18px; height: 18px; }
        .container { max-width: 1400px; margin: 0 auto; padding: 30px; flex: 1; }
        .section {
            background: var(--bg-white);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            border: 1px solid var(--border-color);
        }
        .section-title {
            font-size: 1.2em;
            font-weight: 600;
            color: var(--primary-blue);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--border-color);
        }
        .section-title svg { width: 24px; height: 24px; }
        .filters {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            align-items: center;
        }
        .filters select {
            padding: 8px 14px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.9em;
            background: white;
            color: var(--text-dark);
        }
        .filters select:focus {
            outline: none;
            border-color: var(--primary-blue);
            box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.78em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-pendiente { background: #FEF3C7; color: #92400E; }
        .badge-pedido_proveedor { background: #DBEAFE; color: #1E40AF; }
        .badge-vendido { background: #D1FAE5; color: #065F46; }
        .badge-cancelado { background: #FEE2E2; color: #991B1B; }
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 0.88em;
        }
        th {
            background: #F1F5F9;
            color: var(--text-gray);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.78em;
            letter-spacing: 0.5px;
            padding: 12px 14px;
            text-align: left;
            border-bottom: 2px solid var(--border-color);
            position: sticky;
            top: 0;
        }
        td {
            padding: 10px 14px;
            border-bottom: 1px solid #F1F5F9;
            vertical-align: middle;
        }
        tr:hover td { background: #F8FAFC; }
        .loading { text-align: center; padding: 40px; color: var(--text-gray); }
        .loading .spinner {
            width: 40px; height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--primary-blue);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 50px; color: var(--text-light); }
        .empty-state svg { width: 48px; height: 48px; margin-bottom: 10px; opacity: 0.4; }
        .stats-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .stat-pill {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s;
        }
        .stat-pill:hover { transform: translateY(-1px); }
        .stat-pill.active { border-color: var(--primary-blue); }
        .stat-pill.all { background: #F1F5F9; color: var(--text-dark); }
        .stat-pill.pendiente { background: #FEF3C7; color: #92400E; }
        .stat-pill.pedido_proveedor { background: #DBEAFE; color: #1E40AF; }
        .stat-pill.vendido { background: #D1FAE5; color: #065F46; }
        .stat-pill.cancelado { background: #FEE2E2; color: #991B1B; }
        .count-badge {
            display: inline-block;
            background: rgba(0,0,0,0.1);
            border-radius: 10px;
            padding: 0 6px;
            font-size: 0.85em;
            margin-left: 4px;
        }
        footer {
            background: linear-gradient(135deg, var(--primary-blue), var(--primary-dark));
            color: white;
            padding: 15px 30px;
            text-align: center;
            font-size: 0.85em;
        }
        .footer-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .footer-main { display: flex; align-items: center; gap: 8px; }
        .footer-main img { height: 24px; }
        .footer-developer { opacity: 0.7; font-size: 0.85em; }
        .footer-quote { opacity: 0.5; font-style: italic; font-size: 0.8em; }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <div class="logo-section">
                <img src="/imagenes/logo%20La%20Mascotera%20(1).png" alt="La Mascotera">
                <div class="logo-text">
                    <h1>SISTEMA DE COMPRAS</h1>
                    <span class="subtitle">Optimizacion de Stock y Distribucion v2.0</span>
                </div>
            </div>
            <nav>
                <a href="/">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    Dashboard
                </a>
                <a href="/encargos" class="active">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    Encargos
                </a>
                <a href="/ventas-perdidas">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Ventas Perdidas
                </a>
                <a href="/config">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Configuracion
                </a>
            </nav>
        </div>
    </header>

    <div class="container">
        <div class="section">
            <div class="section-title">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                Encargos de Productos
                <span style="font-size:0.7em;color:var(--text-light);margin-left:auto;">Datos desde Mi Sucursal</span>
            </div>

            <div class="filters">
                <select id="filtroSucursal">
                    <option value="">Todas las sucursales</option>
                </select>
                <div class="stats-row" id="filtroEstado">
                    <span class="stat-pill all active" data-estado="">Todos <span class="count-badge" id="count-all">0</span></span>
                    <span class="stat-pill pendiente" data-estado="pendiente">Pendientes <span class="count-badge" id="count-pendiente">0</span></span>
                    <span class="stat-pill pedido_proveedor" data-estado="pedido_proveedor">Pedido Proveedor <span class="count-badge" id="count-pedido_proveedor">0</span></span>
                    <span class="stat-pill vendido" data-estado="vendido">Vendidos <span class="count-badge" id="count-vendido">0</span></span>
                    <span class="stat-pill cancelado" data-estado="cancelado">Cancelados <span class="count-badge" id="count-cancelado">0</span></span>
                </div>
            </div>

            <div id="tableContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Cargando encargos...</p>
                </div>
            </div>
        </div>
    </div>

    <footer>
        <div class="footer-content">
            <div class="footer-main">
                <img src="/imagenes/corazon%20azul.png" alt="">
                <span>LA MASCOTERA SAS</span>
            </div>
            <div class="footer-developer">Desarrollado por Lucas Salvatierra Software</div>
            <div class="footer-quote">"Ad astra per aspera"</div>
        </div>
    </footer>

    <script>
        let allEncargos = [];
        let currentEstado = '';
        let currentSucursal = '';

        document.addEventListener('DOMContentLoaded', async () => {
            await loadSucursales();
            await loadEncargos();
            setupFilters();
        });

        async function loadSucursales() {
            try {
                const res = await fetch('/api/mi-sucursal/sucursales');
                const data = await res.json();
                const select = document.getElementById('filtroSucursal');
                data.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.nombre;
                    select.appendChild(opt);
                });
            } catch (e) {
                console.error('Error cargando sucursales:', e);
            }
        }

        async function loadEncargos() {
            document.getElementById('tableContainer').innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando encargos...</p></div>';
            try {
                let url = '/api/mi-sucursal/encargos?';
                if (currentSucursal) url += 'sucursal_id=' + currentSucursal + '&';
                if (currentEstado) url += 'estado=' + currentEstado;
                const res = await fetch(url);
                allEncargos = await res.json();
                updateCounts();
                renderTable();
            } catch (e) {
                document.getElementById('tableContainer').innerHTML = '<div class="empty-state"><p>Error cargando encargos</p></div>';
            }
        }

        function updateCounts() {
            // Load all without estado filter to get counts
            fetch('/api/mi-sucursal/encargos?' + (currentSucursal ? 'sucursal_id=' + currentSucursal : ''))
                .then(r => r.json())
                .then(data => {
                    document.getElementById('count-all').textContent = data.length;
                    document.getElementById('count-pendiente').textContent = data.filter(e => e.estado === 'pendiente').length;
                    document.getElementById('count-pedido_proveedor').textContent = data.filter(e => e.estado === 'pedido_proveedor').length;
                    document.getElementById('count-vendido').textContent = data.filter(e => e.estado === 'vendido').length;
                    document.getElementById('count-cancelado').textContent = data.filter(e => e.estado === 'cancelado').length;
                });
        }

        function setupFilters() {
            document.getElementById('filtroSucursal').addEventListener('change', (e) => {
                currentSucursal = e.target.value;
                loadEncargos();
            });

            document.querySelectorAll('.stat-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    document.querySelectorAll('.stat-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    currentEstado = pill.dataset.estado;
                    loadEncargos();
                });
            });
        }

        function formatDate(dateStr) {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        function estadoBadge(estado) {
            const labels = {
                'pendiente': 'Pendiente',
                'pedido_proveedor': 'Pedido Proveedor',
                'vendido': 'Vendido',
                'cancelado': 'Cancelado'
            };
            return '<span class="badge badge-' + estado + '">' + (labels[estado] || estado) + '</span>';
        }

        function renderTable() {
            if (allEncargos.length === 0) {
                document.getElementById('tableContainer').innerHTML = '<div class="empty-state"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg><p>No hay encargos registrados</p></div>';
                return;
            }

            let html = '<table><thead><tr>';
            html += '<th>Sucursal</th>';
            html += '<th>Producto</th>';
            html += '<th>Cliente</th>';
            html += '<th>Cant.</th>';
            html += '<th>Vendedor</th>';
            html += '<th>F. Encargo</th>';
            html += '<th>F. Necesaria</th>';
            html += '<th>Estado</th>';
            html += '<th>Observaciones</th>';
            html += '</tr></thead><tbody>';

            allEncargos.forEach(e => {
                let clienteCell = e.cliente_nombre || '-';
                if (e.cliente_telefono) clienteCell += '<br><small style="color:var(--text-light)">' + e.cliente_telefono + '</small>';

                html += '<tr>';
                html += '<td><strong style="color:var(--primary-blue)">' + (e.sucursal_nombre || '-') + '</strong></td>';
                html += '<td><strong>' + e.producto_nombre + '</strong></td>';
                html += '<td>' + clienteCell + '</td>';
                html += '<td>' + e.cantidad + '</td>';
                html += '<td>' + (e.employee_nombre || '-') + '</td>';
                html += '<td>' + formatDate(e.fecha_encargo) + '</td>';
                html += '<td>' + formatDate(e.fecha_necesaria) + '</td>';
                html += '<td>' + estadoBadge(e.estado) + '</td>';
                html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (e.observaciones || '') + '">' + (e.observaciones || '-') + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            document.getElementById('tableContainer').innerHTML = html;
        }
    </script>
</body>
</html>"""

# ==================== VENTAS_PERDIDAS.HTML ====================
ventas_perdidas_html = r"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ventas Perdidas - Sistema de Compras</title>
    <link rel="icon" type="image/png" href="/imagenes/favicon.png">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-blue: #0066CC;
            --primary-dark: #004C99;
            --primary-light: #3399FF;
            --accent-orange: #FF6B35;
            --bg-light: #F8FAFC;
            --bg-white: #FFFFFF;
            --text-dark: #1E293B;
            --text-gray: #64748B;
            --text-light: #94A3B8;
            --border-color: #E2E8F0;
            --success: #10B981;
            --warning: #F59E0B;
            --danger: #EF4444;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-light);
            color: var(--text-dark);
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        header {
            background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-dark) 100%);
            color: white;
            box-shadow: 0 4px 20px rgba(0, 102, 204, 0.3);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 30px;
        }
        .logo-section { display: flex; align-items: center; gap: 15px; }
        .logo-section img { height: 60px; }
        .logo-text { display: flex; flex-direction: column; }
        .logo-text h1 { font-size: 1.3em; font-weight: 700; letter-spacing: 1px; }
        .logo-text .subtitle { font-size: 0.75em; opacity: 0.8; }
        nav { display: flex; gap: 5px; flex-wrap: wrap; }
        nav a {
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        nav a:hover { background: rgba(255,255,255,0.15); }
        nav a.active { background: rgba(255,255,255,0.2); }
        nav a svg { width: 18px; height: 18px; }
        .container { max-width: 1400px; margin: 0 auto; padding: 30px; flex: 1; }
        .section {
            background: var(--bg-white);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            border: 1px solid var(--border-color);
        }
        .section-title {
            font-size: 1.2em;
            font-weight: 600;
            color: var(--primary-blue);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--border-color);
        }
        .section-title svg { width: 24px; height: 24px; }
        .filters {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            align-items: center;
        }
        .filters select, .filters input {
            padding: 8px 14px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.9em;
            background: white;
            color: var(--text-dark);
        }
        .filters select:focus, .filters input:focus {
            outline: none;
            border-color: var(--primary-blue);
            box-shadow: 0 0 0 3px rgba(0,102,204,0.1);
        }
        .filters label { font-size: 0.85em; color: var(--text-gray); font-weight: 500; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.78em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-stock { background: #FEF3C7; color: #92400E; }
        .badge-precio { background: #DBEAFE; color: #1E40AF; }
        .badge-preferencia { background: #E0E7FF; color: #3730A3; }
        .badge-otro { background: #F1F5F9; color: var(--text-gray); }
        .badge-new { background: #D1FAE5; color: #065F46; font-size: 0.7em; margin-left: 4px; }
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 0.88em;
        }
        th {
            background: #F1F5F9;
            color: var(--text-gray);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.78em;
            letter-spacing: 0.5px;
            padding: 12px 14px;
            text-align: left;
            border-bottom: 2px solid var(--border-color);
            position: sticky;
            top: 0;
        }
        td {
            padding: 10px 14px;
            border-bottom: 1px solid #F1F5F9;
            vertical-align: middle;
        }
        tr:hover td { background: #F8FAFC; }
        .loading { text-align: center; padding: 40px; color: var(--text-gray); }
        .loading .spinner {
            width: 40px; height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--primary-blue);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { text-align: center; padding: 50px; color: var(--text-light); }
        .stat-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }
        .stat-card .number { font-size: 1.8em; font-weight: 700; color: var(--primary-blue); }
        .stat-card .label { font-size: 0.8em; color: var(--text-gray); margin-top: 4px; }
        .stat-card.danger .number { color: var(--danger); }
        .stat-card.warning .number { color: var(--warning); }
        .btn {
            padding: 8px 18px;
            border: none;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.85em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary { background: var(--primary-blue); color: white; }
        .btn-primary:hover { background: var(--primary-dark); }
        footer {
            background: linear-gradient(135deg, var(--primary-blue), var(--primary-dark));
            color: white;
            padding: 15px 30px;
            text-align: center;
            font-size: 0.85em;
        }
        .footer-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .footer-main { display: flex; align-items: center; gap: 8px; }
        .footer-main img { height: 24px; }
        .footer-developer { opacity: 0.7; font-size: 0.85em; }
        .footer-quote { opacity: 0.5; font-style: italic; font-size: 0.8em; }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <div class="logo-section">
                <img src="/imagenes/logo%20La%20Mascotera%20(1).png" alt="La Mascotera">
                <div class="logo-text">
                    <h1>SISTEMA DE COMPRAS</h1>
                    <span class="subtitle">Optimizacion de Stock y Distribucion v2.0</span>
                </div>
            </div>
            <nav>
                <a href="/">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    Dashboard
                </a>
                <a href="/encargos">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    Encargos
                </a>
                <a href="/ventas-perdidas" class="active">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Ventas Perdidas
                </a>
                <a href="/config">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Configuracion
                </a>
            </nav>
        </div>
    </header>

    <div class="container">
        <div class="section">
            <div class="section-title">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Ventas Perdidas
                <span style="font-size:0.7em;color:var(--text-light);margin-left:auto;">Datos desde Mi Sucursal</span>
            </div>

            <div class="stat-cards" id="statsContainer">
                <div class="stat-card"><div class="number" id="stat-total">-</div><div class="label">Total Registros</div></div>
                <div class="stat-card danger"><div class="number" id="stat-stock">-</div><div class="label">Por Falta de Stock</div></div>
                <div class="stat-card warning"><div class="number" id="stat-precio">-</div><div class="label">Por Precio</div></div>
                <div class="stat-card"><div class="number" id="stat-sucursales">-</div><div class="label">Sucursales</div></div>
            </div>

            <div class="filters">
                <div>
                    <label>Sucursal</label><br>
                    <select id="filtroSucursal">
                        <option value="">Todas las sucursales</option>
                    </select>
                </div>
                <div>
                    <label>Desde</label><br>
                    <input type="date" id="filtroDesde">
                </div>
                <div>
                    <label>Hasta</label><br>
                    <input type="date" id="filtroHasta">
                </div>
                <div style="align-self: flex-end;">
                    <button class="btn btn-primary" id="btnFiltrar">Filtrar</button>
                </div>
            </div>

            <div id="tableContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Cargando ventas perdidas...</p>
                </div>
            </div>
        </div>
    </div>

    <footer>
        <div class="footer-content">
            <div class="footer-main">
                <img src="/imagenes/corazon%20azul.png" alt="">
                <span>LA MASCOTERA SAS</span>
            </div>
            <div class="footer-developer">Desarrollado por Lucas Salvatierra Software</div>
            <div class="footer-quote">"Ad astra per aspera"</div>
        </div>
    </footer>

    <script>
        let allVentas = [];

        document.addEventListener('DOMContentLoaded', async () => {
            // Default: last 30 days
            const today = new Date();
            const thirtyAgo = new Date(today);
            thirtyAgo.setDate(thirtyAgo.getDate() - 30);
            document.getElementById('filtroDesde').value = thirtyAgo.toISOString().split('T')[0];
            document.getElementById('filtroHasta').value = today.toISOString().split('T')[0];

            await loadSucursales();
            await loadVentas();

            document.getElementById('btnFiltrar').addEventListener('click', loadVentas);
        });

        async function loadSucursales() {
            try {
                const res = await fetch('/api/mi-sucursal/sucursales');
                const data = await res.json();
                const select = document.getElementById('filtroSucursal');
                data.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.nombre;
                    select.appendChild(opt);
                });
            } catch (e) {
                console.error('Error cargando sucursales:', e);
            }
        }

        async function loadVentas() {
            document.getElementById('tableContainer').innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando ventas perdidas...</p></div>';
            try {
                let url = '/api/mi-sucursal/ventas-perdidas?';
                const suc = document.getElementById('filtroSucursal').value;
                const desde = document.getElementById('filtroDesde').value;
                const hasta = document.getElementById('filtroHasta').value;
                if (suc) url += 'sucursal_id=' + suc + '&';
                if (desde) url += 'fecha_desde=' + desde + '&';
                if (hasta) url += 'fecha_hasta=' + hasta + 'T23:59:59&';
                const res = await fetch(url);
                allVentas = await res.json();
                updateStats();
                renderTable();
            } catch (e) {
                document.getElementById('tableContainer').innerHTML = '<div class="empty-state"><p>Error cargando ventas perdidas</p></div>';
            }
        }

        function updateStats() {
            document.getElementById('stat-total').textContent = allVentas.length;
            document.getElementById('stat-stock').textContent = allVentas.filter(v => v.motivo === 'stock').length;
            document.getElementById('stat-precio').textContent = allVentas.filter(v => v.motivo === 'precio').length;
            const sucs = new Set(allVentas.map(v => v.sucursal_id));
            document.getElementById('stat-sucursales').textContent = sucs.size;
        }

        function formatDate(dateStr) {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        function motivoBadge(motivo) {
            const cls = motivo === 'stock' ? 'badge-stock' : motivo === 'precio' ? 'badge-precio' : motivo === 'preferencia' ? 'badge-preferencia' : 'badge-otro';
            return '<span class="badge ' + cls + '">' + (motivo || 'stock') + '</span>';
        }

        function renderTable() {
            if (allVentas.length === 0) {
                document.getElementById('tableContainer').innerHTML = '<div class="empty-state"><p>No hay ventas perdidas en el periodo seleccionado</p></div>';
                return;
            }

            let html = '<table><thead><tr>';
            html += '<th>Fecha</th>';
            html += '<th>Sucursal</th>';
            html += '<th>Producto</th>';
            html += '<th>Marca</th>';
            html += '<th>Cant.</th>';
            html += '<th>Motivo</th>';
            html += '<th>Vendedor</th>';
            html += '<th>Observaciones</th>';
            html += '</tr></thead><tbody>';

            allVentas.forEach(v => {
                let productoCell = v.item_nombre;
                if (v.es_producto_nuevo) productoCell += ' <span class="badge badge-new">NUEVO</span>';

                html += '<tr>';
                html += '<td>' + formatDate(v.fecha_registro) + '</td>';
                html += '<td><strong style="color:var(--primary-blue)">' + (v.sucursal_nombre || '-') + '</strong></td>';
                html += '<td><strong>' + productoCell + '</strong></td>';
                html += '<td>' + (v.marca || '-') + '</td>';
                html += '<td>' + v.cantidad + '</td>';
                html += '<td>' + motivoBadge(v.motivo) + '</td>';
                html += '<td>' + (v.employee_nombre || '-') + '</td>';
                html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (v.observaciones || '') + '">' + (v.observaciones || '-') + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            document.getElementById('tableContainer').innerHTML = html;
        }
    </script>
</body>
</html>"""

sftp = ssh.open_sftp()

with sftp.file('/var/www/sistema-compras/app/templates/encargos.html', 'w') as f:
    f.write(encargos_html)
print('encargos.html uploaded')

with sftp.file('/var/www/sistema-compras/app/templates/ventas_perdidas.html', 'w') as f:
    f.write(ventas_perdidas_html)
print('ventas_perdidas.html uploaded')

sftp.close()
ssh.close()
print('Done!')
