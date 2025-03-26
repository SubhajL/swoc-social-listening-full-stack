import fetch from 'node-fetch';

// Hardcoded values from sync-hii-data.mjs
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '98'; // For rainfall data
const THAIWATER_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

async function checkRainfallData() {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_API_MID}&eid=${encodeURIComponent(THAIWATER_API_EID)}`;
    
    console.log('Making API request for rainfall data:', {
      url: `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_API_MID}&eid=...`,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SWOC-Rainfall-Check/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid rainfall response format: expected array');
    }

    console.log(`Rainfall API response received with ${data.length} total records`);
    
    // Get current timestamps from API data
    const uniqueTimestamps = [...new Set(data.map(record => record.rainfall_datetime))];
    console.log('\nUnique timestamps in API data:');
    uniqueTimestamps.sort().forEach(timestamp => {
      const date = new Date(timestamp);
      console.log(`- ${timestamp} (${date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })})`);
    });
    
    // Check for stations 420 and 384 with timestamp 10:00 AM
    const station420Data = data.filter(record => record.tele_station_id === 420);
    const station384Data = data.filter(record => record.tele_station_id === 384);
    
    console.log(`\nFound ${station420Data.length} records for station 420:`);
    station420Data.forEach((record, index) => {
      const timestamp = new Date(record.rainfall_datetime);
      console.log(`Record ${index + 1}:`, {
        tele_station_id: record.tele_station_id,
        rainfall_datetime: record.rainfall_datetime,
        local_time: timestamp.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
        rainfall10m: record.rainfall10m,
        rainfall1h: record.rainfall1h,
        rainfall24h: record.rainfall24h,
        rainfall_today: record.rainfall_today
      });
    });
    
    console.log(`\nFound ${station384Data.length} records for station 384:`);
    station384Data.forEach((record, index) => {
      const timestamp = new Date(record.rainfall_datetime);
      console.log(`Record ${index + 1}:`, {
        tele_station_id: record.tele_station_id,
        rainfall_datetime: record.rainfall_datetime,
        local_time: timestamp.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
        rainfall10m: record.rainfall10m,
        rainfall1h: record.rainfall1h,
        rainfall24h: record.rainfall24h,
        rainfall_today: record.rainfall_today
      });
    });
    
    // Check if there are any records with 9:00 AM timestamp
    const nineAMRecords = data.filter(record => {
      const timestamp = new Date(record.rainfall_datetime);
      return timestamp.getHours() === 9;
    });
    
    console.log(`\nFound ${nineAMRecords.length} records with 9:00 AM timestamp`);
    if (nineAMRecords.length > 0) {
      console.log('Sample 9:00 AM records:');
      nineAMRecords.slice(0, 5).forEach((record, index) => {
        const timestamp = new Date(record.rainfall_datetime);
        console.log(`Record ${index + 1}:`, {
          tele_station_id: record.tele_station_id,
          rainfall_datetime: record.rainfall_datetime,
          local_time: timestamp.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
          rainfall10m: record.rainfall10m,
          rainfall1h: record.rainfall1h,
          rainfall24h: record.rainfall24h,
          rainfall_today: record.rainfall_today
        });
      });
    }
    
    // Check specifically for stations 420 and 384 with 9:00 AM timestamp
    const station420At9AM = data.filter(record => {
      const timestamp = new Date(record.rainfall_datetime);
      return record.tele_station_id === 420 && timestamp.getHours() === 9;
    });
    
    const station384At9AM = data.filter(record => {
      const timestamp = new Date(record.rainfall_datetime);
      return record.tele_station_id === 384 && timestamp.getHours() === 9;
    });
    
    console.log(`\nFound ${station420At9AM.length} records for station 420 at 9:00 AM`);
    station420At9AM.forEach((record, index) => {
      const timestamp = new Date(record.rainfall_datetime);
      console.log(`Record ${index + 1}:`, {
        tele_station_id: record.tele_station_id,
        rainfall_datetime: record.rainfall_datetime,
        local_time: timestamp.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
        rainfall10m: record.rainfall10m,
        rainfall1h: record.rainfall1h,
        rainfall24h: record.rainfall24h,
        rainfall_today: record.rainfall_today
      });
    });
    
    console.log(`\nFound ${station384At9AM.length} records for station 384 at 9:00 AM`);
    station384At9AM.forEach((record, index) => {
      const timestamp = new Date(record.rainfall_datetime);
      console.log(`Record ${index + 1}:`, {
        tele_station_id: record.tele_station_id,
        rainfall_datetime: record.rainfall_datetime,
        local_time: timestamp.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
        rainfall10m: record.rainfall10m,
        rainfall1h: record.rainfall1h,
        rainfall24h: record.rainfall24h,
        rainfall_today: record.rainfall_today
      });
    });
    
    // Log the first record to see the structure
    if (data && data.length > 0) {
      console.log("\nSample of API response structure (first record):");
      console.log(JSON.stringify(data[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error fetching rainfall data:', error);
  }
}

checkRainfallData(); 