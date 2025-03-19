import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

// Load environment variables
dotenv.config();

// Database pool with credentials from environment variables
const pool = new Pool({
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTableStructure() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      // Query to get table structure
      const structureQuery = `
        SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'reservoir_locations'
        ORDER BY ordinal_position;
      `;
      
      console.log('Fetching column structure for reservoir_locations table...');
      const structureResult = await client.query(structureQuery);
      
      if (structureResult.rows.length === 0) {
        console.log('No columns found for reservoir_locations table. The table might not exist.');
      } else {
        console.log('Column structure for reservoir_locations table:');
        console.table(structureResult.rows);
        
        // Count records in the table
        const countQuery = 'SELECT COUNT(*) FROM reservoir_locations;';
        const countResult = await client.query(countQuery);
        console.log(`Total records in reservoir_locations table: ${countResult.rows[0].count}`);
        
        // Get a sample record
        const sampleQuery = 'SELECT * FROM reservoir_locations LIMIT 1;';
        const sampleResult = await client.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
          console.log('Sample record:');
          console.log(JSON.stringify(sampleResult.rows[0], null, 2));
        }
      }
    } finally {
      // Release the client back to the pool
      client.release();
      console.log('Database connection released.');
    }
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    // End the pool
    await pool.end();
    console.log('Database pool ended.');
  }
}

// Run the function
checkTableStructure(); 