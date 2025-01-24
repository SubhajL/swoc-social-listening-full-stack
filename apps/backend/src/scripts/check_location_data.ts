import pg from 'pg';

const { Pool } = pg;

async function checkLocationData() {
  console.log('Starting data check...');
  
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

  let client = null;

  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Connected successfully');

    // Check provinces
    console.log('\nChecking provinces table...');
    const provinceResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT id) as unique_ids,
             COUNT(*) FILTER (WHERE name_th IS NOT NULL) as with_thai_names,
             COUNT(*) FILTER (WHERE name_en IS NOT NULL) as with_english_names,
             COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_coordinates
      FROM provinces;
    `);
    console.log('Provinces:', provinceResult.rows[0]);

    // Sample province data
    const provinceSample = await client.query(`
      SELECT id, name_th, name_en, latitude, longitude
      FROM provinces
      LIMIT 3;
    `);
    console.log('\nSample provinces:', provinceSample.rows);

    // Check amphures
    console.log('\nChecking amphures table...');
    const amphureResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT id) as unique_ids,
             COUNT(DISTINCT province_id) as unique_provinces,
             COUNT(*) FILTER (WHERE name_th IS NOT NULL) as with_thai_names,
             COUNT(*) FILTER (WHERE name_en IS NOT NULL) as with_english_names,
             COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_coordinates
      FROM amphures;
    `);
    console.log('Amphures:', amphureResult.rows[0]);

    // Sample amphure data
    const amphureSample = await client.query(`
      SELECT a.id, a.province_id, a.name_th, a.name_en, a.latitude, a.longitude, p.name_th as province_name
      FROM amphures a
      JOIN provinces p ON a.province_id = p.id
      LIMIT 3;
    `);
    console.log('\nSample amphures:', amphureSample.rows);

    // Check tumbons
    console.log('\nChecking tumbons table...');
    const tumbonResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT id) as unique_ids,
             COUNT(DISTINCT amphure_id) as unique_amphures,
             COUNT(*) FILTER (WHERE name_th IS NOT NULL) as with_thai_names,
             COUNT(*) FILTER (WHERE name_en IS NOT NULL) as with_english_names,
             COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_coordinates
      FROM tumbons;
    `);
    console.log('Tumbons:', tumbonResult.rows[0]);

    // Check relationships
    console.log('\nChecking relationships...');
    const relationshipResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM amphures a WHERE NOT EXISTS (
          SELECT 1 FROM provinces p WHERE p.id = a.province_id
        )) as orphaned_amphures,
        (SELECT COUNT(*) FROM tumbons t WHERE NOT EXISTS (
          SELECT 1 FROM amphures a WHERE a.id = t.amphure_id
        )) as orphaned_tumbons;
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