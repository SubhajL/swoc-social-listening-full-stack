const { config } = require('dotenv');
const pg = require('pg');
const path = require('path');
const shapefile = require('shapefile');

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  const client = await pool.connect();
  try {
    // Read shapefile
    const shpPath = path.resolve(__dirname, '../../Tambon_W/Tambon_W.shp');
    const dbfPath = path.resolve(__dirname, '../../Tambon_W/Tambon_W.dbf');
    
    console.log('\nReading shapefile data...');
    const source = await shapefile.open(shpPath, dbfPath);
    
    // Get all tumbons from database
    const dbTumbons = await client.query(`
      SELECT 
        t.id,
        t.name_th,
        t.latitude,
        t.longitude,
        a.name_th as amphur_name,
        p.name_th as province_name
      FROM tumbons t
      JOIN amphures_new a ON t.amphure_id = a.id
      JOIN provinces_new p ON a.province_id = p.id
      WHERE t.latitude IS NOT NULL AND t.longitude IS NOT NULL;
    `);

    console.log(`Found ${dbTumbons.rows.length} tumbons in database`);

    // Compare coordinates
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches = [];
    const threshold = 0.01; // ~1km threshold for coordinate differences
    let recordCount = 0;
    let maxRecords = 100; // Reduced for debugging

    // Print first few database records for debugging
    console.log('\nSample database records:');
    dbTumbons.rows.slice(0, 5).forEach(t => {
      console.log(`DB Tumbon: "${t.name_th}" in ${t.amphur_name}, ${t.province_name}`);
    });

    let result;
    while ((result = await source.read()) !== null && recordCount < maxRecords) {
      recordCount++;
      
      const record = result.value;
      if (!record || !record.properties) continue;

      // Print shapefile records for debugging
      if (recordCount <= 5) {
        console.log(`\nShapefile record ${recordCount}:`);
        console.log(`TAMBON_T: "${record.properties.TAMBON_T}"`);
        console.log(`AMPHOE_T: "${record.properties.AMPHOE_T}"`);
        console.log(`CHANGWAT_T: "${record.properties.CHANGWAT_T}"`);
      }

      // Find matching tumbon in database
      const dbTumbon = dbTumbons.rows.find(t => {
        const shpName = record.properties.TAMBON_T;
        const dbName = t.name_th;
        
        // Print name comparison for first few records
        if (recordCount <= 5) {
          console.log(`Comparing: "${shpName}" with "${dbName}"`);
        }

        return shpName && dbName && (
          dbName.includes(shpName.replace('ต.', '').trim()) || 
          shpName.replace('ต.', '').trim().includes(dbName)
        );
      });

      if (dbTumbon && record.properties.LAT && record.properties.LONG) {
        const latDiff = Math.abs(record.properties.LAT - dbTumbon.latitude);
        const lngDiff = Math.abs(record.properties.LONG - dbTumbon.longitude);

        if (latDiff > threshold || lngDiff > threshold) {
          mismatchCount++;
          if (mismatches.length < 10) {
            mismatches.push({
              name: dbTumbon.name_th,
              shpName: record.properties.TAMBON_T,
              location: `${dbTumbon.amphur_name}, ${dbTumbon.province_name}`,
              shpLocation: `${record.properties.AMPHOE_T}, ${record.properties.CHANGWAT_T}`,
              shp: { lat: record.properties.LAT, lng: record.properties.LONG },
              db: { lat: dbTumbon.latitude, lng: dbTumbon.longitude },
              diff: { lat: latDiff, lng: lngDiff }
            });
          }
        } else {
          matchCount++;
        }
      }
    }

    // Report results
    console.log(`\nComparison Results:`);
    console.log(`Total records processed: ${recordCount}`);
    console.log(`Total records compared: ${matchCount + mismatchCount}`);
    console.log(`Matches (within ${threshold} degree threshold): ${matchCount}`);
    console.log(`Mismatches (beyond threshold): ${mismatchCount}`);
    
    if (mismatches.length > 0) {
      console.log('\nSample of mismatches:');
      mismatches.forEach(m => {
        console.log(`\nTumbon: ${m.name} (${m.shpName})`);
        console.log(`DB Location: ${m.location}`);
        console.log(`Shapefile Location: ${m.shpLocation}`);
        console.log(`Shapefile coordinates: ${m.shp.lat}, ${m.shp.lng}`);
        console.log(`DB coordinates: ${m.db.lat}, ${m.db.lng}`);
        console.log(`Difference: ${m.diff.lat.toFixed(4)}°, ${m.diff.lng.toFixed(4)}°`);
      });
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error); 