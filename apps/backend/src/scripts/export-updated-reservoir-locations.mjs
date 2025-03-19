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

async function exportUpdatedReservoirLocations() {
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
    const outputPath = path.resolve(__dirname, '../../../../updated_reservoir_locations.json');
    
    // Ensure coordinates are preserved as strings to maintain precision
    const jsonData = JSON.stringify(result.rows, (key, value) => {
      // Make sure reservoir_lat and reservoir_long are treated as strings
      if (key === 'reservoir_lat' || key === 'reservoir_long') {
        return value.toString();
      }
      return value;
    }, 2);
    
    // Write to file
    fs.writeFileSync(outputPath, jsonData);
    
    console.log(`Exported updated reservoir locations to: ${outputPath}`);
    
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
    
    // Verify that all amphure names are correct
    const amphureWithPrefixQuery = `
      SELECT COUNT(*) as count
      FROM reservoir_locations
      WHERE amphure LIKE 'อำเภอ%';
    `;
    
    const prefixResult = await client.query(amphureWithPrefixQuery);
    const prefixCount = parseInt(prefixResult.rows[0].count);
    
    if (prefixCount > 0) {
      console.warn(`Warning: There are still ${prefixCount} records with 'อำเภอ' prefix`);
    } else {
      console.log('All amphure names have been cleaned successfully');
    }
    
    // Check for any truncated amphure names
    const truncatedQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      WHERE 
        amphure = 'างดง' OR
        amphure = 'ี้' OR
        amphure = 'ร้าว' OR
        amphure = 'ชียงดาว';
    `;
    
    const truncatedResult = await client.query(truncatedQuery);
    
    if (truncatedResult.rowCount > 0) {
      console.warn(`Warning: Found ${truncatedResult.rowCount} records with truncated amphure names`);
      console.table(truncatedResult.rows);
    } else {
      console.log('No truncated amphure names found');
    }
    
    return result.rows.length;
    
  } catch (error) {
    console.error(`Error exporting reservoir locations: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
exportUpdatedReservoirLocations().then((count) => {
  console.log(`Successfully exported ${count} updated reservoir locations`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 