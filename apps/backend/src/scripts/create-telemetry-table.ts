import pg from 'pg';
const { Pool } = pg;
import xlsx from 'xlsx';
import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../.env') });

// Database configuration using write credentials
const pool = new Pool({
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
});

interface TelemetryRow {
  [key: string]: string | number | null;
}

// Column mapping for standardization
const columnMapping: { [key: string]: string } = {
  'ลำดับที่': 'sequence_number',
  'สำนักงานชลประทาน': 'irrigation_office',
  'สถานี': 'station_id',
  'ชื่อสถานี': 'station_name',
  'Code': 'code',
  'ลุ่มน้ำ': 'river_basin',
  'แม่น้ำ': 'river_name',
  'อำเภอ': 'amphure',
  'จังหวัด': 'province',
  'ระดับตลิ่ง\r\n(เมตร)': 'bank_level_meters',
  'ความจุฯ\r\nลบ.ม/วิ': 'capacity_cms',
  'ศูนย์เสาระดับ\r\nม.(ร.ท.ก.)': 'pole_center_msl'
};

function normalizeColumnName(name: string): string {
  return columnMapping[name] || name.toLowerCase().replace(/[\s\r\n()./]+/g, '_');
}

async function createTelemetryTable() {
  const client = await pool.connect();
  
  try {
    // Read Excel file using absolute path
    const excelPath = path.join(__dirname, '../../../../telemetry-station.xlsx');
    console.log('Reading Excel file from:', excelPath);
    
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read data with header row
    const data = xlsx.utils.sheet_to_json(worksheet, { 
      raw: true,
      defval: null,
      header: 1, // Use 1-based array of arrays
      blankrows: false
    }) as any[];

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Get headers from first row
    const headers = data[0] as string[];
    console.log('Headers:', headers);
    console.log('Total rows (including header):', data.length);

    // Remove header row and convert to objects
    const rows = data.slice(1).map((row: any[]) => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ?? null;
      });
      return obj;
    });

    console.log('First data row:', rows[0]);
    console.log('Last data row:', rows[rows.length - 1]);
    console.log('Total data rows:', rows.length);

    // Get column names and normalize them
    const normalizedColumns = headers.map(normalizeColumnName);
    console.log('Normalized columns:', normalizedColumns);

    // Create table SQL with normalized column names
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS telemetry_station (
        id SERIAL PRIMARY KEY,
        ${normalizedColumns.map(col => `"${col}" TEXT`).join(',\n        ')}
      );
    `;

    // Create the table
    await client.query('DROP TABLE IF EXISTS telemetry_station;');
    await client.query(createTableSQL);
    console.log('Table created successfully');

    // Insert data with normalized column names
    let insertedCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        const normalizedRow: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          // Convert null or undefined to empty string for TEXT columns
          normalizedRow[normalizeColumnName(key)] = value ?? '';
        });

        const columnNames = Object.keys(normalizedRow);
        const values = Object.values(normalizedRow);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        const insertSQL = `
          INSERT INTO telemetry_station (${columnNames.map(name => `"${name}"`).join(', ')})
          VALUES (${placeholders});
        `;
        
        await client.query(insertSQL, values);
        insertedCount++;

        if (insertedCount % 100 === 0) {
          console.log(`Inserted ${insertedCount} rows...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error inserting row ${insertedCount + errorCount}:`, error);
        console.error('Problematic row:', row);
      }
    }

    console.log(`Import completed:
      Total rows in Excel: ${rows.length}
      Successfully inserted: ${insertedCount}
      Failed to insert: ${errorCount}
    `);

    // Add indexes for commonly queried columns
    const indexColumns = ['station_id', 'province', 'amphure', 'river_basin'];
    for (const column of indexColumns) {
      const indexSQL = `CREATE INDEX IF NOT EXISTS idx_telemetry_station_${column} ON telemetry_station ("${column}");`;
      await client.query(indexSQL);
    }
    console.log('Created indexes for commonly queried columns');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
createTelemetryTable()
  .then(() => {
    console.log('Table creation and data import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 