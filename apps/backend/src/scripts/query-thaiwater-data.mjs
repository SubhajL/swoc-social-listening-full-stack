// Script to query ThaiWater data
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Executes a query on the ThaiWater tables
 * @param {string} query - SQL query to execute
 * @returns {Promise<Object>} - Query result
 */
async function executeQuery(query) {
  // Check if DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not defined');
    process.exit(1);
  }
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      console.log('Executing query...');
      const result = await client.query(query);
      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    } finally {
      // Release client back to pool
      client.release();
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  } finally {
    // Close pool
    await pool.end();
  }
}

/**
 * Displays the available queries
 */
function displayAvailableQueries() {
  console.log('\nAvailable queries:');
  console.log('1. List all stations');
  console.log('2. List HII stations');
  console.log('3. List TMD stations');
  console.log('4. List recent rainfall data');
  console.log('5. List rainfall data by station ID');
  console.log('6. List rainfall data by data source');
  console.log('7. Custom query');
  console.log('8. Exit');
}

/**
 * Handles user query selection
 */
async function handleQuerySelection() {
  displayAvailableQueries();
  
  rl.question('\nEnter your choice (1-8): ', async (choice) => {
    let query = '';
    let additionalInput = '';
    
    switch (choice) {
      case '1':
        query = 'SELECT * FROM public.thaiwater_tele_stations LIMIT 100';
        break;
      case '2':
        query = "SELECT * FROM public.thaiwater_tele_stations WHERE data_source = 'HII' LIMIT 100";
        break;
      case '3':
        query = "SELECT * FROM public.thaiwater_tele_stations WHERE data_source = 'TMD' LIMIT 100";
        break;
      case '4':
        query = 'SELECT * FROM public.thaiwater_rainfall_data ORDER BY rainfall_datetime DESC LIMIT 100';
        break;
      case '5':
        await new Promise((resolve) => {
          rl.question('Enter station ID: ', (stationId) => {
            query = `SELECT * FROM public.thaiwater_rainfall_data WHERE tele_station_id = '${stationId}' ORDER BY rainfall_datetime DESC LIMIT 100`;
            resolve();
          });
        });
        break;
      case '6':
        await new Promise((resolve) => {
          rl.question("Enter data source (HII or TMD): ", (dataSource) => {
            query = `SELECT * FROM public.thaiwater_rainfall_data WHERE data_source = '${dataSource}' ORDER BY rainfall_datetime DESC LIMIT 100`;
            resolve();
          });
        });
        break;
      case '7':
        await new Promise((resolve) => {
          rl.question('Enter your custom SQL query: ', (customQuery) => {
            query = customQuery;
            resolve();
          });
        });
        break;
      case '8':
        console.log('Exiting...');
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Invalid choice. Please try again.');
        return handleQuerySelection();
    }
    
    try {
      const result = await executeQuery(query);
      console.log('\nQuery result:');
      console.log(`Found ${result.rowCount} rows`);
      
      if (result.rowCount > 0) {
        // Print column names
        console.log('\nColumns:');
        console.log(Object.keys(result.rows[0]).join(' | '));
        
        // Print rows (limit to 20 for display)
        console.log('\nRows:');
        const displayRows = result.rows.slice(0, 20);
        displayRows.forEach((row, index) => {
          console.log(`Row ${index + 1}:`, JSON.stringify(row));
        });
        
        if (result.rowCount > 20) {
          console.log(`... and ${result.rowCount - 20} more rows`);
        }
      }
    } catch (error) {
      console.error('Error executing query:', error.message);
    }
    
    // Ask if the user wants to run another query
    rl.question('\nDo you want to run another query? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        handleQuerySelection();
      } else {
        console.log('Exiting...');
        rl.close();
        process.exit(0);
      }
    });
  });
}

// Start the query tool
console.log('ThaiWater Query Tool');
console.log('===================');
handleQuerySelection(); 