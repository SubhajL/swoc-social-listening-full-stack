import { Router } from 'express';
import { pool } from '../lib/db';
import { logger } from '../utils/logger';
import { getStationList } from '../services/telemetry/telemetry.service';

const router = Router();

interface TelemetryStation {
  id: number;
  station_id: string;
  station_name: string;
  code: string;
  irrigation_office: string;
  river_basin: string;
  river_name: string;
  amphure: string;
  province: string;
  bank_level_meters: string;
  capacity_cms: string;
  pole_center_msl: string;
}

interface TelemetryStationWithMeasurements extends TelemetryStation {
  water_level: number;
  flow_rate: number;
}

router.get('/', async (req, res) => {
  // Add backend log in the /stations route
  console.log('📡 Received GET /api/telemetry-stations');
  
  const { amphure, province } = req.query;
  
  // Log detailed query information
  console.log('[Backend] Telemetry stations request details:', {
    query: req.query,
    amphure: amphure ? {
      value: String(amphure),
      type: typeof amphure,
      length: String(amphure).length,
      hexEncoded: Buffer.from(String(amphure)).toString('hex')
    } : undefined,
    province: province ? {
      value: String(province),
      type: typeof province,
      length: String(province).length,
      hexEncoded: Buffer.from(String(province)).toString('hex')
    } : undefined,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    timestamp: new Date().toISOString()
  });
  
  // Log full request details for debugging
  logger.info('🔍 Telemetry Station Request', {
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });

  // Validate required parameters
  if (!amphure && !province) {
    logger.warn('Missing required location parameters', {
      amphure,
      province,
      message: 'At least one of amphure or province is required'
    });
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      message: 'At least one of amphure or province parameters is required'
    });
  }

  // Convert parameters to strings and normalize to NFC form
  const amphureStr = amphure ? String(amphure).normalize('NFC') : undefined;
  const provinceStr = province ? String(province).normalize('NFC') : undefined;
  
  // Log detailed debugging information
  logger.info('[Debug] Original parameters:', {
    amphure: amphure ? String(amphure) : undefined,
    province: province ? String(province) : undefined
  });
  
  logger.info('[Debug] Normalized parameters:', {
    amphure: amphureStr,
    province: provinceStr
  });
  
  // Log hexadecimal representation for troubleshooting
  if (amphureStr) {
    logger.info('[Debug] Amphure parameter details:', {
      raw: amphure,
      normalized: amphureStr,
      hexEncoded: Buffer.from(amphureStr).toString('hex'),
      codePoints: Array.from(amphureStr).map(char => ({
        char,
        codePoint: char.codePointAt(0)?.toString(16)
      }))
    });
  }
  
  if (provinceStr) {
    logger.info('[Debug] Province parameter details:', {
      raw: province,
      normalized: provinceStr,
      hexEncoded: Buffer.from(provinceStr).toString('hex'),
      codePoints: Array.from(provinceStr).map(char => ({
        char,
        codePoint: char.codePointAt(0)?.toString(16)
      }))
    });
  }
  
  // Log sanitized parameters
  logger.debug('Sanitized parameters', {
    raw: { amphure, province },
    normalized: { amphure: amphureStr, province: provinceStr }
  });
  
  try {
    logger.info('Calling telemetry service getStationList', {
      amphure: amphureStr, 
      province: provinceStr
    });
    
    // Use the enhanced service function with amphure-first, province-fallback logic
    const response = await getStationList(amphureStr, provinceStr);
    
    logger.debug('Service response', {
      success: response.success,
      dataLength: response.data?.length || 0,
      error: response.error
    });
    
    if (!response.success) {
      logger.error('❌ Error in station service response', {
        error: response.error,
        amphure: amphureStr,
        province: provinceStr,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch telemetry stations',
        message: response.error || 'Unknown service error'
      });
    }

    // Log detailed station ID information from database
    logger.info('🔢 Station IDs from PostgreSQL', { 
      stationIds: response.data.map(station => ({
        id: station.id,
        station_id: station.station_id,
        name: station.station_name,
        amphure: station.amphure,
        province: station.province
      })),
      count: response.data.length
    });

    // Log summary
    logger.info('📊 Query Results Summary', { 
      totalStations: response.data.length,
      location: {
        amphure: amphureStr,
        province: provinceStr
      },
      timestamp: new Date().toISOString()
    });

    // Add cache control headers
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    
    res.json({
      success: true,
      stations: response.data,
      count: response.data.length,
      location: {
        amphure: amphureStr,
        province: provinceStr
      }
    });

  } catch (error) {
    logger.error('❌ Error fetching telemetry stations:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      location: { 
        amphure: amphureStr, 
        province: provinceStr 
      },
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch telemetry stations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add a debug endpoint to get more information about the request
router.get('/debug', (req, res) => {
  const dbInfo = {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    user: process.env.DB_USER?.substring(0, 3) + '***' // Show only first 3 chars of username for security
  };

  res.json({
    success: true,
    message: 'Telemetry Stations API debug info',
    api: {
      version: '1.0.0',
      endpoints: [
        '/ - Get telemetry stations by location',
        '/debug - Get debug information'
      ]
    },
    environment: process.env.NODE_ENV,
    database: dbInfo,
    request: {
      query: req.query,
      path: req.path,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent']
      }
    }
  });
});

export default router; 