import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Load .env relative to script

const sslConfig = process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: sslConfig
});

// Simplest possible query focusing only on amphure match
const query = `SELECT station_id, station_name, amphure FROM telemetry_data_stations WHERE amphure = $1 ORDER BY station_id`;
const params = ['แม่แตง'];

pool.query(query, params)
  .then(res => {
    console.log('--- Test Query Results (WHERE amphure = $1) ---');
    if (res.rows.length > 0) {
      console.log(`>>> Found ${res.rows.length} rows:`);
      console.log(JSON.stringify(res.rows, null, 2));
    } else {
      console.log('>>> No rows returned by the simple amphure query.');
    }
    console.log('---------------------------------------------');
    pool.end();
  })
  .catch(err => {
    console.error('--- Error executing simple amphure query ---');
    console.error(err);
    console.log('-----------------------------------------');
    pool.end();
    process.exit(1); // Exit with error code
  }); 