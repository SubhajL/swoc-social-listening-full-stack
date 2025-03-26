// API Connection Test Script
// This script tests the connections to ThaiWater and TMD APIs
// Usage: node src/scripts/test-api-connections.mjs

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// Load environment variables with explicit path
const envPath = path.resolve(backendRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
  console.warn(`Warning: .env file not found at ${envPath}, using process.env or default values`);
}

// ThaiWater API URL templates - using exact format that works in browser
const THAIWATER_STATION_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=264&eid=skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';
const THAIWATER_STATION_URL_2 = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=105&eid=CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg';
const THAIWATER_RAINFALL_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=98&eid=ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';
const THAIWATER_RAINFALL_URL_2 = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service?mid=244&eid=45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw';

// TMD API configuration
const TMD_API_BASE_URL = 'https://apidoag.opendata.go.th/api/v3';
const TMD_API_KEY = process.env.TMD_API_KEY;
const TMD_API_SECRET = process.env.TMD_API_SECRET;

// API endpoints for TMD
const TMD_WEATHER_STATION_ENDPOINT = '/stations/weather';
const TMD_RAINFALL_STATION_ENDPOINT = '/stations/rainfall';
const TMD_CURRENT_WEATHER_ENDPOINT = '/weather/stations/daily-weather';
const TMD_CURRENT_RAINFALL_ENDPOINT = '/weather/stations/daily-rainfall';

/**
 * Test ThaiWater Stations API connection (first URL)
 */
