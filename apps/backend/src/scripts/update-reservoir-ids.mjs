import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

// Path to the CSV file - using the exact location we found
const csvFilePath = '/Users/subhajlimanond/dev/swoc-social-listening-fullstack/!DAMInfo_201911271750.csv';
console.log(`Using CSV path: ${csvFilePath}`);

// Database connection
const pool = new Pool({
  user: 'swoc-uat-gis-ssl-user',
  password: '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: 15435,
  database: 'swoc-uat-gis-ssl',
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to normalize Thai text by replacing similar characters
function normalizeThaiText(text) {
  if (!text) return '';
  
  // Replace common character variations
  return text
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/ํา/g, 'ำ')  // Replace separated vowel with combined form
    .replace(/บํา/g, 'บำ') // Specific case for "บำรุง"
    .replace(/์/g, '')    // Remove tone marks
    .replace(/\./g, '')   // Remove periods
    .toLowerCase();       // Convert to lowercase
}

async function updateReservoirIds() {
  console.log(`Reading CSV file from: ${csvFilePath}`);
  
  let csvContent;
  try {
    csvContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
  } catch (error) {
    console.error(`Error reading CSV file: ${error.message}`);
    return;
  }
  
  // Manually parse the CSV to handle the specific format
  // Split into lines and filter out empty lines
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  
  // Process valid data rows (lines with DAM_ID and DAM_Name)
  const damData = [];
  for (let i = 3; i < lines.length; i++) { // Start from line 4 (index 3) to skip metadata
    const line = lines[i];
    const values = line.split(',');
    
    if (values.length >= 4 && values[0] && values[3]) { // Check for DAM_ID and DAM_Name
      const damId = values[0].trim();
      const damName = values[3].trim();
      
      if (damId && damName) {
        damData.push({ DAM_ID: damId, DAM_Name: damName });
      }
    }
  }
  
  console.log(`Found ${damData.length} valid dam records in CSV file`);
  
  // Debug - Print the first few dam records
  for (let i = 0; i < Math.min(5, damData.length); i++) {
    console.log(`Dam ${i+1}: ID=${damData[i].DAM_ID}, Name=${damData[i].DAM_Name}`);
  }
  
  // Create mapping of dam name to DAM_ID
  const damNameToIdMap = {};
  const normalizedNameToIdMap = {};
  
  damData.forEach(dam => {
    damNameToIdMap[dam.DAM_Name] = dam.DAM_ID;
    
    // Store normalized versions of the name
    const normalizedName = normalizeThaiText(dam.DAM_Name);
    if (normalizedName) {
      normalizedNameToIdMap[normalizedName] = dam.DAM_ID;
    }
    
    // Handle variations with/without "เขื่อน" prefix
    if (dam.DAM_Name.startsWith('เขื่อน')) {
      const withoutPrefix = dam.DAM_Name.replace(/^เขื่อน/, '').trim();
      normalizedNameToIdMap[normalizeThaiText(withoutPrefix)] = dam.DAM_ID;
    } else {
      const withPrefix = `เขื่อน${dam.DAM_Name}`;
      normalizedNameToIdMap[normalizeThaiText(withPrefix)] = dam.DAM_ID;
    }
  });
  
  console.log(`Created mapping for ${Object.keys(damNameToIdMap).length} original dam names`);
  console.log(`Created normalized mapping for ${Object.keys(normalizedNameToIdMap).length} dam name variations`);
  
  // Get all reservoirs from the database
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get only the reservoirs with data_source = 'dam' for better focusing
    const { rows: reservoirs } = await client.query('SELECT id, reservoir_name, reservoir_id, data_source FROM reservoir_locations WHERE data_source = \'dam\'');
    console.log(`Found ${reservoirs.length} reservoirs with data_source = 'dam'`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const notMatchedNames = [];
    
    // Update reservoir_id for matching reservoirs
    for (const reservoir of reservoirs) {
      const reservoirName = reservoir.reservoir_name;
      const normalizedReservoirName = normalizeThaiText(reservoirName);
      
      // Try to find a match using exact name or normalized name
      let damId = damNameToIdMap[reservoirName];
      if (!damId) {
        damId = normalizedNameToIdMap[normalizedReservoirName];
      }
      
      console.log(`Trying to match: ${reservoirName} (normalized: ${normalizedReservoirName})`);
      console.log(`Match found: ${damId ? 'YES - ' + damId : 'NO'}`);
      
      if (damId) {
        // Update the reservoir_id
        await client.query(
          'UPDATE reservoir_locations SET reservoir_id = $1 WHERE id = $2',
          [damId, reservoir.id]
        );
        updatedCount++;
      } else {
        // Store unmatched dam names for reporting
        notMatchedNames.push(reservoirName);
        skippedCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`Update completed. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    
    // Display reservoirs that didn't find a match
    if (notMatchedNames.length > 0) {
      console.log('Reservoirs with no matching DAM_ID:');
      notMatchedNames.slice(0, 20).forEach(name => console.log(name));
      if (notMatchedNames.length > 20) {
        console.log(`...and ${notMatchedNames.length - 20} more`);
      }
    }
    
    // Show sample of updated reservoirs
    const { rows: updatedReservoirs } = await client.query(
      'SELECT reservoir_name, reservoir_id FROM reservoir_locations WHERE reservoir_id IS NOT NULL AND data_source = \'dam\' LIMIT 10'
    );
    console.log('Sample of updated reservoirs:');
    console.table(updatedReservoirs);
    
    // Count total records with non-null reservoir_id
    const { rows: countResult } = await client.query(
      'SELECT COUNT(*) as count FROM reservoir_locations WHERE reservoir_id IS NOT NULL'
    );
    console.log(`Total records with reservoir_id: ${countResult[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error updating reservoir IDs: ${error.message}`);
  } finally {
    client.release();
    console.log('Database connection released.');
    pool.end();
    console.log('Database pool ended.');
  }
}

// Run the update function
updateReservoirIds(); 