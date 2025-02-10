import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../utils/logger.js';
import { getTelemetryData } from '../services/rid-telemetry/telemetry.service.js';
import type { TelemetryReading } from '../services/rid-telemetry/types.js';

// PostgreSQL connection configuration using write credentials
const dbConfig = {
  user: 'swoc-uat-ssl-user',
  password: 'c3dc7c8f659dd84f76b37057a37d75d2',
  host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: 15434,
  database: 'swoc-uat-ssl',
  ssl: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
};

// Single pool with write permissions
const pool = new Pool(dbConfig);

interface TelemetryStation {
  id: number;
  station_id: string;
  station_name: string;
  river_basin: string;
  province: string;
  amphure: string;
}

interface TestResult {
  station: TelemetryStation;
  success: boolean;
  readings?: TelemetryReading[];
  error?: string;
  timestamp: string;
}

async function getAllTelemetryStations(): Promise<TelemetryStation[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<TelemetryStation>(`
      SELECT id, station_id, station_name, river_basin, province, amphure 
      FROM telemetry_station 
      ORDER BY station_id;
    `);
    return result.rows;
  } finally {
    client.release();
  }
}

async function testStation(station: TelemetryStation): Promise<TestResult> {
  try {
    logger.info('Testing station', 'TelemetryTest', {
      station_id: station.station_id,
      station_name: station.station_name,
      timestamp: new Date().toISOString()
    });

    // Generate dates for the last 8 weeks (one day per week)
    const dates = Array.from({length: 8}).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7)); // Go back i weeks
      return date.toLocaleDateString('th-TH');
    });

    logger.info('Testing dates', 'TelemetryTest', {
      station_id: station.station_id,
      dates,
      timestamp: new Date().toISOString()
    });

    // Try each date
    for (const timeStart of dates) {
      // Fetch telemetry data
      const response = await getTelemetryData({
        stationid: station.station_id,
        timestart: timeStart
      });

      // If we got readings, return them
      if (response.data && response.data.length > 0) {
        // Log successful reading
        logger.info('Station test successful', 'TelemetryTest', {
          station_id: station.station_id,
          date: timeStart,
          readings: response.data.map(reading => ({
            hourlytime: reading.hourlytime,
            wlvalues: reading.wlvalues,
            qvalues: reading.qvalues,
            notationid: reading.notationid
          })),
          timestamp: new Date().toISOString()
        });

        return {
          station,
          success: true,
          readings: response.data,
          timestamp: new Date().toISOString()
        };
      } else {
        logger.debug('No readings for date', 'TelemetryTest', {
          station_id: station.station_id,
          date: timeStart,
          timestamp: new Date().toISOString()
        });
      }
    }

    // If we get here, no readings were found for any date
    logger.warn('No readings found for any tested date', 'TelemetryTest', {
      station_id: station.station_id,
      dates,
      timestamp: new Date().toISOString()
    });

    return {
      station,
      success: true,
      readings: [],
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Log error
    logger.error('Station test failed', 'TelemetryTest', {
      station_id: station.station_id,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });

    return {
      station,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

async function saveTestResults(results: TestResult[]): Promise<void> {
  const client = await pool.connect();
  try {
    // Create results table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry_test_results (
        id SERIAL PRIMARY KEY,
        station_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        test_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        success BOOLEAN NOT NULL,
        water_level NUMERIC,
        flow_rate NUMERIC,
        error_message TEXT,
        raw_data JSONB
      );
    `);

    // Insert results
    for (const result of results) {
      const reading = result.readings?.[0]; // Get most recent reading
      await client.query(
        `INSERT INTO telemetry_test_results 
         (station_id, station_name, test_timestamp, success, water_level, flow_rate, error_message, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          result.station.station_id,
          result.station.station_name,
          new Date(result.timestamp),
          result.success,
          reading?.wlvalues || null,
          reading?.qvalues || null,
          result.error || null,
          result.readings ? JSON.stringify(result.readings) : null
        ]
      );
    }
  } finally {
    client.release();
  }
}

async function generateTestReport(results: TestResult[]): Promise<void> {
  const totalStations = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  
  const stationsWithReadings = results.filter(r => r.readings && r.readings.length > 0).length;
  const stationsWithWaterLevel = results.filter(r => 
    r.readings?.[0]?.wlvalues !== null && r.readings?.[0]?.wlvalues !== undefined
  ).length;
  const stationsWithFlowRate = results.filter(r => 
    r.readings?.[0]?.qvalues !== null && r.readings?.[0]?.qvalues !== undefined
  ).length;

  logger.info('Telemetry Test Report', 'TelemetryTest', {
    summary: {
      totalStations,
      successfulTests,
      failedTests,
      stationsWithReadings,
      stationsWithWaterLevel,
      stationsWithFlowRate
    },
    timestamp: new Date().toISOString()
  });

  // Log details for failed tests
  const failedStations = results.filter(r => !r.success);
  if (failedStations.length > 0) {
    logger.warn('Failed Station Tests', 'TelemetryTest', {
      failedStations: failedStations.map(result => ({
        station_id: result.station.station_id,
        station_name: result.station.station_name,
        error: result.error
      })),
      timestamp: new Date().toISOString()
    });
  }

  // Log stations with readings
  const successfulReadings = results
    .filter(r => r.success && r.readings && r.readings.length > 0)
    .map(result => ({
      station_id: result.station.station_id,
      station_name: result.station.station_name,
      water_level: result.readings![0].wlvalues,
      flow_rate: result.readings![0].qvalues,
      timestamp: result.readings![0].hourlytime
    }));

  logger.info('Successful Readings', 'TelemetryTest', {
    readings: successfulReadings,
    timestamp: new Date().toISOString()
  });
}

async function main() {
  try {
    logger.info('Starting telemetry station test', 'TelemetryTest', {
      timestamp: new Date().toISOString()
    });

    // Get all stations
    const stations = await getAllTelemetryStations();
    logger.info('Retrieved stations', 'TelemetryTest', {
      count: stations.length,
      timestamp: new Date().toISOString()
    });

    // Test each station with a delay between requests
    const results: TestResult[] = [];
    for (const station of stations) {
      const result = await testStation(station);
      results.push(result);
      
      // Add a small delay between requests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save results to database
    await saveTestResults(results);

    // Generate and log report
    await generateTestReport(results);

    logger.info('Telemetry station test completed', 'TelemetryTest', {
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Test script failed', 'TelemetryTest', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
main()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 