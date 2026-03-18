"""Genera PDF de documentación del proyecto Mi Sucursal La Mascotera"""
from fpdf import FPDF


class DocPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "Mi Sucursal La Mascotera - Documentacion Tecnica", align="R")
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Pagina {self.page_no()}/{{nb}}", align="C")

    def titulo(self, txt):
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(0, 180, 180)
        self.cell(0, 12, txt)
        self.ln(14)

    def subtitulo(self, txt):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(40, 40, 40)
        self.cell(0, 10, txt)
        self.ln(8)
        self.set_draw_color(0, 180, 180)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def seccion(self, txt):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(60, 60, 60)
        self.cell(0, 8, txt)
        self.ln(6)

    def parrafo(self, txt):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.set_x(10)
        self.multi_cell(190, 5.5, txt)
        self.ln(3)

    def bullet(self, txt):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.set_x(10)
        self.multi_cell(190, 5.5, "  - " + txt)

    def bullet_bold(self, label, txt):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(50, 50, 50)
        self.set_x(10)
        self.multi_cell(190, 5.5, "  - " + label + txt)

    def tabla_simple(self, headers, rows, col_widths):
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(0, 180, 180)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
        self.ln()
        self.set_font("Helvetica", "", 9)
        self.set_text_color(50, 50, 50)
        fill = False
        for row in rows:
            if self.get_y() > 265:
                self.add_page()
            if fill:
                self.set_fill_color(240, 248, 248)
            else:
                self.set_fill_color(255, 255, 255)
            for i, val in enumerate(row):
                self.cell(col_widths[i], 6, str(val), border=1, fill=True)
            self.ln()
            fill = not fill
        self.ln(4)


pdf = DocPDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)

# ── Portada ──
pdf.add_page()
pdf.ln(50)
pdf.set_font("Helvetica", "B", 32)
pdf.set_text_color(0, 180, 180)
pdf.cell(0, 15, "Mi Sucursal", align="C")
pdf.ln(18)
pdf.set_font("Helvetica", "B", 24)
pdf.set_text_color(80, 80, 80)
pdf.cell(0, 12, "La Mascotera", align="C")
pdf.ln(20)
pdf.set_font("Helvetica", "", 14)
pdf.set_text_color(120, 120, 120)
pdf.cell(0, 10, "Documentacion Tecnica del Proyecto", align="C")
pdf.ln(10)
pdf.cell(0, 10, "Marzo 2026", align="C")
pdf.ln(30)
pdf.set_draw_color(0, 180, 180)
pdf.set_line_width(1)
pdf.line(60, pdf.get_y(), 150, pdf.get_y())
pdf.ln(10)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 8, "Stack: Next.js 14 + FastAPI + PostgreSQL + Docker", align="C")
pdf.ln(8)
pdf.cell(0, 8, "18 sucursales | 47 empleados | 21 endpoints API", align="C")

# ── 1. Resumen del Proyecto ──
pdf.add_page()
pdf.titulo("1. Resumen del Proyecto")
pdf.parrafo(
    "Mi Sucursal es una aplicacion web full-stack desarrollada para gestionar las operaciones "
    "diarias de las 18 sucursales de La Mascotera, una cadena de pet shops. El sistema integra "
    "datos del ERP corporativo DUX (solo lectura) con una base de datos propia (lectura/escritura) "
    "para funcionalidades especificas de cada sucursal."
)
pdf.parrafo(
    "La aplicacion permite a vendedores, encargados y gerencia monitorear ventas, gestionar "
    "encargos de productos, realizar seguimiento de clientes, controlar stock, y administrar "
    "servicios de veterinaria y peluqueria canina."
)

# ── 2. Arquitectura ──
pdf.add_page()
pdf.titulo("2. Arquitectura y Tecnologias")

pdf.subtitulo("2.1 Frontend")
pdf.bullet_bold("Framework: ", "Next.js 14.1.0 (React 18.2) con TypeScript 5.3")
pdf.bullet_bold("Estilos: ", "Tailwind CSS 3.4 con tema oscuro personalizado")
pdf.bullet_bold("Estado: ", "Zustand 4.5 para autenticacion y estado global")
pdf.bullet_bold("Animaciones: ", "Framer Motion 11.0")
pdf.bullet_bold("Iconos: ", "Lucide React 0.312")
pdf.bullet_bold("Build: ", "Next.js standalone output, optimizado para Docker")
pdf.ln(4)

