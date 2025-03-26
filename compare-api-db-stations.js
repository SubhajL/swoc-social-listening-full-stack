// Script to compare TMD and HII stations from API and database
const dotenv = require('dotenv');
const pg = require('pg');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables from backend .env
const envPath = path.join(__dirname, 'apps/backend/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log(`Backend .env file not found at: ${envPath}`);
  dotenv.config(); // Try default location
}

// API configuration
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// TMD station data
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

// HII station data
const HII_STATION_API_MID = '105';
const HII_STATION_API_EID = 'CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg';

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Fetch stations from ThaiWater API
 */
async function fetchStationsFromAPI(mid, eid, description) {
  try {
    console.log(`Fetching ${description} stations from ThaiWater API...`);
    
    const url = `${THAIWATER_API_ENDPOINT}?mid=${mid}&eid=${encodeURIComponent(eid)}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SWOC-Stations-Compare/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });
    
    if (!Array.isArray(response.data)) {
      console.error(`Invalid response format for ${description} stations:`, response.data);
      return [];
    }
    
    console.log(`Successfully fetched ${response.data.length} ${description} stations from API`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${description} stations from API:`, error.message);
    return [];
  }
}

/**
 * Get stations from database by data source
 */
async function getStationsFromDB(dataSource) {
  try {
    console.log(`Fetching ${dataSource || 'ALL'} stations from database...`);
    
    const client = await pool.connect();
    
    // Build query based on data source
    let query = `
      SELECT 
        tele_station_id, 
        tele_station_name_th, 
        tele_station_lat, 
        tele_station_long, 
        province, 
        amphure, 
        data_source 
      FROM thaiwater_tele_stations 
    `;
    
    const params = [];
    if (dataSource) {
      query += `WHERE data_source = $1`;
      params.push(dataSource);
    }
    
    query += ` ORDER BY tele_station_id`;
    
    const result = await client.query(query, params);
    client.release();
    
    console.log(`Found ${result.rows.length} stations in database with data_source=${dataSource || 'ANY'}`);
    return result.rows;
  } catch (error) {
    console.error(`Error fetching stations from database:`, error.message);
    return [];
  }
}

/**
 * Compare stations from API and database
 */
async function compareStations() {
  try {
    // 1. Fetch stations from TMD API
    const tmdStationsApi = await fetchStationsFromAPI(
      TMD_STATION_API_MID, 
      TMD_STATION_API_EID, 
      'TMD'
    );
    
    // Save TMD stations to file
    const tmdStationsFile = 'tmd-stations-api.json';
    fs.writeFileSync(tmdStationsFile, JSON.stringify(tmdStationsApi, null, 2));
    console.log(`Saved TMD stations to ${tmdStationsFile}`);
    
    // 2. Fetch stations from HII API
    const hiiStationsApi = await fetchStationsFromAPI(
      HII_STATION_API_MID, 
      HII_STATION_API_EID, 
      'HII'
    );
    
    // Save HII stations to file
    const hiiStationsFile = 'hii-stations-api.json';
    fs.writeFileSync(hiiStationsFile, JSON.stringify(hiiStationsApi, null, 2));
    console.log(`Saved HII stations to ${hiiStationsFile}`);
    
    // 3. Get stations from database for each source
    const tmdStationsDb = await getStationsFromDB('TMD');
    const hiiStationsDb = await getStationsFromDB('HII');
    const allStationsDb = await getStationsFromDB();
    
    // 4. Basic comparison stats
    console.log('\n=== STATION COMPARISON ===');
    console.log(`TMD stations in API: ${tmdStationsApi.length}`);
    console.log(`TMD stations in DB: ${tmdStationsDb.length}`);
    console.log(`HII stations in API: ${hiiStationsApi.length}`);
    console.log(`HII stations in DB: ${hiiStationsDb.length}`);
    console.log(`Total stations in DB: ${allStationsDb.length}`);
    
    // 5. Sample of TMD stations from API
    if (tmdStationsApi.length > 0) {
      console.log('\n=== TMD STATIONS SAMPLE (API) ===');
      const sampleSize = Math.min(5, tmdStationsApi.length);
      for (let i = 0; i < sampleSize; i++) {
        const station = tmdStationsApi[i];
        console.log(`ID: ${station.id}, Name: ${station.tele_station_name?.th || station.tele_station_name || 'N/A'}`);
        console.log(`  Location: ${station.tele_station_lat}, ${station.tele_station_long}`);
        console.log(`  Agency ID: ${station.agency_id}`);
        console.log('---');
      }
    }
    
    // 6. Sample of HII stations from API
    if (hiiStationsApi.length > 0) {
      console.log('\n=== HII STATIONS SAMPLE (API) ===');
      const sampleSize = Math.min(5, hiiStationsApi.length);
      for (let i = 0; i < sampleSize; i++) {
        const station = hiiStationsApi[i];
        console.log(`ID: ${station.id}, Name: ${station.tele_station_name?.th || station.tele_station_name || 'N/A'}`);
        console.log(`  Location: ${station.tele_station_lat}, ${station.tele_station_long}`);
        console.log(`  Agency ID: ${station.agency_id}`);
        console.log('---');
      }
    }
    
    // 7. Check if specific stations from your screenshot exist in either API source
    console.log('\n=== CHECKING SPECIFIC STATIONS ===');
    const specificStationIds = [
      '1128781', '1128919', '1128728', '1128411', 
      '1128683', '1128155', '1128954', '457560', 
      '1128951', '1128319'
    ];
    
    for (const id of specificStationIds) {
      const numericId = parseInt(id, 10);
      
      // Check each source
      const foundInTmdApi = tmdStationsApi.find(s => s.id === numericId || String(s.id) === id);
      const foundInHiiApi = hiiStationsApi.find(s => s.id === numericId || String(s.id) === id);
      const foundInDb = allStationsDb.find(s => String(s.tele_station_id) === id);
      
      console.log(`Station ID ${id}:`);
      console.log(`  Found in TMD API: ${foundInTmdApi ? 'YES' : 'NO'}`);
      console.log(`  Found in HII API: ${foundInHiiApi ? 'YES' : 'NO'}`);
      console.log(`  Found in Database: ${foundInDb ? 'YES' : 'NO'}`);
      
      if (foundInDb) {
        console.log(`  DB info: Name=${foundInDb.tele_station_name_th}, Source=${foundInDb.data_source}`);
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error during comparison:', error);
  } finally {
    await pool.end();
  }
}

// Run the main function
compareStations().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 