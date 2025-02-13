import { pool } from '../lib/db';

async function checkLocationData() {
  console.log('Starting data check...');
  
  let client = null;

  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Connected successfully');

    // Check provinces
    console.log('\nChecking provinces table...');
    const provinceResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT province_code) as unique_codes,
             COUNT(*) FILTER (WHERE province_name_th IS NOT NULL) as with_thai_names,
             COUNT(*) FILTER (WHERE province_name_en IS NOT NULL) as with_english_names
      FROM provinces;
    `);
    console.log('Provinces:', provinceResult.rows[0]);

    // Sample province data
    const provinceSample = await client.query(`
      SELECT province_code, province_name_th, province_name_en
      FROM provinces
      LIMIT 3;
    `);
    console.log('\nSample provinces:', provinceSample.rows);

    // Check amphures
    console.log('\nChecking amphures table...');
    const amphureResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT amphure_code) as unique_codes,
             COUNT(DISTINCT province_code) as unique_provinces,
             COUNT(*) FILTER (WHERE amphure_name_th IS NOT NULL) as with_thai_names,
             COUNT(*) FILTER (WHERE amphure_name_en IS NOT NULL) as with_english_names
      FROM amphures;
    `);
    console.log('Amphures:', amphureResult.rows[0]);

    // Sample amphure data
    const amphureSample = await client.query(`
      SELECT a.amphure_code, a.province_code, a.amphure_name_th, a.amphure_name_en, 
             p.province_name_th as province_name
      FROM amphures a
      JOIN provinces p ON a.province_code = p.province_code
      LIMIT 3;
    `);
    console.log('\nSample amphures:', amphureSample.rows);

    // Check relationships
    console.log('\nChecking relationships...');
    const relationshipResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM amphures a WHERE NOT EXISTS (
          SELECT 1 FROM provinces p WHERE p.province_code = a.province_code
        )) as orphaned_amphures
    `);
    console.log('Orphaned records:', relationshipResult.rows[0]);

  } catch (error) {
    console.error('Error checking data:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
      console.log('\nDatabase client released');
    }
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the data check
checkLocationData().catch((error) => {
  console.error('Data check failed:', error instanceof Error ? error.message : 'Unknown error');
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
}); 