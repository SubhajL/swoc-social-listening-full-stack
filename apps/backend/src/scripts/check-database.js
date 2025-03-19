// Script to check database tables
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function checkDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Checking database connection and tables...');
  console.log('Using connection string:', process.env.DATABASE_URL);

  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Successfully connected to the database');

    // Check if PostGIS is available
    const postgisCheck = await client.query(`
      SELECT 1 FROM pg_extension WHERE extname = 'postgis'
    `);
    
    if (postgisCheck.rows.length > 0) {
      console.log('PostGIS extension is available');
    } else {
      console.log('PostGIS extension is NOT available');
    }

    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nAvailable tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Check if thaiwater_tele_stations table exists
    const stationsCheck = await client.query(`
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'thaiwater_tele_stations'
    `);
    
    if (stationsCheck.rows.length > 0) {
      console.log('\nthaiwater_tele_stations table exists');
      
      // Check columns in thaiwater_tele_stations
      const columnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'thaiwater_tele_stations'
        ORDER BY ordinal_position
      `);
      
      console.log('\nColumns in thaiwater_tele_stations:');
      columnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
      
      // Count rows in thaiwater_tele_stations
      const countResult = await client.query(`
        SELECT COUNT(*) FROM thaiwater_tele_stations
      `);
      
      console.log(`\nTotal rows in thaiwater_tele_stations: ${countResult.rows[0].count}`);
    } else {
      console.log('\nthaiwater_tele_stations table does NOT exist');
    }

    // Release client
    client.release();
  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the function
checkDatabase().catch(error => {
  console.error('Unhandled error:', error.message);
  process.exit(1);
}); 