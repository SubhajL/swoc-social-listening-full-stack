import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Excel file
const EXCEL_FILE_PATH = path.resolve(__dirname, '../../../../Report_dam_station_2025-02-05_V0.5 LH.xlsx');

async function inspectExcelFile() {
  try {
    console.log(`Reading Excel file from: ${EXCEL_FILE_PATH}`);
    
    // Check if file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`Excel file not found at: ${EXCEL_FILE_PATH}`);
      return;
    }
    
    // Read the Excel file
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    
    // List all sheets
    console.log('Available sheets in the workbook:');
    console.log(workbook.SheetNames);
    
    // Inspect each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\nExamining sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      if (data.length === 0) {
        console.log(`Sheet ${sheetName} is empty or has no recognizable data.`);
        continue;
      }
      
      console.log(`Found ${data.length} records in sheet`);
      
      // Check column headers from first record
      const firstRow = data[0];
      console.log('\nColumn headers in this sheet:');
      console.log(Object.keys(firstRow));
      
      // Show first 2 records as samples
      console.log('\nSample data (first 2 records):');
      console.log(JSON.stringify(data.slice(0, 2), null, 2));
    }
    
  } catch (error) {
    console.error('Error inspecting Excel file:', error);
  }
}

// Run the function
inspectExcelFile().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 