const { config } = require('dotenv');
const pg = require('pg');
const path = require('path');

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

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
    // First, let's check the table structure
    console.log('\nChecking tumbons table structure:');
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tumbons'
      ORDER BY ordinal_position;
    `);
    
    columns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });

    // Get three random tumbons with coordinates
    console.log('\nRandom Tumbon Examples:');
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
    
    result.rows.forEach(row => {
      console.log(`\nID: ${row.id}`);
      console.log(`Name: ${row.name_th} (${row.name_en || 'no English name'})`);
      console.log(`Location: ${row.amphur_name}, ${row.province_name}`);
      console.log(`Coordinates: ${row.latitude}, ${row.longitude}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error); 