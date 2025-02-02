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

// Log database configuration (without sensitive data)
logger.info('Database configuration:', {
  host: process.env.DB_WRITE_HOST,
  port: process.env.DB_WRITE_PORT,
  database: process.env.DB_WRITE_DATABASE,
  user: process.env.DB_WRITE_USER,
  ssl: process.env.DB_WRITE_SSL === 'true'
});

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

async function executeQuery(client: pg.PoolClient, query: string, params: any[] = []): Promise<pg.QueryResult> {
  try {
    logger.info('Executing query:', { query, params });
    const result = await client.query(query, params);
    logger.info('Query executed successfully');
    return result;
  } catch (error) {
    logger.error('Query execution failed:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: (error as any).code,
        detail: (error as any).detail
      } : error,
      query,
      params
    });
    throw error;
  }
}

async function addReplyColumns() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting reply columns migration...');
    
    // Test database connection
    logger.info('Testing database connection...');
    await executeQuery(client, 'SELECT NOW()');
    logger.info('Database connection successful');
    
    // Start transaction
    logger.info('Starting transaction...');
    await executeQuery(client, 'BEGIN');

    try {
      // Add new columns
      logger.info('Adding new columns...');
      await executeQuery(client, `
        ALTER TABLE processed_posts
          ADD COLUMN IF NOT EXISTS replied_post BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS replied_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS replied_by VARCHAR(255)
      `);

      // Update historical data
      logger.info('Updating historical data...');
      const updateResult = await executeQuery(client, `
        UPDATE processed_posts
        SET 
          replied_post = TRUE,
          replied_date = post_date,
          replied_by = 'System Migration'
        WHERE post_date < '2024-12-01'
      `);
      logger.info(`Updated ${updateResult.rowCount} historical posts`);

      // Get update summary
      logger.info('Getting update summary...');
      const summaryResult = await executeQuery(client, `
        SELECT COUNT(*) as count
        FROM processed_posts
        WHERE replied_post = TRUE
          AND replied_by = 'System Migration'
      `);
      logger.info(`Total historical posts updated: ${summaryResult.rows[0].count}`);

      // Commit transaction
      logger.info('Committing transaction...');
      await executeQuery(client, 'COMMIT');
      
      logger.info('Reply columns migration completed successfully');
    } catch (error) {
      // Rollback transaction on error
      logger.error('Error during migration, rolling back...');
      await executeQuery(client, 'ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Migration failed:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: (error as any).code,
        detail: (error as any).detail
      } : error
    });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addReplyColumns().catch(error => {
  logger.error('Failed to add reply columns:', error);
  process.exit(1);
}); 