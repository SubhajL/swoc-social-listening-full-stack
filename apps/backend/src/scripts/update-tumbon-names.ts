import { pool } from '../lib/db';
import xlsx from 'xlsx';
import path from 'path';

interface TumbonRow {
  id: string;
  name_th: string;
}

async function updateTumbonNames() {
  try {
    console.log('Starting tumbon name update process');

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
    
    // Find the columns for ID and Thai name
    const data = xlsx.utils.sheet_to_json(worksheet, { header: headers });
    
    // Transform the data into the format we need
    const tumbonData: TumbonRow[] = [];
    data.slice(1).forEach((row: any) => {
      const id = row['810303']?.toString().padStart(6, '0'); // Ensure 6 digits
      const name_th = row['เกาะกลาง'];
      if (id && name_th) {
        tumbonData.push({ id, name_th });
      }
    });

    console.log(`Processed ${tumbonData.length} rows from Excel`);
    
    // Connect to database
    const client = await pool.connect();
    try {
      // Set proper encoding
      await client.query("SET client_encoding TO 'UTF8'");
      await client.query("SET NAMES 'utf8'");
      
      // Start a transaction
      await client.query('BEGIN');

      // Prepare batch update query
      const batchSize = 1000;
      const batches = Math.ceil(tumbonData.length / batchSize);
      let totalUpdated = 0;

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, tumbonData.length);
        const batch = tumbonData.slice(start, end);

        // Create a single query for the batch
        const values = batch.map((row, idx) => `($${idx * 2 + 1}::varchar, $${idx * 2 + 2}::varchar)`).join(',');
        const params = batch.flatMap(row => [row.id, row.name_th]);

        if (params.length > 0) {
          const query = `
            UPDATE tumbons AS t SET
              name_th = c.name_th
            FROM (VALUES ${values}) AS c(id, name_th)
            WHERE t.id = c.id
          `;

          const result = await client.query(query, params);
          if (result.rowCount) {
            totalUpdated += result.rowCount;
          }

          console.log(`Progress: ${Math.round((end / tumbonData.length) * 100)}% (${end}/${tumbonData.length} rows)`);
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      console.log('Tumbon name update completed', {
        totalProcessed: tumbonData.length,
        updated: totalUpdated
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Failed to update tumbon names:', error);
    throw error;
  }
}

// Run the update
updateTumbonNames().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 