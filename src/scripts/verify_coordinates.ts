import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../utils/logger';

const pool = new Pool({
  user: 'swoc-uat-ssl-readonly-user',
  password: 'c8d20c8a022ac7af9131491704594941',
  host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: 15434,
  database: 'swoc-uat-ssl',
  ssl: false
});

// Thailand's approximate bounding box
const THAILAND_BOUNDS = {
  minLat: 5.613038,  // Southernmost point
  maxLat: 20.465143, // Northernmost point
  minLng: 97.343396, // Westernmost point
  maxLng: 105.636812 // Easternmost point
};

async function verifyCoordinates() {
  const client = await pool.connect();
  try {
    logger.info('Connected to database');
    
    // Check provinces coordinates
    const provinceQuery = `
      SELECT 
        id, name_th, name_en, latitude, longitude,
        CASE 
          WHEN latitude < $1 OR latitude > $2 OR longitude < $3 OR longitude > $4 
          THEN 'Outside Thailand bounds'
          ELSE 'Within Thailand bounds'
        END as location_status
      FROM provinces
      WHERE latitude < $1 OR latitude > $2 OR longitude < $3 OR longitude > $4
      OR latitude IS NULL OR longitude IS NULL;
    `;
    
    const provinceResults = await client.query(provinceQuery, [
      THAILAND_BOUNDS.minLat,
      THAILAND_BOUNDS.maxLat,
      THAILAND_BOUNDS.minLng,
      THAILAND_BOUNDS.maxLng
    ]);
    
    logger.info('Provinces with invalid coordinates:', provinceResults.rows);
    
    // Check amphures coordinates
    const amphureQuery = `
      SELECT 
        a.id, a.name_th, a.name_en, a.latitude, a.longitude,
        p.name_th as province_name,
        CASE 
          WHEN a.latitude < $1 OR a.latitude > $2 OR a.longitude < $3 OR a.longitude > $4 
          THEN 'Outside Thailand bounds'
          ELSE 'Within Thailand bounds'
        END as location_status
      FROM amphures a
      JOIN provinces p ON a.province_id = p.id
      WHERE a.latitude < $1 OR a.latitude > $2 OR a.longitude < $3 OR a.longitude > $4
      OR a.latitude IS NULL OR a.longitude IS NULL;
    `;
    
    const amphureResults = await client.query(amphureQuery, [
      THAILAND_BOUNDS.minLat,
      THAILAND_BOUNDS.maxLat,
      THAILAND_BOUNDS.minLng,
      THAILAND_BOUNDS.maxLng
    ]);
    
    logger.info('Amphures with invalid coordinates:', amphureResults.rows);
    
    // Check for amphures with same coordinates as their provinces
    const sameCoordinatesQuery = `
      SELECT 
        a.id as amphure_id,
        a.name_th as amphure_name,
        a.latitude as amphure_lat,
        a.longitude as amphure_long,
        p.name_th as province_name,
        p.latitude as province_lat,
        p.longitude as province_long
      FROM amphures a
      JOIN provinces p ON a.province_id = p.id
      WHERE a.latitude = p.latitude AND a.longitude = p.longitude;
    `;
    
    const sameCoordinatesResults = await client.query(sameCoordinatesQuery);
    
    logger.info('Amphures with same coordinates as their provinces:', sameCoordinatesResults.rows);

    // Get some statistics
    const statsQuery = `
      SELECT 
        'provinces' as table_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE latitude >= $1 AND latitude <= $2 AND longitude >= $3 AND longitude <= $4) as within_bounds,
        COUNT(*) FILTER (WHERE latitude < $1 OR latitude > $2 OR longitude < $3 OR longitude > $4) as outside_bounds,
        COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as missing_coordinates
      FROM provinces
      UNION ALL
      SELECT 
        'amphures' as table_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE latitude >= $1 AND latitude <= $2 AND longitude >= $3 AND longitude <= $4) as within_bounds,
        COUNT(*) FILTER (WHERE latitude < $1 OR latitude > $2 OR longitude < $3 OR longitude > $4) as outside_bounds,
        COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as missing_coordinates
      FROM amphures;
    `;

    const statsResults = await client.query(statsQuery, [
      THAILAND_BOUNDS.minLat,
      THAILAND_BOUNDS.maxLat,
      THAILAND_BOUNDS.minLng,
      THAILAND_BOUNDS.maxLng
    ]);

    logger.info('Coordinate statistics:', statsResults.rows);

  } catch (err) {
    logger.error('Error:', err instanceof Error ? err.message : 'Unknown error');
    throw err;
  } finally {
    client.release();
    await pool.end();
    logger.info('Database connection closed');
  }
}

verifyCoordinates().catch(err => {
  logger.error('Script failed:', err);
  process.exit(1);
}); 