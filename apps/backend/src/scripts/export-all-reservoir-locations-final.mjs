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

async function exportAllReservoirLocations() {
  const client = await pool.connect();
  
  try {
    console.log('Connecting to database...');
    
    // Query to get all records from reservoir_locations
    const query = `
      SELECT * FROM reservoir_locations
      ORDER BY id;
    `;
    
    console.log('Executing query to fetch all reservoir locations...');
    const result = await client.query(query);
    
    console.log(`Retrieved ${result.rows.length} reservoir records`);
    
    // Define output file path
    const outputPath = path.resolve(__dirname, '../../../../reservoir_locations_all_records.json');
    
    // Ensure coordinates are preserved as strings to maintain precision
    const jsonData = JSON.stringify(result.rows, (key, value) => {
      // Make sure reservoir_lat and reservoir_long are treated as strings
      if (key === 'reservoir_lat' || key === 'reservoir_long') {
        return value !== null ? value.toString() : null;
      }
      return value;
    }, 2);
    
    // Write to file
    fs.writeFileSync(outputPath, jsonData);
    
    console.log(`Exported all reservoir locations to: ${outputPath}`);
    
    // Show a sample of the data
    console.log('\nSample of exported data (first 5 records):');
    console.table(result.rows.slice(0, 5).map(r => ({
      id: r.id,
      reservoir_id: r.reservoir_id,
      reservoir_name: r.reservoir_name,
      reservoir_lat: r.reservoir_lat,
      reservoir_long: r.reservoir_long,
      province: r.province,
      amphure: r.amphure,
      tambon: r.tambon
    })));
    
    // Count records by province
    const provinceCount = {};
    result.rows.forEach(row => {
      const province = row.province || 'Unknown';
      provinceCount[province] = (provinceCount[province] || 0) + 1;
    });
    
    console.log('\nReservoir count by province:');
    Object.entries(provinceCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([province, count]) => {
        console.log(`${province}: ${count}`);
      });
    
    return result.rows.length;
    
  } catch (error) {
    console.error(`Error exporting reservoir locations: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
exportAllReservoirLocations().then((count) => {
  console.log(`Successfully exported ${count} reservoir locations`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 