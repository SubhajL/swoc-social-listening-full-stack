#!/usr/bin/env node

/**
 * Backup ThaiWater Telemetry Stations Table
 * 
 * This script creates a backup of the thaiwater_tele_stations table to thaiwater_tele_stations_backup
 * 
 * Usage:
 *   node src/scripts/backup-thaiwater-stations.mjs           # Create a backup
 *   node src/scripts/backup-thaiwater-stations.mjs --verify  # Verify the backup
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createEnhancedLogger } from '../utils/enhanced-logger.js';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create enhanced logger
const logger = createEnhancedLogger({
  jobType: 'THAIWATER_STATIONS_BACKUP',
  filename: 'thaiwater-stations-backup.log'
});

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  ssl: { rejectUnauthorized: false }
};

// Table names
const SOURCE_TABLE = 'thaiwater_tele_stations';
const BACKUP_TABLE = 'thaiwater_tele_stations_backup';

// Parse command line arguments
const args = process.argv.slice(2);
const shouldVerify = args.includes('--verify');

// Initialize database connection
async function initDatabase() {
  logger.info('Initializing database connection', {
    component: 'Database',
    operation: 'Connect'
  });
  
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Test connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      logger.info('Database connection established', {
        component: 'Database',
        operation: 'ConnectSuccess',
        data: {
          time: result.rows[0].now
        }
      });
    } finally {
      client.release();
    }
    
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database', {
      component: 'Database',
      operation: 'ConnectFailed',
      error: error.toString()
    });
    throw error;
  }
}

/**
 * Check if the source table exists
 */
async function checkIfSourceTableExists(client) {
  try {
    const query = `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    `;
    
    const result = await client.query(query, [SOURCE_TABLE]);
    
    if (result.rowCount === 0) {
      logger.error(`Source table '${SOURCE_TABLE}' does not exist`, {
        component: 'Database',
        operation: 'CheckSourceTable'
      });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking if source table exists', {
      component: 'Database',
      operation: 'CheckSourceTable',
      error: error.toString()
    });
    throw error;
  }
}

/**
 * Check if the backup table already exists
 */
async function checkIfBackupTableExists(client) {
  try {
    const query = `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    `;
    
    const result = await client.query(query, [BACKUP_TABLE]);
    return result.rowCount > 0;
  } catch (error) {
    logger.error('Error checking if backup table exists', {
      component: 'Database',
      operation: 'CheckBackupTable',
      error: error.toString()
    });
    throw error;
  }
}

/**
 * Create a backup of the thaiwater_tele_stations table
 */
async function createBackup(client) {
  try {
    // Check if source table exists
    const sourceExists = await checkIfSourceTableExists(client);
    
    if (!sourceExists) {
      console.error(`❌ Source table '${SOURCE_TABLE}' does not exist.`);
      return false;
    }
    
    // Check if backup table already exists
    const backupExists = await checkIfBackupTableExists(client);
    
    if (backupExists) {
      logger.info(`Backup table '${BACKUP_TABLE}' already exists, dropping it first`, {
        component: 'Database',
        operation: 'DropExistingBackup'
      });
      
      console.log(`Backup table '${BACKUP_TABLE}' already exists. Dropping existing backup table...`);
      
      await client.query(`DROP TABLE IF EXISTS ${BACKUP_TABLE}`);
    }
    
    // Get the table structure
    logger.info(`Creating backup table '${BACKUP_TABLE}'`, {
      component: 'Database',
      operation: 'CreateBackupTable'
    });
    
    console.log(`Creating backup table '${BACKUP_TABLE}'...`);
    
    // Create the backup table with the same structure as the source
    await client.query(`CREATE TABLE ${BACKUP_TABLE} (LIKE ${SOURCE_TABLE} INCLUDING ALL)`);
    
    // Copy data from source to backup
    logger.info(`Copying data from '${SOURCE_TABLE}' to '${BACKUP_TABLE}'`, {
      component: 'Database',
      operation: 'CopyData'
    });
    
    console.log(`Copying data from '${SOURCE_TABLE}' to '${BACKUP_TABLE}'...`);
    
    const insertResult = await client.query(`INSERT INTO ${BACKUP_TABLE} SELECT * FROM ${SOURCE_TABLE}`);
    
    logger.info(`Successfully copied ${insertResult.rowCount} rows to backup table`, {
      component: 'Database',
      operation: 'CopyDataSuccess',
      data: {
        rowsCopied: insertResult.rowCount
      }
    });
    
    console.log(`✅ Successfully copied ${insertResult.rowCount} rows to backup table.`);
    
    return true;
  } catch (error) {
    logger.error('Error creating backup', {
      component: 'Database',
      operation: 'CreateBackup',
      error: error.toString()
    });
    console.error(`❌ Error creating backup: ${error.message}`);
    throw error;
  }
}

