import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

async function populateAmphures() {
  console.log('Starting amphures population...\n');

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
    // Clear existing data
    await pool.query('DELETE FROM amphures_new');

    // Get the existing amphures data - no encoding conversion needed
    const existingData = await pool.query(`
      SELECT 
        id, 
        name_th,
        name_en, 
        province_id 
      FROM amphures 
      ORDER BY id
    `);

    console.log(`Found ${existingData.rows.length} existing amphures`);

    // Process and insert amphures
    for (const amphur of existingData.rows) {
      // For Bangkok (10), use เขต
      // For others, use อำเภอ
      const prefix = amphur.province_id === '10' ? 'เขต' : 'อำเภอ';
      
      // Clean the name by removing existing prefixes
      const nameTh = amphur.name_th
        .replace(/^อ\./, '')
        .replace(/^อำเภอ/, '')
        .replace(/^เขต/, '')
        .trim();

      // Add proper prefix
      const newNameTh = `${prefix}${nameTh}`;

      // Simple insert without encoding conversion
      await pool.query(`
        INSERT INTO amphures_new (
          id, 
          name_th, 
          name_en, 
          province_id
        ) VALUES ($1, $2, $3, $4)
      `, [
        amphur.id,
        newNameTh,
        amphur.name_en,
        amphur.province_id
      ]);
    }

    // Verify some results - no encoding conversion needed
    const verifyResult = await pool.query(`
      SELECT 
        a.id, 
        a.name_th,
        a.name_en, 
        p.name_th as province_name
      FROM amphures_new a
      JOIN provinces_new p ON a.province_id = p.id
      ORDER BY a.id
      LIMIT 10
    `);

    console.log('\nVerifying first 10 amphures:');
    verifyResult.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai: ${row.name_th}`);
      console.log(`English: ${row.name_en}`);
      console.log(`Province: ${row.province_name}`);
      console.log();
    });

    // Get counts by province
    const countResult = await pool.query(`
      SELECT 
        p.name_th as province_name,
        COUNT(*) as amphur_count
      FROM amphures_new a
      JOIN provinces_new p ON a.province_id = p.id
      GROUP BY p.id, p.name_th
      ORDER BY p.id
    `);

    console.log('\nAmphur counts by province:');
    countResult.rows.forEach(row => {
      console.log(`${row.province_name}: ${row.amphur_count} amphurs`);
    });

  } catch (error) {
    console.error('Error during amphures population:', error);
  } finally {
    await pool.end();
  }
}

populateAmphures().catch(console.error); 