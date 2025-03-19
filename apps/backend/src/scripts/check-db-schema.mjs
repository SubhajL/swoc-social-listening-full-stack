import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup database connection
const { Pool } = pkg;
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

async function checkTableSchema() {
  const client = await pool.connect();
  
  try {
    // Get column information for the reservoir_locations table
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reservoir_locations'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(query);
    
    console.log('Reservoir Locations Table Schema:');
    console.table(result.rows);
    
    // Get a sample row to see actual data
    const sampleQuery = `
      SELECT * FROM reservoir_locations LIMIT 1;
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    console.log('\nSample Row:');
    console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    
  } catch (error) {
    console.error(`Error checking schema: ${error.message}`);
  } finally {
    client.release();
  }
}

// Run the function
checkTableSchema().then(() => {
  console.log('Schema check completed');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 