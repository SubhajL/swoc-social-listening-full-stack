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

interface RainStationRow {
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
  'จังหวัด': 'province'
};

function normalizeColumnName(name: string): string {
  return columnMapping[name] || name.toLowerCase().replace(/[\s\r\n()./]+/g, '_');
}

async function createRainStationTable() {
  const client = await pool.connect();
  
  try {
    // Read Excel file using absolute path
    const excelPath = path.join(__dirname, '../../../../rain-station.xlsx');
    console.log('Reading Excel file from:', excelPath);
    
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read data with header row
    const data = xlsx.utils.sheet_to_json(worksheet, { 
      raw: true,
      defval: null
    }) as RainStationRow[];

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
      CREATE TABLE IF NOT EXISTS rain_station (
        id SERIAL PRIMARY KEY,
        ${normalizedColumns.map(col => `"${col}" TEXT`).join(',\n        ')}
      );
    `;

    // Create the table
    await client.query('DROP TABLE IF EXISTS rain_station;');
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
        INSERT INTO rain_station (${columnNames.map(name => `"${name}"`).join(', ')})
        VALUES (${placeholders});
      `;
      
      await client.query(insertSQL, values);
    }

    console.log(`Inserted ${data.length} rows successfully`);

    // Add indexes for commonly queried columns
    const indexColumns = ['station_id', 'province', 'amphure', 'river_basin'];
    for (const column of indexColumns) {
      if (normalizedColumns.includes(column)) {
        const indexSQL = `CREATE INDEX IF NOT EXISTS idx_rain_station_${column} ON rain_station ("${column}");`;
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
createRainStationTable()
  .then(() => {
    console.log('Table creation and data import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 