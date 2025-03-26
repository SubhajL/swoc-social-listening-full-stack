import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Database configuration with SSL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateStation605() {
  try {
    const client = await pool.connect();
    try {
      const updateQuery = `
        UPDATE telemetry_data_stations
        SET 
          province = $1,
          amphure = $2,
          updated_at = NOW()
        WHERE station_id::text = $3
        RETURNING station_id, station_code, province, amphure;
      `;

      const result = await client.query(updateQuery, [
        'มุกดาหาร',
        'ดงหลวง',
        '605'
      ]);

      if (result.rowCount > 0) {
        console.log('Successfully updated station:', result.rows[0]);
      } else {
        console.log('No station was updated');
      }

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

updateStation605(); 