/**
 * Verify that the backup matches the source table
 */
async function verifyBackup(client) {
  try {
    // Check if both tables exist
    const sourceExists = await checkIfSourceTableExists(client);
    const backupExists = await checkIfBackupTableExists(client);
    
    if (!sourceExists) {
      console.error(`❌ Source table '${SOURCE_TABLE}' does not exist.`);
      return false;
    }
    
    if (!backupExists) {
      console.error(`❌ Backup table '${BACKUP_TABLE}' does not exist. Run the backup first.`);
      return false;
    }
    
    // Compare row counts
    logger.info('Verifying backup by comparing row counts', {
      component: 'Verification',
      operation: 'CompareRowCounts'
    });
    
    console.log('Verifying backup integrity...');
    
    const sourceCountResult = await client.query(`SELECT COUNT(*) FROM ${SOURCE_TABLE}`);
    const backupCountResult = await client.query(`SELECT COUNT(*) FROM ${BACKUP_TABLE}`);
    
    const sourceCount = parseInt(sourceCountResult.rows[0].count);
    const backupCount = parseInt(backupCountResult.rows[0].count);
    
    logger.info('Row count comparison results', {
      component: 'Verification',
      operation: 'RowCountResults',
      data: {
        sourceCount,
        backupCount,
        match: sourceCount === backupCount
      }
    });
    
    if (sourceCount !== backupCount) {
      console.error(`❌ Row count mismatch: ${SOURCE_TABLE}=${sourceCount}, ${BACKUP_TABLE}=${backupCount}`);
      return false;
    }
    
    // Check columns match
    logger.info('Verifying backup by comparing column structure', {
      component: 'Verification',
      operation: 'CompareColumns'
    });
    
    const columnsQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position
    `;
    
    const sourceColumnsResult = await client.query(columnsQuery, [SOURCE_TABLE]);
    const backupColumnsResult = await client.query(columnsQuery, [BACKUP_TABLE]);
    
    const sourceColumns = sourceColumnsResult.rows;
    const backupColumns = backupColumnsResult.rows;
    
    if (sourceColumns.length !== backupColumns.length) {
      logger.error('Column count mismatch', {
        component: 'Verification',
        operation: 'ColumnCountMismatch',
        data: {
          sourceCount: sourceColumns.length,
          backupCount: backupColumns.length
        }
      });
      
      console.error(`❌ Column count mismatch: ${SOURCE_TABLE}=${sourceColumns.length}, ${BACKUP_TABLE}=${backupColumns.length}`);
      return false;
    }
    
    // Check if columns match
    let columnsMatch = true;
    
    for (let i = 0; i < sourceColumns.length; i++) {
      if (
        sourceColumns[i].column_name !== backupColumns[i].column_name ||
        sourceColumns[i].data_type !== backupColumns[i].data_type ||
        sourceColumns[i].character_maximum_length !== backupColumns[i].character_maximum_length
      ) {
        columnsMatch = false;
        logger.error('Column mismatch detected', {
          component: 'Verification',
          operation: 'ColumnMismatch',
          data: {
            position: i,
            sourceColumn: sourceColumns[i],
            backupColumn: backupColumns[i]
          }
        });
        
        console.error(`❌ Column mismatch at position ${i}:`,
          sourceColumns[i].column_name, 'vs', backupColumns[i].column_name);
        
        break;
      }
    }
    
    if (!columnsMatch) {
      return false;
    }
    
    // Random data sample verification
    logger.info('Performing sample data verification', {
      component: 'Verification',
      operation: 'SampleDataCheck'
    });
    
    // Use primary key for consistent sampling
    const idQuery = `
      SELECT column_name
      FROM information_schema.key_column_usage
      WHERE table_schema = 'public'
      AND table_name = $1
      AND constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'PRIMARY KEY'
        AND table_name = $1
      )
    `;
    
    const pkResult = await client.query(idQuery, [SOURCE_TABLE]);
    
    if (pkResult.rows.length === 0) {
      // No primary key, use random rows
      const sampleQuery = `
        SELECT * FROM ${SOURCE_TABLE} 
        ORDER BY random() 
        LIMIT 5
      `;
      
      const samples = await client.query(sampleQuery);
      
      for (const sample of samples.rows) {
        // Use first column as reference
        const firstCol = Object.keys(sample)[0];
        const firstVal = sample[firstCol];
        
        // Find matching row in backup
        const matchQuery = `
          SELECT COUNT(*) FROM ${BACKUP_TABLE}
          WHERE ${firstCol} = $1
        `;
        
        const matchResult = await client.query(matchQuery, [firstVal]);
        
        if (parseInt(matchResult.rows[0].count) === 0) {
          logger.error(`Sample data verification failed for ${firstCol}=${firstVal}`, {
            component: 'Verification',
            operation: 'SampleVerificationFailed'
          });
          
          console.error(`❌ Sample data verification failed: No matching row in backup for ${firstCol}=${firstVal}`);
          return false;
        }
      }
    } else {
      // Use primary key for verification
      const pkColumn = pkResult.rows[0].column_name;
      
      const sampleQuery = `
        SELECT ${pkColumn} FROM ${SOURCE_TABLE} 
        ORDER BY random() 
        LIMIT 5
      `;
      
      const samples = await client.query(sampleQuery);
      
      for (const sample of samples.rows) {
        const pkValue = sample[pkColumn];
        
        // Find matching row in backup
        const matchQuery = `
          SELECT COUNT(*) FROM ${BACKUP_TABLE}
          WHERE ${pkColumn} = $1
        `;
        
        const matchResult = await client.query(matchQuery, [pkValue]);
        
        if (parseInt(matchResult.rows[0].count) === 0) {
          logger.error(`Sample data verification failed for ${pkColumn}=${pkValue}`, {
            component: 'Verification',
            operation: 'SampleVerificationFailed'
          });
          
          console.error(`❌ Sample data verification failed: No matching row in backup for ${pkColumn}=${pkValue}`);
          return false;
        }
      }
    }
    
    logger.info('Backup verification completed successfully', {
      component: 'Verification',
      operation: 'VerificationSuccess'
    });
    
    console.log('✅ Backup verification completed successfully!');
    console.log(`Source table: ${SOURCE_TABLE} (${sourceCount} rows)`);
    console.log(`Backup table: ${BACKUP_TABLE} (${backupCount} rows)`);
    
    return true;
  } catch (error) {
    logger.error('Error verifying backup', {
      component: 'Verification',
      operation: 'VerificationError',
      error: error.toString()
    });
    console.error(`❌ Error verifying backup: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  logger.info('Starting ThaiWater Stations Backup Script', {
    component: 'Job',
    operation: 'StartJob',
    data: {
      verify: shouldVerify
    }
  });
  
  const startTime = Date.now();
  
  try {
    // Initialize database
    const pool = await initDatabase();
    const client = await pool.connect();
    
    try {
      if (shouldVerify) {
        // Verify the backup
        await verifyBackup(client);
      } else {
        // Create a backup
        await createBackup(client);
      }
    } finally {
      client.release();
    }
    
    // Close database connection
    await pool.end();
    
    const duration = Date.now() - startTime;
    
    logger.info('ThaiWater Stations Backup Script completed', {
      component: 'Job',
      operation: 'CompleteJob',
      duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('ThaiWater Stations Backup Script failed', {
      component: 'Job',
      operation: 'JobFailed',
      duration,
      error: error.toString()
    });
    
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  logger.error('Unhandled error in main function', {
    component: 'Job',
    operation: 'UnhandledError',
    error: err.toString()
  });
  process.exit(1);
}); 