pdf.subtitulo("2.2 Backend")
pdf.bullet_bold("Framework: ", "FastAPI 0.109 (Python 3.11)")
pdf.bullet_bold("ORM: ", "SQLAlchemy 2.0.25")
pdf.bullet_bold("Validacion: ", "Pydantic 2.5.3")
pdf.bullet_bold("Autenticacion: ", "JWT (python-jose) + bcrypt (passlib)")
pdf.bullet_bold("HTTP Client: ", "HTTPX 0.26 para integraciones externas (Astra)")
pdf.bullet_bold("Base de datos: ", "PostgreSQL via psycopg2-binary 2.9.9")
pdf.ln(4)

pdf.subtitulo("2.3 Infraestructura")
pdf.bullet_bold("Servidor: ", "VPS Linux en 66.97.35.249 (SSH puerto 5695)")
pdf.bullet_bold("Contenedores: ", "Docker Compose con 2 servicios")
pdf.bullet_bold("Backend: ", "Puerto 8005, imagen python:3.11-slim")
pdf.bullet_bold("Frontend: ", "Puerto 3005 -> 3000, imagen node:18-alpine (multi-stage)")
pdf.bullet_bold("Reverse Proxy: ", "Nginx con ruta /misucursal-api")
pdf.ln(4)

pdf.subtitulo("2.4 Bases de Datos")
pdf.tabla_simple(
    ["Base de Datos", "Esquema", "Acceso", "Uso"],
    [
        ["dux_integrada", "DUX", "Solo lectura", "ERP corporativo: facturas, empleados, stock"],
        ["mi_sucursal", "Anexa", "Lectura/Escritura", "Operaciones propias: encargos, clientes, etc"],
    ],
    [40, 30, 40, 80],
)

# ── 3. Modulos y Funcionalidades ──
pdf.add_page()
pdf.titulo("3. Modulos y Funcionalidades")

pdf.subtitulo("3.1 Dashboard de Ventas")
pdf.parrafo(
    "Panel principal que muestra ventas mensuales por sucursal, desglosadas en productos, "
    "peluqueria y veterinaria. Incluye proyeccion mensual, objetivos y ventas de ayer."
)
pdf.bullet("Venta total de la sucursal con proyeccion mensual")
pdf.bullet("Turnos de peluqueria canina (codigo 01311, excluyendo corte de unas 01310)")
pdf.bullet("Consultas veterinarias y vacunaciones (quintuple, sextuple, antirrabica, triple felina)")
pdf.bullet("Notas de credito restadas automaticamente de turnos y montos")
pdf.bullet("Vista comparativa de todas las sucursales (solo encargados)")
pdf.ln(4)

pdf.subtitulo("3.2 Encargos de Productos")
pdf.parrafo(
    "Sistema completo de gestion de encargos con seleccion de proveedor y validacion "
    "inteligente de fechas de entrega basada en el calendario de cada proveedor."
)
pdf.seccion("Estados del encargo:")
pdf.bullet("Pendiente -> Pedido al proveedor -> Sin stock -> En deposito central/Alem -> En sucursal destino -> Vendido / Cancelado")
pdf.seccion("Proveedores con calendario de entrega:")
pdf.tabla_simple(
    ["Proveedor", "Destinos principales", "Ejemplo de regla"],
    [
        ["La Cabana Central", "Alem/Congreso/Laprida, YB, Ruta9", "L/Mi/Vi (pedir 1 dia antes)"],
        ["Josmayo", "General, Belgrano Sur, Concepcion", "Dia siguiente (cualquier dia)"],
        ["Frual", "General (todas)", "Ma (pedir Lu 10hs) / Vi (pedir Ju 10hs)"],
        ["La Cabana (Salta)", "General (todas)", "Lu/Ma (pedir hasta Vi 16hs)"],
        ["Dimacol", "Ruta 9", "Vi (pedir hasta Mi)"],
        ["Alcivet", "Alem", "Mismo dia (manana) / dia sig. (tarde)"],
        ["Baza", "Alem", "Dia siguiente (pedir Lu o Ju)"],
    ],
    [35, 55, 100],
)
pdf.bullet("Validacion automatica: bloquea si la fecha necesaria es anterior a la entrega mas temprana")
pdf.bullet("Los encargos vendidos desaparecen automaticamente despues de 2 dias")
pdf.bullet("Busqueda de productos contra el catalogo DUX con opcion manual")
pdf.bullet("Busqueda y creacion de clientes integrada")
pdf.ln(4)

