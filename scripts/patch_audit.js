const fs = require('fs');

// Read the file
let content = fs.readFileSync('/root/auditoraLaMascotera/server/index.js', 'utf8');

// 1. Add pdfkit import after the existing requires
const oldImports = "const { createTunnel, LOCAL_PORT } = require('./ssh-tunnel');";
const newImports = oldImports + "\nconst PDFDocument = require('pdfkit');";
content = content.replace(oldImports, newImports);

// 2. Replace the POST /api/informes endpoint to also generate PDF
const oldEndpoint = `// POST /api/informes - guardar informe de auditoría en la base de datos
app.post('/api/informes', async (req, res) => {
  const {
    sucursal_id, periodo, orden_limpieza, pedidos,
    gestion_administrativa, club_mascotera, control_stock_caja,
    puntaje_total, observaciones, data_json
  } = req.body;

  if (!sucursal_id || !periodo) {
    return res.status(400).json({ error: 'sucursal_id y periodo son requeridos' });
  }

  try {
    const result = await poolMiSucursal.query(\`
      INSERT INTO auditoria_mensual
        (sucursal_id, periodo, orden_limpieza, pedidos, gestion_administrativa,
         club_mascotera, control_stock_caja, puntaje_total, observaciones,
         data_json, estado, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'generado', CURRENT_TIMESTAMP)
      RETURNING *
    \`, [
      sucursal_id, periodo,
      orden_limpieza || null, pedidos || null, gestion_administrativa || null,
      club_mascotera || null, control_stock_caja || null,
      puntaje_total || null, observaciones || null,
      data_json ? JSON.stringify(data_json) : null
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error guardando informe:', err.message);
    res.status(500).json({ error: 'Error al guardar informe' });
  }
});`;

