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

async function removeAmphurePrefix() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting removal of "อำเภอ" prefix from amphure column...');
    
    // First, get a sample of current values
    const sampleQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      WHERE amphure LIKE 'อำเภอ%'
      LIMIT 10;
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    console.log('Sample of current amphure values:');
    console.table(sampleResult.rows);
    
    // Count how many records will be affected
    const countQuery = `
      SELECT COUNT(*) as count
      FROM reservoir_locations
      WHERE amphure LIKE 'อำเภอ%';
    `;
    
    const countResult = await client.query(countQuery);
    const affectedCount = parseInt(countResult.rows[0].count);
    
    console.log(`Found ${affectedCount} records with "อำเภอ" prefix`);
    
    // Update the amphure column to remove the prefix
    const updateQuery = `
      UPDATE reservoir_locations
      SET 
        amphure = TRIM(SUBSTRING(amphure FROM 7)), -- Remove 'อำเภอ' (6 characters) and trim any spaces
        updated_at = NOW()
      WHERE amphure LIKE 'อำเภอ%'
      RETURNING id, reservoir_id, amphure;
    `;
    
    const updateResult = await client.query(updateQuery);
    
    console.log(`Updated ${updateResult.rowCount} records`);
    
    // Get a sample of updated values
    const updatedSampleQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      WHERE id IN (${sampleResult.rows.map(r => r.id).join(',')})
      ORDER BY id;
    `;
    
    const updatedSampleResult = await client.query(updatedSampleQuery);
    
    console.log('Sample of updated amphure values:');
    console.table(updatedSampleResult.rows);
    
    // Check if there are any remaining records with the prefix
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM reservoir_locations
      WHERE amphure LIKE 'อำเภอ%';
    `;
    
    const checkResult = await client.query(checkQuery);
    const remainingCount = parseInt(checkResult.rows[0].count);
    
    if (remainingCount > 0) {
      console.warn(`Warning: There are still ${remainingCount} records with "อำเภอ" prefix`);
    } else {
      console.log('All "อำเภอ" prefixes have been removed successfully');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
    return updateResult.rowCount;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
removeAmphurePrefix().then((count) => {
  console.log(`Successfully updated ${count} records`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 