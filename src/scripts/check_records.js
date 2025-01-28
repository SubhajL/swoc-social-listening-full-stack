const { config } = require('dotenv');
const pg = require('pg');
const path = require('path');
const iconv = require('iconv-lite');

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

// Configure Node.js and PostgreSQL for UTF-8
process.env.PGCLIENTENCODING = 'UTF8';
process.stdout.setEncoding('utf8');

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  const client = await pool.connect();
  try {
    // Set connection encoding
    await client.query(`
      SET client_encoding TO 'UTF8';
      SET NAMES 'UTF8';
    `);
    
    // Get three random tumbons with coordinates
    const result = await client.query(`
      SELECT 
        t.id,
        t.name_th,
        t.name_en,
        t.latitude,
        t.longitude,
        a.name_th as amphur_name,
        p.name_th as province_name
      FROM tumbons t
      JOIN amphures_new a ON t.amphure_id = a.id
      JOIN provinces_new p ON a.province_id = p.id
      WHERE t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 3;
    `);
    
    console.log('\nRandom Tumbon Examples:');
    result.rows.forEach(row => {
      console.log(`\nID: ${row.id}`);
      console.log(`Name: ${iconv.decode(Buffer.from(row.name_th, 'binary'), 'tis-620')} (${row.name_en || 'no English name'})`);
      console.log(`Location: ${iconv.decode(Buffer.from(row.amphur_name, 'binary'), 'tis-620')}, ${iconv.decode(Buffer.from(row.province_name, 'binary'), 'tis-620')}`);
      console.log(`Coordinates: ${row.latitude}, ${row.longitude}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error); 