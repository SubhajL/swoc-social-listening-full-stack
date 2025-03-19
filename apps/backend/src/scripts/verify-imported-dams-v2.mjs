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

async function verifyImportedDams() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      // Get total count
      const countQuery = "SELECT COUNT(*) FROM reservoir_locations WHERE data_source = 'dam_excel_v2'";
      const countResult = await client.query(countQuery);
      console.log(`Total imported dam records: ${countResult.rows[0].count}`);
      
      // Get recently imported dams
      const recentDamsQuery = `
        SELECT id, reservoir_id, reservoir_name, reservoir_lat, reservoir_long, 
               province, amphure, data_source, metadata, created_at, updated_at
        FROM reservoir_locations
        WHERE data_source = 'dam_excel_v2'
        ORDER BY id DESC
        LIMIT 10
      `;
      
      const recentDamsResult = await client.query(recentDamsQuery);
      
      console.log('\nRecently imported dams:');
      recentDamsResult.rows.forEach(dam => {
        console.log(`ID: ${dam.id}, Reservoir ID: ${dam.reservoir_id}, Name: ${dam.reservoir_name}`);
        console.log(`  Location: ${dam.province}, ${dam.amphure}`);
        console.log(`  Coordinates: ${dam.reservoir_lat || 'Not set'}, ${dam.reservoir_long || 'Not set'}`);
        console.log(`  Metadata: ${JSON.stringify(dam.metadata || {})}`);
        console.log(`  Created: ${dam.created_at}`);
        console.log('---');
      });
      
      // Get province counts
      const provinceCountQuery = `
        SELECT province, COUNT(*) as count
        FROM reservoir_locations
        WHERE data_source = 'dam_excel_v2'
        GROUP BY province
        ORDER BY count DESC
      `;
      
      const provinceCountResult = await client.query(provinceCountQuery);
      
      console.log('\nDams count by province:');
      provinceCountResult.rows.forEach(row => {
        console.log(`${row.province}: ${row.count}`);
      });
      
      // Check for duplicates
      const duplicateQuery = `
        SELECT reservoir_name, COUNT(*) as count
        FROM reservoir_locations
        GROUP BY reservoir_name
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      `;
      
      const duplicateResult = await client.query(duplicateQuery);
      
      if (duplicateResult.rows.length > 0) {
        console.log('\nPotential duplicate reservoir names:');
        duplicateResult.rows.forEach(row => {
          console.log(`${row.reservoir_name}: ${row.count} occurrences`);
        });
      } else {
        console.log('\nNo duplicate reservoir names found.');
      }
      
      // Check for NULL values
      const nullValuesQuery = `
        SELECT 
          SUM(CASE WHEN reservoir_name IS NULL THEN 1 ELSE 0 END) as null_name,
          SUM(CASE WHEN province IS NULL THEN 1 ELSE 0 END) as null_province,
          SUM(CASE WHEN amphure IS NULL THEN 1 ELSE 0 END) as null_amphure,
          SUM(CASE WHEN reservoir_lat IS NULL THEN 1 ELSE 0 END) as null_lat,
          SUM(CASE WHEN reservoir_long IS NULL THEN 1 ELSE 0 END) as null_long
        FROM reservoir_locations
        WHERE data_source = 'dam_excel_v2'
      `;
      
      const nullValuesResult = await client.query(nullValuesQuery);
      
      console.log('\nNULL values in imported data:');
      console.log(nullValuesResult.rows[0]);
      
    } finally {
      // Release the client back to the pool
      client.release();
      console.log('\nDatabase connection released.');
    }
  } catch (error) {
    console.error('Error verifying imported dams:', error);
  } finally {
    // End the pool
    await pool.end();
    console.log('Database pool ended.');
  }
}

// Run the function
verifyImportedDams().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 