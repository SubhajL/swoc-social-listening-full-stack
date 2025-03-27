import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

// RID Telemetry API configuration
const RID_API_BASE_URL = process.env.RID_API_BASE_URL;
const RID_CLIENT_ID = process.env.RID_CLIENT_ID;
const RID_CLIENT_SECRET = process.env.RID_CLIENT_SECRET;

// Create axios instance with SSL verification disabled
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

// Function to get OAuth token
async function getOAuthToken() {
  try {
    const response = await axiosInstance.post(`${RID_API_BASE_URL}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: RID_CLIENT_ID,
      client_secret: RID_CLIENT_SECRET
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting OAuth token:', error.message);
    throw error;
  }
}

// Function to fetch telemetry data
async function fetchTelemetryData() {
  try {
    const token = await getOAuthToken();
    const response = await axiosInstance.get(`${RID_API_BASE_URL}/telemetry`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching telemetry data:', error.message);
    throw error;
  }
}

// Function to store telemetry data in database
async function storeTelemetryData(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert telemetry data
    const insertQuery = `
      INSERT INTO rid_telemetry (
        timestamp,
        aircraft_id,
        operator_id,
        position,
        altitude,
        speed,
        heading,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (timestamp, aircraft_id) DO UPDATE SET
        operator_id = EXCLUDED.operator_id,
        position = EXCLUDED.position,
        altitude = EXCLUDED.altitude,
        speed = EXCLUDED.speed,
        heading = EXCLUDED.heading,
        status = EXCLUDED.status
    `;

    for (const record of data) {
      await client.query(insertQuery, [
        record.timestamp,
        record.aircraft_id,
        record.operator_id,
        record.position,
        record.altitude,
        record.speed,
        record.heading,
        record.status
      ]);
    }

    await client.query('COMMIT');
    console.log(`Successfully stored ${data.length} telemetry records`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error storing telemetry data:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Main function to sync telemetry data
async function syncTelemetryData() {
  try {
    console.log('Starting telemetry data sync...');
    const telemetryData = await fetchTelemetryData();
    await storeTelemetryData(telemetryData);
    console.log('Telemetry data sync completed successfully');
  } catch (error) {
    console.error('Telemetry data sync failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Execute the sync
syncTelemetryData(); 