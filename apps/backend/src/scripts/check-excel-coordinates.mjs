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
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Successfully read ${data.length} records from Excel`);
    
    // Find specific reservoirs
    const specificReservoirs = data.filter(row => 
      row.cresv === 'rsv01' || row.cresv === 'rsv02' || row.cresv === 'rsv10'
    );
    
    console.log('\nSpecific Reservoir Coordinates from Excel:');
    console.table(specificReservoirs.map(row => ({
      cresv: row.cresv,
      nresv: row.nresv,
      cresv_lat: row.cresv_lat,
      cresv_lng: row.cresv_lng
    })));
    
    // Show the raw values
    console.log('\nRaw Values from Excel:');
    specificReservoirs.forEach(row => {
      console.log(`${row.cresv}: lat=${row.cresv_lat} (${typeof row.cresv_lat}), lng=${row.cresv_lng} (${typeof row.cresv_lng})`);
    });
    
    return data;
  } catch (error) {
    console.error(`Error reading Excel file: ${error.message}`);
    throw error;
  }
}

// Run the function
readExcelFile(); 