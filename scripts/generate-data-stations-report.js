/**
 * Script to generate a comprehensive report on the telemetry_data_stations table
 */

const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function generateDataStationsReport() {
  const client = await pool.connect();
  
  try {
    console.log('Generating comprehensive report on telemetry_data_stations table...');
    
    // Overall counts
    const overallCounts = await client.query(`
      SELECT 
        COUNT(*) as total_stations,
        SUM(CASE WHEN has_data = true THEN 1 ELSE 0 END) as stations_with_data,
        SUM(CASE WHEN has_data = false THEN 1 ELSE 0 END) as stations_without_data
      FROM telemetry_data_stations
    `);
    
    console.log('Overall Statistics:');
    console.table(overallCounts.rows);
    
    // Category breakdown
    const categoryBreakdown = await client.query(`
      SELECT 
        category, 
        COUNT(*) as total,
        SUM(CASE WHEN has_data = true THEN 1 ELSE 0 END) as with_data,
        SUM(CASE WHEN has_data = false THEN 1 ELSE 0 END) as without_data
      FROM telemetry_data_stations
      GROUP BY category
      ORDER BY category
    `);
    
    console.log('\nCategory Breakdown:');
    console.table(categoryBreakdown.rows);
    
    // Data source breakdown
    const dataSourceBreakdown = await client.query(`
      SELECT 
        data_source, 
        COUNT(*) as total,
        SUM(CASE WHEN has_data = true THEN 1 ELSE 0 END) as with_data,
        SUM(CASE WHEN has_data = false THEN 1 ELSE 0 END) as without_data
      FROM telemetry_data_stations
      GROUP BY data_source
      ORDER BY data_source
    `);
    
    console.log('\nData Source Breakdown:');
    console.table(dataSourceBreakdown.rows);
    
    // Station ID pattern analysis
    const stationIdPatterns = await client.query(`
      WITH patterns AS (
        SELECT 
          CASE 
            WHEN station_id ~ '^[A-Z]\\.\\d+' THEN 'Letter.Number (e.g., X.158)'
            WHEN station_id ~ '^[A-Z]\\d+' THEN 'LetterNumber (e.g., M42)'
            WHEN station_id ~ '^[A-Z]\\w+\\.\\d+' THEN 'LetterWord.Number (e.g., Kgt.34)'
            ELSE 'Other'
          END as pattern,
          id
        FROM telemetry_data_stations
      )
      SELECT 
        pattern,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM telemetry_data_stations)), 2) as percentage
      FROM patterns
      GROUP BY pattern
      ORDER BY count DESC
    `);
    
    console.log('\nStation ID Pattern Analysis:');
    console.table(stationIdPatterns.rows);
    
    // Sample stations from each category
    const categories = ['API-only', 'Common', 'DB-only'];
    
    for (const category of categories) {
      const sampleResult = await client.query(`
        SELECT id, station_id, station_code, numeric_station_id, station_name, data_source, has_data
        FROM telemetry_data_stations
        WHERE category = $1
        ORDER BY RANDOM()
        LIMIT 5
      `, [category]);
      
      console.log(`\nSample Stations from ${category} category:`);
      console.table(sampleResult.rows);
    }
    
    // Generate a full report JSON file
    const fullReport = {
      generated_at: new Date().toISOString(),
      overall: overallCounts.rows[0],
      by_category: categoryBreakdown.rows,
      by_data_source: dataSourceBreakdown.rows,
      id_patterns: stationIdPatterns.rows
    };
    
    // Add sample data for each category
    fullReport.samples = {};
    for (const category of categories) {
      const sampleData = await client.query(`
        SELECT id, station_id, station_code, numeric_station_id, station_name, data_source, has_data
        FROM telemetry_data_stations
        WHERE category = $1
        ORDER BY station_id
        LIMIT 10
      `, [category]);
      
      fullReport.samples[category] = sampleData.rows;
    }
    
    // Save the report to a file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportFile = `telemetry_data_stations_report_${timestamp}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(fullReport, null, 2));
    
    console.log(`\nFull report saved to ${reportFile}`);
    
  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
generateDataStationsReport().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 