pdf.subtitulo("3.3 Recontacto de Clientes")
pdf.parrafo(
    "Sistema de seguimiento de clientes importados desde CSV, clasificados por tipo de "
    "servicio (General, Veterinaria, Peluqueria) con tabs por servicio."
)
pdf.bullet("Importacion masiva desde CSV con verificacion de duplicados")
pdf.bullet("Estados: Pendiente, Contactado, Recuperado, Recordatorio")
pdf.bullet("Multi-sucursal: Contact Center y Tesoreria Central ven Belgrano + Parque")
pdf.bullet("Registro de contacto con observaciones y recordatorios")
pdf.ln(4)

pdf.subtitulo("3.4 Ventas Perdidas")
pdf.parrafo("Registro de ventas no concretadas para analisis y mejora de stock.")
pdf.bullet("Captura de producto buscado, motivo y cliente")
pdf.bullet("Filtros por estado y sucursal")
pdf.ln(4)

pdf.subtitulo("3.5 Cierre de Cajas")
pdf.parrafo("Gestion del proceso diario de cierre de caja por sucursal.")
pdf.bullet("Registro de montos por medio de pago")
pdf.bullet("Pendientes destacados para encargados")
pdf.ln(4)

pdf.subtitulo("3.6 Control de Stock")
pdf.parrafo("Tareas de conteo fisico de inventario con fotos de respaldo.")
pdf.bullet("Creacion de tareas de conteo por sucursal")
pdf.bullet("Registro de productos contados vs sistema")
pdf.bullet("Adjuntar fotos como evidencia")
pdf.ln(4)

pdf.subtitulo("3.7 Vencimientos")
pdf.parrafo("Seguimiento de productos proximos a vencer en cada sucursal.")
pdf.bullet("Alertas por proximidad de vencimiento")
pdf.bullet("Registro y baja de productos vencidos")
pdf.ln(4)

pdf.add_page()
pdf.subtitulo("3.8 Integracion Astra")
pdf.parrafo(
    "Panel lateral que muestra pedidos del sistema Astra con estado de pago y entrega."
)
pdf.bullet("Resumen de pedidos pendientes, pagados y entregados")
pdf.bullet("Comprobante de pago de MercadoPago (endpoint proxy)")
pdf.bullet("Marcar pedidos como entregados")
pdf.ln(4)

pdf.subtitulo("3.9 Auditoria")
pdf.parrafo("Sistema de evaluacion mensual de sucursales con generacion de reportes PDF.")
pdf.bullet("Evaluaciones por pilar con puntaje")
pdf.bullet("Descargos por sucursal")
pdf.bullet("Reportes PDF mensuales")
pdf.ln(4)

pdf.subtitulo("3.10 Tareas Semanales")
pdf.parrafo("Asignacion y seguimiento de tareas operativas por sucursal.")
pdf.bullet("Resumen semanal con fotos")
pdf.bullet("Estados de avance por tarea")
pdf.ln(4)

pdf.subtitulo("3.11 Peluqueria y Veterinaria")
pdf.parrafo("Modulos especificos para servicios de peluqueria canina y veterinaria.")
pdf.bullet("Tracking de turnos realizados vs objetivo")
pdf.bullet("Clasificacion por codigo de item (01311 peluqueria, 01305 consulta vet, etc.)")
pdf.bullet("Separacion de senas (900301) del conteo de turnos reales")

# ── 4. Sistema de Permisos ──
pdf.add_page()
pdf.titulo("4. Sistema de Permisos y Roles")

pdf.subtitulo("4.1 Roles")
pdf.tabla_simple(
    ["Rol", "Alcance", "Ejemplos de acceso"],
    [
        ["Admin/Gerencia", "Global", "Ver todas las sucursales, eliminar encargos, gestionar"],
        ["Encargado Superior", "Global", "Dashboard comparativo, filtrar por sucursal"],
        ["Encargado de Local", "Su sucursal", "Ver datos de su sucursal, aprobar tareas"],
        ["Vendedor/Auxiliar", "Su sucursal", "Crear encargos, registrar contactos, ver dashboard"],
        ["Administrativo", "Su sucursal", "Recontactos y tareas de su sucursal"],
    ],
    [35, 25, 130],
)

