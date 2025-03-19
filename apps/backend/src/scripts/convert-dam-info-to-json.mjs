import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to CSV file (relative to project root)
const CSV_FILE_PATH = path.resolve(__dirname, '../../../../!DAMInfo_201911271750.csv');
const OUTPUT_PATH = path.resolve(__dirname, '../../../../dam_info.json');

async function convertDamInfoToJson() {
  try {
    console.log(`Reading CSV file from: ${CSV_FILE_PATH}`);
    
    // Read the CSV file
    const csvData = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    
    // Parse CSV manually (Rainbow CSV-style)
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Parse records
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');
      
      // Skip lines that don't have enough values
      if (values.length !== headers.length) {
        console.log(`Skipping line ${i + 1} due to column count mismatch: ${line}`);
        continue;
      }
      
      // Create record object
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ? values[index].trim() : '';
      });
      
      records.push(record);
    }
    
    console.log(`Successfully parsed ${records.length} records from CSV`);
    
    // Filter out rows with empty DAM_ID or DAM_Name
    const validRecords = records.filter(record => {
      return record.DAM_ID && record.DAM_Name;
    });
    
    console.log(`Found ${validRecords.length} valid dam records`);
    
    // Process each record to convert numeric values
    const processedRecords = validRecords.map(record => {
      const processedRecord = { ...record };
      
      // Convert numeric fields
      ['DAM_Lat', 'DAM_Lon', 'DAM_QMax', 'DAM_QStore', 'DAM_QUsage', 
       'DAM_ULevelMax', 'DAM_ULevelMin', 'DAM_DLevelMax', 'DAM_DLevelMin'].forEach(field => {
        if (processedRecord[field]) {
          const numValue = parseFloat(processedRecord[field]);
          if (!isNaN(numValue)) {
            processedRecord[field] = numValue;
          }
        }
      });
      
      // Convert boolean fields
      if (processedRecord.DAM_ShowReport) {
        processedRecord.DAM_ShowReport = processedRecord.DAM_ShowReport === '1';
      }
      
      return processedRecord;
    });
    
    // Organize dams by region
    const damsByRegion = {};
    processedRecords.forEach(dam => {
      const region = dam.DAM_Group || 'Unknown';
      if (!damsByRegion[region]) {
        damsByRegion[region] = [];
      }
      damsByRegion[region].push(dam);
    });
    
    // Create output structure
    const outputData = {
      metadata: {
        totalDams: processedRecords.length,
        source: '!DAMInfo_201911271750.csv',
        exportDate: new Date().toISOString(),
        regions: Object.keys(damsByRegion)
      },
      damsByRegion: damsByRegion,
      dams: processedRecords
    };
    
    // Write to JSON file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    
    console.log(`Successfully exported dam information to: ${OUTPUT_PATH}`);
    
    // Show a sample of the data
    console.log('\nSample of exported data (first 3 records):');
    console.table(processedRecords.slice(0, 3).map(dam => ({
      DAM_ID: dam.DAM_ID,
      DAM_Name: dam.DAM_Name,
      DAM_Group: dam.DAM_Group,
      DAM_Lat: dam.DAM_Lat,
      DAM_Lon: dam.DAM_Lon,
      DAM_QMax: dam.DAM_QMax
    })));
    
    // Count dams by region
    console.log('\nDams count by region:');
    Object.entries(damsByRegion).forEach(([region, dams]) => {
      console.log(`${region}: ${dams.length}`);
    });
    
    return processedRecords.length;
  } catch (error) {
    console.error(`Error converting CSV to JSON: ${error.message}`);
    throw error;
  }
}

// Run the function
convertDamInfoToJson().then((count) => {
  console.log(`Successfully converted ${count} dam records to JSON`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 