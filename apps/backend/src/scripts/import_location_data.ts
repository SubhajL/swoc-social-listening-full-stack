import { DBFFile } from 'dbffile';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const { Pool } = pg;

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DBFRecord {
  TAMBON_T: string;
  TAMBON_E: string;
  AMPHOE_T: string;
  AMPHOE_E: string;
  CHANGWAT_T: string;
  CHANGWAT_E: string;
  LAT: number;
  LONG: number;
  TA_ID: string;
  AM_ID: string;
  CH_ID: string;
  [key: string]: unknown;
}

function isValidCoordinate(lat: number, long: number): boolean {
  // Thailand's bounding box
  const THAILAND_BOUNDS = {
    minLat: 5.613038,
    maxLat: 20.465143,
    minLong: 97.343396,
    maxLong: 105.636812
  };

  return (
    lat >= THAILAND_BOUNDS.minLat &&
    lat <= THAILAND_BOUNDS.maxLat &&
    long >= THAILAND_BOUNDS.minLong &&
    long <= THAILAND_BOUNDS.maxLong
  );
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  console.warn(`Truncating string: "${str}" to ${maxLength} characters`);
  return str.substring(0, maxLength);
}

async function importLocationData() {
  const pool = new Pool({
    user: 'swoc-uat-ssl-user',
    password: 'c3dc7c8f659dd84f76b37057a37d75d2',
    host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
    port: 15434,
    database: 'swoc-uat-ssl',
    ssl: {
      rejectUnauthorized: false
    }
  });

  const dbfPath = path.resolve(__dirname, '../../../../Tambon_W/Tambon_W.dbf');
  console.log('DBF file path:', dbfPath);

  let dbf: DBFFile | null = null;
  let client = null;

  try {
    // Check if file exists
    try {
      await fs.access(dbfPath);
      console.log('DBF file exists');
    } catch (error) {
      console.error('DBF file does not exist:', dbfPath);
      throw new Error('DBF file not found');
    }

    // Open DBF file
    try {
      console.log('Opening DBF file...');
      dbf = await DBFFile.open(dbfPath);
      console.log('DBF file opened successfully');
    } catch (error) {
      console.error('Failed to open DBF file:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Failed to open DBF file');
    }

    // Read records
    console.log('Reading records...');
    const records = await dbf.readRecords();
    console.log(`Found ${records.length} records`);

    // Get database client and start transaction
    client = await pool.connect();
    await client.query('BEGIN');
    console.log('Transaction started');

    let processedProvinces = new Set<string>();
    let processedAmphures = new Set<string>();
    let processedTumbons = new Set<string>();
    let invalidCoordinates = 0;
    let truncatedValues = 0;

    // Process records
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as DBFRecord;
      
      if (i % 100 === 0) {
        console.log(`Processing record ${i + 1}/${records.length}`);
      }

      // Clean and truncate names
      const provinceThai = truncateString(record.CHANGWAT_T.replace('จ.', '').trim(), 100);
      const provinceEng = truncateString(record.CHANGWAT_E.trim(), 100);
      const amphureThai = truncateString(record.AMPHOE_T.replace('อ.', '').trim(), 100);
      const amphureEng = truncateString(record.AMPHOE_E.trim(), 100);
      const tumbonThai = truncateString(record.TAMBON_T.replace('ต.', '').trim(), 100);
      const tumbonEng = truncateString(record.TAMBON_E.trim(), 100);

      const lat = parseFloat(record.LAT.toString());
      const long = parseFloat(record.LONG.toString());

      if (!isValidCoordinate(lat, long)) {
        console.warn(`Invalid coordinates for tumbon ${tumbonThai}: ${lat}, ${long}`);
        invalidCoordinates++;
        continue;
      }

      try {
        // Insert province if not processed
        if (!processedProvinces.has(record.CH_ID)) {
          await client.query(
            'INSERT INTO provinces (id, name_th, name_en, latitude, longitude) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
            [record.CH_ID, provinceThai, provinceEng, lat, long]
          );
          processedProvinces.add(record.CH_ID);
        }

        // Insert amphure if not processed
        if (!processedAmphures.has(record.AM_ID)) {
          await client.query(
            'INSERT INTO amphures (id, province_id, name_th, name_en, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
            [record.AM_ID, record.CH_ID, amphureThai, amphureEng, lat, long]
          );
          processedAmphures.add(record.AM_ID);
        }

        // Insert tumbon if not processed
        if (!processedTumbons.has(record.TA_ID)) {
          await client.query(
            'INSERT INTO tumbons (id, amphure_id, name_th, name_en, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
            [record.TA_ID, record.AM_ID, tumbonThai, tumbonEng, lat, long]
          );
          processedTumbons.add(record.TA_ID);
        }
      } catch (error) {
        console.error('Error processing record:', {
          record_index: i,
          province: provinceThai,
          amphure: amphureThai,
          tumbon: tumbonThai,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('\nImport completed successfully:');
    console.log(`- Processed provinces: ${processedProvinces.size}`);
    console.log(`- Processed amphures: ${processedAmphures.size}`);
    console.log(`- Processed tumbons: ${processedTumbons.size}`);
    console.log(`- Skipped records with invalid coordinates: ${invalidCoordinates}`);
    if (truncatedValues > 0) {
      console.log(`- Truncated ${truncatedValues} values to fit column length`);
    }

  } catch (error: unknown) {
    if (client) {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back');
    }
    console.error('Fatal error during import:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  } finally {
    if (dbf) {
      try {
        // Check if dbf.close is a function before calling it
        if (typeof (dbf as any).close === 'function') {
          await (dbf as any).close();
          console.log('DBF file closed');
        }
      } catch (error) {
        console.warn('Warning: Could not close DBF file:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
    if (client) {
      client.release();
      console.log('Database client released');
    }
    await pool.end();
    console.log('Database pool closed');
  }
}

// Run the import
importLocationData().catch((error: unknown) => {
  console.error('Import failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}); 