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

async function exportReservoirData() {
  const client = await pool.connect();
  
  try {
    // Get all reservoir data
    const query = `
      SELECT * FROM reservoir_locations ORDER BY reservoir_id;
    `;
    
    const result = await client.query(query);
    const reservoirs = result.rows;
    
    console.log(`Retrieved ${reservoirs.length} reservoir records from database`);
    
    // Format coordinates to have 8 decimal places
    const formattedReservoirs = reservoirs.map(reservoir => {
      // Convert to number, then format to 8 decimal places, then convert back to string
      const lat = parseFloat(reservoir.reservoir_lat).toFixed(8);
      const long = parseFloat(reservoir.reservoir_long).toFixed(8);
      
      return {
        ...reservoir,
        reservoir_lat: lat,
        reservoir_long: long
      };
    });
    
    // Export to JSON file
    const outputPath = path.resolve(__dirname, '../../../../reservoir_locations_precise_8decimals.json');
    fs.writeFileSync(outputPath, JSON.stringify(formattedReservoirs, null, 2));
    
    console.log(`Exported data with 8 decimal precision to: ${outputPath}`);
    
    // Show a sample of the formatted data
    console.log('\nSample of formatted data (first 3 records):');
    console.table(formattedReservoirs.slice(0, 3).map(r => ({
      reservoir_id: r. reservoir_id,
      reservoir_name: r.reservoir_name,
      reservoir_lat: r.reservoir_lat,
      reservoir_long: r.reservoir_long,
      province: r.province,
      amphure: r.amphure,
      tambon: r.tambon
    })));
    
  } catch (error) {
    console.error(`Error exporting data: ${error.message}`);
  } finally {
    client.release();
  }
}

// Run the function
exportReservoirData().then(() => {
  console.log('Export completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 