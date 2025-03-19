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

async function verifyPrecision() {
  const client = await pool.connect();
  
  try {
    // Query specific reservoirs to check precision
    const query = `
      SELECT reservoir_id, 
        reservoir_name, 
        reservoir_lat, 
        reservoir_long,
        province,
        amphure,
        tambon
      FROM reservoir_locations 
      WHERE reservoir_id IN ('rsv01', 'rsv02', 'rsv10')
      ORDER BY formatted_id;
    `;
    
    const result = await client.query(query);
    
    console.log('Reservoir Coordinates with Precision:');
    console.table(result.rows);
    
    // Show the raw values and their length
    console.log('\nRaw Values with Length:');
    result.rows.forEach(row => {
      console.log(`${row.reservoir_id}: lat=${row.reservoir_lat} (length: ${row.reservoir_lat.length}), long=${row.reservoir_long} (length: ${row.reservoir_long.length})`);
    });
    
    // Compare with Excel values
    console.log('\nExpected Excel Values:');
    console.log('rsv01: lat=18.68840521, lng=99.27046237');
    console.log('rsv02: lat=18.70082146, lng=98.94305522');
    console.log('rsv10: lat=18.37657163, lng=98.3533572');
    
  } catch (error) {
    console.error(`Error verifying precision: ${error.message}`);
  } finally {
    client.release();
  }
}

// Run the function
verifyPrecision().then(() => {
  console.log('Verification completed');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 