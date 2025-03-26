import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';
import path from 'path';

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function updateStationsFromMapping() {
  try {
    // Read the station mapping file
    const mappingPath = path.join(process.cwd(), 'scripts', 'station_mapping', 'station_mapping.json');
    const mappingData = JSON.parse(await fs.readFile(mappingPath, 'utf8'));

    const client = await pool.connect();
    let updatedCount = 0;
    let errorCount = 0;

    try {
      await client.query('BEGIN');

      for (const [stationCode, stationData] of Object.entries(mappingData.stations)) {
        if (!stationData.latitude || !stationData.longitude) {
          console.log(`Skipping station ${stationCode} - missing coordinates`);
          continue;
        }

        const updateQuery = `
          UPDATE telemetry_data_stations
          SET 
            latitude = $1,
            longitude = $2,
            updated_at = NOW()
          WHERE station_code = $3
          RETURNING station_code;
        `;

        const result = await client.query(updateQuery, [
          stationData.latitude,
          stationData.longitude,
          stationCode
        ]);

        if (result.rowCount > 0) {
          updatedCount++;
          console.log(`Updated station ${stationCode}`);
        } else {
          console.log(`No matching station found for ${stationCode}`);
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