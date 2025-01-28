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

async function addLocationColumns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add columns to provinces_new
    await client.query(`
      ALTER TABLE provinces_new 
      ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
    `);

    // Add columns to amphures_new
    await client.query(`
      ALTER TABLE amphures_new 
      ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
    `);

    await client.query('COMMIT');
    console.log('Successfully added location columns to both tables');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to add location columns:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addLocationColumns().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 