import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Script to fix the reservoir_data table schema to properly handle API IDs
 */
async function fixReservoirDataSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  logger.info('[SchemaFix] Starting reservoir_data schema fix');
  
  try {
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Check if the reservoir_data table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'reservoir_data'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        logger.error('[SchemaFix] reservoir_data table does not exist');
        throw new Error('reservoir_data table does not exist');
      }
      
      // Check the structure of the reservoir_data table
      logger.info('[SchemaFix] Checking reservoir_data table structure');
      const columnCheck = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'reservoir_data'
        ORDER BY ordinal_position;
      `);
      
      logger.info(`[SchemaFix] Found ${columnCheck.rows.length} columns in reservoir_data table`);
      columnCheck.rows.forEach(col => {
        logger.info(`[SchemaFix] Column: ${col.column_name}, Type: ${col.data_type}, Max Length: ${col.character_maximum_length || 'N/A'}`);
      });
      
      // 1. Create the new table with VARCHAR for reservoir_id
      logger.info('[SchemaFix] Creating new reservoir_data table with correct schema');
      await client.query(`
        CREATE TABLE IF NOT EXISTS reservoir_data_new (
          id SERIAL PRIMARY KEY,
          reservoir_id VARCHAR(20) NOT NULL,
          reservoir_name VARCHAR(255) NOT NULL,
          storage NUMERIC(15,2),
          dead_storage NUMERIC(15,2),
          volume NUMERIC(15,2),
          inflow NUMERIC(15,2),
          outflow NUMERIC(15,2),
          date DATE NOT NULL,
          type VARCHAR(20) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // 2. Create indexes for better query performance
      logger.info('[SchemaFix] Creating indexes on new table');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_reservoir_data_new_reservoir_id ON reservoir_data_new(reservoir_id);
        CREATE INDEX IF NOT EXISTS idx_reservoir_data_new_date ON reservoir_data_new(date);
        CREATE INDEX IF NOT EXISTS idx_reservoir_data_new_type ON reservoir_data_new(type);
      `);
      
      // 3. Check if old data exists and needs migration
      const oldDataCheck = await client.query('SELECT COUNT(*) FROM reservoir_data');
      
      if (parseInt(oldDataCheck.rows[0].count) > 0) {
        // 4. Migrate data from old table to new table
        logger.info(`[SchemaFix] Migrating ${oldDataCheck.rows[0].count} records from old reservoir_data table to new schema`);
        
        try {
          // First, check if reservoir_locations table exists
          const locationsTableCheck = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'reservoir_locations'
            );
          `);
          
          if (locationsTableCheck.rows[0].exists) {
            logger.info('[SchemaFix] reservoir_locations table exists, checking its structure');
            const locationsColumnCheck = await client.query(`
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_name = 'reservoir_locations'
              ORDER BY ordinal_position;
            `);
            
            locationsColumnCheck.rows.forEach(col => {
              logger.info(`[SchemaFix] Column: ${col.column_name}, Type: ${col.data_type}`);
            });
            
            // Check for direct migration query
            logger.info('[SchemaFix] Attempting migration with JOIN to reservoir_locations');
            await client.query(`
              -- Join with reservoir_locations to get the string reservoir_id
              INSERT INTO reservoir_data_new (
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
              )
              SELECT 
                COALESCE(rl.reservoir_id, CAST(rd.reservoir_id AS VARCHAR)),  -- Use the string reservoir_id from reservoir_locations or cast the integer
                rd.reservoir_name,
                rd.storage,
                rd.dead_storage,
                rd.volume,
                rd.inflow,
                rd.outflow,
                rd.date,
                rd.type,
                rd.created_at,
                rd.updated_at
              FROM reservoir_data rd
              LEFT JOIN reservoir_locations rl ON rd.reservoir_id = rl.id;
            `);
          } else {
            // If reservoir_locations doesn't exist, just copy data with type conversion
            logger.info('[SchemaFix] reservoir_locations table does not exist, using simple migration');
            await client.query(`
              INSERT INTO reservoir_data_new (
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
              )
              SELECT 
                CAST(reservoir_id AS VARCHAR),
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
              FROM reservoir_data;
            `);
          }
        } catch (migrationError) {
          logger.error('[SchemaFix] Migration query failed', {
            error: migrationError instanceof Error ? migrationError.message : String(migrationError),
            stack: migrationError instanceof Error ? migrationError.stack : undefined
          });
          
          // Try alternative migration approach
          logger.info('[SchemaFix] Trying alternative migration approach with cursor');
          
          // Get all data from old table
          const oldData = await client.query('SELECT * FROM reservoir_data');
          logger.info(`[SchemaFix] Retrieved ${oldData.rows.length} rows for manual migration`);
          
          // Insert data row by row
          let insertedCount = 0;
          for (const row of oldData.rows) {
            try {
              await client.query(`
                INSERT INTO reservoir_data_new (
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
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `, [
                String(row.reservoir_id), // Convert to string
                row.reservoir_name,
                row.storage,
                row.dead_storage,
                row.volume,
                row.inflow,
                row.outflow,
                row.date,
                row.type,
                row.created_at,
                row.updated_at
              ]);
              insertedCount++;
            } catch (rowError) {
              logger.error(`[SchemaFix] Error inserting row with ID ${row.id}`, {
                error: rowError instanceof Error ? rowError.message : String(rowError)
              });
            }
          }
          
          logger.info(`[SchemaFix] Manually inserted ${insertedCount} of ${oldData.rows.length} rows`);
          
          if (insertedCount !== oldData.rows.length) {
            throw new Error(`Manual migration only inserted ${insertedCount} of ${oldData.rows.length} rows`);
          }
        }
      } else {
        logger.info('[SchemaFix] No existing data to migrate from old table');
      }
      
      // 5. Verify the migration
      const newDataCount = await client.query('SELECT COUNT(*) FROM reservoir_data_new');
      logger.info(`[SchemaFix] New table has ${newDataCount.rows[0].count} records`);
      
      if (oldDataCheck.rows[0].count === newDataCount.rows[0].count || oldDataCheck.rows[0].count === '0') {
        // 6. Rename tables to swap them
        logger.info('[SchemaFix] Swapping tables');
        await client.query(`
          ALTER TABLE reservoir_data RENAME TO reservoir_data_old;
          ALTER TABLE reservoir_data_new RENAME TO reservoir_data;
        `);
        
        // 7. Rename sequences
        logger.info('[SchemaFix] Renaming sequences');
        await client.query(`
          ALTER SEQUENCE IF EXISTS reservoir_data_id_seq RENAME TO reservoir_data_old_id_seq;
          ALTER SEQUENCE IF EXISTS reservoir_data_new_id_seq RENAME TO reservoir_data_id_seq;
        `);
        
        // 8. Create a unique constraint on (reservoir_id, date) for ON CONFLICT to work
        logger.info('[SchemaFix] Creating unique constraint on reservoir_id and date');
        await client.query(`
          ALTER TABLE reservoir_data ADD CONSTRAINT reservoir_data_reservoir_id_date_unique UNIQUE (reservoir_id, date);
        `);
        
        // Commit the transaction
        await client.query('COMMIT');
        logger.info('[SchemaFix] Schema migration completed successfully');
        
        return {
          success: true,
          message: 'Schema migration completed successfully',
          oldRecordCount: parseInt(oldDataCheck.rows[0].count),
          newRecordCount: parseInt(newDataCount.rows[0].count)
        };
      } else {
        // If counts don't match, roll back
        await client.query('ROLLBACK');
        logger.error('[SchemaFix] Record counts do not match, rolling back schema changes', {
          oldCount: oldDataCheck.rows[0].count,
          newCount: newDataCount.rows[0].count
        });
        
        return {
          success: false,
          message: 'Migration failed: record counts do not match',
          oldRecordCount: parseInt(oldDataCheck.rows[0].count),
          newRecordCount: parseInt(newDataCount.rows[0].count)
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[SchemaFix] Error during schema migration', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[SchemaFix] Schema migration failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Execute the function
fixReservoirDataSchema()
  .then((result) => {
    logger.info('[SchemaFix] Schema fix result:', result);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[SchemaFix] Schema fix failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 