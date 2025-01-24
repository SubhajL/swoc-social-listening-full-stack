import pg from 'pg';

const { Pool } = pg;

async function installPostGIS() {
  console.log('Starting PostGIS installation process...');
  
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

    // Check if PostGIS is already installed
    console.log('Checking PostGIS installation...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      );
    `);

    if (checkResult.rows[0].exists) {
      console.log('PostGIS is already installed.');
      
      // Get PostGIS version
      const versionResult = await client.query('SELECT PostGIS_Version();');
      console.log('PostGIS version:', versionResult.rows[0].postgis_version);
      return;
    }

    // Check if we have permission to create extensions
    console.log('Checking extension creation permissions...');
    const permissionResult = await client.query(`
      SELECT 
        current_user,
        has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
        (SELECT usesuper FROM pg_user WHERE usename = current_user) as is_superuser;
    `);

    console.log('Permission check results:', permissionResult.rows[0]);

    if (!permissionResult.rows[0].can_create || !permissionResult.rows[0].is_superuser) {
      throw new Error(`Current user "${permissionResult.rows[0].current_user}" does not have sufficient permissions to create extensions. Superuser privileges are required.`);
    }

    // Install PostGIS
    console.log('Installing PostGIS...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS installed successfully.');

    // Verify installation
    const verifyResult = await client.query('SELECT PostGIS_Version();');
    console.log('PostGIS version:', verifyResult.rows[0].postgis_version);

    // Enable PostGIS on our tables
    console.log('\nEnabling spatial features on location tables...');
    
    try {
      // Add geometry columns to provinces
      console.log('Adding geometry column to provinces...');
      await client.query(`
        SELECT AddGeometryColumn('provinces', 'geom', 4326, 'POINT', 2);
        UPDATE provinces SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
      `);
      console.log('Added geometry column to provinces table');

      // Add geometry columns to amphures
      console.log('Adding geometry column to amphures...');
      await client.query(`
        SELECT AddGeometryColumn('amphures', 'geom', 4326, 'POINT', 2);
        UPDATE amphures SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
      `);
      console.log('Added geometry column to amphures table');

      // Add geometry columns to tumbons
      console.log('Adding geometry column to tumbons...');
      await client.query(`
        SELECT AddGeometryColumn('tumbons', 'geom', 4326, 'POINT', 2);
        UPDATE tumbons SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
      `);
      console.log('Added geometry column to tumbons table');
    } catch (error) {
      console.error('Error adding geometry columns:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }

    console.log('\nPostGIS setup completed successfully!');

  } catch (error) {
    console.error('Error during PostGIS installation:', error instanceof Error ? error.message : 'Unknown error');
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

// Run the installation
installPostGIS().catch((error) => {
  console.error('Installation failed:', error instanceof Error ? error.message : 'Unknown error');
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
}); 