import pkg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
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

// Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDQRGhAV-67h6AJlxn2nNLKjn5t4Kj8A-Y';

// Delay between API requests to avoid rate limiting
const API_DELAY = 200; // milliseconds

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to get administrative location from Google Maps API
async function getAdminLocationFromGoogle(lat, lng) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=th`;
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK') {
      console.warn(`Warning: Google API returned status ${response.data.status} for coordinates (${lat}, ${lng})`);
      return null;
    }
    
    const results = response.data.results;
    if (!results || results.length === 0) {
      console.warn(`Warning: No results from Google API for coordinates (${lat}, ${lng})`);
      return null;
    }
    
    // Extract administrative components
    let province = '';
    let amphure = '';
    let tambon = '';
    
    // Process address components
    for (const result of results) {
      const addressComponents = result.address_components || [];
      
      for (const component of addressComponents) {
        const types = component.types || [];
        
        if (types.includes('administrative_area_level_1')) {
          province = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          // Get amphure without 'อำเภอ' prefix
          const rawAmphure = component.long_name;
          amphure = rawAmphure.replace(/^อำเภอ\s*/, '');
        } else if (types.includes('administrative_area_level_3')) {
          // Get tambon without 'ตำบล' prefix
          const rawTambon = component.long_name;
          tambon = rawTambon.replace(/^ตำบล\s*/, '');
        }
      }
      
      // If we found all components, break out of the loop
      if (province && amphure && tambon) {
        break;
      }
    }
    
    return {
      province,
      amphure,
      tambon
    };
    
  } catch (error) {
    console.error(`Error getting location from Google API: ${error.message}`);
    return null;
  }
}

async function updateAdminLocations() {
  const client = await pool.connect();
  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting update of administrative locations from Google Maps API...');
    
    // Get all reservoir locations
    const query = `
      SELECT id, reservoir_id, reservoir_name, reservoir_lat, reservoir_long, province, amphure, tambon
      FROM reservoir_locations
      ORDER BY id;
    `;
    
    const result = await client.query(query);
    const reservoirs = result.rows;
    
    console.log(`Retrieved ${reservoirs.length} reservoir records`);
    
    // Create a backup of the current data
    const backupPath = path.resolve(__dirname, '../../../../reservoir_locations_backup_before_google_update.json');
    fs.writeFileSync(backupPath, JSON.stringify(reservoirs, null, 2));
    console.log(`Created backup of current data at: ${backupPath}`);
    
    // Process each reservoir
    for (let i = 0; i < reservoirs.length; i++) {
      const reservoir = reservoirs[i];
      
      // Log progress every 10 records
      if (i % 10 === 0) {
        console.log(`Processing record ${i + 1}/${reservoirs.length}...`);
      }
      
      // Skip if latitude or longitude is missing
      if (!reservoir.reservoir_lat || !reservoir.reservoir_long) {
        console.warn(`Skipping reservoir ${reservoir.reservoir_id}: Missing coordinates`);
        skippedCount++;
        continue;
      }
      
      // Get administrative location from Google Maps API
      const adminLocation = await getAdminLocationFromGoogle(
        reservoir.reservoir_lat,
        reservoir.reservoir_long
      );
      
      // Wait to avoid rate limiting
      await sleep(API_DELAY);
      
      // Skip if API call failed
      if (!adminLocation) {
        console.warn(`Skipping reservoir ${reservoir.reservoir_id}: Failed to get location from Google API`);
        errorCount++;
        continue;
      }
      
      // Update the database
      const updateQuery = `
        UPDATE reservoir_locations
        SET 
          province = $1,
          amphure = $2,
          tambon = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING id, reservoir_id, province, amphure, tambon;
      `;
      
      try {
        const updateResult = await client.query(updateQuery, [
          adminLocation.province,
          adminLocation.amphure,
          adminLocation.tambon,
          reservoir.id
        ]);
        
        if (updateResult.rowCount > 0) {
          updatedCount++;
          
          // Log details for the first few updates
          if (updatedCount <= 5) {
            console.log(`Updated ${reservoir.reservoir_id} (${reservoir.reservoir_name}): ` +
              `Province: ${adminLocation.province}, ` +
              `Amphure: ${adminLocation.amphure}, ` +
              `Tambon: ${adminLocation.tambon}`);
          }
        } else {
          console.warn(`Warning: Failed to update reservoir ${reservoir.reservoir_id}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error updating reservoir ${reservoir.reservoir_id}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
    // Export the updated data
    const updatedQuery = `
      SELECT id, reservoir_id, reservoir_name, reservoir_lat, reservoir_long, province, amphure, tambon
      FROM reservoir_locations
      ORDER BY id;
    `;
    
    const updatedResult = await client.query(updatedQuery);
    const updatedReservoirs = updatedResult.rows;
    
    const outputPath = path.resolve(__dirname, '../../../../reservoir_locations_google_updated.json');
    fs.writeFileSync(outputPath, JSON.stringify(updatedReservoirs, null, 2));
    
    console.log(`Exported updated data to: ${outputPath}`);
    
    // Show a sample of the updated data
    console.log('\nSample of updated data (first 5 records):');
    console.table(updatedReservoirs.slice(0, 5).map(r => ({
      id: r.id,
      reservoir_id: r.reservoir_id,
      reservoir_name: r.reservoir_name,
      province: r.province,
      amphure: r.amphure,
      tambon: r.tambon
    })));
    
    return {
      total: reservoirs.length,
      updated: updatedCount,
      errors: errorCount,
      skipped: skippedCount
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
updateAdminLocations().then((stats) => {
  console.log(`
Update completed:
- Total records: ${stats.total}
- Updated: ${stats.updated}
- Errors: ${stats.errors}
- Skipped: ${stats.skipped}
  `);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 