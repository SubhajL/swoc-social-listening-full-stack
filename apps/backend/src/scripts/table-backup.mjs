#!/usr/bin/env node

/**
 * Backup PostgreSQL Table
 * 
 * This script creates a backup of any PostgreSQL table by copying its structure and data to a new table
 * with "_backup" suffix.
 * 
 * Usage:
 *   node src/scripts/table-backup.mjs --table=table_name           # Create a backup
 *   node src/scripts/table-backup.mjs --table=table_name --verify  # Verify the backup
 *   node src/scripts/table-backup.mjs --help                       # Show help
 * 
 * Examples:
 *   npm run table:backup -- --table=thaiwater_tele_stations
 *   npm run table:backup -- --table=amphures --verify
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
  jobType: 'TABLE_BACKUP',
  filename: 'table-backup.log'
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

// Parse command line arguments
const args = process.argv.slice(2);
const shouldVerify = args.includes('--verify');
const showHelp = args.includes('--help');

// Extract table name from arguments
const tableArg = args.find(arg => arg.startsWith('--table='));
let tableName = null;

if (tableArg) {
  tableName = tableArg.split('=')[1];
}

// Display help if requested or if no table name is provided
if (showHelp || !tableName) {
  console.log('Backup PostgreSQL Table');
  console.log('');
  console.log('Usage:');
  console.log('  node src/scripts/table-backup.mjs --table=table_name           # Create a backup');
  console.log('  node src/scripts/table-backup.mjs --table=table_name --verify  # Verify the backup');
  console.log('  node src/scripts/table-backup.mjs --help                       # Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  npm run table:backup -- --table=thaiwater_tele_stations');
  console.log('  npm run table:backup -- --table=amphures --verify');
  process.exit(showHelp ? 0 : 1);
}

// Construct backup table name
const BACKUP_TABLE = `${tableName}_backup`;

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
async function checkIfSourceTableExists(client, tableName) {
  try {
    const query = `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    `;
    
    const result = await client.query(query, [tableName]);
    
    if (result.rowCount === 0) {
      logger.error(`Source table '${tableName}' does not exist`, {
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
async function checkIfBackupTableExists(client, backupTable) {
  try {
    const query = `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    `;
    
    const result = await client.query(query, [backupTable]);
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
 * Create a backup of the specified table
 */
