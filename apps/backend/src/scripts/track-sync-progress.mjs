import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../../logs');

// Create logs directory if it doesn't exist
async function ensureLogDir() {
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error('Error creating logs directory:', error);
  }
}

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  ssl: {
    rejectUnauthorized: false
  }
});

// Create task_status table if it doesn't exist
async function createTaskStatusTable() {
  const client = await pool.connect();
  try {
    console.log('Checking if task_status table exists...');
    
    // Check if table exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_status'
      )
    `);
    
    if (!checkResult.rows[0].exists) {
      console.log('Creating task_status table...');
      await client.query(`
        CREATE TABLE task_status (
          id SERIAL PRIMARY KEY,
          task_name VARCHAR(100) NOT NULL UNIQUE,
          last_run TIMESTAMP WITH TIME ZONE,
          status VARCHAR(50) NOT NULL,
          records_processed INTEGER,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default tasks
      await client.query(`
        INSERT INTO task_status (task_name, status, records_processed, error_message)
        VALUES 
          ('reservoir_sync', 'PENDING', 0, NULL),
          ('thaiwater_sync', 'PENDING', 0, NULL),
          ('tmd_sync', 'PENDING', 0, NULL)
        ON CONFLICT (task_name) DO NOTHING
      `);
      
      console.log('Task status table created successfully');
    } else {
      console.log('Task status table already exists');
    }
  } catch (error) {
    console.error('Error creating task status table:', error);
  } finally {
    client.release();
  }
}

// Update task status
async function updateTaskStatus(taskName, status, recordsProcessed = 0, errorMessage = null) {
  const client = await pool.connect();
  try {
    // Update the task status
    await client.query(`
      UPDATE task_status
      SET 
        last_run = CURRENT_TIMESTAMP,
        status = $1,
        records_processed = $2,
        error_message = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE task_name = $4
    `, [status, recordsProcessed, errorMessage, taskName]);
    
    console.log(`Updated status for task ${taskName}: ${status}`);
    
    // Get all task statuses for logging
    const result = await client.query(`
      SELECT task_name, last_run, status, records_processed, error_message
      FROM task_status
      ORDER BY task_name
    `);
    
    // Write to log file
    const logContent = {
      timestamp: new Date().toISOString(),
      tasks: result.rows
    };
    
    await ensureLogDir();
    await fs.writeFile(
      path.join(logDir, 'task-status.json'), 
      JSON.stringify(logContent, null, 2)
    );
    
    return { success: true, data: result.rows };
  } catch (error) {
    console.error(`Error updating task status for ${taskName}:`, error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Get task statuses
async function getTaskStatuses() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT task_name, last_run, status, records_processed, error_message
      FROM task_status
      ORDER BY task_name
    `);
    
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Error getting task statuses:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Check reservoir data to find most recent update
async function checkReservoirData() {
  const client = await pool.connect();
  try {
    // Check if table exists
    const checkTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reservoir_data'
      )
    `);
    
    if (!checkTableResult.rows[0].exists) {
      return {
        success: false,
        error: 'reservoir_data table does not exist'
      };
    }
    
    // Get count and most recent date
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        MAX(updated_at) as last_updated,
        COUNT(DISTINCT reservoir_id) as unique_stations
      FROM reservoir_data
    `);
    
    return {
      success: true, 
      data: result.rows[0]
    };
  } catch (error) {
    console.error('Error checking reservoir data:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Check rainfall data to find most recent update
async function checkRainfallData() {
  const client = await pool.connect();
  try {
    // Check if table exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'thaiwater_rainfall_data_new'
      )
    `);
    
    if (!checkResult.rows[0].exists) {
      return {
        success: false,
        error: 'thaiwater_rainfall_data_new table does not exist'
      };
    }
    
    // Get count and most recent date
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        MAX(updated_at) as last_updated,
        COUNT(DISTINCT tele_station_id) as unique_stations
      FROM thaiwater_rainfall_data_new
    `);
    
    return {
      success: true, 
      data: result.rows[0]
    };
  } catch (error) {
    console.error('Error checking rainfall data:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// Main function to update all task progress
async function updateTaskProgress() {
  try {
    console.log('Starting task progress update...');
    
    // Create task status table if it doesn't exist
    await createTaskStatusTable();
    
    // Check reservoir data
    const reservoirStatus = await checkReservoirData();
    if (reservoirStatus.success) {
      const { total_records, last_updated, unique_stations } = reservoirStatus.data;
      console.log(`Reservoir data: ${total_records} records, ${unique_stations} stations, last updated: ${last_updated}`);
      
      // Update reservoir task status
      await updateTaskStatus(
        'reservoir_sync',
        last_updated ? 'SUCCESS' : 'PENDING',
        total_records,
        null
      );
    } else {
      await updateTaskStatus(
        'reservoir_sync',
        'ERROR',
        0,
        reservoirStatus.error
      );
    }
    
    // Check rainfall data
    const rainfallStatus = await checkRainfallData();
    if (rainfallStatus.success) {
      const { total_records, last_updated, unique_stations } = rainfallStatus.data;
      console.log(`Rainfall data: ${total_records} records, ${unique_stations} stations, last updated: ${last_updated}`);
      
      // Update rainfall task statuses
      await updateTaskStatus(
        'thaiwater_sync',
        last_updated ? 'SUCCESS' : 'PENDING',
        total_records,
        null
      );
      
      await updateTaskStatus(
        'tmd_sync',
        last_updated ? 'SUCCESS' : 'PENDING',
        total_records,
        null
      );
    } else {
      await updateTaskStatus(
        'thaiwater_sync',
        'ERROR',
        0,
        rainfallStatus.error
      );
      
      await updateTaskStatus(
        'tmd_sync',
        'ERROR',
        0,
        rainfallStatus.error
      );
    }
    
    // Get updated statuses
    const statuses = await getTaskStatuses();
    console.log('Current task statuses:');
    console.table(statuses.data);
    
    console.log('Task progress update completed');
  } catch (error) {
    console.error('Error updating task progress:', error);
  } finally {
    await pool.end();
  }
}

// Run the function if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  updateTaskProgress().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

// Export functions for use in other modules
export {
  updateTaskStatus,
  getTaskStatuses,
  checkReservoirData,
  checkRainfallData,
  updateTaskProgress
}; 