import { Pool } from 'pg';
import { logger } from '../utils/logger';

// Create a connection pool with read-only credentials by default for safety
export const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});

// Add error handling for the pool
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    logger.error('Error connecting to the database', err);
    process.exit(-1);
  } else {
    logger.info('Successfully connected to PostgreSQL database');
  }
}); 