import pkg from 'pg';
import type { QueryResultRow } from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;
import { ProcessedPost } from '../types/processed-post.js';
import { ProcessedPostDTO, CoordinateSource } from '../types/processed-post.dto.js';
import { CreatePostDTO } from '../types/create-post.dto.js';
import { logger } from '../utils/logger.js';
import { TransactionManager, TransactionClient } from '../utils/transaction-manager.js';
import {
  PostNotFoundError,
  DatabaseError,
  ValidationError
} from '../errors/index.js';
import { randomUUID } from 'crypto';
import { BatchProgressManager } from '../utils/batch-progress-manager.js';
import { BatchOperation, BatchProgress } from '../models/batch-progress.js';
import { Server } from 'socket.io';
import { LocationCacheService } from './location-cache.service.js';

interface BatchUpdateLocation {
  id: string;
  tumbon?: string;
  amphure?: string;
  province?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class ProcessedPostService {
  private transactionManager: TransactionManager;
  private batchProgressManager: BatchProgressManager;
  private io: Server;
  private locationCache: LocationCacheService;

  constructor(
    private readonly pool: PoolType,
    io: Server
  ) {
    this.transactionManager = new TransactionManager(pool);
    this.batchProgressManager = new BatchProgressManager();
    this.io = io;
    this.locationCache = new LocationCacheService(pool);
  }

  async initialize(): Promise<void> {
    await this.locationCache.initialize();
    logger.info('ProcessedPostService initialized with location cache');
  }

  private async executeQuery<T extends QueryResultRow>(
    query: string,
    params: any[],
    client: PoolType | TransactionClient = this.pool
  ): Promise<T[]> {
    try {
      const result = await client.query<T>(query, params);
      return result.rows;
    } catch (error) {
      throw new DatabaseError('Query execution failed', error);
    }
  }

  private toDTO(post: ProcessedPost): ProcessedPostDTO {
    return {
      processed_post_id: post.processed_post_id,
      text: post.text,
      category_name: post.category_name,
      sub1_category_name: post.sub1_category_name,
      profile_name: post.profile_name,
      post_date: post.post_date.toISOString(),
      post_url: post.post_url,
      latitude: post.latitude,
      longitude: post.longitude,
      tumbon: post.tumbon,
      amphure: post.amphure,
      province: post.province,
      replied_post: post.replied_post,
      replied_date: post.replied_date?.toISOString(),
      replied_by: post.replied_by,
      coordinate_source: post.coordinate_source || 'direct'
    };
  }

  async getUnprocessedPosts(): Promise<ProcessedPostDTO[]> {
    try {
      logger.info('Starting to fetch unprocessed posts');
      
      const posts = await this.executeQuery<ProcessedPost>(
        `SELECT * FROM processed_posts 
         WHERE replied_post = false 
         ORDER BY post_date DESC`,
        []
      );

      logger.info(`Found ${posts.length} total unprocessed posts`);
      
      let directCoordinatesCount = 0;
      let cacheCoordinatesCount = 0;
      let noCoordinatesCount = 0;
      let onlyTumbonCount = 0;

      const processedPosts = posts.map(post => {
        // Check direct coordinates
        if (post.latitude !== null && post.longitude !== null) {
          directCoordinatesCount++;
          return {
            ...this.toDTO(post),
            coordinate_source: 'direct' as const
          };
        }

        // Skip posts with only tumbon information (no amphure or province)
        if (post.tumbon?.length && (!post.amphure?.length || !post.province?.length)) {
          onlyTumbonCount++;
          logger.debug('Skipping post with only tumbon information', {
            id: post.processed_post_id,
            tumbon: post.tumbon,
            amphure: post.amphure,
            province: post.province
          });
          return null;
        }

        // Try cache if we have sufficient administrative location (must have both amphure AND province)
        if (post.amphure?.length && post.province?.length) {
          const location = this.locationCache.getLocation(
            post.tumbon?.[0],
            post.amphure?.[0],
            post.province?.[0]
          );

          if (location) {
            cacheCoordinatesCount++;
            return {
              ...this.toDTO(post),
              latitude: location.lat,
              longitude: location.lng,
              coordinate_source: location.source === 'direct' ? ('cache_direct' as const) : ('cache_inherited' as const)
            };
          }
        }

        // No coordinates found
        noCoordinatesCount++;
        return null;
      });

      const result = processedPosts.filter((post): post is ProcessedPostDTO => 
        post !== null && 
        post.coordinate_source !== undefined &&
        ['direct', 'cache_direct', 'cache_inherited'].includes(post.coordinate_source)
      );

      logger.info('Posts processing completed', {
        totalPosts: posts.length,
        withDirectCoordinates: directCoordinatesCount,
        withCachedCoordinates: cacheCoordinatesCount,
        withoutCoordinates: noCoordinatesCount,
        onlyTumbonSkipped: onlyTumbonCount,
        finalProcessedCount: result.length
      });

      return result;
    } catch (error) {
      logger.error('Error fetching unprocessed posts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async getPostById(id: string, client: PoolType | TransactionClient = this.pool): Promise<ProcessedPostDTO> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        'SELECT * FROM processed_posts WHERE processed_post_id = $1',
        [id],
        client
      );

      if (result.length === 0) {
        throw new PostNotFoundError(id);
      }

      const post = result[0];
      return this.toDTO(post);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      logger.error(`Error fetching post with id ${id}:`, error);
      throw new DatabaseError('Failed to fetch post', error);
    }
  }

  async getPostsByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<ProcessedPostDTO[]> {
    try {
      // Try using PostGIS first
      const result = await this.pool.query(
        `SELECT * FROM processed_posts
         WHERE ST_DWithin(
           ST_MakePoint(longitude, latitude)::geography,
           ST_MakePoint($1, $2)::geography,
           $3 * 1000
         )`,
        [longitude, latitude, radiusKm]
      );
      
      return result.rows.map((post: ProcessedPost) => this.toDTO(post));
    } catch (error) {
      // If PostGIS is not available, fall back to Haversine formula
      logger.info('PostGIS query failed, falling back to Haversine formula:', error);
      
      // Haversine formula implemented in SQL
      const fallbackResult = await this.pool.query(
        `SELECT * FROM processed_posts
         WHERE (
           6371 * acos(
             cos(radians($1)) * 
             cos(radians(latitude)) * 
             cos(radians(longitude) - radians($2)) + 
             sin(radians($1)) * 
             sin(radians(latitude))
           )
         ) <= $3`,
        [latitude, longitude, radiusKm]
      );
      
      return fallbackResult.rows.map((post: ProcessedPost) => this.toDTO(post));
    }
  }

  async updateLocationDetails(
    id: string,
    tumbon?: string[],
    amphure?: string[],
    province?: string[],
    client: PoolType | TransactionClient = this.pool
  ): Promise<ProcessedPostDTO | null> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        `UPDATE processed_posts 
         SET tumbon = $2,
             amphure = $3,
             province = $4
         WHERE processed_post_id = $1
         RETURNING *`,
        [id, tumbon, amphure, province],
        client
      );

