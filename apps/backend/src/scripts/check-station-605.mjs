import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';

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

async function checkStation605() {
  try {
    const client = await pool.connect();
    try {
      // Get station coordinates
      const { rows } = await client.query(
        'SELECT station_id, station_code, latitude, longitude FROM telemetry_data_stations WHERE station_id::text = $1',
        ['605']
      );

      if (rows.length === 0) {
        console.log('Station not found');
        return;
      }

      const station = rows[0];
      console.log('Station details:', station);

      // Call Google Maps API
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${station.latitude},${station.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=th`;
      console.log('\nAPI URL (without key):', url.replace(process.env.GOOGLE_MAPS_API_KEY, 'REDACTED'));
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('\nAPI Response:', JSON.stringify(data, null, 2));

      if (data.status === 'OK' && data.results.length > 0) {
        console.log('\nParsed Address Components:');
        // Parse address components
        for (const component of data.results[0].address_components) {
          console.log('Component:', {
            long_name: component.long_name,
            short_name: component.short_name,
            types: component.types
          });
        }
      } else {
        console.log('API Status:', data.status);
        console.log('Error Message:', data.error_message);
      }

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkStation605(); 