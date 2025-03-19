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

// Mapping of incorrect to correct amphure names
const amphureCorrections = {
  'างดง': 'หางดง',
  'ี้': 'ลี้',
  'ร้าว': 'พร้าว',
  'ชียงดาว': 'เชียงดาว'
};

async function fixAmphureNames() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting amphure name fixes...');
    
    // Get all amphure names for analysis
    const getAllQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      ORDER BY id;
    `;
    
    const allResult = await client.query(getAllQuery);
    
    // Identify potentially truncated names
    const potentiallyTruncated = allResult.rows.filter(row => {
      const amphure = row.amphure;
      return Object.keys(amphureCorrections).some(incorrect => amphure === incorrect);
    });
    
    console.log(`Found ${potentiallyTruncated.length} potentially truncated amphure names`);
    
    if (potentiallyTruncated.length > 0) {
      console.log('Sample of truncated amphure names:');
      console.table(potentiallyTruncated.slice(0, 10));
    }
    
    // Fix each truncated name
    let fixedCount = 0;
    
    for (const [incorrect, correct] of Object.entries(amphureCorrections)) {
      const updateQuery = `
        UPDATE reservoir_locations
        SET 
          amphure = $1,
          updated_at = NOW()
        WHERE amphure = $2
        RETURNING id, reservoir_id, amphure;
      `;
      
      const updateResult = await client.query(updateQuery, [correct, incorrect]);
      
      if (updateResult.rowCount > 0) {
        console.log(`Fixed ${updateResult.rowCount} occurrences of '${incorrect}' to '${correct}'`);
        fixedCount += updateResult.rowCount;
      }
    }
    
    // Now let's handle the special case of "อำเภอ " prefix (with space)
    // This requires a more careful approach to preserve the actual amphure name
    const findWithPrefixQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      WHERE amphure LIKE 'อำเภอ %'
      ORDER BY id;
    `;
    
    const withPrefixResult = await client.query(findWithPrefixQuery);
    
    if (withPrefixResult.rowCount > 0) {
      console.log(`Found ${withPrefixResult.rowCount} records still with 'อำเภอ ' prefix (with space)`);
      
      // For each record with the prefix, extract the actual amphure name correctly
      for (const row of withPrefixResult.rows) {
        const amphureWithPrefix = row.amphure;
        const actualAmphure = amphureWithPrefix.substring(7).trim(); // Skip "อำเภอ " (7 chars including space)
        
        const fixPrefixQuery = `
          UPDATE reservoir_locations
          SET 
            amphure = $1,
            updated_at = NOW()
          WHERE id = $2
          RETURNING id, reservoir_id, amphure;
        `;
        
        const fixResult = await client.query(fixPrefixQuery, [actualAmphure, row.id]);
        
        if (fixResult.rowCount > 0) {
          console.log(`Fixed prefix for id=${row.id}, reservoir_id=${row.reservoir_id}: '${amphureWithPrefix}' -> '${actualAmphure}'`);
          fixedCount += fixResult.rowCount;
        }
      }
    }
    
    // Get a sample of the fixed data
    const sampleQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      WHERE id IN (${potentiallyTruncated.map(r => r.id).join(',')})
      ORDER BY id;
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    if (sampleResult.rowCount > 0) {
      console.log('Sample of fixed amphure values:');
      console.table(sampleResult.rows);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
    return fixedCount;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
fixAmphureNames().then((count) => {
  console.log(`Successfully fixed ${count} amphure names`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 