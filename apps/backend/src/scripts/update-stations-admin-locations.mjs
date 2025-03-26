import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Database configuration with SSL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
  ssl: {
    rejectUnauthorized: false
  }
});

async function getAddressComponents(lat, lng) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=th`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Geocoding API error:', data.status);
      return null;
    }

    let province = null;
    let amphure = null;

    // Parse the address components
    for (const component of data.results[0].address_components) {
      if (component.types.includes('administrative_area_level_1')) {
        province = component.long_name.replace('จังหวัด', '').trim();
      } else if (component.types.includes('administrative_area_level_2')) {
        amphure = component.long_name.replace('อำเภอ', '').replace('เขต', '').trim();
      }
    }

    return { province, amphure };
  } catch (error) {
    console.error('Error calling Google Maps API:', error);
    return null;
  }
}

async function updateStationsAdminLocations() {
  try {
    const client = await pool.connect();
    let updatedCount = 0;
    let errorCount = 0;

    try {
      await client.query('BEGIN');

      // Get stations with coordinates but missing admin locations
      const query = `
        SELECT station_id, station_code, latitude, longitude
        FROM telemetry_data_stations
        WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL 
        AND (province IS NULL OR amphure IS NULL)
      `;

      const { rows } = await client.query(query);
      console.log(`Found ${rows.length} stations with missing admin locations`);

      for (const station of rows) {
        try {
          console.log(`Processing station ${station.station_code} (ID: ${station.station_id})`);
          
          const adminLocations = await getAddressComponents(station.latitude, station.longitude);
          
          if (!adminLocations) {
            console.log(`No admin locations found for station ${station.station_code}`);
            continue;
          }

          const updateQuery = `
            UPDATE telemetry_data_stations
            SET 
              province = $1,
              amphure = $2,
              updated_at = NOW()
            WHERE station_id = $3
            RETURNING station_id;
          `;

          const result = await client.query(updateQuery, [
            adminLocations.province,
            adminLocations.amphure,
            station.station_id
          ]);

          if (result.rowCount > 0) {
            updatedCount++;
            console.log(`Updated admin locations for station ${station.station_code}:`, adminLocations);
          }

          // Add a small delay to avoid hitting API rate limits
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (err) {
          errorCount++;
          console.error(`Error updating station ${station.station_code}:`, err.message);
        }
      }

      await client.query('COMMIT');
      console.log(`\nUpdate completed successfully:`);
      console.log(`- Updated stations: ${updatedCount}`);
      console.log(`- Errors: ${errorCount}`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating stations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
updateStationsAdminLocations(); 