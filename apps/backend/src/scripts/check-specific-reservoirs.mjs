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

async function checkSpecificReservoirs() {
  const client = await pool.connect();
  
  try {
    // Query specific reservoirs
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
    
    console.log('Specific Reservoir Coordinates:');
    console.table(result.rows);
    
    // Show the raw values without any formatting
    console.log('\nRaw Values (as stored in database):');
    result.rows.forEach(row => {
      console.log(`${row.reservoir_id}: lat=${row.reservoir_lat} (${typeof row.reservoir_lat}), long=${row.reservoir_long} (${typeof row.reservoir_long})`);
    });
    
  } catch (error) {
    console.error(`Error querying reservoirs: ${error.message}`);
  } finally {
    client.release();
  }
}

// Run the function
checkSpecificReservoirs().then(() => {
  console.log('Query completed');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 