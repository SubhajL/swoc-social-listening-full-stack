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

interface ReservoirRow {
  [key: string]: string | number | null;
}

// Column mapping for standardization
const columnMapping: { [key: string]: string } = {
  'ลำดับที่': 'sequence_number',
  'สำนักงานชลประทาน': 'irrigation_office',
  'อ่างเก็บน้ำ/เขื่อน': 'reservoir_name',
  'ลุ่มน้ำ': 'river_basin',
  'แม่น้ำ': 'river_name',
  'อำเภอ': 'amphure',
  'จังหวัด': 'province',
  'ความจุ รนก. \r\n(ล้าน ลบ.ม.)': 'normal_storage_capacity',
  'ปริมาณน้ำ รนก. ต่ำสุด\r\n (ล้าน ลบ.ม.)': 'minimum_storage_capacity',
  'หมายเหตุ': 'type'
};

function normalizeColumnName(name: string): string {
  return columnMapping[name] || name.toLowerCase().replace(/[\s\r\n()./]+/g, '_');
}

async function createReservoirTable() {
  const client = await pool.connect();
  
  try {
    // Read Excel file using absolute path
    const excelPath = path.join(__dirname, '../../../../reservoir.xlsx');
    console.log('Reading Excel file from:', excelPath);
    
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read data with header row
    const data = xlsx.utils.sheet_to_json(worksheet, { 
      raw: true,
      defval: null
    }) as ReservoirRow[];

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Skip the first row as it contains header descriptions
    data.shift();

    console.log('First data row:', data[0]);
    console.log('Total rows:', data.length);

    // Get column names from the first row and normalize them
    const firstRow = data[0] as Record<string, unknown>;
    const originalColumns = Object.keys(firstRow);
    const normalizedColumns = originalColumns.map(normalizeColumnName);

    console.log('Original columns:', originalColumns);
    console.log('Normalized columns:', normalizedColumns);

    // Create table SQL with normalized column names
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS reservoir (
        id SERIAL PRIMARY KEY,
        ${normalizedColumns.map(col => `"${col}" TEXT`).join(',\n        ')}
      );
    `;

    // Create the table
    await client.query('DROP TABLE IF EXISTS reservoir;');
    await client.query(createTableSQL);
    console.log('Table created successfully');

    // Insert data with normalized column names
    for (const row of data) {
      const normalizedRow: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        // Convert null or undefined to empty string for TEXT columns
        normalizedRow[normalizeColumnName(key)] = value?.toString() ?? '';
      });

      const columnNames = Object.keys(normalizedRow);
      const values = Object.values(normalizedRow);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const insertSQL = `
        INSERT INTO reservoir (${columnNames.map(name => `"${name}"`).join(', ')})
        VALUES (${placeholders});
      `;
      
      await client.query(insertSQL, values);
    }

    console.log(`Inserted ${data.length} rows successfully`);

    // Add indexes for commonly queried columns
    const indexColumns = ['reservoir_name', 'province', 'amphure', 'river_basin', 'type'];
    for (const column of indexColumns) {
      if (normalizedColumns.includes(column)) {
        const indexSQL = `CREATE INDEX IF NOT EXISTS idx_reservoir_${column} ON reservoir ("${column}");`;
        await client.query(indexSQL);
      }
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
createReservoirTable()
  .then(() => {
    console.log('Table creation and data import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 