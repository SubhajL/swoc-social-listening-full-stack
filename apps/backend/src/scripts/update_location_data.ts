import { Client } from '@googlemaps/google-maps-services-js';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

// Load environment variables
config();

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface LocationUpdate {
  id: string;
  name_th: string;
  name_en: string;
  latitude: number;
  longitude: number;
}

async function getCoordinates(searchQuery: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await googleMapsClient.geocode({
      params: {
        address: searchQuery,
        components: { country: 'TH' },
        key: process.env.GOOGLE_MAPS_API_KEY || '',
      },
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    logger.error('Error fetching coordinates:', error);
    return null;
  }
}

async function updateProvinceCoordinates(): Promise<void> {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Get all provinces
    const { rows: provinces } = await client.query(
      'SELECT id, name_th, name_en, latitude, longitude FROM provinces'
    );

    // Create backup table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS provinces_coordinates_backup (
        id VARCHAR(255) PRIMARY KEY,
        original_latitude NUMERIC,
        original_longitude NUMERIC,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const province of provinces) {
      let searchQuery = '';
      if (province.name_en === 'Bangkok') {
        searchQuery = 'ศาลาว่าการกรุงเทพมหานคร Bangkok City Hall';
      } else {
        searchQuery = `ศาลากลางจังหวัด${province.name_th}`;
      }

      const coordinates = await getCoordinates(searchQuery);
      if (coordinates) {
        // Backup original coordinates
        await client.query(
          'INSERT INTO provinces_coordinates_backup (id, original_latitude, original_longitude) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
          [province.id, province.latitude, province.longitude]
        );

        // Update coordinates
        await client.query(
          'UPDATE provinces SET latitude = $1, longitude = $2 WHERE id = $3',
          [coordinates.lat, coordinates.lng, province.id]
        );

        logger.info(`Updated coordinates for province: ${province.name_en}`);
      } else {
        logger.warn(`Could not find coordinates for province: ${province.name_en}`);
      }

      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Commit transaction
    await client.query('COMMIT');
    logger.info('Successfully updated province coordinates');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating province coordinates:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function updateAmphureCoordinates(): Promise<void> {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Get all amphures with their province names
    const { rows: amphures } = await client.query(`
      SELECT 
        a.id, 
        a.name_th as amphure_name_th, 
        a.name_en as amphure_name_en,
        p.name_th as province_name_th,
        p.name_en as province_name_en,
        a.latitude,
        a.longitude
      FROM amphures a
      JOIN provinces p ON a.province_id = p.id
    `);

    // Create backup table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS amphures_coordinates_backup (
        id VARCHAR(255) PRIMARY KEY,
        original_latitude NUMERIC,
        original_longitude NUMERIC,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const amphure of amphures) {
      let searchQuery = '';
      if (amphure.province_name_en === 'Bangkok') {
        searchQuery = `สำนักงานเขต${amphure.amphure_name_th} ${amphure.amphure_name_en} District Office Bangkok`;
      } else {
        searchQuery = `ที่ว่าการอำเภอ${amphure.amphure_name_th} ${amphure.province_name_th}`;
      }

      const coordinates = await getCoordinates(searchQuery);
      if (coordinates) {
        // Backup original coordinates
        await client.query(
          'INSERT INTO amphures_coordinates_backup (id, original_latitude, original_longitude) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
          [amphure.id, amphure.latitude, amphure.longitude]
        );

        // Update coordinates
        await client.query(
          'UPDATE amphures SET latitude = $1, longitude = $2 WHERE id = $3',
          [coordinates.lat, coordinates.lng, amphure.id]
        );

        logger.info(`Updated coordinates for amphure: ${amphure.amphure_name_en}`);
      } else {
        logger.warn(`Could not find coordinates for amphure: ${amphure.amphure_name_en}`);
      }

      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Commit transaction
    await client.query('COMMIT');
    logger.info('Successfully updated amphure coordinates');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating amphure coordinates:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyCoordinates(): Promise<void> {
  const client = await pool.connect();
  try {
    // Thailand's bounding box
    const THAILAND_BOUNDS = {
      north: 20.4178496,
      south: 5.6130800,
      east: 105.6366039,
      west: 97.3438072,
    };

    // Check provinces
    const { rows: provinces } = await client.query(
      'SELECT id, name_en, latitude, longitude FROM provinces'
    );

    for (const province of provinces) {
      if (
        province.latitude < THAILAND_BOUNDS.south ||
        province.latitude > THAILAND_BOUNDS.north ||
        province.longitude < THAILAND_BOUNDS.west ||
        province.longitude > THAILAND_BOUNDS.east
      ) {
        logger.warn(
          `Province ${province.name_en} coordinates (${province.latitude}, ${province.longitude}) are outside Thailand's bounds`
        );
      }
    }

    // Check amphures
    const { rows: amphures } = await client.query(
      'SELECT id, name_en, latitude, longitude FROM amphures'
    );

    for (const amphure of amphures) {
      if (
        amphure.latitude < THAILAND_BOUNDS.south ||
        amphure.latitude > THAILAND_BOUNDS.north ||
        amphure.longitude < THAILAND_BOUNDS.west ||
        amphure.longitude > THAILAND_BOUNDS.east
      ) {
        logger.warn(
          `Amphure ${amphure.name_en} coordinates (${amphure.latitude}, ${amphure.longitude}) are outside Thailand's bounds`
        );
      }
    }

    logger.info('Coordinate verification completed');
  } catch (error) {
    logger.error('Error verifying coordinates:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set');
    }

    logger.info('Starting location data update...');
    
    // Update province coordinates
    await updateProvinceCoordinates();
    
    // Update amphure coordinates
    await updateAmphureCoordinates();
    
    // Verify all coordinates
    await verifyCoordinates();
    
    logger.info('Location data update completed successfully');
  } catch (error) {
    logger.error('Error in main execution:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main(); 