import { pool } from '../lib/db';

async function checkLocationTables() {
  console.log('Starting location tables check...');
  
  try {
    // Check provinces
    const provinceResult = await pool.query(`
      SELECT COUNT(*) as count, 
             COUNT(DISTINCT province_code) as unique_codes,
             COUNT(DISTINCT province_name_th) as unique_names_th,
             COUNT(DISTINCT province_name_en) as unique_names_en
      FROM provinces
    `);
    
    console.log('Provinces check:');
    console.log('Total count:', provinceResult.rows[0].count);
    console.log('Unique codes:', provinceResult.rows[0].unique_codes);
    console.log('Unique Thai names:', provinceResult.rows[0].unique_names_th);
    console.log('Unique English names:', provinceResult.rows[0].unique_names_en);

    // Check amphures
    const amphureResult = await pool.query(`
      SELECT COUNT(*) as count,
             COUNT(DISTINCT amphure_code) as unique_codes,
             COUNT(DISTINCT amphure_name_th) as unique_names_th,
             COUNT(DISTINCT amphure_name_en) as unique_names_en,
             COUNT(DISTINCT province_code) as unique_province_codes
      FROM amphures
    `);
    
    console.log('\nAmphures check:');
    console.log('Total count:', amphureResult.rows[0].count);
    console.log('Unique codes:', amphureResult.rows[0].unique_codes);
    console.log('Unique Thai names:', amphureResult.rows[0].unique_names_th);
    console.log('Unique English names:', amphureResult.rows[0].unique_names_en);
    console.log('Unique province codes:', amphureResult.rows[0].unique_province_codes);

    // Check for orphaned amphures (those without matching provinces)
    const orphanedResult = await pool.query(`
      SELECT COUNT(*) as orphaned_count
      FROM amphures a
      LEFT JOIN provinces p ON a.province_code = p.province_code
      WHERE p.province_code IS NULL
    `);
    
    console.log('\nOrphaned amphures check:');
    console.log('Orphaned count:', orphanedResult.rows[0].orphaned_count);

    console.log('\nLocation tables check completed successfully');
  } catch (error) {
    console.error('Error checking location tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the check
checkLocationTables().catch(console.error); 