async function createBackup(client, sourceTable, backupTable) {
  try {
    // Check if source table exists
    const sourceExists = await checkIfSourceTableExists(client, sourceTable);
    
    if (!sourceExists) {
      console.error(`❌ Source table '${sourceTable}' does not exist.`);
      return false;
    }
    
    // Check if backup table already exists
    const backupExists = await checkIfBackupTableExists(client, backupTable);
    
    if (backupExists) {
      logger.info(`Backup table '${backupTable}' already exists, dropping it first`, {
        component: 'Database',
        operation: 'DropExistingBackup'
      });
      
      console.log(`Backup table '${backupTable}' already exists. Dropping existing backup table...`);
      
      await client.query(`DROP TABLE IF EXISTS ${backupTable}`);
    }
    
    // Get the table structure
    logger.info(`Creating backup table '${backupTable}'`, {
      component: 'Database',
      operation: 'CreateBackupTable'
    });
    
    console.log(`Creating backup table '${backupTable}'...`);
    
    // Create the backup table with the same structure as the source
    await client.query(`CREATE TABLE ${backupTable} (LIKE ${sourceTable} INCLUDING ALL)`);
    
    // Copy data from source to backup
    logger.info(`Copying data from '${sourceTable}' to '${backupTable}'`, {
      component: 'Database',
      operation: 'CopyData'
    });
    
    console.log(`Copying data from '${sourceTable}' to '${backupTable}'...`);
    
    const insertResult = await client.query(`INSERT INTO ${backupTable} SELECT * FROM ${sourceTable}`);
    
    logger.info(`Successfully copied ${insertResult.rowCount} rows to backup table`, {
      component: 'Database',
      operation: 'CopyDataSuccess',
      data: {
        rowsCopied: insertResult.rowCount
      }
    });
    
    console.log(`✅ Successfully copied ${insertResult.rowCount} rows to backup table '${backupTable}'.`);
    
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
async function verifyBackup(client, sourceTable, backupTable) {
  try {
    // Check if both tables exist
    const sourceExists = await checkIfSourceTableExists(client, sourceTable);
    const backupExists = await checkIfBackupTableExists(client, backupTable);
    
    if (!sourceExists) {
      console.error(`❌ Source table '${sourceTable}' does not exist.`);
      return false;
    }
    
    if (!backupExists) {
      console.error(`❌ Backup table '${backupTable}' does not exist. Run the backup first.`);
      return false;
    }
    
    // Compare row counts
    logger.info('Verifying backup by comparing row counts', {
      component: 'Verification',
      operation: 'CompareRowCounts'
    });
    
    console.log('Verifying backup integrity...');
    
    const sourceCountResult = await client.query(`SELECT COUNT(*) FROM ${sourceTable}`);
    const backupCountResult = await client.query(`SELECT COUNT(*) FROM ${backupTable}`);
    
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
      console.error(`❌ Row count mismatch: ${sourceTable}=${sourceCount}, ${backupTable}=${backupCount}`);
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
    
    const sourceColumnsResult = await client.query(columnsQuery, [sourceTable]);
    const backupColumnsResult = await client.query(columnsQuery, [backupTable]);
    
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
      
      console.error(`❌ Column count mismatch: ${sourceTable}=${sourceColumns.length}, ${backupTable}=${backupColumns.length}`);
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
    
    const pkResult = await client.query(idQuery, [sourceTable]);
    
    if (pkResult.rows.length === 0) {
      // No primary key, use random rows
      const sampleQuery = `
        SELECT * FROM ${sourceTable} 
        ORDER BY random() 
        LIMIT 5
      `;
      
      const samples = await client.query(sampleQuery);
      
      for (const sample of samples.rows) {
        // Use first column as reference
        const firstCol = Object.keys(sample)[0];
        const firstVal = sample[firstCol];
        
        if (firstVal === null) continue; // Skip null values
        
        // Find matching row in backup
        const matchQuery = `
          SELECT COUNT(*) FROM ${backupTable}
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
        SELECT ${pkColumn} FROM ${sourceTable} 
        ORDER BY random() 
        LIMIT 5
      `;
      
      const samples = await client.query(sampleQuery);
      
      for (const sample of samples.rows) {
        const pkValue = sample[pkColumn];
        
        if (pkValue === null) continue; // Skip null values
        
        // Find matching row in backup
        const matchQuery = `
          SELECT COUNT(*) FROM ${backupTable}
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
    console.log(`Source table: ${sourceTable} (${sourceCount} rows)`);
    console.log(`Backup table: ${backupTable} (${backupCount} rows)`);
    
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
  logger.info('Starting Table Backup Script', {
    component: 'Job',
    operation: 'StartJob',
    data: {
      sourceTable: tableName,
      backupTable: BACKUP_TABLE,
      verify: shouldVerify
    }
  });
  
  console.log(`${shouldVerify ? 'Verifying' : 'Creating'} backup for table '${tableName}'`);
  
  const startTime = Date.now();
  
  try {
    // Initialize database
    const pool = await initDatabase();
    const client = await pool.connect();
    
    try {
      if (shouldVerify) {
        // Verify the backup
        await verifyBackup(client, tableName, BACKUP_TABLE);
      } else {
        // Create a backup
        await createBackup(client, tableName, BACKUP_TABLE);
      }
    } finally {
      client.release();
    }
    
    // Close database connection
    await pool.end();
    
    const duration = Date.now() - startTime;
    
    logger.info('Table Backup Script completed', {
      component: 'Job',
      operation: 'CompleteJob',
      duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Table Backup Script failed', {
      component: 'Job',
      operation: 'JobFailed',
      duration,
      error: error.toString()
    });
    
    console.error(`❌ Backup operation failed: ${error.message}`);
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
  console.error(`❌ Unhandled error: ${err.message}`);
  process.exit(1);
}); 