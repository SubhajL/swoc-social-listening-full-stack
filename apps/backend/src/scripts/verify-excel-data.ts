import xlsx from 'xlsx';
import path from 'path';

async function verifyExcelData() {
  try {
    console.log('Reading Excel file...');
    
    // Read the Excel file
    const workbook = xlsx.readFile(path.join(process.cwd(), '../../geocode.xlsx'));
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Get the range of the worksheet
    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Get headers (first row)
    const headers: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[xlsx.utils.encode_cell({r: 0, c: C})];
      headers[C] = cell ? cell.v : undefined;
    }
    
    console.log('\nExcel file structure:');
    console.log('====================');
    console.log('Headers:', headers);
    
    // Get first few rows of data
    const data = xlsx.utils.sheet_to_json(worksheet, { header: headers });
    
    console.log('\nFirst 5 rows of data:');
    console.log('===================');
    data.slice(1, 6).forEach((row: any) => {
      console.log('\nRow data:', row);
    });
    
  } catch (error) {
    console.error('Failed to verify Excel data:', error);
    throw error;
  }
}

// Run the verification
verifyExcelData().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 