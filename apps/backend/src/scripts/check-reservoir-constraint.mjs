import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

async function checkReservoirConstraints() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  logger.info('[ConstraintCheck] Checking reservoir_data constraints');
  
  try {
    const client = await pool.connect();
    
    try {
      // Check table structure
      const tableResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'reservoir_data'
        ORDER BY ordinal_position;
      `);
      
      logger.info(`[ConstraintCheck] Table has ${tableResult.rows.length} columns`);
      tableResult.rows.forEach(col => {
        logger.info(`[ConstraintCheck] Column: ${col.column_name}, Type: ${col.data_type}, Max Length: ${col.character_maximum_length || 'N/A'}`);
      });
      
      // Check for unique constraint
      const uniqueConstraintResult = await client.query(`
        SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) as constraint_def
        FROM pg_constraint con
        JOIN pg_namespace nsp ON nsp.oid = con.connamespace
        JOIN pg_class cls ON cls.oid = con.conrelid
        WHERE cls.relname = 'reservoir_data'
        AND nsp.nspname = 'public'
        AND con.contype = 'u'; -- 'u' for unique constraint
      `);
      
      if (uniqueConstraintResult.rows.length > 0) {
        logger.info(`[ConstraintCheck] Found ${uniqueConstraintResult.rows.length} unique constraints:`);
        uniqueConstraintResult.rows.forEach(constraint => {
          logger.info(`[ConstraintCheck] Name: ${constraint.conname}, Definition: ${constraint.constraint_def}`);
        });
      } else {
        logger.warn('[ConstraintCheck] No unique constraints found on reservoir_data');
        
        // Add the missing unique constraint
        try {
          logger.info('[ConstraintCheck] Attempting to add missing unique constraint');
          await client.query(`
            ALTER TABLE reservoir_data ADD CONSTRAINT reservoir_data_reservoir_id_date_unique UNIQUE (reservoir_id, date);
          `);
          logger.info('[ConstraintCheck] Successfully added unique constraint on (reservoir_id, date)');
        } catch (constraintError) {
          logger.error('[ConstraintCheck] Error adding unique constraint', {
            error: constraintError instanceof Error ? constraintError.message : String(constraintError)
          });
        }
      }
      
      // Test query to check if ON CONFLICT would work
      logger.info('[ConstraintCheck] Testing ON CONFLICT query with dummy data');
      try {
        await client.query('BEGIN');
        await client.query(`
          INSERT INTO reservoir_data (
            reservoir_id,
            reservoir_name,
            storage,
            dead_storage,
            volume,
            inflow,
            outflow,
            date,
            type,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (reservoir_id, date) DO UPDATE SET
            storage = EXCLUDED.storage,
            updated_at = NOW()
        `, [
          'test_dummy_id',
          'Test Reservoir',
          100.0,
          10.0,
          90.0,
          5.0,
          3.0,
          '2025-03-26',
          'test',
        ]);
        await client.query('ROLLBACK'); // Don't actually insert the test data
        logger.info('[ConstraintCheck] ON CONFLICT query works correctly');
      } catch (testError) {
        await client.query('ROLLBACK');
        logger.error('[ConstraintCheck] ON CONFLICT query failed', {
          error: testError instanceof Error ? testError.message : String(testError),
          stack: testError instanceof Error ? testError.stack : undefined
        });
      }
      
      // Check a sample row
      const sampleResult = await client.query(`
        SELECT * FROM reservoir_data LIMIT 1;
      `);
      
      if (sampleResult.rows.length > 0) {
        logger.info('[ConstraintCheck] Sample row from reservoir_data:');
        const sampleRow = sampleResult.rows[0];
        Object.keys(sampleRow).forEach(key => {
          logger.info(`[ConstraintCheck] ${key}: ${sampleRow[key]}`);
        });
      } else {
        logger.warn('[ConstraintCheck] No data found in reservoir_data table');
      }
      
    } catch (error) {
      logger.error('[ConstraintCheck] Error checking constraints', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[ConstraintCheck] Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    await pool.end();
  }
}

// Run the check
checkReservoirConstraints()
  .then(() => {
    logger.info('[ConstraintCheck] Check completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[ConstraintCheck] Check failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 