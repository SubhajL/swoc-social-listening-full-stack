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
    // Check for missing coordinates
    const missingCoords = await client.query(`
      SELECT COUNT(*) as count
      FROM tumbons
      WHERE latitude IS NULL OR longitude IS NULL;
    `);
    
    console.log('\nChecking for missing coordinates:');
    console.log(`Tumbons missing coordinates: ${missingCoords.rows[0].count}`);

    // Get total count
    const totalCount = await client.query(`
      SELECT COUNT(*) as count FROM tumbons;
    `);
    
    console.log(`Total tumbons: ${totalCount.rows[0].count}`);
    console.log(`Percentage complete: ${((totalCount.rows[0].count - missingCoords.rows[0].count) / totalCount.rows[0].count * 100).toFixed(2)}%`);

    // Get sample of coordinates for manual verification
    console.log('\nSample of 100 tumbon coordinates for verification:');
    const sample = await client.query(`
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
      LIMIT 100;
    `);

    sample.rows.forEach(row => {
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