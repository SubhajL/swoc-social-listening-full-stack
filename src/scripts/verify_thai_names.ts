import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

async function verifyThaiNames() {
  console.log('Starting Thai names verification...\n');

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
    // Check database character set
    const encodingResult = await pool.query(`
      SELECT current_setting('server_encoding') as server,
             current_setting('client_encoding') as client
    `);
    
    console.log('Database Encoding:');
    console.log('Server encoding:', encodingResult.rows[0].server);
    console.log('Client encoding:', encodingResult.rows[0].client);
    console.log();

    // Check a few provinces
    console.log('Checking Provinces:');
    const provinces = await pool.query(`
      SELECT id, name_th, name_en, 
             length(name_th) as th_length,
             length(convert_to(name_th, 'UTF8')) as bytes_length
      FROM provinces_new 
      WHERE id IN ('10', '50', '90')
    `);

    provinces.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai name: ${row.name_th}`);
      console.log(`English name: ${row.name_en}`);
      console.log(`Thai name length: ${row.th_length} characters`);
      console.log(`Thai name bytes: ${row.bytes_length} bytes`);
      console.log();
    });

    // Check a few amphures
    console.log('Checking Amphures:');
    const amphures = await pool.query(`
      SELECT a.id, a.name_th, a.name_en, 
             length(a.name_th) as th_length,
             length(convert_to(a.name_th, 'UTF8')) as bytes_length,
             p.name_th as province_name
      FROM amphures_new a
      JOIN provinces_new p ON a.province_id = p.id
      WHERE a.id IN ('1001', '5001', '9001')
    `);

    amphures.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai name: ${row.name_th}`);
      console.log(`English name: ${row.name_en}`);
      console.log(`Province: ${row.province_name}`);
      console.log(`Thai name length: ${row.th_length} characters`);
      console.log(`Thai name bytes: ${row.bytes_length} bytes`);
      console.log();
    });

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await pool.end();
  }
}

verifyThaiNames().catch(console.error); 