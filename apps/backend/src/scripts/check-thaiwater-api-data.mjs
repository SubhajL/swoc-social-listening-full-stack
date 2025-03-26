// Script to check ThaiWater API endpoints and analyze rainfall data
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// Load environment variables
const envPath = path.resolve(backendRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
  console.warn(`Warning: .env file not found at ${envPath}, using process.env or default values`);
}

// API configuration with exact URLs
const THAIWATER_STATION_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=264&eid=skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';
const THAIWATER_RAINFALL_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=98&eid=ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

// For adding date parameter to rainfall URL
const RAINFALL_DATE_PARAM = '&start_date=';

/**
 * Fetch all ThaiWater stations from the API
 */
async function fetchThaiWaterStations() {
  console.log('Fetching ThaiWater stations from API...');
  
  try {
    const startTime = Date.now();
    
    // Use the exact URL that works in browser
    console.log(`Using station API URL: ${THAIWATER_STATION_URL}`);
    
    // Make API request using direct axios call
    const response = await axios.get(THAIWATER_STATION_URL);
    
    const stations = response.data;
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(stations)) {
      console.warn('Unexpected API response format for stations:', typeof stations);
      return [];
    }
    
    console.log(`Successfully fetched ${stations.length} ThaiWater stations in ${duration}ms`);
    
    // Analyze station IDs
    const stationIds = stations.map(station => station.tele_station_id);
    const lowIdStations = stationIds.filter(id => id < 10000);
    const highIdStations = stationIds.filter(id => id >= 10000);
    
    console.log('Station ID Analysis:');
    console.log(`- Total stations: ${stations.length}`);
    console.log(`- Stations with ID < 10000: ${lowIdStations.length} (${((lowIdStations.length / stations.length) * 100).toFixed(2)}%)`);
    console.log(`- Stations with ID >= 10000: ${highIdStations.length} (${((highIdStations.length / stations.length) * 100).toFixed(2)}%)`);
    
    const sampleLowIdStations = lowIdStations.slice(0, 5);
    const sampleHighIdStations = highIdStations.slice(0, 5);
    
    console.log('Sample low ID stations:', sampleLowIdStations);
    console.log('Sample high ID stations:', sampleHighIdStations);
    
    if (stations.length > 0) {
      const sampleStation = stations[0];
      console.log('Sample station data:', JSON.stringify(sampleStation, null, 2));
    }
    
    return stations;
  } catch (error) {
    console.error('Failed to fetch ThaiWater stations:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Fetch rainfall data from ThaiWater API
 */
async function fetchRainfallData() {
  console.log('Fetching ThaiWater rainfall data from API...');
  
  try {
    const startTime = Date.now();
    
    // Get current time in Thailand
    const now = new Date();
    const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
    
    // Format date for API request (YYYY-MM-DD)
    const formattedDate = thailandTime.toISOString().split('T')[0];
    
    console.log('Using date for rainfall data request:');
    console.log(`- UTC now: ${now.toISOString()}`);
    console.log(`- Thailand time: ${thailandTime.toISOString()}`);
    console.log(`- Formatted date: ${formattedDate}`);
    
    // Add date parameter to the URL
    const urlWithDate = formattedDate ? `${THAIWATER_RAINFALL_URL}${RAINFALL_DATE_PARAM}${formattedDate}` : THAIWATER_RAINFALL_URL;
    
    console.log(`Using rainfall API URL: ${urlWithDate}`);
    
    // Make API request using direct axios call
    const response = await axios.get(urlWithDate);
    
    const rainfallData = response.data;
    const duration = Date.now() - startTime;
    
    if (!Array.isArray(rainfallData)) {
      console.warn('Unexpected API response format for rainfall data:', typeof rainfallData);
      return [];
    }
    
    console.log(`Successfully fetched rainfall data: ${rainfallData.length} records in ${duration}ms`);
    
    // Analyze rainfall data by station ID
    const stationIds = [...new Set(rainfallData.map(item => item.tele_station_id))];
    const rainfallByStation = {};
    
    stationIds.forEach(id => {
      rainfallByStation[id] = rainfallData.filter(item => item.tele_station_id === id);
    });
    
    const lowIdStations = stationIds.filter(id => id < 10000);
    const highIdStations = stationIds.filter(id => id >= 10000);
    
    console.log('Rainfall Data Analysis:');
    console.log(`- Total unique stations with rainfall data: ${stationIds.length}`);
    console.log(`- Stations with ID < 10000 with rainfall data: ${lowIdStations.length} (${((lowIdStations.length / stationIds.length) * 100).toFixed(2)}%)`);
    console.log(`- Stations with ID >= 10000 with rainfall data: ${highIdStations.length} (${((highIdStations.length / stationIds.length) * 100).toFixed(2)}%)`);
    
    // Check for NULL values in rainfall_today field
    const nullRainfallTodayCount = rainfallData.filter(item => item.rainfall_today === null).length;
    console.log(`- Records with NULL rainfall_today: ${nullRainfallTodayCount} (${((nullRainfallTodayCount / rainfallData.length) * 100).toFixed(2)}%)`);
    
    if (rainfallData.length > 0) {
      const sampleData = rainfallData[0];
      console.log('Sample rainfall data:', JSON.stringify(sampleData, null, 2));
    }
    
    return rainfallData;
  } catch (error) {
    console.error('Failed to fetch rainfall data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting ThaiWater API check...');
  
  // Fetch stations
  const stations = await fetchThaiWaterStations();
  
  // Fetch rainfall data
  const rainfallData = await fetchRainfallData();
  
  // Calculate coverage
  if (stations.length > 0 && rainfallData.length > 0) {
    const uniqueStationsWithRainfall = [...new Set(rainfallData.map(item => item.tele_station_id))];
    const coveragePercentage = (uniqueStationsWithRainfall.length / stations.length) * 100;
    
    console.log('\nCoverage Analysis:');
    console.log(`- Total stations from station API: ${stations.length}`);
    console.log(`- Total unique stations with rainfall data: ${uniqueStationsWithRainfall.length}`);
    console.log(`- Coverage percentage: ${coveragePercentage.toFixed(2)}%`);
    
    // Check for missing stations
    const stationIds = stations.map(station => station.tele_station_id);
    const missingStations = stationIds.filter(id => !uniqueStationsWithRainfall.includes(id));
    
    console.log(`- Stations without rainfall data: ${missingStations.length}`);
    if (missingStations.length > 0) {
      console.log('- Sample missing stations (first 10):', missingStations.slice(0, 10));
    }
  }
  
  console.log('\nAPI check completed.');
}

// Run the main function
main().catch(console.error); 