import { pool } from '../lib/db';

async function verifyTumbonNames() {
  try {
    console.log('Starting tumbon name verification');
    
    const client = await pool.connect();
    try {
      // Set proper encoding
      await client.query("SET client_encoding TO 'UTF8'");
      await client.query("SET NAMES 'utf8'");
      
      // Get a sample of tumbon names
      const result = await client.query(`
        SELECT 
          id, 
          name_th,
          LENGTH(name_th) as char_length,
          OCTET_LENGTH(name_th) as byte_length
        FROM tumbons 
        WHERE name_th IS NOT NULL
        ORDER BY RANDOM() 
        LIMIT 100
      `);

      // Log the results
      console.log('\nTumbon entries:');
      console.log('==============');
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}, Name: ${row.name_th}`);
      });

      // Print summary
      console.log('\nSummary:');
      console.log('========');
      console.log(`Total entries shown: ${result.rows.length}`);
      console.log(`Average name length: ${(result.rows.reduce((sum, row) => sum + row.char_length, 0) / result.rows.length).toFixed(1)} characters`);
      console.log(`Average byte length: ${(result.rows.reduce((sum, row) => sum + row.byte_length, 0) / result.rows.length).toFixed(1)} bytes`);

    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Failed to verify tumbon names:', error);
    throw error;
  }
}

// Run the verification
verifyTumbonNames().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 