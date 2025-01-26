import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

async function fixAmphuresEncoding() {
  console.log('Starting amphures encoding fix...\n');

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
    // First, let's check a few records before fixing
    console.log('Before fixing:');
    const beforeFix = await pool.query(`
      SELECT id, name_th, name_en
      FROM amphures
      WHERE id IN ('1001', '5001', '9001')
    `);

    beforeFix.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai: ${row.name_th}`);
      console.log(`English: ${row.name_en}`);
      console.log();
    });

    // Create a temporary table with correct encoding
    await pool.query(`
      CREATE TEMP TABLE amphures_temp (
        id VARCHAR(4) PRIMARY KEY,
        name_th VARCHAR(250),
        name_en VARCHAR(250),
        province_id VARCHAR(2)
      );
    `);

    // Copy data to temp table with encoding fix
    await pool.query(`
      INSERT INTO amphures_temp
      SELECT 
        id,
        convert_from(convert_to(name_th, 'UTF8'), 'UTF8') as name_th,
        name_en,
        province_id
      FROM amphures;
    `);

    // Verify the temp table data
    console.log('\nAfter fixing (in temp table):');
    const afterFix = await pool.query(`
      SELECT id, name_th, name_en
      FROM amphures_temp
      WHERE id IN ('1001', '5001', '9001')
    `);

    afterFix.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai: ${row.name_th}`);
      console.log(`English: ${row.name_en}`);
      console.log();
    });

    // If the fix looks good, update the original table
    await pool.query('TRUNCATE TABLE amphures');
    await pool.query(`
      INSERT INTO amphures
      SELECT * FROM amphures_temp;
    `);

    // Drop the temp table
    await pool.query('DROP TABLE amphures_temp');

    console.log('Amphures encoding has been fixed!');

  } catch (error) {
    console.error('Error during encoding fix:', error);
  } finally {
    await pool.end();
  }
}

fixAmphuresEncoding().catch(console.error); 