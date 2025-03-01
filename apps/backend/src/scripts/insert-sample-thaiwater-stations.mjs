import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

/**
 * Inserts sample data into the thaiwater_tele_stations table
 */
async function insertSampleThaiWaterStations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('[ThaiWaterStations] Inserting sample data into thaiwater_tele_stations');

  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Sample data for telemetry stations
      const sampleStations = [
        {
          tele_station_id: 1002,
          tele_station_name: "Sample Station 2",
          tele_station_name_th: "สถานีตัวอย่าง 2",
          tele_station_lat: 13.756301,
          tele_station_long: 100.501801,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.51,
          left_bank: 15.21,
          right_bank: 14.81,
          is_warning: true,
          province: "กรุงเทพมหานคร",
          amphure: "พระนคร",
          tambon: "พระบรมมหาราชวัง"
        },
        {
          tele_station_id: 1003,
          tele_station_name: "Sample Station 3",
          tele_station_name_th: "สถานีตัวอย่าง 3",
          tele_station_lat: 13.756302,
          tele_station_long: 100.501802,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.52,
          left_bank: 15.22,
          right_bank: 14.82,
          is_warning: false,
          province: "กรุงเทพมหานคร",
          amphure: "พระนคร",
          tambon: "พระบรมมหาราชวัง"
        },
        {
          tele_station_id: 1004,
          tele_station_name: "Sample Station 4",
          tele_station_name_th: "สถานีตัวอย่าง 4",
          tele_station_lat: 13.756303,
          tele_station_long: 100.501803,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.53,
          left_bank: 15.23,
          right_bank: 14.83,
          is_warning: true,
          province: "กรุงเทพมหานคร",
          amphure: "พระนคร",
          tambon: "พระบรมมหาราชวัง"
        },
        {
          tele_station_id: 1005,
          tele_station_name: "Sample Station 5",
          tele_station_name_th: "สถานีตัวอย่าง 5",
          tele_station_lat: 13.756304,
          tele_station_long: 100.501804,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.54,
          left_bank: 15.24,
          right_bank: 14.84,
          is_warning: false,
          province: "เชียงใหม่",
          amphure: "เมืองเชียงใหม่",
          tambon: "ศรีภูมิ"
        },
        {
          tele_station_id: 1006,
          tele_station_name: "Sample Station 6",
          tele_station_name_th: "สถานีตัวอย่าง 6",
          tele_station_lat: 13.756305,
          tele_station_long: 100.501805,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.55,
          left_bank: 15.25,
          right_bank: 14.85,
          is_warning: true,
          province: "เชียงใหม่",
          amphure: "เมืองเชียงใหม่",
          tambon: "ศรีภูมิ"
        },
        {
          tele_station_id: 1007,
          tele_station_name: "Sample Station 7",
          tele_station_name_th: "สถานีตัวอย่าง 7",
          tele_station_lat: 13.756306,
          tele_station_long: 100.501806,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.56,
          left_bank: 15.26,
          right_bank: 14.86,
          is_warning: false,
          province: "เชียงใหม่",
          amphure: "เมืองเชียงใหม่",
          tambon: "ศรีภูมิ"
        },
        {
          tele_station_id: 1008,
          tele_station_name: "Sample Station 8",
          tele_station_name_th: "สถานีตัวอย่าง 8",
          tele_station_lat: 13.756307,
          tele_station_long: 100.501807,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.57,
          left_bank: 15.27,
          right_bank: 14.87,
          is_warning: true,
          province: "ขอนแก่น",
          amphure: "เมืองขอนแก่น",
          tambon: "ในเมือง"
        },
        {
          tele_station_id: 1009,
          tele_station_name: "Sample Station 9",
          tele_station_name_th: "สถานีตัวอย่าง 9",
          tele_station_lat: 13.756308,
          tele_station_long: 100.501808,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.58,
          left_bank: 15.28,
          right_bank: 14.88,
          is_warning: false,
          province: "ขอนแก่น",
          amphure: "เมืองขอนแก่น",
          tambon: "ในเมือง"
        },
        {
          tele_station_id: 1010,
          tele_station_name: "Sample Station 10",
          tele_station_name_th: "สถานีตัวอย่าง 10",
          tele_station_lat: 13.756309,
          tele_station_long: 100.501809,
          tele_station_type: "rainfall",
          agency_id: 1,
          ground_level: 10.59,
          left_bank: 15.29,
          right_bank: 14.89,
          is_warning: true,
          province: "ขอนแก่น",
          amphure: "เมืองขอนแก่น",
          tambon: "ในเมือง"
        }
      ];
      
      // Insert each station
      for (const station of sampleStations) {
        // Check if station exists
        const existingStation = await client.query(
          'SELECT tele_station_id FROM thaiwater_tele_stations WHERE tele_station_id = $1',
          [station.tele_station_id]
        );
        
        if (existingStation.rows.length === 0) {
          // Insert new station
          await client.query(`
            INSERT INTO thaiwater_tele_stations (
              tele_station_id,
              tele_station_name,
              tele_station_name_th,
              tele_station_oldcode,
              tele_station_lat,
              tele_station_long,
              tele_station_type,
              agency_id,
              ground_level,
              left_bank,
              right_bank,
              is_warning,
              province,
              amphure,
              tambon,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
          `, [
            station.tele_station_id,
            station.tele_station_name,
            station.tele_station_name_th,
            station.tele_station_oldcode || '',
            station.tele_station_lat,
            station.tele_station_long,
            station.tele_station_type,
            station.agency_id,
            station.ground_level,
            station.left_bank,
            station.right_bank,
            station.is_warning,
            station.province,
            station.amphure,
            station.tambon
          ]);
          
          console.log(`[ThaiWaterStations] Inserted station: ${station.tele_station_id}`);
        } else {
          console.log(`[ThaiWaterStations] Station already exists: ${station.tele_station_id}`);
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('[ThaiWaterStations] Sample data insertion completed successfully');
      
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('[ThaiWaterStations] Error inserting sample data', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error('[ThaiWaterStations] Error connecting to database', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute the function
insertSampleThaiWaterStations().catch(error => {
  console.error('[ThaiWaterStations] Unhandled error', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
}); 