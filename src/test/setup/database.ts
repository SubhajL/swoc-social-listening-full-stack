import pg from 'pg';
import { logger } from '../../utils/logger.js';

export let pool: pg.Pool;

const DB_CONFIG = {
  host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: 15434,
  database: 'swoc-uat-ssl',
  user: 'swoc-uat-ssl-readonly-user',
  password: 'c8d20c8a022ac7af9131491704594941',
  ssl: {
    rejectUnauthorized: false
  }
};

export async function setupTestDatabase() {
  logger.info('Setting up test database connection...');
  
  pool = new pg.Pool({
    ...DB_CONFIG,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 1
  });

  try {
    // Test the connection
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database connection successful');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error setting up test database:', error);
    throw error;
  }
}

export async function teardownTestDatabase() {
  if (!pool) {
    return;
  }

  try {
    await pool.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
} 