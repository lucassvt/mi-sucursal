const PDFDocument = require('pdfkit');
const { Pool } = require('pg');

function generateAuditPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { sucursal_nombre, periodo, orden_limpieza, pedidos, gestion_administrativa,
            club_mascotera, control_stock_caja, puntaje_total, observaciones } = data;

    doc.fontSize(20).font('Helvetica-Bold').text('INFORME DE AUDITORIA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text('La Mascotera', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Sucursal: ', { continued: true });
    doc.font('Helvetica').text(sucursal_nombre || 'Sin nombre');
    doc.font('Helvetica-Bold').text('Periodo: ', { continued: true });
    doc.font('Helvetica').text(periodo || '-');
    doc.font('Helvetica-Bold').text('Fecha: ', { continued: true });
    doc.font('Helvetica').text(new Date().toLocaleDateString('es-AR'));
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333');
    doc.moveDown(1);

    doc.fontSize(16).font('Helvetica-Bold').text('Puntajes por Pilar', { align: 'center' });
    doc.moveDown(0.8);

    const pilares = [
      { nombre: 'Orden y Limpieza', valor: orden_limpieza },
      { nombre: 'Pedidos', valor: pedidos },
      { nombre: 'Gestion Administrativa', valor: gestion_administrativa },
      { nombre: 'Club La Mascotera', valor: club_mascotera },
      { nombre: 'Control Stock y Caja', valor: control_stock_caja },
    ];

    const tableX = 80;
    const valX = 400;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Categoria', tableX, doc.y);
    doc.text('Puntaje', valX, doc.y - 13, { width: 80, align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(tableX, doc.y).lineTo(480, doc.y).stroke('#ccc');
    doc.moveDown(0.3);

    pilares.forEach(p => {
      const y = doc.y;
      doc.fontSize(11).font('Helvetica').fillColor('#000').text(p.nombre, tableX, y);
      const val = p.valor !== null && p.valor !== undefined ? p.valor.toString() : '-';
      const color = p.valor === null || p.valor === undefined ? '#999' : p.valor >= 80 ? '#22c55e' : p.valor >= 60 ? '#eab308' : p.valor >= 40 ? '#f97316' : '#ef4444';
      doc.font('Helvetica-Bold').fillColor(color).text(val, valX, y, { width: 80, align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(0.5);
    });

    doc.moveDown(0.3);
    doc.moveTo(tableX, doc.y).lineTo(480, doc.y).stroke('#333');
    doc.moveDown(0.5);
    const totalY = doc.y;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('PUNTAJE TOTAL', tableX, totalY);
    const tc = puntaje_total === null || puntaje_total === undefined ? '#999' : puntaje_total >= 80 ? '#22c55e' : puntaje_total >= 60 ? '#eab308' : puntaje_total >= 40 ? '#f97316' : '#ef4444';
    doc.fontSize(16).fillColor(tc).text(puntaje_total !== null && puntaje_total !== undefined ? puntaje_total.toString() : '-', valX, totalY - 2, { width: 80, align: 'center' });
    doc.fillColor('#000');

    if (observaciones) {
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold').text('Observaciones:');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(observaciones, { width: 460 });
    }

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').fillColor('#666');
    doc.text('Leyenda: 80-100 Excelente | 60-79 Bueno | 40-59 Regular | 0-39 Bajo', { align: 'center' });
    doc.moveDown(1);
    doc.text('Generado automaticamente por Sistema de Auditoria - La Mascotera', { align: 'center' });

    doc.end();
  });
}

(async () => {
  try {
    const pdfBuffer = await generateAuditPdf({
      sucursal_nombre: 'ALEM', periodo: '2026-02',
      orden_limpieza: 75, pedidos: 100, gestion_administrativa: 75,
      club_mascotera: 40, control_stock_caja: 100, puntaje_total: 78
    });
    console.log('PDF generated:', pdfBuffer.length, 'bytes');

    // Save to database
    const pool = new Pool({
      host: '127.0.0.1',
      port: 5433,
      user: 'dux_user',
      password: 'Pm2480856!',
      database: 'mi_sucursal'
    });

    const filename = 'auditoria_ALEM_2026-02.pdf';

    // Delete existing
    await pool.query('DELETE FROM reportes_auditoria_pdf WHERE sucursal_id = $1 AND periodo = $2', [7, '2026-02']);

    // Insert
    await pool.query(`
      INSERT INTO reportes_auditoria_pdf
        (sucursal_id, periodo, filename, content_type, pdf_data, tamano_bytes, uploaded_by, origen, notas, created_at)
      VALUES ($1, $2, $3, 'application/pdf', $4, $5, 0, 'automatico', $6, CURRENT_TIMESTAMP)
    `, [7, '2026-02', filename, pdfBuffer, pdfBuffer.length, 'Generado automaticamente desde informe de auditoria']);

    console.log('Saved to reportes_auditoria_pdf:', filename);
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
