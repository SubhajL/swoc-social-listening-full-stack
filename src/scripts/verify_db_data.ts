import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

async function verifyDatabaseData() {
  console.log('Starting database data verification...\n');

  const pool = new Pool({
    user: process.env.DB_WRITE_USER,
    password: process.env.DB_WRITE_PASSWORD,
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_WRITE_PORT || '5432'),
    database: process.env.DB_WRITE_DATABASE,
    ssl: process.env.DB_WRITE_SSL === 'true' ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    // Check database settings
    const settings = await pool.query(`
      SELECT 
        current_setting('server_encoding') as server_encoding,
        current_setting('client_encoding') as client_encoding
    `);
    
    console.log('Database Settings:');
    console.log(settings.rows[0]);
    console.log();

    // Check provinces data
    console.log('Provinces Data:');
    const provinces = await pool.query(`
      SELECT id, name_th, name_en
      FROM provinces_new
      WHERE id IN ('10', '50', '90')
    `);

    provinces.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai: ${row.name_th}`);
      console.log(`English: ${row.name_en}`);
      console.log();
    });

    // Check amphures data
    console.log('Amphures Data:');
    const amphures = await pool.query(`
      SELECT 
        a.id, 
        a.name_th, 
        a.name_en,
        p.name_th as province_name
      FROM amphures_new a
      JOIN provinces_new p ON a.province_id = p.id
      WHERE a.id IN ('1001', '5001', '9001')
    `);

    amphures.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai: ${row.name_th}`);
      console.log(`English: ${row.name_en}`);
      console.log(`Province: ${row.province_name}`);
      console.log();
    });

    // Check original amphures data
    console.log('Original Amphures Data:');
    const originalAmphures = await pool.query(`
      SELECT 
        a.id, 
        a.name_th, 
        a.name_en,
        p.name_th as province_name
      FROM amphures a
      JOIN provinces p ON a.province_id = p.id
      WHERE a.id IN ('1001', '5001', '9001')
    `);

    originalAmphures.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai: ${row.name_th}`);
      console.log(`English: ${row.name_en}`);
      console.log(`Province: ${row.province_name}`);
      console.log();
    });

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await pool.end();
  }
}

verifyDatabaseData().catch(console.error); 