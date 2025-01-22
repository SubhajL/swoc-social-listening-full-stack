import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testConnection() {
  console.log('Environment check:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('Attempting connection without SSL...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('Connection successful!');
    console.log('Database info:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Connection error:', err instanceof Error ? {
      message: err.message,
      stack: err.stack,
      name: err.name
    } : err);
  } finally {
    await pool.end();
  }
}

testConnection(); 