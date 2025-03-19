import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to CSV file (relative to project root)
const CSV_FILE_PATH = path.resolve(__dirname, '../../../../!DAMInfo_201911271750.csv');

function getDecimalPlaces(numStr) {
  if (!numStr || typeof numStr !== 'string') return 0;
  
  const parts = numStr.split('.');
  if (parts.length !== 2) return 0;
  
  return parts[1].length;
}

async function checkCoordinatesPrecision() {
  try {
    console.log(`Reading CSV file from: ${CSV_FILE_PATH}`);
    
    // Read the CSV file
    const csvData = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    
    // Parse CSV manually
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Find indices of latitude and longitude columns
    const latIndex = headers.indexOf('DAM_Lat');
    const lonIndex = headers.indexOf('DAM_Lon');
    
    if (latIndex === -1 || lonIndex === -1) {
      throw new Error('Could not find DAM_Lat or DAM_Lon columns in the CSV');
    }
    
    // Track decimal places
    const latDecimalPlaces = {};
    const lonDecimalPlaces = {};
    let maxLatDecimalPlaces = 0;
    let maxLonDecimalPlaces = 0;
    
    // Track example coordinates
    const coordinatesExamples = [];
    
    // Process all records
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');
      
      // Skip lines that don't have enough values
      if (values.length <= Math.max(latIndex, lonIndex)) continue;
      
      const latValue = values[latIndex] ? values[latIndex].trim() : '';
      const lonValue = values[lonIndex] ? values[lonIndex].trim() : '';
      
      if (latValue && lonValue) {
        const latDecimals = getDecimalPlaces(latValue);
        const lonDecimals = getDecimalPlaces(lonValue);
        
        // Update max decimal places
        maxLatDecimalPlaces = Math.max(maxLatDecimalPlaces, latDecimals);
        maxLonDecimalPlaces = Math.max(maxLonDecimalPlaces, lonDecimals);
        
        // Count occurrences of each decimal place count
        latDecimalPlaces[latDecimals] = (latDecimalPlaces[latDecimals] || 0) + 1;
        lonDecimalPlaces[lonDecimals] = (lonDecimalPlaces[lonDecimals] || 0) + 1;
        
        // Save example
        if (coordinatesExamples.length < 5) {
          coordinatesExamples.push({
            row: i + 1,
            damId: values[headers.indexOf('DAM_ID')],
            damName: values[headers.indexOf('DAM_Name')],
            latitude: latValue,
            latDecimals,
            longitude: lonValue,
            lonDecimals
          });
        }
      }
    }
    
    // Print results
    console.log('\nLatitude Decimal Places:');
    for (const [decimals, count] of Object.entries(latDecimalPlaces).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
      console.log(`${decimals} decimal places: ${count} records (${((count / (lines.length - 1)) * 100).toFixed(2)}%)`);
    }
    
    console.log('\nLongitude Decimal Places:');
    for (const [decimals, count] of Object.entries(lonDecimalPlaces).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
      console.log(`${decimals} decimal places: ${count} records (${((count / (lines.length - 1)) * 100).toFixed(2)}%)`);
    }
    
    console.log(`\nMaximum decimal places in latitude: ${maxLatDecimalPlaces}`);
    console.log(`Maximum decimal places in longitude: ${maxLonDecimalPlaces}`);
    
    console.log('\nExample Coordinates:');
    console.table(coordinatesExamples);
    
    return {
      maxLatDecimalPlaces,
      maxLonDecimalPlaces,
      latitudeStats: latDecimalPlaces,
      longitudeStats: lonDecimalPlaces
    };
  } catch (error) {
    console.error(`Error checking coordinate precision: ${error.message}`);
    throw error;
  }
}

// Run the function
checkCoordinatesPrecision().then((stats) => {
  console.log(`\nAnalysis completed for coordinate precision`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 