import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getRainfallData, getStations, getRainfallStatistics } from '../services/thaiwater/rainfall.service';
import { logger } from '../utils/logger';

/**
 * Controller for ThaiWater API endpoints
 */
export class ThaiWaterController {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get rainfall data with filters
   */
  public getRainfall = async (req: Request, res: Response) => {
    try {
      const {
        date,
        station_id,
        province,
        amphoe,
        min_rainfall,
        data_source,
        limit,
        offset
      } = req.query;

      const params = {
        date: date as string,
        stationId: station_id ? parseInt(station_id as string, 10) : undefined,
        province: province as string,
        amphoe: amphoe as string,
        minRainfall: min_rainfall ? parseFloat(min_rainfall as string) : undefined,
        dataSource: data_source as 'HII' | 'TMD' | 'ALL',
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined
      };

      const data = await getRainfallData(params, this.pool);

      return res.status(200).json({
        success: true,
        data,
        meta: {
          count: data.length,
          filters: params
        }
      });
    } catch (error) {
      logger.error('Error in getRainfall controller', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve rainfall data',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get telemetry stations with filters
   */
  public getStations = async (req: Request, res: Response) => {
    try {
      const {
        station_id,
        province,
        amphoe,
        data_source,
        limit,
        offset
      } = req.query;

      const params = {
        stationId: station_id ? parseInt(station_id as string, 10) : undefined,
        province: province as string,
        amphoe: amphoe as string,
        dataSource: data_source as 'HII' | 'TMD' | 'ALL',
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined
      };

      const data = await getStations(params, this.pool);

      return res.status(200).json({
        success: true,
        data,
        meta: {
          count: data.length,
          filters: params
        }
      });
    } catch (error) {
      logger.error('Error in getStations controller', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve stations data',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get rainfall statistics
   */
  public getStatistics = async (_req: Request, res: Response) => {
    try {
      const data = await getRainfallStatistics(this.pool);

      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Error in getStatistics controller', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve rainfall statistics',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };
} 