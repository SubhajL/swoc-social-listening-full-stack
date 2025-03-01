import { getStationInfo, ThaiWaterStationData } from '../services/thaiwater/thaiwater.service';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// For TypeScript in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Type guard to check if an item is a ThaiWaterStationData
 */
function isStationData(item: any): item is ThaiWaterStationData {
  return item && typeof item === 'object' && 'tele_station_type' in item;
}

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
      
      // Filter to ensure we only process station data
      const stationData = response.data.filter(isStationData);
      
      if (stationData.length === 0) {
        console.error('No station data found in the response');
        return;
      }
      
      // Display sample data (first 5 records)
      console.log('\nSample data (first 5 records):');
      const sampleData = stationData.slice(0, 5);
      console.log(JSON.stringify(sampleData, null, 2));
      
      // Save sample data to file for further analysis
      const sampleFilePath = path.join(__dirname, 'thaiwater-station-service-sample.json');
      fs.writeFileSync(
        sampleFilePath,
        JSON.stringify(stationData.slice(0, 20), null, 2)
      );
      console.log(`\nSaved 20 sample records to ${sampleFilePath}`);
      
      // Display station types distribution
      const stationTypes: Record<string, number> = {};
      stationData.forEach(station => {
        const type = station.tele_station_type || 'unknown';
        stationTypes[type] = (stationTypes[type] || 0) + 1;
      });
      
      console.log('\nStation types distribution:');
      Object.entries(stationTypes).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} stations`);
      });
      
      // Display warning stations count
      const warningStations = stationData.filter(station => {
        // Handle different possible values for is_warning
        if (typeof station.is_warning === 'string') {
          return station.is_warning === 'Y';
        } else if (typeof station.is_warning === 'boolean') {
          return station.is_warning === true;
        }
        return false;
      });
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