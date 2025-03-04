import { getStationInfo } from '../services/thaiwater/thaiwater.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to fetch telemetry station data from ThaiWater API using the service function
 */
async function fetchAndDisplayStationInfo() {
  console.log('Fetching telemetry station information from ThaiWater API...');
  
  try {
    // Call the service function
    const response = await getStationInfo();
    
    if (response.success && Array.isArray(response.data) && response.data.length > 0) {
      console.log(`Successfully fetched ${response.data.length} telemetry stations`);
      
      // Display sample data (first 5 records)
      console.log('\nSample data (first 5 records):');
      const sampleData = response.data.slice(0, 5);
      console.log(JSON.stringify(sampleData, null, 2));
      
      // Save sample data to file for further analysis
      const sampleFilePath = path.join(__dirname, 'thaiwater-station-service-sample.json');
      fs.writeFileSync(
        sampleFilePath,
        JSON.stringify(response.data.slice(0, 20), null, 2)
      );
      console.log(`\nSaved 20 sample records to ${sampleFilePath}`);
      
      // Display station types distribution
      const stationTypes = {};
      response.data.forEach(station => {
        const type = station.tele_station_type || 'unknown';
        stationTypes[type] = (stationTypes[type] || 0) + 1;
      });
      
      console.log('\nStation types distribution:');
      Object.entries(stationTypes).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} stations`);
      });
      
      // Display warning stations count
      const warningStations = response.data.filter(station => 
        station.is_warning === 'Y' || station.is_warning === true
      );
      console.log(`\nStations with warning status: ${warningStations.length}`);
      
    } else {
      console.error('Failed to fetch station data:', response.error);
    }
  } catch (error) {
    console.error('Error fetching station data:', error);
  }
}

// Execute the function
fetchAndDisplayStationInfo().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 