pdf.subtitulo("4.2 Logica de permisos")
pdf.parrafo(
    "La verificacion de roles usa una funcion esAdminSuperior que excluye roles como "
    "'encargado de local', 'encargado de ventas', 'encargado de sucursal' y 'administrativo' "
    "para evitar falsos positivos (ej: 'administrativo' no debe matchear 'admin')."
)
pdf.bullet("Backend: es_encargado() y es_admin_o_superior() en security.py")
pdf.bullet("Frontend: esAdminSuperior con lista de exclusion en cada pagina")
pdf.bullet("Multi-sucursal: Contact Center (15) y Tesoreria Central (25) ven Belgrano + Parque")

# ── 5. Sucursales ──
pdf.add_page()
pdf.titulo("5. Mapeo de Sucursales")

pdf.tabla_simple(
    ["ID", "Sucursal", "Pto Vta", "Veterinaria", "Peluqueria"],
    [
        ["7", "ALEM", "3, 14", "Si", "Si"],
        ["8", "ARENALES", "30", "No", "Si"],
        ["9", "BANDA", "4", "No", "Si"],
        ["10", "BELGRANO", "20", "No", "Si"],
        ["11", "BELGRANO SUR", "21", "No", "Si"],
        ["12", "CATAMARCA", "25", "No", "Si"],
        ["13", "CONCEPCION", "5", "No", "Si"],
        ["14", "CONGRESO", "2", "Si", "Si"],
        ["15", "CONTACT CENTER", "29", "No", "No"],
        ["16", "LAPRIDA", "28", "Si", "Si"],
        ["17", "LEGUIZAMON", "32", "No", "No"],
        ["18", "MUNECAS", "27", "No", "Si"],
        ["20", "NEUQUEN OLASCOAGA", "23", "No", "Si"],
        ["21", "PARQUE", "6", "No", "Si"],
        ["22", "PINAR I", "44", "No", "Si"],
        ["26", "YERBA BUENA", "26", "Si", "Si"],
    ],
    [15, 50, 25, 30, 30],
)

# ── 6. API Endpoints ──
pdf.add_page()
pdf.titulo("6. Endpoints de la API")

pdf.subtitulo("6.1 Autenticacion")
pdf.bullet("POST /api/auth/login - Login con usuario y contrasena, retorna JWT")
pdf.ln(3)

pdf.subtitulo("6.2 Dashboard")
pdf.bullet("GET /api/dashboard/ventas - Ventas mensuales de la sucursal")
pdf.bullet("GET /api/dashboard/objetivos - Objetivos del periodo")
pdf.bullet("GET /api/dashboard/ventas-por-tipo - Ventas por tipo (productos/vet/pelu)")
pdf.bullet("GET /api/dashboard/ventas-por-tipo/todas - Comparativa de todas las sucursales")
pdf.ln(3)

pdf.subtitulo("6.3 Encargos")
pdf.bullet("POST /api/encargos/ - Crear encargo con proveedor")
pdf.bullet("GET /api/encargos/ - Listar encargos (filtros: estado, sucursal)")
pdf.bullet("PUT /api/encargos/{id} - Actualizar estado")
pdf.bullet("DELETE /api/encargos/{id} - Eliminar (solo admin)")
pdf.ln(3)

pdf.subtitulo("6.4 Recontactos")
pdf.bullet("GET /api/recontactos/ - Listar clientes a recontactar")
pdf.bullet("GET /api/recontactos/resumen - Estadisticas por estado")
pdf.bullet("GET /api/recontactos/sucursales-disponibles - Sucursales del usuario")
pdf.bullet("POST /api/recontactos/registrar-contacto - Registrar contacto realizado")
pdf.ln(3)

pdf.subtitulo("6.5 Astra")
pdf.bullet("GET /api/astra/pedidos/resumen - Resumen de pedidos")
pdf.bullet("PUT /api/astra/pedidos/{id}/entregar - Marcar como entregado")
pdf.bullet("GET /api/astra/pedidos/{id}/comprobante-pago - Comprobante de MercadoPago")
pdf.ln(3)

