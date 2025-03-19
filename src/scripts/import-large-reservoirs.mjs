// Importing pg as an ES module
import pkg from 'pg';
const { Pool } = pkg;

// Enhanced data validation to check required fields and numeric conversion
function validateReservoir(reservoir) {
  const requiredFields = [
    'อ่างเก็บน้ำ/เขื่อน',
    'ลุ่มน้ำ',
    'อำเภอ',
    'จังหวัด',
    'ความจุ รนก. \r\n(ล้าน ลบ.ม.)',
    'ปริมาณน้ำ รนก. ต่ำสุด\r\n (ล้าน ลบ.ม.)'
  ];

  // Check that all required fields exist and are non-empty
  const basicValidation = requiredFields.every(field => {
    const value = reservoir[field];
    return value !== undefined && value !== null && value !== '';
  });

  if (!basicValidation) return false;

  // Validate numeric fields
  const capacity = parseFloat(reservoir['ความจุ รนก. \r\n(ล้าน ลบ.ม.)']);
  const minVolume = parseFloat(reservoir['ปริมาณน้ำ รนก. ต่ำสุด\r\n (ล้าน ลบ.ม.)']);

  if (isNaN(capacity) || isNaN(minVolume)) return false;

  return true;
}

// Enhanced reservoir processing with individual transaction and type guards
async function processReservoir(client, reservoir) {
  if (!validateReservoir(reservoir)) {
    console.warn(`Skipping invalid reservoir: ${JSON.stringify(reservoir)}`);
    return { status: 'skipped', reservoir };
  }

  // Parse numeric values
  const capacity = parseFloat(reservoir['ความจุ รนก. \r\n(ล้าน ลบ.ม.)']);
  const minVolume = parseFloat(reservoir['ปริมาณน้ำ รนก. ต่ำสุด\r\n (ล้าน ลบ.ม.)']);

  try {
    await client.query('BEGIN');
    
    // Process the reservoir data with upsert logic
    const query = `
      INSERT INTO reservoir_locations (
        reservoir_name, 
        reservoir_lat, 
        reservoir_long, 
        province, 
        amphure, 
        capacity, 
        min_volume,
        data_source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (reservoir_name) DO UPDATE SET
        reservoir_lat = EXCLUDED.reservoir_lat,
        reservoir_long = EXCLUDED.reservoir_long,
        province = EXCLUDED.province,
        amphure = EXCLUDED.amphure,
        capacity = EXCLUDED.capacity,
        min_volume = EXCLUDED.min_volume,
        data_source = EXCLUDED.data_source
    `;
    
    const values = [
      reservoir['อ่างเก็บน้ำ/เขื่อน'],
      null, // latitude (to be populated later if available)
      null, // longitude (to be populated later if available)
      reservoir['จังหวัด'],
      reservoir['อำเภอ'],
      capacity,
      minVolume,
      'reservoir' // data source label
    ];
    
    await client.query(query, values);
    await client.query('COMMIT');
    return { status: 'success', reservoir };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error processing reservoir: ${JSON.stringify(reservoir)}`, error);
    return { status: 'error', reservoir, error };
  }
}

async function importLargeReservoirs() {
  const pool = new Pool({
    user: 'swoc-uat-gis-ssl-user',
    password: '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
    host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
    port: 15435,
    database: 'swoc-uat-gis-ssl'
  });
  
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  // Assume reservoirs is defined and is an array of reservoir records
  // If not, it should be imported or read from a source
  for (const reservoir of reservoirs) {
    // Use a dedicated client for each record if needed, but here we reuse a connection
    const client = await pool.connect();
    try {
      const result = await processReservoir(client, reservoir);
      if (result.status === 'success') {
        successCount++;
      } else if (result.status === 'error') {
        errorCount++;
      } else {
        skipCount++;
      }
    } finally {
      client.release();
    }
  }

  // Final logging of table status before ending the pool
  const finalClient = await pool.connect();
  try {
    const resCount = await finalClient.query('SELECT COUNT(*) FROM reservoir_locations');
    console.log(`Total records in reservoir_locations table: ${resCount.rows[0].count}`);
    
    const sourceRes = await finalClient.query(
      'SELECT data_source, COUNT(*) FROM reservoir_locations GROUP BY data_source'
    );
    console.log('Records by data source:');
    sourceRes.rows.forEach(row => {
      console.log(`  ${row.data_source}: ${row.count}`);
    });
  } finally {
    finalClient.release();
    await pool.end();
  }

  console.log(`\nImport completed. Successful: ${successCount}, Errors: ${errorCount}, Skipped: ${skipCount}`);
}

// Execute the import process
importLargeReservoirs().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
}); 