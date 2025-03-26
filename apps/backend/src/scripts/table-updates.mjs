#!/usr/bin/env node

/**
 * Disable/Enable Updates to PostgreSQL Tables
 * 
 * This script creates or removes a PostgreSQL RULE that prevents updates to a specified table.
 * 
 * Usage:
 *   node src/scripts/table-updates.mjs --disable --table=table_name    # Disable updates to the table
 *   node src/scripts/table-updates.mjs --enable --table=table_name     # Re-enable updates to the table
 *   node src/scripts/table-updates.mjs --status --table=table_name     # Check if updates are currently disabled
 * 
 * Examples:
 *   npm run table:disable -- --table=thaiwater_tele_stations
 *   npm run table:enable -- --table=thaiwater_tele_stations
 *   npm run table:status -- --table=thaiwater_tele_stations
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
  jobType: 'TABLE_UPDATE_MANAGER',
  filename: 'table-updates.log'
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

// Default rule name prefix
const RULE_NAME_PREFIX = 'no_update_rule';

// Parse command line arguments
const args = process.argv.slice(2);
const shouldDisable = args.includes('--disable');
const shouldEnable = args.includes('--enable');
const checkStatus = args.includes('--status');

// Extract table name from arguments
const tableArg = args.find(arg => arg.startsWith('--table='));
let tableName = null;

if (tableArg) {
  tableName = tableArg.split('=')[1];
}

// Validate input
if (!tableName) {
  console.error('Error: Table name is required. Use --table=table_name');
  console.log('Usage:');
  console.log('  node src/scripts/table-updates.mjs --disable --table=table_name');
  console.log('  node src/scripts/table-updates.mjs --enable --table=table_name');
  console.log('  node src/scripts/table-updates.mjs --status --table=table_name');
  process.exit(1);
}

// Calculate rule name for this table
const getRuleName = (tableName) => `${RULE_NAME_PREFIX}_${tableName}`;

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
 * Check if the table exists in the database
 */
async function checkIfTableExists(client, tableName) {
  try {
    const query = `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    `;
    
    const result = await client.query(query, [tableName]);
    return result.rowCount > 0;
  } catch (error) {
    logger.error('Error checking if table exists', {
      component: 'Database',
      operation: 'CheckTable',
      error: error.toString()
    });
    throw error;
  }
}

/**
 * Check if the no_update_rule exists on the table
 */
async function checkIfRuleExists(client, tableName) {
  const ruleName = getRuleName(tableName);
  
  try {
    const query = `
      SELECT 1
      FROM pg_rules
      WHERE tablename = $1
      AND rulename = $2
    `;
    
    const result = await client.query(query, [tableName, ruleName]);
    return result.rowCount > 0;
  } catch (error) {
    logger.error('Error checking if rule exists', {
      component: 'Database',
      operation: 'CheckRule',
      error: error.toString()
    });
    throw error;
  }
}

/**
 * Disable updates to the specified table
 */
async function disableTableUpdates(client, tableName) {
  const ruleName = getRuleName(tableName);
  
  try {
    // First check if the table exists
    const tableExists = await checkIfTableExists(client, tableName);
    
    if (!tableExists) {
      logger.error(`Table '${tableName}' does not exist`, {
        component: 'Database',
        operation: 'TableNotFound'
      });
      console.error(`❌ Error: Table '${tableName}' does not exist in the database`);
      return false;
    }
    
    // Check if the rule already exists
    const ruleExists = await checkIfRuleExists(client, tableName);
    
    if (ruleExists) {
      logger.info(`Updates are already disabled for '${tableName}'`, {
        component: 'Database',
        operation: 'AlreadyDisabled'
      });
      console.log(`⚠️ Updates are already disabled for table '${tableName}'`);
      return false;
    }
    
    // Create the rule to prevent updates
    const query = `
      CREATE RULE ${ruleName} AS ON UPDATE TO ${tableName}
      DO INSTEAD NOTHING;
    `;
    
    await client.query(query);
    
    logger.info(`Successfully disabled updates to '${tableName}' table`, {
      component: 'Database',
      operation: 'DisableSuccess'
    });
    
    console.log(`✅ Successfully disabled updates to table '${tableName}'`);
    return true;
  } catch (error) {
    logger.error(`Error disabling updates to '${tableName}' table`, {
      component: 'Database',
      operation: 'DisableError',
      error: error.toString()
    });
    console.error(`❌ Error disabling updates: ${error.message}`);
    throw error;
  }
}

/**
 * Enable updates to the specified table
 */
