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

  // Validate input parameters
  if (!province && !amphoe) {
    logger.warn('Missing required parameters for rainfall data', {
      params,
      message: 'Either province or amphoe is required'
    });
    throw new Error('Either province or amphoe parameter is required');
  }

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
      
      // Return empty array if no results found
      if (result.rows.length === 0) {
        logger.info('No rainfall data found for the given parameters', {
          params
        });
      }
      
      return result.rows;
    } catch (dbError) {
      logger.error('Database error retrieving rainfall data', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        query,
        params: queryParams
      });
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error retrieving rainfall data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      params
    });
    
    // Rethrow with more context
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Failed to retrieve rainfall data: ${String(error)}`);
    }
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

  // Validate input parameters
  if (!province && !amphoe && !stationId) {
    logger.warn('Missing required parameters for stations', {
      params,
      message: 'At least one of province, amphoe, or stationId is required'
    });
    throw new Error('At least one of province, amphoe, or stationId parameter is required');
  }

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
      
      // Return empty array if no results found
      if (result.rows.length === 0) {
        logger.info('No stations found for the given parameters', {
          params
        });
      }
      
      return result.rows;
    } catch (dbError) {
      logger.error('Database error retrieving stations', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        query,
        params: queryParams
      });
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error retrieving stations', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      params
    });
    
    // Rethrow with more context
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Failed to retrieve stations: ${String(error)}`);
    }
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
      
      // Get latest rainfall date
      const latestDateQuery = `
        SELECT MAX(rainfall_datetime) as latest_date
        FROM thaiwater_rainfall_data
      `;
      
      const latestDateResult = await client.query(latestDateQuery);
      
      // Get rainfall summary for the latest date
      const latestDate = latestDateResult.rows[0]?.latest_date;
      
      let rainfallSummary = [];
      
      if (latestDate) {
        const summaryQuery = `
          SELECT 
            data_source,
            COUNT(*) as total_records,
            AVG(rainfall24h) as avg_rainfall,
            MAX(rainfall24h) as max_rainfall,
            MIN(rainfall24h) as min_rainfall
          FROM 
            thaiwater_rainfall_data
          WHERE 
            DATE(rainfall_datetime) = DATE($1)
          GROUP BY 
            data_source
        `;
        
        const summaryResult = await client.query(summaryQuery, [latestDate]);
        rainfallSummary = summaryResult.rows;
      }
      
      logger.info('Rainfall statistics retrieved successfully');
      
      return {
        stations: stationsResult.rows,
        rainfall: rainfallResult.rows,
        latest_date: latestDate,
        summary: rainfallSummary
      };
    } catch (dbError) {
      logger.error('Database error retrieving rainfall statistics', {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error retrieving rainfall statistics', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Rethrow with more context
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Failed to retrieve rainfall statistics: ${String(error)}`);
    }
  }
} 