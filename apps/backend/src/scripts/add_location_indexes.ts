import pg from 'pg';

const { Pool } = pg;

async function addLocationIndexes() {
  console.log('Starting index creation process...');
  
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

    await client.query('BEGIN');

    // Indexes for provinces
    console.log('\nCreating indexes for provinces table...');
    await client.query(`
      -- Name indexes
      CREATE INDEX IF NOT EXISTS idx_provinces_name_th ON provinces (name_th);
      CREATE INDEX IF NOT EXISTS idx_provinces_name_en ON provinces (name_en);
      
      -- Coordinate indexes (separate and combined)
      CREATE INDEX IF NOT EXISTS idx_provinces_latitude ON provinces (latitude);
      CREATE INDEX IF NOT EXISTS idx_provinces_longitude ON provinces (longitude);
      CREATE INDEX IF NOT EXISTS idx_provinces_coords ON provinces (latitude, longitude);
    `);
    console.log('Created province indexes');

    // Indexes for amphures
    console.log('\nCreating indexes for amphures table...');
    await client.query(`
      -- Foreign key index
      CREATE INDEX IF NOT EXISTS idx_amphures_province_id ON amphures (province_id);
      
      -- Name indexes
      CREATE INDEX IF NOT EXISTS idx_amphures_name_th ON amphures (name_th);
      CREATE INDEX IF NOT EXISTS idx_amphures_name_en ON amphures (name_en);
      
      -- Coordinate indexes (separate and combined)
      CREATE INDEX IF NOT EXISTS idx_amphures_latitude ON amphures (latitude);
      CREATE INDEX IF NOT EXISTS idx_amphures_longitude ON amphures (longitude);
      CREATE INDEX IF NOT EXISTS idx_amphures_coords ON amphures (latitude, longitude);
    `);
    console.log('Created amphure indexes');

    // Indexes for tumbons
    console.log('\nCreating indexes for tumbons table...');
    await client.query(`
      -- Foreign key index
      CREATE INDEX IF NOT EXISTS idx_tumbons_amphure_id ON tumbons (amphure_id);
      
      -- Name indexes
      CREATE INDEX IF NOT EXISTS idx_tumbons_name_th ON tumbons (name_th);
      CREATE INDEX IF NOT EXISTS idx_tumbons_name_en ON tumbons (name_en);
      
      -- Coordinate indexes (separate and combined)
      CREATE INDEX IF NOT EXISTS idx_tumbons_latitude ON tumbons (latitude);
      CREATE INDEX IF NOT EXISTS idx_tumbons_longitude ON tumbons (longitude);
      CREATE INDEX IF NOT EXISTS idx_tumbons_coords ON tumbons (latitude, longitude);
    `);
    console.log('Created tumbon indexes');

    // Analyze tables for better query planning
    console.log('\nAnalyzing tables...');
    await client.query(`
      ANALYZE provinces;
      ANALYZE amphures;
      ANALYZE tumbons;
    `);
    console.log('Tables analyzed');

    await client.query('COMMIT');
    console.log('\nAll indexes created and tables analyzed successfully!');

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      console.log('Changes rolled back');
    }
    console.error('Error creating indexes:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
      console.log('Database client released');
    }
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the index creation
addLocationIndexes().catch((error) => {
  console.error('Failed to create indexes:', error instanceof Error ? error.message : 'Unknown error');
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
}); 