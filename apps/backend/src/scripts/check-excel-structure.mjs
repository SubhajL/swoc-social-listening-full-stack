import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Excel file (relative to project root)
const EXCEL_FILE_PATH = path.resolve(__dirname, '../../../../reservior (tumbon code).xlsx');

// Function to read Excel file
function readExcelFile() {
  try {
    console.log(`Reading Excel file from: ${EXCEL_FILE_PATH}`);
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    console.log(`Sheet name: ${sheetName}`);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Successfully read ${data.length} records from Excel`);
    
    // Print the first row to see the column structure
    if (data.length > 0) {
      console.log('First row structure:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
    return data;
  } catch (error) {
    console.error(`Error reading Excel file: ${error.message}`);
    throw error;
  }
}

// Run the function
readExcelFile(); 