// Script to view all ThaiWater rainfall data
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
 * Fetches rainfall data with pagination
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of records per page
 * @param {string} dataSource - Filter by data source (optional)
 * @returns {Promise<Object>} - Query result
 */
async function fetchRainfallData(page = 1, pageSize = 20, dataSource = null) {
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
      // Calculate offset
      const offset = (page - 1) * pageSize;
      
      // Build query
      let query = `
        SELECT 
          r.id,
          r.tele_station_id,
          s.tele_station_name,
          s.tele_station_name_th,
          r.rainfall10m,
          r.rainfall1h,
          r.rainfall24h,
          r.rainfall3h,
          r.rainfall_datetime,
          r.data_source,
          s.province,
          s.amphure
        FROM 
          public.thaiwater_rainfall_data r
        JOIN 
          public.thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      `;
      
      const params = [];
      
      // Add data source filter if provided
      if (dataSource) {
        query += ` WHERE r.data_source = $1`;
        params.push(dataSource);
      }
      
      // Add order by and pagination
      query += `
        ORDER BY r.rainfall_datetime DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(pageSize, offset);
      
      // Execute query
      const result = await client.query(query, params);
      
      // Get total count
      let countQuery = `SELECT COUNT(*) FROM public.thaiwater_rainfall_data`;
      if (dataSource) {
        countQuery += ` WHERE data_source = $1`;
      }
      
      const countResult = await client.query(countQuery, dataSource ? [dataSource] : []);
      const totalCount = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalCount / pageSize);
      
      return {
        data: result.rows,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages
        }
      };
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
 * Formats a date string
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

/**
 * Formats a rainfall value
 * @param {number|string} value - Rainfall value
 * @returns {string} - Formatted rainfall value
 */
function formatRainfall(value) {
  if (value === null || value === undefined) return 'N/A';
  
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check if it's a valid number
  if (isNaN(numValue)) return 'N/A';
  
  return `${numValue.toFixed(2)} mm`;
}

/**
 * Displays rainfall data in a table format
 * @param {Array} data - Rainfall data
 */
function displayRainfallData(data) {
  if (data.length === 0) {
    console.log('No rainfall data found.');
    return;
  }
  
  // Print header
  console.log('\n=== THAIWATER RAINFALL DATA ===\n');
  
  // Print each record
  data.forEach((record, index) => {
    console.log(`Record #${index + 1}:`);
    console.log(`  Station ID: ${record.tele_station_id}`);
    console.log(`  Station Name: ${record.tele_station_name || record.tele_station_name_th || 'N/A'}`);
    console.log(`  Location: ${record.province || 'N/A'}, ${record.amphure || 'N/A'}`);
    console.log(`  Date/Time: ${formatDate(record.rainfall_datetime)}`);
    console.log(`  Rainfall (10m): ${formatRainfall(record.rainfall10m)}`);
    console.log(`  Rainfall (1h): ${formatRainfall(record.rainfall1h)}`);
    console.log(`  Rainfall (24h): ${formatRainfall(record.rainfall24h)}`);
    console.log(`  Rainfall (3h): ${formatRainfall(record.rainfall3h)}`);
    console.log(`  Data Source: ${record.data_source}`);
    console.log('  ---');
  });
}

/**
 * Displays pagination information
 * @param {Object} pagination - Pagination information
 */
function displayPagination(pagination) {
  console.log(`\nPage ${pagination.page} of ${pagination.totalPages}`);
  console.log(`Showing ${pagination.pageSize} records per page`);
  console.log(`Total records: ${pagination.totalCount}`);
}

/**
 * Main function to view rainfall data
 */
async function viewRainfallData() {
  let page = 1;
  let pageSize = 20;
  let dataSource = null;
  
  // Ask for data source filter
  await new Promise((resolve) => {
    rl.question('Filter by data source (HII/TMD/ALL): ', (answer) => {
      if (answer.toUpperCase() === 'HII') {
        dataSource = 'HII';
      } else if (answer.toUpperCase() === 'TMD') {
        dataSource = 'TMD';
      }
      resolve();
    });
  });
  
  // Ask for page size
  await new Promise((resolve) => {
    rl.question('Number of records per page (default: 20): ', (answer) => {
      if (answer && !isNaN(parseInt(answer, 10))) {
        pageSize = parseInt(answer, 10);
      }
      resolve();
    });
  });
  
  // Main loop for pagination
  let running = true;
  
  while (running) {
    try {
      // Fetch data
      const result = await fetchRainfallData(page, pageSize, dataSource);
      
      // Display data
      displayRainfallData(result.data);
      displayPagination(result.pagination);
      
      // Navigation options
      console.log('\nNavigation:');
      console.log('  [n] Next page');
      console.log('  [p] Previous page');
      console.log('  [g] Go to page');
      console.log('  [f] Change filter');
      console.log('  [q] Quit');
      
      // Get user input
      const action = await new Promise((resolve) => {
        rl.question('\nEnter option: ', (answer) => {
          resolve(answer.toLowerCase());
        });
      });
      
      switch (action) {
        case 'n':
          if (page < result.pagination.totalPages) {
            page++;
          } else {
            console.log('Already on the last page.');
          }
          break;
        case 'p':
          if (page > 1) {
            page--;
          } else {
            console.log('Already on the first page.');
          }
          break;
        case 'g':
          await new Promise((resolve) => {
            rl.question('Enter page number: ', (answer) => {
              const newPage = parseInt(answer, 10);
              if (!isNaN(newPage) && newPage > 0 && newPage <= result.pagination.totalPages) {
                page = newPage;
              } else {
                console.log(`Invalid page number. Must be between 1 and ${result.pagination.totalPages}.`);
              }
              resolve();
            });
          });
          break;
        case 'f':
          await new Promise((resolve) => {
            rl.question('Filter by data source (HII/TMD/ALL): ', (answer) => {
              if (answer.toUpperCase() === 'HII') {
                dataSource = 'HII';
              } else if (answer.toUpperCase() === 'TMD') {
                dataSource = 'TMD';
              } else {
                dataSource = null;
              }
              page = 1; // Reset to first page when changing filter
              resolve();
            });
          });
          break;
        case 'q':
          running = false;
          break;
        default:
          console.log('Invalid option. Please try again.');
      }
      
    } catch (error) {
      console.error('Error fetching rainfall data:', error);
      running = false;
    }
  }
  
  rl.close();
}

// Run the main function
console.log('ThaiWater Rainfall Data Viewer');
console.log('=============================');
viewRainfallData()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 