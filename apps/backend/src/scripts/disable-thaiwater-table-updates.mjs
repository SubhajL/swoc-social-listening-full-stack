#!/usr/bin/env node

/**
 * Disable/Enable Updates to ThaiWater Telemetry Stations Table
 * 
 * This script creates or removes a PostgreSQL RULE that prevents updates to the thaiwater_tele_stations table.
 * 
 * Usage:
 *   node src/scripts/disable-thaiwater-table-updates.mjs --disable   # Disable updates to the table
 *   node src/scripts/disable-thaiwater-table-updates.mjs --enable    # Re-enable updates to the table
 *   node src/scripts/disable-thaiwater-table-updates.mjs --status    # Check if updates are currently disabled
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
  jobType: 'THAIWATER_TABLE_UPDATES',
  filename: 'thaiwater-table-updates.log'
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

// The table name to disable updates for
const TABLE_NAME = 'thaiwater_tele_stations';
const RULE_NAME = 'no_update_rule';

// Parse command line arguments
const args = process.argv.slice(2);
const shouldDisable = args.includes('--disable');
const shouldEnable = args.includes('--enable');
const checkStatus = args.includes('--status');

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
      error
    });
    throw error;
  }
}

/**
 * Check if the no_update_rule exists on the table
 */
async function checkIfRuleExists(client) {
  try {
    const query = `
      SELECT 1
      FROM pg_rules
      WHERE tablename = $1
      AND rulename = $2
    `;
    
    const result = await client.query(query, [TABLE_NAME, RULE_NAME]);
    return result.rowCount > 0;
  } catch (error) {
    logger.error('Error checking if rule exists', {
      component: 'Database',
      operation: 'CheckRule',
      error
    });
    throw error;
  }
}

/**
 * Disable updates to the thaiwater_tele_stations table
 */
async function disableTableUpdates(client) {
  try {
    // First check if the rule already exists
    const ruleExists = await checkIfRuleExists(client);
    
    if (ruleExists) {
      logger.info(`Updates are already disabled for ${TABLE_NAME}`, {
        component: 'Database',
        operation: 'AlreadyDisabled'
      });
      return false;
    }
    
    // Create the rule to prevent updates
    const query = `
      CREATE RULE ${RULE_NAME} AS ON UPDATE TO ${TABLE_NAME}
      DO INSTEAD NOTHING;
    `;
    
    await client.query(query);
    
    logger.info(`Successfully disabled updates to ${TABLE_NAME} table`, {
      component: 'Database',
      operation: 'DisableSuccess'
    });
    
    return true;
  } catch (error) {
    logger.error(`Error disabling updates to ${TABLE_NAME} table`, {
      component: 'Database',
      operation: 'DisableError',
      error
    });
    throw error;
  }
}

/**
 * Enable updates to the thaiwater_tele_stations table
 */
async function enableTableUpdates(client) {
  try {
    // First check if the rule exists
    const ruleExists = await checkIfRuleExists(client);
    
    if (!ruleExists) {
      logger.info(`Updates are already enabled for ${TABLE_NAME}`, {
        component: 'Database',
        operation: 'AlreadyEnabled'
      });
      return false;
    }
    
    // Drop the rule to re-enable updates
    const query = `
      DROP RULE ${RULE_NAME} ON ${TABLE_NAME};
    `;
    
    await client.query(query);
    
    logger.info(`Successfully re-enabled updates to ${TABLE_NAME} table`, {
      component: 'Database',
      operation: 'EnableSuccess'
    });
    
    return true;
  } catch (error) {
    logger.error(`Error enabling updates to ${TABLE_NAME} table`, {
      component: 'Database',
      operation: 'EnableError',
      error
    });
    throw error;
  }
}

/**
 * Test the update capability by trying to update a non-existent record
 */
async function testUpdateCapability(client) {
  try {
    // Begin a transaction
    await client.query('BEGIN');
    
    // Try to update a non-existent record (should not affect any real data)
    const query = `
      UPDATE ${TABLE_NAME}
      SET updated_at = NOW()
      WHERE tele_station_id = -99999
      RETURNING tele_station_id;
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
      error
    });
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  logger.info('Starting ThaiWater Table Updates Script', {
    component: 'Job',
    operation: 'StartJob',
    data: {
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
        await disableTableUpdates(client);
      } else if (shouldEnable) {
        // Enable updates to the table
        await enableTableUpdates(client);
      } else if (checkStatus) {
        // Check the current status
        const ruleExists = await checkIfRuleExists(client);
        const updatesEnabled = await testUpdateCapability(client);
        
        if (ruleExists) {
          console.log(`✅ Rule '${RULE_NAME}' exists on table '${TABLE_NAME}'`);
        } else {
          console.log(`❌ Rule '${RULE_NAME}' does not exist on table '${TABLE_NAME}'`);
        }
        
        if (updatesEnabled) {
          console.log(`✅ Updates to table '${TABLE_NAME}' are currently ENABLED`);
        } else {
          console.log(`⛔ Updates to table '${TABLE_NAME}' are currently DISABLED`);
        }
      } else {
        console.log('Please provide a command: --disable, --enable, or --status');
        console.log('Usage:');
        console.log('  node src/scripts/disable-thaiwater-table-updates.mjs --disable   # Disable updates to the table');
        console.log('  node src/scripts/disable-thaiwater-table-updates.mjs --enable    # Re-enable updates to the table');
        console.log('  node src/scripts/disable-thaiwater-table-updates.mjs --status    # Check if updates are currently disabled');
      }
    } finally {
      client.release();
    }
    
    // Close database connection
    await pool.end();
    
    const duration = Date.now() - startTime;
    
    logger.info('ThaiWater Table Updates Script completed', {
      component: 'Job',
      operation: 'CompleteJob',
      duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('ThaiWater Table Updates Script failed', {
      component: 'Job',
      operation: 'JobFailed',
      duration,
      error
    });
    
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  logger.error('Unhandled error in main function', {
    component: 'Job',
    operation: 'UnhandledError',
    error: err
  });
  process.exit(1);
}); 