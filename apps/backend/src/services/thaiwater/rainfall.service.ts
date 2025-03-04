import { Pool } from 'pg';
import { logger } from '../../utils/logger';

interface RainfallQueryParams {
  date?: string;
  stationId?: number;
  province?: string;
  amphoe?: string;
  minRainfall?: number;
  dataSource?: 'HII' | 'TMD' | 'ALL';
  limit?: number;
  offset?: number;
}

interface StationQueryParams {
  stationId?: number;
  province?: string;
  amphoe?: string;
  dataSource?: 'HII' | 'TMD' | 'ALL';
  limit?: number;
  offset?: number;
}

/**
 * Get rainfall data from the database with various filters
 */
export async function getRainfallData(params: RainfallQueryParams, pool: Pool) {
  const {
    date,
    stationId,
    province,
    amphoe,
    minRainfall = 0,
    dataSource = 'ALL',
    limit = 100,
    offset = 0
  } = params;

  try {
    let query = `
      SELECT 
        r.id,
        r.tele_station_id,
        s.tele_station_name,
        s.tele_station_name_th,
        s.tele_station_lat,
        s.tele_station_long,
        r.rainfall24h,
        r.rainfall10m,
        r.rainfall1h,
        r.rainfall3h,
        r.rainfall_datetime,
        r.data_source,
        s.province,
        s.amphure,
        s.tambon
      FROM 
        thaiwater_rainfall_data r
      JOIN 
        thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      WHERE 
        r.rainfall24h >= $1
    `;

    const queryParams: any[] = [minRainfall];
    let paramIndex = 2;

    if (date) {
      query += ` AND DATE(r.rainfall_datetime) = $${paramIndex}`;
      queryParams.push(date);
      paramIndex++;
    }

    if (stationId) {
      query += ` AND r.tele_station_id = $${paramIndex}`;
      queryParams.push(stationId);
      paramIndex++;
    }

    if (province) {
      query += ` AND s.province = $${paramIndex}`;
      queryParams.push(province);
      paramIndex++;
    }

    if (amphoe) {
      query += ` AND s.amphure = $${paramIndex}`;
      queryParams.push(amphoe);
      paramIndex++;
    }

    if (dataSource && dataSource !== 'ALL') {
      query += ` AND r.data_source = $${paramIndex}`;
      queryParams.push(dataSource);
      paramIndex++;
    }

    // Add sorting and pagination
    query += ` ORDER BY r.rainfall24h DESC, r.rainfall_datetime DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    logger.debug('Executing rainfall query', {
      query,
      params: queryParams
    });

    const client = await pool.connect();
    try {
      const result = await client.query(query, queryParams);
      
      logger.info('Rainfall data retrieved', {
        count: result.rows.length,
        filters: {
          date,
          stationId,
          province,
          amphoe,
          minRainfall,
          dataSource
        }
      });
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error retrieving rainfall data', {
      error: error instanceof Error ? error.message : String(error),
      params
    });
    throw error;
  }
}

/**
 * Get telemetry stations from the database with various filters
 */
export async function getStations(params: StationQueryParams, pool: Pool) {
  const {
    stationId,
    province,
    amphoe,
    dataSource = 'ALL',
    limit = 100,
    offset = 0
  } = params;

  try {
    let query = `
      SELECT 
        tele_station_id,
        tele_station_name,
        tele_station_name_th,
        tele_station_oldcode,
        tele_station_lat,
        tele_station_long,
        agency_id,
        data_source,
        province,
        amphoe,
        tambon,
        updated_at
      FROM 
        thaiwater_tele_stations
      WHERE 
        1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (stationId) {
      query += ` AND tele_station_id = $${paramIndex}`;
      queryParams.push(stationId);
      paramIndex++;
    }

    if (province) {
      query += ` AND province = $${paramIndex}`;
      queryParams.push(province);
      paramIndex++;
    }

    if (amphoe) {
      query += ` AND amphoe = $${paramIndex}`;
      queryParams.push(amphoe);
      paramIndex++;
    }

    if (dataSource && dataSource !== 'ALL') {
      query += ` AND data_source = $${paramIndex}`;
      queryParams.push(dataSource);
      paramIndex++;
    }

    // Add sorting and pagination
    query += ` ORDER BY tele_station_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    logger.debug('Executing stations query', {
      query,
      params: queryParams
    });

    const client = await pool.connect();
    try {
      const result = await client.query(query, queryParams);
      
      logger.info('Stations retrieved', {
        count: result.rows.length,
        filters: {
          stationId,
          province,
          amphoe,
          dataSource
        }
      });
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error retrieving stations', {
      error: error instanceof Error ? error.message : String(error),
      params
    });
    throw error;
  }
}

/**
 * Get rainfall statistics
 */
export async function getRainfallStatistics(pool: Pool) {
  try {
    const client = await pool.connect();
    
    try {
      // Get total stations by data source
      const stationsQuery = `
        SELECT data_source, COUNT(*) as count
        FROM thaiwater_tele_stations
        GROUP BY data_source
      `;
      
      const stationsResult = await client.query(stationsQuery);
      
      // Get total rainfall records by data source
      const rainfallQuery = `
        SELECT data_source, COUNT(*) as count
        FROM thaiwater_rainfall_data
        GROUP BY data_source
      `;
      
      const rainfallResult = await client.query(rainfallQuery);
      
      // Get rainfall distribution
      const distributionQuery = `
        SELECT
          CASE
            WHEN rainfall24h >= 90 THEN 'Very Heavy (≥90mm)'
            WHEN rainfall24h >= 35 THEN 'Heavy (35-90mm)'
            WHEN rainfall24h >= 10 THEN 'Moderate (10-35mm)'
            WHEN rainfall24h > 0 THEN 'Light (<10mm)'
            ELSE 'No Rain (0mm)'
          END as category,
          COUNT(*) as count,
          data_source
        FROM thaiwater_rainfall_data
        GROUP BY category, data_source
        ORDER BY 
          data_source,
          CASE
            WHEN category = 'Very Heavy (≥90mm)' THEN 1
            WHEN category = 'Heavy (35-90mm)' THEN 2
            WHEN category = 'Moderate (10-35mm)' THEN 3
            WHEN category = 'Light (<10mm)' THEN 4
            WHEN category = 'No Rain (0mm)' THEN 5
          END
      `;
      
      const distributionResult = await client.query(distributionQuery);
      
      // Get highest rainfall by data source
      const highestQuery = `
        WITH highest_rainfall AS (
          SELECT
            r.tele_station_id,
            s.tele_station_name,
            s.tele_station_name_th,
            r.rainfall24h,
            r.data_source,
            ROW_NUMBER() OVER (PARTITION BY r.data_source ORDER BY r.rainfall24h DESC) as rn
          FROM
            thaiwater_rainfall_data r
          JOIN
            thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
        )
        SELECT * FROM highest_rainfall WHERE rn <= 5
      `;
      
      const highestResult = await client.query(highestQuery);
      
      // Get latest data timestamp by data source
      const latestQuery = `
        SELECT
          data_source,
          MAX(rainfall_datetime) as latest_timestamp,
          COUNT(*) as records_count
        FROM
          thaiwater_rainfall_data
        GROUP BY
          data_source
      `;
      
      const latestResult = await client.query(latestQuery);
      
      return {
        stations: stationsResult.rows,
        rainfall: rainfallResult.rows,
        distribution: distributionResult.rows,
        highest: highestResult.rows,
        latest: latestResult.rows
      };
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error retrieving rainfall statistics', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
} 