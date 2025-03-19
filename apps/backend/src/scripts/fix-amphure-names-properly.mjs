import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function fixAmphureNamesProperly() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting proper fix of amphure names...');
    
    // First, get all amphure values
    const getAllQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      ORDER BY id;
    `;
    
    const allResult = await client.query(getAllQuery);
    const reservoirs = allResult.rows;
    
    console.log(`Retrieved ${reservoirs.length} reservoir records`);
    
    // Create a backup of the current data
    const backupPath = path.resolve(__dirname, '../../../../reservoir_locations_backup_before_amphure_fix.json');
    fs.writeFileSync(backupPath, JSON.stringify(reservoirs, null, 2));
    console.log(`Created backup of current data at: ${backupPath}`);
    
    // Count amphure values with 'อำเภอ' prefix
    const withPrefix = reservoirs.filter(r => r.amphure && r.amphure.startsWith('อำเภอ'));
    console.log(`Found ${withPrefix.length} records with 'อำเภอ' prefix`);
    
    // Count potentially truncated amphure names
    const potentiallyTruncated = [
      'างดง', 'ี้', 'ร้าว', 'ชียงดาว', 'วียงหนองล่อง', 'ม่อาย', 'ม่แจ่ม', 'ม่แตง', 'ม่ริม', 'ม่วาง',
      'ันป่าตอง', 'ันทราย', 'อมทอง', 'ันกำแพง', 'ะเมิง', 'าแม่วาง'
    ];
    
    const truncated = reservoirs.filter(r => 
      r.amphure && potentiallyTruncated.some(prefix => r.amphure === prefix)
    );
    
    console.log(`Found ${truncated.length} potentially truncated amphure names`);
    
    if (truncated.length > 0) {
      console.log('Sample of truncated amphure names:');
      console.table(truncated.slice(0, 10));
    }
    
    // Define corrections for truncated names
    const corrections = {
      'างดง': 'หางดง',
      'ี้': 'ลี้',
      'ร้าว': 'พร้าว',
      'ชียงดาว': 'เชียงดาว',
      'วียงหนองล่อง': 'เวียงหนองล่อง',
      'ม่อาย': 'แม่อาย',
      'ม่แจ่ม': 'แม่แจ่ม',
      'ม่แตง': 'แม่แตง',
      'ม่ริม': 'แม่ริม',
      'ม่วาง': 'แม่วาง',
      'ันป่าตอง': 'สันป่าตอง',
      'ันทราย': 'สันทราย',
      'อมทอง': 'ฮอมทอง',
      'ันกำแพง': 'สันกำแพง',
      'ะเมิง': 'สะเมิง',
      'าแม่วาง': 'แม่วาง'
    };
    
    // Fix truncated names
    let fixedTruncatedCount = 0;
    
    for (const [incorrect, correct] of Object.entries(corrections)) {
      const updateTruncatedQuery = `
        UPDATE reservoir_locations
        SET 
          amphure = $1,
          updated_at = NOW()
        WHERE amphure = $2
        RETURNING id, reservoir_id, amphure;
      `;
      
      const updateResult = await client.query(updateTruncatedQuery, [correct, incorrect]);
      
      if (updateResult.rowCount > 0) {
        console.log(`Fixed ${updateResult.rowCount} occurrences of '${incorrect}' to '${correct}'`);
        fixedTruncatedCount += updateResult.rowCount;
      }
    }
    
    // Now properly remove 'อำเภอ' prefix
    const updatePrefixQuery = `
      UPDATE reservoir_locations
      SET 
        amphure = REGEXP_REPLACE(amphure, '^อำเภอ\\s*', ''),
        updated_at = NOW()
      WHERE amphure LIKE 'อำเภอ%'
      RETURNING id, reservoir_id, amphure;
    `;
    
    const prefixResult = await client.query(updatePrefixQuery);
    const fixedPrefixCount = prefixResult.rowCount;
    
    console.log(`Removed 'อำเภอ' prefix from ${fixedPrefixCount} records`);
    
    // Get a sample of the fixed data
    const sampleQuery = `
      SELECT id, reservoir_id, amphure
      FROM reservoir_locations
      WHERE id IN (${truncated.map(r => r.id).join(',')})
      ORDER BY id;
    `;
    
    const sampleResult = await client.query(sampleQuery);
    
    if (sampleResult.rowCount > 0) {
      console.log('Sample of fixed amphure values:');
      console.table(sampleResult.rows);
    }
    
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
    
    // Export the updated data
    const exportQuery = `
      SELECT id, reservoir_id, reservoir_name, reservoir_lat, reservoir_long, province, amphure, tambon
      FROM reservoir_locations
      ORDER BY id;
    `;
    
    const exportResult = await client.query(exportQuery);
    const updatedReservoirs = exportResult.rows;
    
    const outputPath = path.resolve(__dirname, '../../../../reservoir_locations_fixed_amphure.json');
    fs.writeFileSync(outputPath, JSON.stringify(updatedReservoirs, null, 2));
    
    console.log(`Exported updated data to: ${outputPath}`);
    
    // Show a sample of the updated data
    console.log('\nSample of updated data (first 5 records):');
    console.table(updatedReservoirs.slice(0, 5).map(r => ({
      id: r.id,
      reservoir_id: r.reservoir_id,
      reservoir_name: r.reservoir_name,
      province: r.province,
      amphure: r.amphure,
      tambon: r.tambon
    })));
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
    return {
      totalRecords: reservoirs.length,
      fixedTruncated: fixedTruncatedCount,
      fixedPrefix: fixedPrefixCount
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
fixAmphureNamesProperly().then((stats) => {
  console.log(`
Fix completed:
- Total records: ${stats.totalRecords}
- Fixed truncated names: ${stats.fixedTruncated}
- Fixed prefix: ${stats.fixedPrefix}
  `);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 