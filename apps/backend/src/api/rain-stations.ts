import { Router } from 'express';
import { pool } from '../lib/db';
import { logger } from '../utils/logger';

const router = Router();

interface RainStation {
  id: string;
  name: string;
  name_th: string | null;
  latitude: number;
  longitude: number;
  station_type: string;
  data_source: string;
  province: string | null;
  amphure: string | null;
  tambon: string | null;
}

interface RainStationWithMeasurements extends RainStation {
  rainfall10m: number | null;
  rainfall1h: number | null;
  rainfall3h: number | null;
  rainfall24h: number | null;
  rainfall_today: number | null;
  rainfall_date_calc: string | null;
  rainfall_datetime: string | null;
}

// Simple test endpoint to check if we can access the database
router.get('/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 as test');
    res.json({ success: true, result: result.rows[0] });
  } catch (error) {
    logger.error('❌ Test query failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ 
      success: false,
      error: 'Test query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple count endpoint to check if we can access the thaiwater_tele_stations table
router.get('/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM thaiwater_tele_stations');
    res.json({ success: true, count: result.rows[0].count });
  } catch (error) {
    logger.error('❌ Count query failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ 
      success: false,
      error: 'Count query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple hello endpoint to check if the router is working
router.get('/hello', async (req, res) => {
  res.json({ message: 'Hello from rain-stations API!' });
});

// Simple endpoint that just returns the query parameters
router.get('/echo', async (req, res) => {
  res.json({
    query: req.query,
    amphure: req.query.amphure,
    province: req.query.province,
    data_source: req.query.data_source
  });
});

router.get('/', async (req, res) => {
  try {
    const amphure = typeof req.query.amphure === 'string' ? req.query.amphure : undefined;
    const province = typeof req.query.province === 'string' ? req.query.province : undefined;
    const dataSource = typeof req.query.data_source === 'string' ? req.query.data_source.toUpperCase() : undefined;
    
    // Parse pagination parameters
    const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : 1;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 50;
    
    // Validate pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 && limit <= 100 ? limit : 50;
    const offset = (validPage - 1) * validLimit;
    
    logger.info('🔍 Rain Station Query Started', {
      amphure,
      province,
      dataSource,
      pagination: { page: validPage, limit: validLimit, offset },
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    // Validate input parameters
    if (!province && !amphure) {
      logger.warn('Missing required parameters for rain stations', {
        params: req.query,
        message: 'Either province or amphure is required'
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Either province or amphure parameter is required'
      });
    }
    
    // Try to count the matching stations
    let countQuery = `
      SELECT COUNT(*) 
      FROM thaiwater_tele_stations
      WHERE (data_source = 'TMD' OR data_source = 'HII')
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (amphure) {
      countQuery += ` AND amphure = $${paramIndex}`;
      params.push(amphure);
      paramIndex++;
      logger.info(`🎯 Filtering by amphure: ${amphure}`);
    }
    
    if (province) {
      countQuery += ` AND province = $${paramIndex}`;
      params.push(province);
      paramIndex++;
      logger.info(`🎯 Filtering by province: ${province}`);
    }

    if (dataSource) {
      countQuery += ` AND data_source = $${paramIndex}`;
      params.push(dataSource);
      paramIndex++;
      logger.info(`🎯 Filtering by data source: ${dataSource}`);
    }
    
    logger.debug('📝 Executing count query', { query: countQuery, params });
    
    try {
      const countResult = await pool.query(countQuery, params);
      const count = parseInt(countResult.rows[0].count);
      
      logger.info(`📊 Found ${count} matching stations`);
      
      if (count === 0) {
        return res.json({
          success: true,
          message: 'No matching stations found',
          params: {
            amphure,
            province,
            dataSource
          },
          pagination: {
            page: validPage,
            limit: validLimit,
            total: 0,
            totalPages: 0
          },
          count: 0,
          stations: [],
          total: 0
        });
      }
      
      // Calculate total pages
      const totalPages = Math.ceil(count / validLimit);
      
      // If we have matching stations, proceed with the full query
      let query = `
        SELECT 
          tele_station_id as id,
          tele_station_name as name,
          tele_station_name_th as name_th,
          tele_station_lat as latitude,
          tele_station_long as longitude,
          tele_station_type as station_type,
          data_source,
          province,
          amphure,
          tambon
        FROM 
          thaiwater_tele_stations
        WHERE 
          (data_source = 'TMD' OR data_source = 'HII')
      `;
      
      // Reset params array for the main query
      params.length = 0;
      paramIndex = 1;
      
      if (amphure) {
        query += ` AND amphure = $${paramIndex}`;
        params.push(amphure);
        paramIndex++;
      }
      
      if (province) {
        query += ` AND province = $${paramIndex}`;
        params.push(province);
        paramIndex++;
      }

      if (dataSource) {
        query += ` AND data_source = $${paramIndex}`;
        params.push(dataSource);
        paramIndex++;
      }
      
      query += ` ORDER BY tele_station_id LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(validLimit, offset);
      
      logger.debug('📝 Executing main query', { query, params });
      
      const { rows } = await pool.query<RainStation>(query, params);
      
      // Group stations by data source for better logging
      const stationsBySource = rows.reduce((acc: Record<string, number>, station: RainStation) => {
        acc[station.data_source] = (acc[station.data_source] || 0) + 1;
        return acc;
      }, {});

      logger.info('📊 Query Results Summary', { 
        totalStations: rows.length,
        stationsBySource,
        province: rows[0]?.province || province,
        amphure: rows[0]?.amphure || amphure,
        pagination: { page: validPage, limit: validLimit, offset, totalPages },
        timestamp: new Date().toISOString()
      });
      
      // Now fetch the latest rainfall data for these stations
      const stationsWithRainfall: RainStationWithMeasurements[] = await Promise.all(
        rows.map(async (station: RainStation) => {
          try {
            // Different query based on data source
            let rainfallQuery = '';
            
            if (station.data_source === 'TMD') {
              // Query for TMD stations
              rainfallQuery = `
                SELECT 
                  rainfall3h,
                  rainfall24h,
                  rainfall_datetime,
                  DATE_TRUNC('day', rainfall_datetime) as rainfall_date_calc
                FROM 
                  thaiwater_rainfall_data
                WHERE 
                  tele_station_id = $1
                ORDER BY 
                  rainfall_datetime DESC
                LIMIT 1
              `;
            } else {
              // Query for HII stations
              rainfallQuery = `
                SELECT 
                  rainfall10m,
                  rainfall1h,
                  rainfall24h,
                  rainfall_datetime,
                  DATE_TRUNC('day', rainfall_datetime) as rainfall_date_calc,
                  COALESCE(
                    (SELECT SUM(rainfall1h)
                     FROM thaiwater_rainfall_data
                     WHERE tele_station_id = $1
                     AND DATE_TRUNC('day', rainfall_datetime) = DATE_TRUNC('day', NOW())
                    ), 0
                  ) as rainfall_today
                FROM 
                  thaiwater_rainfall_data
                WHERE 
                  tele_station_id = $1
                ORDER BY 
                  rainfall_datetime DESC
                LIMIT 1
              `;
            }
            
            const rainfallResult = await pool.query(rainfallQuery, [station.id]);
            
            if (rainfallResult.rows.length > 0) {
              // For TMD stations, set rainfall_today to null
              if (station.data_source === 'TMD') {
                return {
                  ...station,
                  ...rainfallResult.rows[0],
                  rainfall10m: null,
                  rainfall1h: null,
                  rainfall_today: null
                };
              } else {
                return {
                  ...station,
                  ...rainfallResult.rows[0],
                  rainfall3h: null
                };
              }
            } else {
              // No rainfall data found, return station with null values
              return {
                ...station,
                rainfall10m: null,
                rainfall1h: null,
                rainfall3h: null,
                rainfall24h: null,
                rainfall_today: null,
                rainfall_date_calc: null,
                rainfall_datetime: null
              };
            }
          } catch (error) {
            logger.error('Error fetching rainfall data for station', {
              stationId: station.id,
              dataSource: station.data_source,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Return station with null values on error
            return {
              ...station,
              rainfall10m: null,
              rainfall1h: null,
              rainfall3h: null,
              rainfall24h: null,
              rainfall_today: null,
              rainfall_date_calc: null,
              rainfall_datetime: null
            };
          }
        })
      );

      logger.info('✅ Successfully processed rain stations with rainfall data', {
        totalStations: stationsWithRainfall.length,
        stationsWithRainfallData: stationsWithRainfall.filter(s => s.rainfall_datetime !== null).length,
        filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
        pagination: { page: validPage, limit: validLimit, total: count, totalPages },
        timestamp: new Date().toISOString()
      });
      
      // Return the stations with rainfall data in the response
      res.json({
        success: true,
        message: 'Successfully fetched matching stations with rainfall data',
        params: {
          amphure,
          province,
          dataSource
        },
        pagination: {
          page: validPage,
          limit: validLimit,
          total: count,
          totalPages
        },
        count,
        stations: stationsWithRainfall,
        total: stationsWithRainfall.length
      });
    } catch (dbError) {
      logger.error('❌ Database query failed', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : 'No stack trace',
        query: countQuery,
        params,
        timestamp: new Date().toISOString()
      });
      
      // Return an error response with detailed information
      res.status(500).json({ 
        success: false,
        error: 'Database query failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error',
        query: {
          sql: countQuery,
          params,
          amphure,
          province,
          dataSource
        }
      });
    }
  } catch (error) {
    logger.error('❌ Failed to process request', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      query: req.query,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
      query: req.query
    });
  }
});

// Get all provinces that have rain stations
router.get('/provinces', async (req, res) => {
  try {
    logger.info('📋 Fetching list of provinces with rain stations');
    
    const query = `
      SELECT DISTINCT province 
      FROM thaiwater_tele_stations 
      WHERE province IS NOT NULL 
      AND (data_source = 'TMD' OR data_source = 'HII')
      ORDER BY province
    `;
    
    const { rows } = await pool.query(query);
    
    logger.info(`✅ Successfully fetched ${rows.length} provinces`);
    
    res.json({
      success: true,
      message: 'Successfully fetched provinces',
      provinces: rows.map(row => row.province),
      total: rows.length
    });
  } catch (error) {
    logger.error('❌ Failed to fetch provinces', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch provinces',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all amphures within a specific province
router.get('/amphures', async (req, res) => {
  try {
    const province = typeof req.query.province === 'string' ? req.query.province : undefined;
    
    if (!province) {
      logger.warn('Missing province parameter for amphures list');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'Province parameter is required'
      });
    }
    
    logger.info(`📋 Fetching list of amphures in province: ${province}`);
    
    const query = `
      SELECT DISTINCT amphure 
      FROM thaiwater_tele_stations 
      WHERE province = $1 
      AND amphure IS NOT NULL 
      AND (data_source = 'TMD' OR data_source = 'HII')
      ORDER BY amphure
    `;
    
    const { rows } = await pool.query(query, [province]);
    
    logger.info(`✅ Successfully fetched ${rows.length} amphures in ${province}`);
    
    res.json({
      success: true,
      message: `Successfully fetched amphures in ${province}`,
      province,
      amphures: rows.map(row => row.amphure),
      total: rows.length
    });
  } catch (error) {
    logger.error('❌ Failed to fetch amphures', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      province: req.query.province,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch amphures',
      details: error instanceof Error ? error.message : 'Unknown error',
      province: req.query.province
    });
  }
});

// Get summary of data sources and station counts
router.get('/summary', async (req, res) => {
  try {
    logger.info('📊 Fetching rain stations summary');
    
    const query = `
      SELECT 
        data_source, 
        COUNT(*) as count,
        COUNT(DISTINCT province) as province_count,
        COUNT(DISTINCT amphure) as amphure_count
      FROM 
        thaiwater_tele_stations 
      WHERE 
        (data_source = 'TMD' OR data_source = 'HII')
      GROUP BY 
        data_source
      ORDER BY 
        data_source
    `;
    
    const { rows } = await pool.query(query);
    
    // Get total counts
    const totalQuery = `
      SELECT 
        COUNT(*) as total_stations,
        COUNT(DISTINCT province) as total_provinces,
        COUNT(DISTINCT amphure) as total_amphures
      FROM 
        thaiwater_tele_stations 
      WHERE 
        (data_source = 'TMD' OR data_source = 'HII')
    `;
    
    const totalResult = await pool.query(totalQuery);
    const totals = totalResult.rows[0];
    
    logger.info(`✅ Successfully fetched summary data for ${rows.length} data sources`);
    
    res.json({
      success: true,
      message: 'Successfully fetched rain stations summary',
      summary: rows,
      totals,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to fetch summary', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get historical rainfall data for a specific station
router.get('/:stationId/history', async (req, res) => {
  try {
    const stationId = req.params.stationId;
    
    // Parse date range parameters
    const startDate = typeof req.query.start_date === 'string' ? req.query.start_date : undefined;
    const endDate = typeof req.query.end_date === 'string' ? req.query.end_date : undefined;
    
    // Default to last 7 days if no date range is provided
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    
    const validStartDate = startDate || defaultStartDate.toISOString().split('T')[0];
    const validEndDate = endDate || new Date().toISOString().split('T')[0];
    
    logger.info('🔍 Fetching historical rainfall data', {
      stationId,
      startDate: validStartDate,
      endDate: validEndDate,
      timestamp: new Date().toISOString()
    });
    
    // First, get station details to determine data source
    const stationQuery = `
      SELECT 
        tele_station_id as id,
        tele_station_name as name,
        tele_station_name_th as name_th,
        data_source,
        province,
        amphure
      FROM 
        thaiwater_tele_stations
      WHERE 
        tele_station_id = $1
    `;
    
    const stationResult = await pool.query(stationQuery, [stationId]);
    
    if (stationResult.rows.length === 0) {
      logger.warn(`Station with ID ${stationId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Station not found',
        message: `No station found with ID ${stationId}`
      });
    }
    
    const station = stationResult.rows[0];
    const dataSource = station.data_source;
    
    // Different query based on data source
    let historyQuery = '';
    
    if (dataSource === 'TMD') {
      // Query for TMD stations
      historyQuery = `
        SELECT 
          rainfall3h,
          rainfall24h,
          rainfall_datetime,
          DATE_TRUNC('day', rainfall_datetime) as rainfall_date_calc
        FROM 
          thaiwater_rainfall_data
        WHERE 
          tele_station_id = $1
          AND rainfall_datetime >= $2
          AND rainfall_datetime <= $3
        ORDER BY 
          rainfall_datetime DESC
      `;
    } else {
      // Query for HII stations
      historyQuery = `
        SELECT 
          rainfall10m,
          rainfall1h,
          rainfall24h,
          rainfall_datetime,
          DATE_TRUNC('day', rainfall_datetime) as rainfall_date_calc,
          (
            SELECT SUM(rainfall1h)
            FROM thaiwater_rainfall_data
            WHERE tele_station_id = $1
            AND DATE_TRUNC('day', rainfall_datetime) = DATE_TRUNC('day', r.rainfall_datetime)
          ) as rainfall_today
        FROM 
          thaiwater_rainfall_data r
        WHERE 
          tele_station_id = $1
          AND rainfall_datetime >= $2
          AND rainfall_datetime <= $3
        ORDER BY 
          rainfall_datetime DESC
      `;
    }
    
    const historyResult = await pool.query(historyQuery, [
      stationId,
      `${validStartDate} 00:00:00`,
      `${validEndDate} 23:59:59`
    ]);
    
    // Process the results based on data source
    let processedData = historyResult.rows;
    
    if (dataSource === 'TMD') {
      // For TMD stations, add null values for HII-specific fields
      processedData = historyResult.rows.map(row => ({
        ...row,
        rainfall10m: null,
        rainfall1h: null,
        rainfall_today: null
      }));
    } else {
      // For HII stations, add null values for TMD-specific fields
      processedData = historyResult.rows.map(row => ({
        ...row,
        rainfall3h: null
      }));
    }
    
    logger.info(`✅ Successfully fetched ${processedData.length} historical records for station ${stationId}`, {
      stationId,
      dataSource,
      recordCount: processedData.length,
      dateRange: `${validStartDate} to ${validEndDate}`,
      timestamp: new Date().toISOString()
    });
    
    // Group data by day for easier consumption
    const dataByDay = processedData.reduce((acc: Record<string, any[]>, record: any) => {
      const day = record.rainfall_datetime.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(record);
      return acc;
    }, {});
    
    res.json({
      success: true,
      message: `Successfully fetched historical rainfall data for station ${stationId}`,
      station: {
        id: station.id,
        name: station.name,
        name_th: station.name_th,
        data_source: dataSource,
        province: station.province,
        amphure: station.amphure
      },
      date_range: {
        start_date: validStartDate,
        end_date: validEndDate
      },
      data: processedData,
      data_by_day: dataByDay,
      total: processedData.length
    });
  } catch (error) {
    logger.error('❌ Failed to fetch historical rainfall data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      stationId: req.params.stationId,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch historical rainfall data',
      details: error instanceof Error ? error.message : 'Unknown error',
      stationId: req.params.stationId,
      query: req.query
    });
  }
});

export default router; 