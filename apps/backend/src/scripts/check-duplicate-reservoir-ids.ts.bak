import { pool } from '../lib/db';

async function checkDuplicateReservoirIds() {
  console.log('Checking for duplicate reservoir_ids...\n');
  
  try {
    // First, get the count of duplicates
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT reservoir_id) as unique_count
      FROM (
        SELECT reservoir_id
        FROM reservoir 
        WHERE reservoir_id IS NOT NULL
        GROUP BY reservoir_id
        HAVING COUNT(*) > 1
      ) as duplicates;
    `);
    
    const duplicateCount = parseInt(countResult.rows[0].unique_count);
    
    if (duplicateCount === 0) {
      console.log('No duplicate reservoir_ids found.');
      return;
    }
    
    console.log(`Found ${duplicateCount} reservoir_ids with duplicates. Fetching details...\n`);
    
    // Then get the details
    const result = await pool.query(`
      SELECT 
        r.reservoir_id,
        r.reservoir_name,
        r.amphure,
        r.province_name
      FROM reservoir r
      WHERE r.reservoir_id IN (
        SELECT reservoir_id
        FROM reservoir 
        WHERE reservoir_id IS NOT NULL
        GROUP BY reservoir_id
        HAVING COUNT(*) > 1
      )
      ORDER BY r.reservoir_id, r.reservoir_name;
    `);
    
    let currentId = '';
    let count = 0;
    
    result.rows.forEach((row) => {
      if (currentId !== row.reservoir_id) {
        if (currentId !== '') {
          console.log('------------------------\n');
        }
        currentId = row.reservoir_id;
        console.log(`\nReservoir ID: ${row.reservoir_id}`);
        count = 1;
      }
      
      console.log(`${count}. ${row.reservoir_name}`);
      console.log(`   Amphure: ${row.amphure || 'Missing'}`);
      console.log(`   Province: ${row.province_name || 'Missing'}`);
      count++;
    });
    
    console.log('\n------------------------');
    console.log(`\nTotal unique reservoir_ids with duplicates: ${duplicateCount}`);
    console.log(`Total records involved: ${result.rows.length}`);
    
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
checkDuplicateReservoirIds().catch(console.error); 