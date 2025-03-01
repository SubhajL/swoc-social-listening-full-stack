// ThaiWater rainfall data analysis script
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

/**
 * Analyzes rainfall data in the database
 */
async function analyzeRainfallData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM thaiwater_rainfall_data');
    console.log(`Total rainfall records: ${countResult.rows[0].count}`);
    
    // Get count by date
    const dateResult = await pool.query(`
      SELECT 
        DATE(rainfall_datetime) as date,
        COUNT(*) as count
      FROM thaiwater_rainfall_data
      GROUP BY DATE(rainfall_datetime)
      ORDER BY date DESC
    `);
    
    console.log('\nRainfall records by date:');
    dateResult.rows.forEach(row => {
      console.log(`  ${row.date}: ${row.count} records`);
    });
    
    // Get rainfall distribution
    const distributionResult = await pool.query(`
      SELECT 
        CASE 
          WHEN rainfall24h = 0 THEN 'No rain (0mm)'
          WHEN rainfall24h < 10 THEN 'Light (< 10mm)'
          WHEN rainfall24h >= 10 AND rainfall24h < 35 THEN 'Moderate (10-35mm)'
          WHEN rainfall24h >= 35 AND rainfall24h < 90 THEN 'Heavy (35-90mm)'
          WHEN rainfall24h >= 90 THEN 'Very Heavy (>= 90mm)'
        END as rainfall_category,
        COUNT(*) as count
      FROM thaiwater_rainfall_data
      WHERE rainfall_datetime = (
        SELECT MAX(rainfall_datetime)
        FROM thaiwater_rainfall_data
        WHERE tele_station_id = thaiwater_rainfall_data.tele_station_id
      )
      GROUP BY rainfall_category
      ORDER BY rainfall_category
    `);
    
    console.log('\nRainfall distribution by category:');
    distributionResult.rows.forEach(row => {
      console.log(`  ${row.rainfall_category}: ${row.count} stations`);
    });
    
    // Get stations with highest rainfall
    const highestResult = await pool.query(`
      SELECT 
        r.tele_station_id,
        s.tele_station_name,
        s.tele_station_name_th,
        r.rainfall24h,
        r.rainfall_datetime
      FROM thaiwater_rainfall_data r
      JOIN thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      WHERE r.rainfall_datetime = (
        SELECT MAX(rainfall_datetime)
        FROM thaiwater_rainfall_data
        WHERE tele_station_id = r.tele_station_id
      )
      ORDER BY r.rainfall24h DESC
      LIMIT 10
    `);
    
    console.log('\nTop 10 stations with highest rainfall (24h):');
    highestResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.tele_station_name || 'Unknown'} (${row.tele_station_name_th || 'Unknown'}): ${row.rainfall24h} mm`);
    });
    
    // Get count of stations with rainfall data
    const stationCountResult = await pool.query(`
      SELECT COUNT(DISTINCT tele_station_id) FROM thaiwater_rainfall_data
    `);
    
    console.log(`\nTotal stations with rainfall data: ${stationCountResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error analyzing rainfall data:', error);
  } finally {
    await pool.end();
  }
}

// Run the analysis function
analyzeRainfallData()
  .then(() => {
    console.log('\nRainfall data analysis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 