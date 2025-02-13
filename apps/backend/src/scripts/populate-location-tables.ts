import { config } from 'dotenv';
import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

// Database configuration
const dbConfig = {
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: process.env.DB_WRITE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

const pool = new Pool(dbConfig);

interface LocationRow {
  province_code: string;
  province_name_th: string;
  province_name_en: string;
  amphure_code: string;
  amphure_name_th: string;
  amphure_name_en: string;
}

async function readLocationData(): Promise<LocationRow[]> {
  const excelPath = path.join(process.cwd(), '../../amphure_coding.xlsx');
  logger.info('Reading amphure data from Excel file:', excelPath);
  
  try {
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(worksheet) as Array<{
      amphure_code: string;
      thai_amphure_name: string;
      english_amphure_name: string;
      thai_province_name: string;
    }>;
    
    logger.info(`Read ${rawData.length} rows from Excel file`);

    // Map the raw data to our LocationRow interface
    const locationData: LocationRow[] = rawData.map(row => {
      return {
        province_code: String(row.amphure_code).substring(0, 2),
        province_name_th: row.thai_province_name,
        province_name_en: row.thai_province_name === 'กรุงเทพมหานคร' ? 'Bangkok' : '', // We'll need to add other province English names
        amphure_code: row.amphure_code,
        amphure_name_th: row.thai_amphure_name,
        amphure_name_en: row.english_amphure_name
      };
    });

    // Log first few rows for verification
    logger.info('Sample processed data:', locationData.slice(0, 3));
    
    return locationData;
  } catch (error) {
    const err = error as Error;
    logger.error('Error reading Excel file:', {
      message: err.message,
      path: excelPath,
      stack: err.stack
    });
    throw err;
  }
}

async function populateLocationTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    logger.info('Started transaction');

    // Drop existing tables if they exist
    await client.query(`
      DROP TABLE IF EXISTS amphures CASCADE;
      DROP TABLE IF EXISTS provinces CASCADE;
    `);
    logger.info('Dropped existing tables');

    // Create provinces table first
    await client.query(`
      CREATE TABLE provinces (
        province_code TEXT PRIMARY KEY,
        province_name_th TEXT NOT NULL,
        province_name_en TEXT NOT NULL
      );
    `);
    logger.info('Created provinces table');

    // Then create amphures table
    await client.query(`
      CREATE TABLE amphures (
        amphure_code TEXT PRIMARY KEY,
        province_code TEXT REFERENCES provinces(province_code),
        amphure_name_th TEXT NOT NULL,
        amphure_name_en TEXT NOT NULL
      );
    `);
    logger.info('Created amphures table');

    // Finally create the index
    await client.query(`
      CREATE INDEX idx_amphures_province_code ON amphures(province_code);
    `);
    logger.info('Created index on amphures table');

    const locationData = await readLocationData();
    logger.info(`Read ${locationData.length} rows from Excel file`);

    // Insert provinces with English names
    const provinces = new Map();
    for (const row of locationData) {
      if (!provinces.has(row.province_code)) {
        provinces.set(row.province_code, row);
        await client.query(`
          INSERT INTO provinces (province_code, province_name_th, province_name_en)
          VALUES ($1, $2, $3)
          ON CONFLICT (province_code) DO UPDATE
          SET province_name_th = EXCLUDED.province_name_th,
              province_name_en = EXCLUDED.province_name_en;
        `, [row.province_code, row.province_name_th, row.province_name_en]);
        logger.info(`Inserted/updated province: ${row.province_code}`);
      }
    }

    // Insert amphures with English names
    for (const row of locationData) {
      await client.query(`
        INSERT INTO amphures (amphure_code, province_code, amphure_name_th, amphure_name_en)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (amphure_code) DO UPDATE
        SET province_code = EXCLUDED.province_code,
            amphure_name_th = EXCLUDED.amphure_name_th,
            amphure_name_en = EXCLUDED.amphure_name_en;
      `, [row.amphure_code, row.province_code, row.amphure_name_th, row.amphure_name_en]);
      logger.info(`Inserted/updated amphure: ${row.amphure_code}`);
    }

    await client.query('COMMIT');
    logger.info('Successfully committed all changes');

  } catch (error) {
    await client.query('ROLLBACK');
    const err = error as Error;
    console.error('Full error:', err);
    logger.error('Error populating location tables:', {
      message: err.message,
      stack: err.stack,
      error: JSON.stringify(err, null, 2)
    });
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the script
populateLocationTables()
  .then(() => {
    logger.info('Location tables population completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  }); 