async function testThaiWaterStationsAPI() {
  console.log('Testing ThaiWater Stations API connection (first URL)...');
  
  try {
    // Use exact URL without any parameter manipulation
    console.log(`API URL: ${THAIWATER_STATION_URL}`);
    
    // Make API request with minimal headers
    const response = await axios.get(THAIWATER_STATION_URL);
    
    const stations = response.data;
    
    if (!Array.isArray(stations)) {
      console.error('❌ ERROR: Unexpected API response format for stations:');
      console.log(typeof stations, stations);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${stations.length} ThaiWater stations`);
    
    // Show sample station data
    if (stations.length > 0) {
      console.log('Sample station data:');
      console.log(JSON.stringify(stations[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: ThaiWater Stations API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Test ThaiWater Stations API connection (second URL)
 */
async function testThaiWaterStationsAPI2() {
  console.log('\nTesting ThaiWater Stations API connection (second URL)...');
  
  try {
    // Use exact URL without any parameter manipulation
    console.log(`API URL: ${THAIWATER_STATION_URL_2}`);
    
    // Make API request with minimal headers
    const response = await axios.get(THAIWATER_STATION_URL_2);
    
    const stations = response.data;
    
    if (!Array.isArray(stations)) {
      console.error('❌ ERROR: Unexpected API response format for stations:');
      console.log(typeof stations, stations);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${stations.length} ThaiWater stations`);
    
    // Show sample station data
    if (stations.length > 0) {
      console.log('Sample station data:');
      console.log(JSON.stringify(stations[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: ThaiWater Stations API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Test ThaiWater Rainfall API connection (first URL)
 */
async function testThaiWaterRainfallAPI() {
  console.log('\nTesting ThaiWater Rainfall API connection (first URL)...');
  
  try {
    // Use exact URL without any parameter manipulation
    console.log(`API URL: ${THAIWATER_RAINFALL_URL}`);
    
    // Make API request with minimal headers
    const response = await axios.get(THAIWATER_RAINFALL_URL);
    
    const rainfallData = response.data;
    
    if (!Array.isArray(rainfallData)) {
      console.error('❌ ERROR: Unexpected API response format for rainfall data:');
      console.log(typeof rainfallData, rainfallData);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${rainfallData.length} rainfall records`);
    
    // Show sample rainfall data
    if (rainfallData.length > 0) {
      console.log('Sample rainfall data:');
      console.log(JSON.stringify(rainfallData[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: ThaiWater Rainfall API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Test ThaiWater Rainfall API connection (second URL)
 */
async function testThaiWaterRainfallAPI2() {
  console.log('\nTesting ThaiWater Rainfall API connection (second URL)...');
  
  try {
    // Use exact URL without any parameter manipulation
    console.log(`API URL: ${THAIWATER_RAINFALL_URL_2}`);
    
    // Make API request with minimal headers
    const response = await axios.get(THAIWATER_RAINFALL_URL_2);
    
    const rainfallData = response.data;
    
    if (!Array.isArray(rainfallData)) {
      console.error('❌ ERROR: Unexpected API response format for rainfall data:');
      console.log(typeof rainfallData, rainfallData);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${rainfallData.length} rainfall records`);
    
    // Show sample rainfall data
    if (rainfallData.length > 0) {
      console.log('Sample rainfall data:');
      console.log(JSON.stringify(rainfallData[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: ThaiWater Rainfall API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Test TMD Weather Stations API connection
 */
async function testTMDWeatherStationsAPI() {
  console.log('\nTesting TMD Weather Stations API connection...');
  
  try {
    // Check if TMD API credentials are available
    if (!TMD_API_KEY || !TMD_API_SECRET) {
      console.error('❌ ERROR: TMD API credentials are missing. Please set TMD_API_KEY and TMD_API_SECRET in .env file.');
      return false;
    }
    
    // Build URL with updated endpoint format
    const stationUrl = `${TMD_API_BASE_URL}${TMD_WEATHER_STATION_ENDPOINT}`;
    
    console.log(`API URL: ${stationUrl}`);
    
    // Make API request
    const response = await axios.get(stationUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SWOC-TMD-API-Test/1.0',
        'api-key': TMD_API_KEY,
        'secret-key': TMD_API_SECRET
      }
    });
    
    // Extract stations from response data
    const stationsData = response.data;
    const stations = stationsData?.data?.stations || [];
    
    if (!Array.isArray(stations)) {
      console.error('❌ ERROR: Unexpected API response format for weather stations:');
      console.log(typeof stations, stationsData);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${stations.length} TMD weather stations`);
    
    // Show sample station data
    if (stations.length > 0) {
      console.log('Sample weather station data:');
      console.log(JSON.stringify(stations[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: TMD Weather Stations API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Test TMD Rainfall Stations API connection
 */
async function testTMDRainfallStationsAPI() {
  console.log('\nTesting TMD Rainfall Stations API connection...');
  
  try {
    // Check if TMD API credentials are available
    if (!TMD_API_KEY || !TMD_API_SECRET) {
      console.error('❌ ERROR: TMD API credentials are missing. Please set TMD_API_KEY and TMD_API_SECRET in .env file.');
      return false;
    }
    
    // Build URL with updated endpoint format
    const stationUrl = `${TMD_API_BASE_URL}${TMD_RAINFALL_STATION_ENDPOINT}`;
    
    console.log(`API URL: ${stationUrl}`);
    
    // Make API request
    const response = await axios.get(stationUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SWOC-TMD-API-Test/1.0',
        'api-key': TMD_API_KEY,
        'secret-key': TMD_API_SECRET
      }
    });
    
    // Extract stations from response data
    const stationsData = response.data;
    const stations = stationsData?.data?.stations || [];
    
    if (!Array.isArray(stations)) {
      console.error('❌ ERROR: Unexpected API response format for rainfall stations:');
      console.log(typeof stations, stationsData);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${stations.length} TMD rainfall stations`);
    
    // Show sample station data
    if (stations.length > 0) {
      console.log('Sample rainfall station data:');
      console.log(JSON.stringify(stations[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: TMD Rainfall Stations API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Test TMD Current Weather Data API connection
 */
async function testTMDCurrentWeatherAPI() {
  console.log('\nTesting TMD Current Weather Data API connection...');
  
  try {
    // Check if TMD API credentials are available
    if (!TMD_API_KEY || !TMD_API_SECRET) {
      console.error('❌ ERROR: TMD API credentials are missing. Please set TMD_API_KEY and TMD_API_SECRET in .env file.');
      return false;
    }
    
    // Get current time in Thailand
    const now = new Date();
    const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
    
    // Format date for API request (YYYY-MM-DD)
    const formattedDate = thailandTime.toISOString().split('T')[0];
    console.log(`Using date: ${formattedDate}`);
    
    // Build URL with updated endpoint format
    const weatherUrl = `${TMD_API_BASE_URL}${TMD_CURRENT_WEATHER_ENDPOINT}`;
    
    // Add date parameter if needed
    const urlWithDate = formattedDate ? `${weatherUrl}?date=${formattedDate}` : weatherUrl;
    
    console.log(`API URL: ${urlWithDate}`);
    
    // Make API request
    const response = await axios.get(urlWithDate, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SWOC-TMD-API-Test/1.0',
        'api-key': TMD_API_KEY,
        'secret-key': TMD_API_SECRET
      }
    });
    
    // Extract weather data from response
    const weatherData = response.data;
    const observations = weatherData?.data?.observations || [];
    
    if (!Array.isArray(observations)) {
      console.error('❌ ERROR: Unexpected API response format for current weather data:');
      console.log(typeof observations, weatherData);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${observations.length} current weather records`);
    
    // Show sample weather data
    if (observations.length > 0) {
      console.log('Sample current weather data:');
      console.log(JSON.stringify(observations[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: TMD Current Weather API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Test TMD Current Rainfall Data API connection
 */
async function testTMDCurrentRainfallAPI() {
  console.log('\nTesting TMD Current Rainfall Data API connection...');
  
  try {
    // Check if TMD API credentials are available
    if (!TMD_API_KEY || !TMD_API_SECRET) {
      console.error('❌ ERROR: TMD API credentials are missing. Please set TMD_API_KEY and TMD_API_SECRET in .env file.');
      return false;
    }
    
    // Get current time in Thailand
    const now = new Date();
    const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
    
    // Format date for API request (YYYY-MM-DD)
    const formattedDate = thailandTime.toISOString().split('T')[0];
    console.log(`Using date: ${formattedDate}`);
    
    // Build URL with updated endpoint format
    const rainfallUrl = `${TMD_API_BASE_URL}${TMD_CURRENT_RAINFALL_ENDPOINT}`;
    
    // Add date parameter if needed
    const urlWithDate = formattedDate ? `${rainfallUrl}?date=${formattedDate}` : rainfallUrl;
    
    console.log(`API URL: ${urlWithDate}`);
    
    // Make API request
    const response = await axios.get(urlWithDate, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SWOC-TMD-API-Test/1.0',
        'api-key': TMD_API_KEY,
        'secret-key': TMD_API_SECRET
      }
    });
    
    // Extract rainfall data from response
    const rainfallData = response.data;
    const observations = rainfallData?.data?.observations || [];
    
    if (!Array.isArray(observations)) {
      console.error('❌ ERROR: Unexpected API response format for current rainfall data:');
      console.log(typeof observations, rainfallData);
      return false;
    }
    
    console.log(`✅ SUCCESS: Fetched ${observations.length} current rainfall records`);
    
    // Show sample rainfall data
    if (observations.length > 0) {
      console.log('Sample current rainfall data:');
      console.log(JSON.stringify(observations[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR: TMD Current Rainfall API request failed:');
    console.error(error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Main function to run all tests
async function main() {
  console.log('=============================================');
  console.log('      Testing Weather API Connections');
  console.log('=============================================');
  
  const results = {
    thaiWaterStations: false,
    thaiWaterStations2: false,
    thaiWaterRainfall: false,
    thaiWaterRainfall2: false,
    tmdWeatherStations: false,
    tmdRainfallStations: false,
    tmdCurrentWeather: false,
    tmdCurrentRainfall: false
  };
  
  // Test ThaiWater APIs with direct URLs
  console.log('\n----- ThaiWater APIs -----');
  results.thaiWaterStations = await testThaiWaterStationsAPI();
  results.thaiWaterStations2 = await testThaiWaterStationsAPI2();
  results.thaiWaterRainfall = await testThaiWaterRainfallAPI();
  results.thaiWaterRainfall2 = await testThaiWaterRainfallAPI2();
  
  // Test TMD APIs
  console.log('\n----- TMD APIs -----');
  results.tmdWeatherStations = await testTMDWeatherStationsAPI();
  results.tmdRainfallStations = await testTMDRainfallStationsAPI();
  results.tmdCurrentWeather = await testTMDCurrentWeatherAPI();
  results.tmdCurrentRainfall = await testTMDCurrentRainfallAPI();
  
  // Display summary of results
  console.log('\n=============================================');
  console.log('            Test Results Summary');
  console.log('=============================================');
  console.log('ThaiWater Stations API 1:     ' + (results.thaiWaterStations ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('ThaiWater Stations API 2:     ' + (results.thaiWaterStations2 ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('ThaiWater Rainfall API 1:     ' + (results.thaiWaterRainfall ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('ThaiWater Rainfall API 2:     ' + (results.thaiWaterRainfall2 ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('TMD Weather Stations API:    ' + (results.tmdWeatherStations ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('TMD Rainfall Stations API:   ' + (results.tmdRainfallStations ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('TMD Current Weather API:     ' + (results.tmdCurrentWeather ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('TMD Current Rainfall API:    ' + (results.tmdCurrentRainfall ? '✅ SUCCESS' : '❌ FAILED'));
  console.log('=============================================');
  
  // Return exit code based on test results
  const allSuccessful = Object.values(results).every(result => result === true);
  process.exit(allSuccessful ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('Unexpected error running tests:', error);
  process.exit(1);
}); 