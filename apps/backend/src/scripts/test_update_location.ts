import { config } from 'dotenv';
import { logger } from '../utils/logger';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeThaiText, constructSearchQuery, validateCoordinates, fetchCoordinatesWithRetry } from './update_location_data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

// Test data
const TEST_PROVINCES = [
  { id: 1, name_th: 'กรุงเทพมหานคร', name_en: 'Bangkok' },
  { id: 2, name_th: 'เชียงใหม่', name_en: 'Chiang Mai' },
  { id: 3, name_th: 'ภูเก็ต', name_en: 'Phuket' }
];

const TEST_AMPHURES = [
  { 
    id: 1, 
    name_th: 'พระนคร', 
    name_en: 'Phra Nakhon', 
    province_name_th: 'กรุงเทพมหานคร', 
    province_name_en: 'Bangkok' 
  },
  { 
    id: 2, 
    name_th: 'เมืองเชียงใหม่', 
    name_en: 'Mueang Chiang Mai', 
    province_name_th: 'เชียงใหม่', 
    province_name_en: 'Chiang Mai' 
  },
  { 
    id: 3, 
    name_th: 'เมืองภูเก็ต', 
    name_en: 'Mueang Phuket', 
    province_name_th: 'ภูเก็ต', 
    province_name_en: 'Phuket' 
  }
];

// Test functions
async function testNormalizeThaiText() {
  logger.info('Testing Thai text normalization...');
  const testCases = [
    'กรุงเทพมหานคร',
    'เชียงใหม่',
    'ภูเก็ต'
  ];

  for (const text of testCases) {
    const normalized = normalizeThaiText(text);
    logger.info(`Original: ${text}, Normalized: ${normalized}`);
  }
}

async function testQueryConstruction() {
  logger.info('Testing query construction...');
  
  // Test province queries
  for (const province of TEST_PROVINCES) {
    const query = constructSearchQuery({
      type: 'province',
      nameTh: province.name_th,
      nameEn: province.name_en,
      isBangkok: province.name_en === 'Bangkok'
    });
    logger.info(`Province query for ${province.name_en}: ${query}`);
  }

  // Test amphure queries
  for (const amphure of TEST_AMPHURES) {
    const query = constructSearchQuery({
      type: 'amphure',
      nameTh: amphure.name_th,
      nameEn: amphure.name_en,
      provinceTh: amphure.province_name_th,
      isBangkok: amphure.province_name_en === 'Bangkok'
    });
    logger.info(`Amphure query for ${amphure.name_en}: ${query}`);
  }
}

async function testGeocoding() {
  logger.info('Testing geocoding...');

  // Test province geocoding
  for (const province of TEST_PROVINCES) {
    const query = constructSearchQuery({
      type: 'province',
      nameTh: province.name_th,
      nameEn: province.name_en,
      isBangkok: province.name_en === 'Bangkok'
    });
    
    logger.info(`Testing geocoding for province: ${province.name_en}`);
    const coordinates = await fetchCoordinatesWithRetry(query);
    
    if (coordinates) {
      logger.info(`Found coordinates for ${province.name_en}:`, coordinates);
      const isValid = validateCoordinates(coordinates);
      logger.info(`Coordinates ${isValid ? 'are' : 'are not'} within Thailand`);
    } else {
      logger.error(`Failed to get coordinates for ${province.name_en}`);
    }

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test amphure geocoding
  for (const amphure of TEST_AMPHURES) {
    const query = constructSearchQuery({
      type: 'amphure',
      nameTh: amphure.name_th,
      nameEn: amphure.name_en,
      provinceTh: amphure.province_name_th,
      isBangkok: amphure.province_name_en === 'Bangkok'
    });
    
    logger.info(`Testing geocoding for amphure: ${amphure.name_en}`);
    const coordinates = await fetchCoordinatesWithRetry(query);
    
    if (coordinates) {
      logger.info(`Found coordinates for ${amphure.name_en}:`, coordinates);
      const isValid = validateCoordinates(coordinates);
      logger.info(`Coordinates ${isValid ? 'are' : 'are not'} within Thailand`);
    } else {
      logger.error(`Failed to get coordinates for ${amphure.name_en}`);
    }

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testCoordinateValidation() {
  logger.info('Testing coordinate validation...');
  
  const testCoordinates = [
    // Valid coordinates within Thailand
    { lat: 13.7563, lng: 100.5018 }, // Bangkok
    { lat: 18.7883, lng: 98.9853 },  // Chiang Mai
    { lat: 7.8804, lng: 98.3923 },   // Phuket
    // Invalid coordinates
    { lat: 35.6762, lng: 139.6503 }, // Tokyo
    { lat: 1.3521, lng: 103.8198 },  // Singapore
    { lat: 0, lng: 0 }               // Null Island
  ];

  for (const coords of testCoordinates) {
    const isValid = validateCoordinates(coords);
    logger.info(`Coordinates (${coords.lat}, ${coords.lng}) ${isValid ? 'are' : 'are not'} within Thailand`);
  }
}

// Main test function
async function runTests() {
  try {
    logger.info('Starting location update tests...');

    // Test Thai text normalization
    await testNormalizeThaiText();

    // Test query construction
    await testQueryConstruction();

    // Test coordinate validation
    await testCoordinateValidation();

    // Test geocoding
    await testGeocoding();

    logger.info('All tests completed successfully');
  } catch (error) {
    logger.error('Error in tests:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 