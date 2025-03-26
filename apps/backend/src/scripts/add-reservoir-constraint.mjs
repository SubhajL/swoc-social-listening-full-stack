import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Adds the missing unique constraint to the reservoir_data table
 */
async function addReservoirConstraint() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  logger.info('[ReservoirConstraint] Adding missing unique constraint to reservoir_data table');
  
  try {
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // First check if duplicate data exists for reservoir_id and date
      logger.info('[ReservoirConstraint] Checking for duplicate data');
      const duplicateResult = await client.query(`
        SELECT reservoir_id, date, COUNT(*) 
        FROM reservoir_data
        GROUP BY reservoir_id, date
        HAVING COUNT(*) > 1
      `);
      
      if (duplicateResult.rows.length > 0) {
        logger.warn(`[ReservoirConstraint] Found ${duplicateResult.rows.length} sets of duplicate data`);
        
        // Handle duplicates
        for (const dup of duplicateResult.rows) {
          logger.info(`[ReservoirConstraint] Handling duplicates for reservoir_id=${dup.reservoir_id}, date=${dup.date}`);
          
          // Get all duplicate rows
          const dupsResult = await client.query(`
            SELECT id, reservoir_id, date, updated_at
            FROM reservoir_data
            WHERE reservoir_id = $1 AND date = $2
            ORDER BY updated_at DESC
          `, [dup.reservoir_id, dup.date]);
          
          // Keep the most recently updated row
          const keepId = dupsResult.rows[0].id;
          const deleteIds = dupsResult.rows.slice(1).map(row => row.id);
          
          logger.info(`[ReservoirConstraint] Keeping row with id=${keepId}, deleting ${deleteIds.length} rows`);
          
          // Delete the older duplicate rows
          if (deleteIds.length > 0) {
            await client.query(`
              DELETE FROM reservoir_data
              WHERE id IN (${deleteIds.join(',')})
            `);
          }
        }
      } else {
        logger.info('[ReservoirConstraint] No duplicate data found');
      }
      
      // Now add the unique constraint
      logger.info('[ReservoirConstraint] Adding unique constraint');
      await client.query(`
        ALTER TABLE reservoir_data ADD CONSTRAINT reservoir_data_reservoir_id_date_unique UNIQUE (reservoir_id, date);
      `);
      
      // Test the constraint
      logger.info('[ReservoirConstraint] Testing constraint with dummy data');
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
        'test_constraint_id',
        'Test Reservoir',
        100.0,
        10.0,
        90.0,
        5.0,
        3.0,
        '2025-03-26',
        'test'
      ]);
      
      // Commit transaction
      await client.query('COMMIT');
      logger.info('[ReservoirConstraint] Successfully added unique constraint to reservoir_data table');
      
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[ReservoirConstraint] Error adding constraint', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[ReservoirConstraint] Operation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the function
addReservoirConstraint()
  .then((result) => {
    logger.info('[ReservoirConstraint] Operation completed', result);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[ReservoirConstraint] Operation failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 