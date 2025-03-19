// Script to query stations that have Amphure data
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function queryStationsWithAmphure() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Querying stations with Amphure data...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Query stations with Amphure data
    const query = `
      SELECT 
        tele_station_id as station_id, 
        amphure, 
        province, 
        tele_station_name as station_name, 
        tele_station_lat as lat, 
        tele_station_long as long
      FROM 
        thaiwater_tele_stations 
      WHERE 
        amphure IS NOT NULL 
        AND amphure != ''
      ORDER BY 
        province, amphure, station_id
      LIMIT 100;  -- Limiting to 100 results for readability
    `;

    const result = await pool.query(query);
    
    console.log(`Found ${result.rowCount} stations with Amphure data (showing first 100)`);
    console.log('\nStation Data:');
    console.log('=============');
    
    // Display results in a formatted table
    if (result.rows.length > 0) {
      // Get column widths for formatting
      const columnWidths = {
        station_id: Math.max(10, ...result.rows.map(r => String(r.station_id).length)),
        station_name: Math.max(12, ...result.rows.map(r => (r.station_name || '').length)),
        province: Math.max(8, ...result.rows.map(r => (r.province || '').length)),
        amphure: Math.max(7, ...result.rows.map(r => (r.amphure || '').length)),
        lat: 10,
        long: 10
      };
      
      // Print header
      console.log(
        'Station ID'.padEnd(columnWidths.station_id) + ' | ' +
        'Station Name'.padEnd(columnWidths.station_name) + ' | ' +
        'Province'.padEnd(columnWidths.province) + ' | ' +
        'Amphure'.padEnd(columnWidths.amphure) + ' | ' +
        'Latitude'.padEnd(columnWidths.lat) + ' | ' +
        'Longitude'.padEnd(columnWidths.long)
      );
      
      // Print separator
      console.log(
        '-'.repeat(columnWidths.station_id) + '-+-' +
        '-'.repeat(columnWidths.station_name) + '-+-' +
        '-'.repeat(columnWidths.province) + '-+-' +
        '-'.repeat(columnWidths.amphure) + '-+-' +
        '-'.repeat(columnWidths.lat) + '-+-' +
        '-'.repeat(columnWidths.long)
      );
      
      // Print rows
      for (const row of result.rows) {
        // Handle lat and long values safely
        const latValue = row.lat !== null ? parseFloat(row.lat) : null;
        const longValue = row.long !== null ? parseFloat(row.long) : null;
        
        console.log(
          String(row.station_id).padEnd(columnWidths.station_id) + ' | ' +
          (row.station_name || '').padEnd(columnWidths.station_name) + ' | ' +
          (row.province || '').padEnd(columnWidths.province) + ' | ' +
          (row.amphure || '').padEnd(columnWidths.amphure) + ' | ' +
          (latValue !== null ? latValue.toFixed(6).padEnd(columnWidths.lat) : 'N/A'.padEnd(columnWidths.lat)) + ' | ' +
          (longValue !== null ? longValue.toFixed(6).padEnd(columnWidths.long) : 'N/A'.padEnd(columnWidths.long))
        );
      }
    } else {
      console.log('No stations found with Amphure data.');
    }
    
    // Get total count of stations with Amphure data
    const countQuery = `
      SELECT COUNT(*) as total
      FROM thaiwater_tele_stations 
      WHERE amphure IS NOT NULL AND amphure != '';
    `;
    
    const countResult = await pool.query(countQuery);
    console.log(`\nTotal stations with Amphure data: ${countResult.rows[0].total}`);
    
    // Get count of stations without Amphure data
    const missingQuery = `
      SELECT COUNT(*) as total
      FROM thaiwater_tele_stations 
      WHERE amphure IS NULL OR amphure = '';
    `;
    
    const missingResult = await pool.query(missingQuery);
    console.log(`Total stations without Amphure data: ${missingResult.rows[0].total}`);
    
  } catch (error) {
    console.error('Error querying stations:', error);
  } finally {
    await pool.end();
  }
}

// Run the query function
queryStationsWithAmphure().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 