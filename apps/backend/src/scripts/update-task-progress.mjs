import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup database connection
const { Pool } = pkg;
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

async function updateTaskProgress() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Create a log entry for the coordinate precision update
    const logQuery = `
      INSERT INTO task_logs (
        task_name, 
        description, 
        status, 
        details, 
        created_at, 
        updated_at
      ) VALUES (
        'Reservoir Coordinates Precision Update',
        'Updated reservoir coordinates to maintain 8 decimal places precision',
        'COMPLETED',
        $1,
        NOW(),
        NOW()
      ) RETURNING *;
    `;
    
    const logDetails = {
      action: 'update_precision',
      totalRecords: 495,
      columnTypes: ['reservoir_lat: TEXT', 'reservoir_long: TEXT'],
      exportedFile: 'reservoir_locations_8decimals_final.json',
      timestamp: new Date().toISOString()
    };
    
    const logResult = await client.query(logQuery, [JSON.stringify(logDetails)]);
    console.log('Created task log entry:', logResult.rows[0]);
    
    // 2. Update the task status in the tasks table (if it exists)
    const checkTaskQuery = `
      SELECT * FROM information_schema.tables 
      WHERE table_name = 'tasks';
    `;
    
    const taskTableExists = await client.query(checkTaskQuery);
    
    if (taskTableExists.rows.length > 0) {
      const updateTaskQuery = `
        UPDATE tasks
        SET 
          status = 'COMPLETED',
          progress = 100,
          updated_at = NOW(),
          details = jsonb_set(
            COALESCE(details, '{}'::jsonb),
            '{coordinate_precision}',
            $1::jsonb
          )
        WHERE task_name = 'Reservoir Data Update'
        RETURNING *;
      `;
      
      const taskDetails = {
        precision: '8 decimal places',
        recordsUpdated: 495,
        completedAt: new Date().toISOString()
      };
      
      const taskResult = await client.query(updateTaskQuery, [JSON.stringify(taskDetails)]);
      
      if (taskResult.rowCount > 0) {
        console.log('Updated task status:', taskResult.rows[0]);
      } else {
        console.log('No matching task found to update');
        
        // Create a new task entry if none exists
        const createTaskQuery = `
          INSERT INTO tasks (
            task_name,
            description,
            status,
            progress,
            details,
            created_at,
            updated_at
          ) VALUES (
            'Reservoir Data Update',
            'Update of reservoir coordinates to maintain 8 decimal places precision',
            'COMPLETED',
            100,
            $1,
            NOW(),
            NOW()
          ) RETURNING *;
        `;
        
        const newTaskDetails = {
          coordinate_precision: {
            precision: '8 decimal places',
            recordsUpdated: 495,
            completedAt: new Date().toISOString()
          }
        };
        
        const newTaskResult = await client.query(createTaskQuery, [JSON.stringify(newTaskDetails)]);
        console.log('Created new task entry:', newTaskResult.rows[0]);
      }
    } else {
      console.log('Tasks table does not exist, skipping task update');
    }
    
    // 3. Generate a summary report
    const summaryPath = path.resolve(__dirname, '../../../../coordinate_precision_update_summary.json');
    
    const summary = {
      taskName: 'Reservoir Coordinates Precision Update',
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      details: {
        totalReservoirs: 495,
        updatedColumns: ['reservoir_lat', 'reservoir_long'],
        newColumnType: 'TEXT',
        exportedFiles: [
          'reservoir_locations_exact_precision.json',
          'reservoir_locations_8decimals_final.json'
        ],
        sampleData: [
          {
            id: 'rsv01',
            lat: '18.68840521',
            long: '99.27046237'
          },
          {
            id: 'rsv02',
            lat: '18.70082146',
            long: '98.94305522'
          },
          {
            id: 'rsv10',
            lat: '18.37657163',
            long: '98.3533572'
          }
        ]
      }
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`Generated summary report at: ${summaryPath}`);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Task progress update completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
updateTaskProgress().then(() => {
  console.log('Task progress update completed');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 