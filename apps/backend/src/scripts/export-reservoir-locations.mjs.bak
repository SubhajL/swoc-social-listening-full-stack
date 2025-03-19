import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pkg;

// Database pool with credentials from environment variables
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

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

/**
 * Exports all reservoir locations from PostgreSQL to JSON
 */
async function exportReservoirLocations() {
  console.log('[ReservoirLocationsExport] Starting export to JSON');

  try {
    const client = await pool.connect();
    try {
      // Query all records from reservoir_locations table
      const result = await client.query('SELECT * FROM reservoir_locations ORDER BY reservoir_id');
      
      console.log(`[ReservoirLocationsExport] Found ${result.rows.length} records`);
      
      // Output as JSON
      console.log(JSON.stringify(result.rows, null, 2));
      
      // Optionally save to file
      const outputPath = path.join(rootDir, 'reservoir_locations.json');
      fs.writeFileSync(outputPath, JSON.stringify(result.rows, null, 2));
      
      console.log(`[ReservoirLocationsExport] Saved to ${outputPath}`);
      
      return {
        success: true,
        count: result.rows.length
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ReservoirLocationsExport] Export failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the export
exportReservoirLocations()
  .then((result) => {
    console.log('[ReservoirLocationsExport] Export process completed successfully', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ReservoirLocationsExport] Export process failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 