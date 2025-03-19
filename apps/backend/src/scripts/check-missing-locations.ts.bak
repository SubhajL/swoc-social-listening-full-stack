import { pool } from '../lib/db';

async function checkMissingLocations() {
  console.log('Checking reservoirs with missing location information...\n');
  
  try {
    const result = await pool.query(`
      SELECT 
        reservoir_name,
        reservoir_id,
        amphure,
        province_name
      FROM reservoir 
      WHERE (amphure IS NULL OR province_name IS NULL)
      ORDER BY reservoir_name;
    `);
    
    if (result.rows.length === 0) {
      console.log('No reservoirs found with missing location information.');
    } else {
      console.log(`Found ${result.rows.length} reservoirs with missing location information:\n`);
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Reservoir: ${row.reservoir_name}`);
        console.log(`   ID: ${row.reservoir_id || 'Not set'}`);
        console.log(`   Amphure: ${row.amphure || 'Missing'}`);
        console.log(`   Province: ${row.province_name || 'Missing'}\n`);
      });
    }
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
checkMissingLocations().catch(console.error); 