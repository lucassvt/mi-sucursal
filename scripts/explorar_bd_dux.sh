#!/bin/bash
# Script para explorar la estructura de la BD DUX
# Ejecutar en el servidor: bash explorar_bd_dux.sh

DB_NAME="dux_integrada"
DB_USER="dux_user"
OUTPUT_FILE="/tmp/estructura_bd_dux.txt"

echo "========================================" > $OUTPUT_FILE
echo "ESTRUCTURA BASE DE DATOS: $DB_NAME" >> $OUTPUT_FILE
echo "Fecha: $(date)" >> $OUTPUT_FILE
echo "========================================" >> $OUTPUT_FILE

echo "" >> $OUTPUT_FILE
echo "=== 1. LISTADO DE TABLAS ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\dt" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 2. ESTRUCTURA TABLA: employees ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d employees" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 3. DATOS EMPLOYEES (primeros 10) ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM employees LIMIT 10;" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 4. ESTRUCTURA TABLA: sucursales ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d sucursales" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 5. DATOS SUCURSALES ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM sucursales;" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 6. ESTRUCTURA TABLA: items (productos) ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d items" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 7. MUESTRA ITEMS (primeros 5) ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM items LIMIT 5;" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 8. ESTRUCTURA TABLA: depositos ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d depositos" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 9. DATOS DEPOSITOS ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM depositos;" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 10. OTRAS TABLAS RELEVANTES ===" >> $OUTPUT_FILE

# Stock
echo "" >> $OUTPUT_FILE
echo "--- stock_deposito ---" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d stock_deposito" >> $OUTPUT_FILE 2>&1

# Cajas
echo "" >> $OUTPUT_FILE
echo "--- cajas ---" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d cajas" >> $OUTPUT_FILE 2>&1

# Facturas
echo "" >> $OUTPUT_FILE
echo "--- facturas ---" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d facturas" >> $OUTPUT_FILE 2>&1

# Clientes
echo "" >> $OUTPUT_FILE
echo "--- clientes ---" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "\d clientes" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 11. CONTEO DE REGISTROS ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "
SELECT
    'employees' as tabla, COUNT(*) as registros FROM employees
UNION ALL
SELECT 'sucursales', COUNT(*) FROM sucursales
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'depositos', COUNT(*) FROM depositos
UNION ALL
SELECT 'stock_deposito', COUNT(*) FROM stock_deposito
UNION ALL
SELECT 'cajas', COUNT(*) FROM cajas
UNION ALL
SELECT 'facturas', COUNT(*) FROM facturas
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes;
" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== 12. RELACIÓN EMPLOYEES-SUCURSALES ===" >> $OUTPUT_FILE
psql -U $DB_USER -d $DB_NAME -c "
SELECT e.id, e.nombre, e.apellido, e.sucursal_id, s.nombre as sucursal_nombre
FROM employees e
LEFT JOIN sucursales s ON e.sucursal_id = s.id
LIMIT 20;
" >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "========================================" >> $OUTPUT_FILE
echo "FIN DEL REPORTE" >> $OUTPUT_FILE
echo "========================================" >> $OUTPUT_FILE

echo "Reporte generado en: $OUTPUT_FILE"
echo "Para ver el contenido: cat $OUTPUT_FILE"
