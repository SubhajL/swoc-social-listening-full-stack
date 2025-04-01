import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
// Calculate __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env relative to the script location
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Check if DB_NAME loaded, otherwise log error and exit
if (!process.env.DB_NAME) {
    console.error('ERROR: Database environment variables not loaded. Check .env path and file.');
    console.error(`Attempted to load .env from: ${path.resolve(__dirname, '../../.env')}`);
    process.exit(1);
}
// Configure SSL based on DB_SSL environment variable
const sslConfig = process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;
// Use individual connection parameters from .env
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    ssl: sslConfig
});
const query = `SELECT DISTINCT amphure, status FROM telemetry_data_stations ORDER BY amphure, status`;
pool.query(query)
    .then(res => {
    console.log('--- Distinct Amphure/Status Combinations ---');
    if (res.rows.length > 0) {
        console.log(JSON.stringify(res.rows, null, 2));
    }
    else {
        console.log('>>> No distinct combinations found.');
    }
    console.log('-------------------------------------------');
    pool.end();
})
    .catch(err => {
    console.error('--- Error executing distinct query ---');
    console.error(err);
    console.log('-------------------------------------');
    pool.end();
    process.exit(1); // Exit with error code
});
