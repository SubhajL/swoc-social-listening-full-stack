import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Log database configuration (without password)
console.log('Database configuration:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL
});

// Database configuration with SSL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10), // Convert port to number
  ssl: {
    rejectUnauthorized: false // Required for self-signed certificates
  }
});

async function updateStationsFromMapping() {
  try {
    // Read the station mapping file
    const mappingPath = path.resolve(__dirname, '../../../../scripts/station_mapping/station_mapping.json');
    console.log('Reading mapping file from:', mappingPath);
    const mappingData = JSON.parse(await fs.readFile(mappingPath, 'utf8'));

    const client = await pool.connect();
    let updatedCount = 0;
    let errorCount = 0;

    try {
      await client.query('BEGIN');

      // Restructure data to be indexed by stationId
      const stationsByID = {};
      for (const [stationCode, stationData] of Object.entries(mappingData.stations)) {
        stationsByID[stationData.stationId] = {
          ...stationData,
          stationCode: stationCode // Keep the station code
        };
      }

      // Process each station by ID
      for (const [stationId, stationData] of Object.entries(stationsByID)) {
        if (!stationData.latitude || !stationData.longitude) {
          console.log(`Skipping station ID ${stationId} (${stationData.stationCode}) - missing coordinates`);
          continue;
        }

        const updateQuery = `
          UPDATE telemetry_data_stations
          SET 
            latitude = $1,
            longitude = $2,
            station_name = $3,
            station_code = $4,
            updated_at = NOW()
          WHERE station_id = $5
          RETURNING station_id;
        `;

        try {
          const result = await client.query(updateQuery, [
            stationData.latitude,
            stationData.longitude,
            stationData.stationName,
            stationData.stationCode,
            stationId
          ]);

          if (result.rowCount > 0) {
            updatedCount++;
            console.log(`Updated station ID ${stationId} (${stationData.stationCode})`);
          } else {
            console.log(`No matching station found for ID ${stationId} (${stationData.stationCode})`);
          }
        } catch (err) {
          errorCount++;
          console.error(`Error updating station ID ${stationId} (${stationData.stationCode}):`, err.message);
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
updateStationsFromMapping(); 