async function enableTableUpdates(client, tableName) {
  const ruleName = getRuleName(tableName);
  
  try {
    // First check if the table exists
    const tableExists = await checkIfTableExists(client, tableName);
    
    if (!tableExists) {
      logger.error(`Table '${tableName}' does not exist`, {
        component: 'Database',
        operation: 'TableNotFound'
      });
      console.error(`❌ Error: Table '${tableName}' does not exist in the database`);
      return false;
    }
    
    // Check if the rule exists
    const ruleExists = await checkIfRuleExists(client, tableName);
    
    if (!ruleExists) {
      logger.info(`Updates are already enabled for '${tableName}'`, {
        component: 'Database',
        operation: 'AlreadyEnabled'
      });
      console.log(`⚠️ Updates are already enabled for table '${tableName}'`);
      return false;
    }
    
    // Drop the rule to re-enable updates
    const query = `
      DROP RULE ${ruleName} ON ${tableName};
    `;
    
    await client.query(query);
    
    logger.info(`Successfully re-enabled updates to '${tableName}' table`, {
      component: 'Database',
      operation: 'EnableSuccess'
    });
    
    console.log(`✅ Successfully re-enabled updates to table '${tableName}'`);
    return true;
  } catch (error) {
    logger.error(`Error enabling updates to '${tableName}' table`, {
      component: 'Database',
      operation: 'EnableError',
      error: error.toString()
    });
    console.error(`❌ Error enabling updates: ${error.message}`);
    throw error;
  }
}

/**
 * Test the update capability by trying to update a non-existent record
 */
async function testUpdateCapability(client, tableName) {
  try {
    // Begin a transaction
    await client.query('BEGIN');
    
    // Try to update a non-existent record (should not affect any real data)
    const query = `
      UPDATE ${tableName}
      SET updated_at = NOW()
      WHERE 1=0
      RETURNING 1;
    `;
    
    try {
      const result = await client.query(query);
      
      logger.info('Update test result', {
        component: 'Database',
        operation: 'TestUpdate',
        data: {
          success: true,
          rowsAffected: result.rowCount,
          message: 'Update operation is allowed (though no rows were affected)'
        }
      });
      
      // Updates are enabled
      return true;
    } catch (error) {
      logger.info('Update test result', {
        component: 'Database',
        operation: 'TestUpdate',
        data: {
          success: false,
          message: 'Update operation is blocked',
          error: error.message
        }
      });
      
      // Updates are disabled
      return false;
    } finally {
      // Rollback the transaction (nothing should be committed)
      await client.query('ROLLBACK');
    }
  } catch (error) {
    logger.error('Error testing update capability', {
      component: 'Database',
      operation: 'TestUpdateError',
      error: error.toString()
    });
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  logger.info('Starting Table Updates Manager Script', {
    component: 'Job',
    operation: 'StartJob',
    data: {
      table: tableName,
      disable: shouldDisable,
      enable: shouldEnable,
      checkStatus: checkStatus
    }
  });
  
  const startTime = Date.now();
  
  try {
    // Initialize database
    const pool = await initDatabase();
    const client = await pool.connect();
    
    try {
      if (shouldDisable) {
        // Disable updates to the table
        await disableTableUpdates(client, tableName);
      } else if (shouldEnable) {
        // Enable updates to the table
        await enableTableUpdates(client, tableName);
      } else if (checkStatus) {
        // Check the current status
        const ruleName = getRuleName(tableName);
        const tableExists = await checkIfTableExists(client, tableName);
        
        if (!tableExists) {
          console.error(`❌ Error: Table '${tableName}' does not exist in the database`);
          return;
        }
        
        const ruleExists = await checkIfRuleExists(client, tableName);
        const updatesEnabled = await testUpdateCapability(client, tableName);
        
        if (ruleExists) {
          console.log(`✅ Rule '${ruleName}' exists on table '${tableName}'`);
        } else {
          console.log(`❌ Rule '${ruleName}' does not exist on table '${tableName}'`);
        }
        
        if (updatesEnabled) {
          console.log(`✅ Updates to table '${tableName}' are currently ENABLED`);
        } else {
          console.log(`⛔ Updates to table '${tableName}' are currently DISABLED`);
        }
      } else {
        console.log('Please provide a command: --disable, --enable, or --status');
        console.log('Usage:');
        console.log('  node src/scripts/table-updates.mjs --disable --table=table_name');
        console.log('  node src/scripts/table-updates.mjs --enable --table=table_name');
        console.log('  node src/scripts/table-updates.mjs --status --table=table_name');
      }
    } finally {
      client.release();
    }
    
    // Close database connection
    await pool.end();
    
    const duration = Date.now() - startTime;
    
    logger.info('Table Updates Manager Script completed', {
      component: 'Job',
      operation: 'CompleteJob',
      duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Table Updates Manager Script failed', {
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