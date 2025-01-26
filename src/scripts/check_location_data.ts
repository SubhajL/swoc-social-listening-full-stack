import pg from 'pg';
import { logger } from '../utils/logger';

const { Pool } = pg;

// Known correct coordinates for major provinces
const KNOWN_COORDINATES = {
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Chiang Mai': { lat: 18.7883, lng: 98.9853 },
  'Phuket': { lat: 7.8804, lng: 98.3923 },
  'Satun': { lat: 6.6167, lng: 100.0667 },
  'Chonburi': { lat: 13.3611, lng: 100.9847 },
  'Ayutthaya': { lat: 14.3692, lng: 100.5876 },
  'Nakhon Ratchasima': { lat: 14.9799, lng: 102.0978 },
  'Udon Thani': { lat: 17.4649, lng: 102.8359 },
  'Songkhla': { lat: 7.1896, lng: 100.5945 },
  'Chiang Rai': { lat: 19.9105, lng: 99.8404 }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function checkLocationData() {
  const pool = new Pool({
    user: 'swoc-uat-ssl-readonly-user',
    password: 'c8d20c8a022ac7af9131491704594941',
    host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
    port: 15434,
    database: 'swoc-uat-ssl',
    ssl: false
  });

  const client = await pool.connect();
  try {
    logger.info('Connected to database');

    // Get all provinces
    const provincesQuery = `
      SELECT id, name_th, name_en, latitude::float, longitude::float
      FROM provinces
      ORDER BY name_en;
    `;
    
    const provincesResult = await client.query(provincesQuery);
    const provinces = provincesResult.rows;
    
    // Check each province against known coordinates
    const discrepancies = [];
    for (const province of provinces) {
      const knownCoords = KNOWN_COORDINATES[province.name_en];
      if (knownCoords) {
        const distance = calculateDistance(
          province.latitude,
          province.longitude,
          knownCoords.lat,
          knownCoords.lng
        );
        
        if (distance > 5) { // If difference is more than 5km
          discrepancies.push({
            province: province.name_en,
            thai_name: province.name_th,
            current: {
              lat: province.latitude,
              lng: province.longitude
            },
            expected: knownCoords,
            difference_km: Math.round(distance * 100) / 100
          });
        }
      }
    }
    
    // Log coordinate discrepancies
    if (discrepancies.length > 0) {
      logger.info('\nFound coordinate discrepancies:');
      discrepancies.forEach(d => {
        logger.info(`\n${d.province} (${d.thai_name}):`);
        logger.info(`Current:  ${d.current.lat}, ${d.current.lng}`);
        logger.info(`Expected: ${d.expected.lat}, ${d.expected.lng}`);
        logger.info(`Difference: ${d.difference_km} km`);
      });
    }

    // Check for provinces too close together
    const closeProvinces = [];
    for (let i = 0; i < provinces.length; i++) {
      for (let j = i + 1; j < provinces.length; j++) {
        const distance = calculateDistance(
          provinces[i].latitude,
          provinces[i].longitude,
          provinces[j].latitude,
          provinces[j].longitude
        );
        
        if (distance < 20) { // If provinces are less than 20km apart
          closeProvinces.push({
            province1: provinces[i].name_en,
            province2: provinces[j].name_en,
            distance_km: Math.round(distance * 100) / 100
          });
        }
      }
    }
    
    if (closeProvinces.length > 0) {
      logger.info('\nProvinces suspiciously close to each other:');
      closeProvinces.forEach(pair => {
        logger.info(`${pair.province1} and ${pair.province2}: ${pair.distance_km} km apart`);
      });
    }

    // Continue with the rest of the checks...
    // ... existing code ...

  } catch (error) {
    logger.error('Error during verification:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
checkLocationData().catch((error) => {
  logger.error('Verification failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}); 