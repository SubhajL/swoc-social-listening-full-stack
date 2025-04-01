import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLocationDetails } from '../../services/google-maps/google-maps.service.js';
import { logger } from '../../utils/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../../.env') });

const problematicStations = [
  { lat: 7.0084, lng: 98.337, description: "Station 1" },
  { lat: 12.5657, lng: 100.8887, description: "Station 2" },
  { lat: 9.1398, lng: 100.4529, description: "Station 3" },
  { lat: 17.9757, lng: 99.8187, description: "Station 4" }
];

async function testLocationDetails() {
  logger.info('Starting location test for problematic stations');

  for (const station of problematicStations) {
    try {
      logger.info(`Testing coordinates for ${station.description}`, {
        latitude: station.lat,
        longitude: station.lng
      });

      const locationDetails = await getLocationDetails(station.lat, station.lng);
      
      logger.info(`Location details for ${station.description}:`, {
        coordinates: { lat: station.lat, lng: station.lng },
        details: locationDetails
      });
    } catch (error) {
      logger.error(`Error getting location details for ${station.description}:`, {
        error: error instanceof Error ? error.message : String(error),
        coordinates: { lat: station.lat, lng: station.lng }
      });
    }
  }
}

// Run the test
testLocationDetails().catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
}); 