const newEndpoint = `// Función para generar PDF de informe de auditoría
function generateAuditPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { sucursal_nombre, periodo, orden_limpieza, pedidos, gestion_administrativa,
            club_mascotera, control_stock_caja, puntaje_total, observaciones } = data;

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('INFORME DE AUDITORIA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text('La Mascotera', { align: 'center' });
    doc.moveDown(1);

    // Info
    doc.fontSize(12).font('Helvetica-Bold').text('Sucursal: ', { continued: true });
    doc.font('Helvetica').text(sucursal_nombre || 'Sin nombre');
    doc.font('Helvetica-Bold').text('Periodo: ', { continued: true });
    doc.font('Helvetica').text(periodo || '-');
    doc.font('Helvetica-Bold').text('Fecha: ', { continued: true });
    doc.font('Helvetica').text(new Date().toLocaleDateString('es-AR'));
    doc.moveDown(1);

    // Separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333');
    doc.moveDown(1);

    // Puntajes
    doc.fontSize(16).font('Helvetica-Bold').text('Puntajes por Pilar', { align: 'center' });
    doc.moveDown(0.8);

    const pilares = [
      { nombre: 'Orden y Limpieza', valor: orden_limpieza },
      { nombre: 'Pedidos', valor: pedidos },
      { nombre: 'Gestion Administrativa', valor: gestion_administrativa },
      { nombre: 'Club La Mascotera', valor: club_mascotera },
      { nombre: 'Control Stock y Caja', valor: control_stock_caja },
    ];

    // Table header
    const tableX = 80;
    const valX = 400;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Categoria', tableX, doc.y);
    doc.text('Puntaje', valX, doc.y - 13, { width: 80, align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(tableX, doc.y).lineTo(480, doc.y).stroke('#ccc');
    doc.moveDown(0.3);

    // Table rows
    pilares.forEach(p => {
      const y = doc.y;
      doc.fontSize(11).font('Helvetica').fillColor('#000').text(p.nombre, tableX, y);
      const val = p.valor != null ? p.valor.toString() : '-';
      const color = p.valor == null ? '#999' : p.valor >= 80 ? '#22c55e' : p.valor >= 60 ? '#eab308' : p.valor >= 40 ? '#f97316' : '#ef4444';
      doc.font('Helvetica-Bold').fillColor(color).text(val, valX, y, { width: 80, align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(0.5);
    });

    // Total
    doc.moveDown(0.3);
    doc.moveTo(tableX, doc.y).lineTo(480, doc.y).stroke('#333');
    doc.moveDown(0.5);
    const totalY = doc.y;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('PUNTAJE TOTAL', tableX, totalY);
    const totalColor = puntaje_total == null ? '#999' : puntaje_total >= 80 ? '#22c55e' : puntaje_total >= 60 ? '#eab308' : puntaje_total >= 40 ? '#f97316' : '#ef4444';
    doc.fontSize(16).fillColor(totalColor).text(puntaje_total != null ? puntaje_total.toString() : '-', valX, totalY - 2, { width: 80, align: 'center' });
    doc.fillColor('#000');

    // Observaciones
    if (observaciones) {
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold').text('Observaciones:');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(observaciones, { width: 460 });
    }

    // Leyenda
    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').fillColor('#666');
    doc.text('Leyenda: 80-100 Excelente | 60-79 Bueno | 40-59 Regular | 0-39 Bajo', { align: 'center' });

    // Footer
    doc.moveDown(1);
    doc.text('Generado automaticamente por Sistema de Auditoria - La Mascotera', { align: 'center' });

    doc.end();
  });
}

// POST /api/informes - guardar informe de auditoría en la base de datos
app.post('/api/informes', async (req, res) => {
  const {
    sucursal_id, periodo, orden_limpieza, pedidos,
    gestion_administrativa, club_mascotera, control_stock_caja,
    puntaje_total, observaciones, data_json
  } = req.body;

  if (!sucursal_id || !periodo) {
    return res.status(400).json({ error: 'sucursal_id y periodo son requeridos' });
  }

  try {
    const result = await poolMiSucursal.query(\`
      INSERT INTO auditoria_mensual
        (sucursal_id, periodo, orden_limpieza, pedidos, gestion_administrativa,
         club_mascotera, control_stock_caja, puntaje_total, observaciones,
         data_json, estado, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'generado', CURRENT_TIMESTAMP)
      RETURNING *
    \`, [
      sucursal_id, periodo,
      orden_limpieza || null, pedidos || null, gestion_administrativa || null,
      club_mascotera || null, control_stock_caja || null,
      puntaje_total || null, observaciones || null,
      data_json ? JSON.stringify(data_json) : null
    ]);

    // Generar PDF y guardarlo en reportes_auditoria_pdf
    try {
      let sucursal_nombre = 'Sucursal ' + sucursal_id;
      if (poolDuxIntegrada) {
        const sucResult = await poolDuxIntegrada.query(
          'SELECT nombre FROM sucursales WHERE id = $1', [sucursal_id]
        );
        if (sucResult.rows.length > 0) {
          sucursal_nombre = sucResult.rows[0].nombre.replace(/^SUCURSAL\\s+/i, '');
        }
      }

      const pdfBuffer = await generateAuditPdf({
        sucursal_nombre, periodo, orden_limpieza, pedidos,
        gestion_administrativa, club_mascotera, control_stock_caja,
        puntaje_total, observaciones
      });

      const filename = \`auditoria_\${sucursal_nombre.replace(/\\s+/g, '_')}_\${periodo}.pdf\`;

      // Borrar PDF anterior del mismo periodo/sucursal si existe
      await poolMiSucursal.query(
        'DELETE FROM reportes_auditoria_pdf WHERE sucursal_id = $1 AND periodo = $2',
        [sucursal_id, periodo]
      );

      await poolMiSucursal.query(\`
        INSERT INTO reportes_auditoria_pdf
          (sucursal_id, periodo, filename, content_type, pdf_data, tamano_bytes, uploaded_by, origen, notas, created_at)
        VALUES ($1, $2, $3, 'application/pdf', $4, $5, 0, 'automatico', $6, CURRENT_TIMESTAMP)
      \`, [
        sucursal_id, periodo, filename, pdfBuffer, pdfBuffer.length,
        'Generado automaticamente desde informe de auditoria'
      ]);

      console.log('PDF generado y guardado:', filename, '(' + pdfBuffer.length + ' bytes)');
    } catch (pdfErr) {
      console.error('Error generando PDF (informe guardado ok):', pdfErr.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error guardando informe:', err.message);
    res.status(500).json({ error: 'Error al guardar informe' });
  }
});`;

content = content.replace(oldEndpoint, newEndpoint);

fs.writeFileSync('/root/auditoraLaMascotera/server/index.js', content, 'utf8');
console.log('Patched successfully');
