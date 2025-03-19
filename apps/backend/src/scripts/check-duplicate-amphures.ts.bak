import { pool } from '../lib/db';

async function checkDuplicateAmphures() {
  console.log('Checking reservoirs sharing the same amphure...\n');
  
  try {
    const result = await pool.query(`
      WITH amphure_counts AS (
        SELECT 
          amphure,
          COUNT(*) as reservoir_count
        FROM reservoir 
        WHERE amphure IS NOT NULL
        GROUP BY amphure
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
      )
      SELECT 
        r.reservoir_name,
        r.reservoir_id,
        r.amphure,
        r.province_name,
        ac.reservoir_count
      FROM reservoir r
      INNER JOIN amphure_counts ac ON r.amphure = ac.amphure
      ORDER BY ac.reservoir_count DESC, r.amphure, r.reservoir_name;
    `);
    
    if (result.rows.length === 0) {
      console.log('No amphures found with multiple reservoirs.');
    } else {
      let currentAmphure = '';
      let count = 0;
      
      result.rows.forEach((row) => {
        if (currentAmphure !== row.amphure) {
          if (currentAmphure !== '') {
            console.log('------------------------\n');
          }
          currentAmphure = row.amphure;
          console.log(`\nAmphure: ${row.amphure} (${row.reservoir_count} reservoirs)`);
          count = 1;
        }
        
        console.log(`${count}. ${row.reservoir_name}`);
        console.log(`   ID: ${row.reservoir_id || 'Not set'}`);
        console.log(`   Province: ${row.province_name || 'Missing'}`);
        count++;
      });
      
      console.log('\n------------------------');
      console.log(`\nTotal unique amphures with multiple reservoirs: ${new Set(result.rows.map(r => r.amphure)).size}`);
      console.log(`Total reservoirs in these amphures: ${result.rows.length}`);
    }
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
checkDuplicateAmphures().catch(console.error); 