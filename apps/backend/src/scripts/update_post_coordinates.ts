import pg from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../../.env') });

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

interface QueryResultRow {
  message?: string;
  [key: string]: unknown;
}

async function updatePostCoordinates() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting post coordinates update...');
    
    // Read and execute the SQL file
    const sqlFile = readFileSync(join(__dirname, 'update_post_coordinates.sql'), 'utf8');
    const results = await client.query<QueryResultRow>(sqlFile);
    
    // Log results (results is an array of QueryResult for multiple statements)
    if (Array.isArray(results)) {
      results.forEach((res) => {
        if (res.rows && res.rows.length > 0) {
          res.rows.forEach((row: QueryResultRow) => {
            logger.info(row.message || JSON.stringify(row));
          });
        }
      });
    }
    
    logger.info('Post coordinates update completed successfully');
  } catch (error) {
    logger.error('Error updating post coordinates:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updatePostCoordinates().catch(error => {
  logger.error('Failed to update post coordinates:', error);
  process.exit(1);
}); 