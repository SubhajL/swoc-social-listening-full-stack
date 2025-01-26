import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../utils/logger';

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

const pool = new Pool({
  user: 'swoc-uat-ssl-readonly-user',
  password: 'c8d20c8a022ac7af9131491704594941',
  host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: 15434,
  database: 'swoc-uat-ssl',
  ssl: false
});

interface ProvinceData {
  id: string;
  name_th: string;
  name_en: string;
  latitude: number;
  longitude: number;
}

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

async function checkProvinceCoordinates() {
  const client = await pool.connect();
  try {
    logger.info('Connected to database');
    
    // Get all provinces
    const query = `
      SELECT id, name_th, name_en, latitude::float, longitude::float
      FROM provinces
      ORDER BY name_en;
    `;
    
    const result = await client.query<ProvinceData>(query);
    const provinces = result.rows;
    
    logger.info(`Found ${provinces.length} provinces`);
    
    // Check each province
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
    
    // Log results
    if (discrepancies.length > 0) {
      logger.info('\nFound coordinate discrepancies:');
      discrepancies.forEach(d => {
        logger.info(`\n${d.province} (${d.thai_name}):`);
        logger.info(`Current:  ${d.current.lat}, ${d.current.lng}`);
        logger.info(`Expected: ${d.expected.lat}, ${d.expected.lng}`);
        logger.info(`Difference: ${d.difference_km} km`);
      });
    } else {
      logger.info('\nNo major discrepancies found in checked provinces');
    }
    
    // Additional checks
    logger.info('\nChecking for potential issues:');
    
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
    
    // Check for provinces outside reasonable bounds
    const outliers = provinces.filter(p => 
      p.latitude < 5.5 || p.latitude > 20.5 || // Thailand's approximate N-S bounds
      p.longitude < 97.3 || p.longitude > 105.7 // Thailand's approximate E-W bounds
    );
    
    if (outliers.length > 0) {
      logger.info('\nProvinces with coordinates outside Thailand\'s typical bounds:');
      outliers.forEach(p => {
        logger.info(`${p.name_en}: ${p.latitude}, ${p.longitude}`);
      });
    }

  } catch (err) {
    logger.error('Error:', err instanceof Error ? err.message : 'Unknown error');
    throw err;
  } finally {
    client.release();
    await pool.end();
    logger.info('\nDatabase connection closed');
  }
}

checkProvinceCoordinates().catch(err => {
  logger.error('Script failed:', err);
  process.exit(1);
}); 