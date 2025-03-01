import { getStationInfo, ThaiWaterStationData } from '../services/thaiwater/thaiwater.service';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

/**
 * Type guard to check if an item is a ThaiWaterStationData
 */
function isStationData(item: any): item is ThaiWaterStationData {
  return item && typeof item === 'object' && 'tele_station_type' in item;
}

/**
 * Script to fetch telemetry station data from ThaiWater API and insert into database
 */
async function insertThaiWaterStationsFromAPI() {
  console.log('Fetching telemetry station information from ThaiWater API...');
  
  // Create a database connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Call the service function to get station data
    const response = await getStationInfo();
    
    if (!response.success || !Array.isArray(response.data) || response.data.length === 0) {
      console.error('Failed to fetch station data:', response.error);
      return;
    }
    
    // Filter to ensure we only process station data
    const stationData = response.data.filter(isStationData);
    
    if (stationData.length === 0) {
      console.error('No station data found in the response');
      return;
    }
    
    console.log(`Successfully fetched ${stationData.length} telemetry stations from API`);
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      console.log('Starting to insert telemetry stations into database...');
      
      // Track statistics
      let inserted = 0;
      let skipped = 0;
      let errors = 0;
      
      // Process each station
      for (const station of stationData) {
        try {
          // Check if station already exists
          const checkQuery = `
            SELECT tele_station_id FROM thaiwater_tele_stations 
            WHERE tele_station_id = $1
          `;
          const checkResult = await client.query(checkQuery, [station.id]);
          
          if (checkResult.rows.length > 0) {
            // Station already exists, skip
            skipped++;
            continue;
          }
          
          // Prepare station data for insertion
          const insertQuery = `
            INSERT INTO thaiwater_tele_stations (
              tele_station_id, 
              tele_station_name, 
              tele_station_name_th, 
              tele_station_lat, 
              tele_station_long, 
              tele_station_type,
              agency_id,
              ground_level,
              left_bank,
              right_bank,
              is_warning,
              province,
              amphure,
              tambon
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `;
          
          // Extract values from station data
          const values = [
            station.id,
            station.tele_station_name.en || '',
            station.tele_station_name.th || '',
            station.tele_station_lat,
            station.tele_station_long,
            station.tele_station_type,
            station.agency_id,
            station.ground_level,
            station.left_bank,
            station.right_bank,
            typeof station.is_warning === 'string' ? (station.is_warning === 'Y') : !!station.is_warning,
            '', // province - would need geocoding to determine
            '', // amphure - would need geocoding to determine
            ''  // tambon - would need geocoding to determine
          ];
          
          await client.query(insertQuery, values);
          inserted++;
          
          // Log progress every 100 stations
          if (inserted % 100 === 0) {
            console.log(`Inserted ${inserted} stations so far...`);
          }
          
        } catch (error) {
          errors++;
          console.error(`Error inserting station ID ${station.id}:`, error);
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('\nInsertion completed:');
      console.log(`- Total stations processed: ${stationData.length}`);
      console.log(`- Inserted: ${inserted}`);
      console.log(`- Skipped (already exist): ${skipped}`);
      console.log(`- Errors: ${errors}`);
      
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error('Error in script execution:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute the function
insertThaiWaterStationsFromAPI().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 