      if (result.length === 0) {
        return null;
      }

      const post = result[0];
      return this.toDTO(post);
    } catch (error) {
      logger.error(`Error updating location details for post ${id}:`, error);
      throw new Error('Failed to update location details');
    }
  }

  async getRecentPosts(minutes: number = 5, client: PoolType | TransactionClient = this.pool): Promise<ProcessedPostDTO[]> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        'SELECT * FROM processed_posts WHERE post_date >= NOW() - INTERVAL \'$1 minutes\' ORDER BY post_date DESC',
        [minutes],
        client
      );

      return result.map((post: ProcessedPost) => this.toDTO(post));
    } catch (error) {
      logger.error('Error fetching recent posts:', error);
      throw new Error('Failed to fetch recent posts');
    }
  }

  async createPost(data: CreatePostDTO): Promise<ProcessedPostDTO> {
    const { category_name, sub1_category_name, text, profile_name, post_url, latitude, longitude, tumbon, amphure, province } = data;
    
    const result = await this.pool.query(
      `INSERT INTO processed_posts 
       (category_name, sub1_category_name, text, profile_name, post_url, latitude, longitude, tumbon, amphure, province)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [category_name, sub1_category_name, text, profile_name, post_url, latitude, longitude, tumbon, amphure, province]
    );
    
    return this.toDTO(result.rows[0]);
  }

  /**
   * Get counts of posts by category with optional filtering
   * @param filters Optional filters for the query (province, amphure, tumbon, dateRange)
   * @param client Database client to use
   * @returns Object with counts for each category
   */
  async getCategoryCounts(
    filters?: {
      province?: string;
      amphure?: string;
      tumbon?: string;
      startDate?: string;
      endDate?: string;
    },
    client: PoolType | TransactionClient = this.pool
  ): Promise<{
    report: number;
    support: number;
    info: number;
    suggestion: number;
  }> {
    try {
      // Build the query with optional filters
      let query = `
        SELECT 
          category_name, 
          COUNT(*) as count 
        FROM processed_posts 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      // Add province filter if provided
      if (filters?.province) {
        query += ` AND province @> ARRAY[$${paramIndex}]`;
        params.push(filters.province);
        paramIndex++;
      }
      
      // Add amphure filter if provided
      if (filters?.amphure) {
        query += ` AND amphure @> ARRAY[$${paramIndex}]`;
        params.push(filters.amphure);
        paramIndex++;
      }
      
      // Add tumbon filter if provided
      if (filters?.tumbon) {
        query += ` AND tumbon @> ARRAY[$${paramIndex}]`;
        params.push(filters.tumbon);
        paramIndex++;
      }
      
      // Add date range filter if provided
      if (filters?.startDate && filters?.endDate) {
        query += ` AND post_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(filters.startDate, filters.endDate);
        paramIndex += 2;
      }
      
      // Group by category
      query += ` GROUP BY category_name`;
      
      // Execute the query
      const result = await this.executeQuery<{ category_name: string; count: string }>(
        query,
        params,
        client
      );
      
      // Initialize counts object with zeros
      const counts = {
        report: 0,
        support: 0,
        info: 0,
        suggestion: 0
      };
      
      // Map category names to count object properties
      const categoryMapping: Record<string, keyof typeof counts> = {
        'การรายงานและแจ้งเหตุ': 'report',
        'การขอการสนับสนุน/ช่วยดำเนินการ': 'support',
        'ขอข้อมูล': 'info',
        'ข้อเสนอแนะ': 'suggestion',
        'Unknown': 'report' // Map Unknown to report category for now
      };
      
      // Log the raw query results for debugging
      logger.info('Raw category counts from database:', result);
      
      // Fill in the counts from the query results
      result.forEach(row => {
        const key = categoryMapping[row.category_name];
        if (key) {
          counts[key] = parseInt(row.count, 10);
        } else {
          // For unrecognized categories, log them and add to report count
          logger.warn('Unrecognized category in count results:', {
            category: row.category_name,
            count: row.count
          });
          
          // Try to map based on partial matches
          if (row.category_name.includes('รายงาน') || row.category_name.includes('แจ้งเหตุ')) {
            counts.report += parseInt(row.count, 10);
          } else if (row.category_name.includes('สนับสนุน') || row.category_name.includes('ช่วยดำเนินการ')) {
            counts.support += parseInt(row.count, 10);
          } else if (row.category_name.includes('ข้อมูล')) {
            counts.info += parseInt(row.count, 10);
          } else if (row.category_name.includes('เสนอแนะ')) {
            counts.suggestion += parseInt(row.count, 10);
          } else {
            // Default to report for unknown categories
            counts.report += parseInt(row.count, 10);
          }
        }
      });
      
      // Log the final counts for debugging
      logger.info('Final category counts:', counts);
      
      return counts;
    } catch (error) {
      logger.error('Error getting category counts:', error);
      throw new Error('Failed to get category counts');
    }
  }
} 