pdf.subtitulo("6.6 Otros")
pdf.bullet("GET /api/items/search - Buscar productos en catalogo DUX")
pdf.bullet("GET /api/clientes/ - Buscar clientes")
pdf.bullet("POST /api/clientes/ - Crear cliente")
pdf.bullet("GET/POST /api/ventas-perdidas/ - Ventas perdidas")
pdf.bullet("GET/POST /api/cierres-caja/ - Cierres de caja")
pdf.bullet("GET/POST /api/conteo-stock/ - Control de stock")
pdf.bullet("GET/POST /api/vencimientos/ - Vencimientos")
pdf.bullet("GET/POST /api/tareas/ - Tareas semanales")
pdf.bullet("GET/POST /api/auditoria/ - Auditorias")

# ── 7. Clasificacion de Items ──
pdf.add_page()
pdf.titulo("7. Clasificacion de Items de Venta")

pdf.subtitulo("7.1 Peluqueria")
pdf.tabla_simple(
    ["Codigo", "Descripcion", "Cuenta como turno"],
    [
        ["01311", "Peluqueria canina", "Si"],
        ["900301", "Sena peluqueria canina", "No (solo monto)"],
        ["01310", "Corte de unas", "No (excluido)"],
    ],
    [30, 80, 50],
)

pdf.subtitulo("7.2 Veterinaria")
pdf.tabla_simple(
    ["Codigo", "Descripcion", "Categoria"],
    [
        ["01305", "Consulta veterinaria", "Consulta (con objetivo)"],
        ["01328", "Vacuna quintuple", "Vacuna"],
        ["900233", "Vacuna sextuple", "Vacuna"],
        ["01307", "Vacunacion antirrabica", "Vacuna"],
        ["01329", "Triple felina", "Vacuna"],
        ["01306", "Medicacion veterinaria", "Otros servicios"],
        ["01308", "Desparasitacion", "Otros servicios"],
        ["01321", "Cirugia", "Otros servicios"],
    ],
    [30, 80, 50],
)

pdf.subtitulo("7.3 Notas de Credito")
pdf.parrafo(
    "Las notas de credito (tipo_comp = 'NOTA_CREDITO') se restan tanto del conteo de turnos "
    "como del monto total. El dashboard principal resta NC del total de ventas, y la query de "
    "servicios multiplica por -1 cuando el comprobante es nota de credito."
)

# ── 8. Deploy ──
pdf.add_page()
pdf.titulo("8. Deploy y Operaciones")

pdf.subtitulo("8.1 Proceso de deploy")
pdf.bullet("1. Modificar archivos localmente (Windows)")
pdf.bullet("2. SCP archivos al servidor: scp -P 5695 archivo root@66.97.35.249:/var/www/mi-sucursal/...")
pdf.bullet("3. Rebuild containers: docker compose up -d --build")
pdf.bullet("4. Frontend requiere rebuild completo (multi-stage Dockerfile)")
pdf.bullet("5. Backend solo requiere COPY y restart")
pdf.ln(4)

pdf.subtitulo("8.2 Migraciones de BD")
pdf.parrafo(
    "No se usa Alembic. Las tablas nuevas se crean automaticamente con BaseAnexa.metadata.create_all() "
    "al iniciar el backend. Para columnas nuevas en tablas existentes se usa ALTER TABLE manual."
)
pdf.bullet("Ejemplo: ALTER TABLE encargos ADD COLUMN IF NOT EXISTS proveedor_nombre VARCHAR(100);")
pdf.ln(4)

pdf.subtitulo("8.3 Sincronizacion de datos")
pdf.parrafo(
    "Los datos de ventas/facturas provienen de DUX (dux_integrada) que se sincroniza "
    "periodicamente. Se detectaron dias faltantes en la sincronizacion (ej: Banda sin datos "
    "del 4, 6 y 8 de marzo). La API de DUX puede llamarse para resincronizar dias especificos."
)

# Guardar
output = "c:/Users/Usuario/Desktop/Programacion/mi-sucursalLaMascotera/documentacion_mi_sucursal.pdf"
pdf.output(output)
print(f"PDF generado: {output}")
