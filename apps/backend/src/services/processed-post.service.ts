import pkg from 'pg';
import type { QueryResultRow } from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;
import { ProcessedPost } from '../types/processed-post.js';
import { ProcessedPostDTO } from '../types/processed-post.dto.js';
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
      replied_by: post.replied_by
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

      const result = posts.map(post => {
        // Check direct coordinates
        if (post.latitude !== null && post.longitude !== null) {
          directCoordinatesCount++;
          return {
            ...this.toDTO(post),
            latitude: post.latitude,
            longitude: post.longitude
          };
        }

        // Try cache
        const location = this.locationCache.getLocation(
          post.tumbon,
          post.amphure,
          post.province
        );

        if (location) {
          cacheCoordinatesCount++;
          return {
            ...this.toDTO(post),
            latitude: location.lat,
            longitude: location.lng
          };
        }

        // No coordinates found
        noCoordinatesCount++;
        return null;
      }).filter((post): post is ProcessedPostDTO => post !== null);

      logger.info('Coordinates source breakdown:', {
        totalPosts: posts.length,
        postsWithDirectCoordinates: directCoordinatesCount,
        postsWithCachedCoordinates: cacheCoordinatesCount,
        postsWithNoCoordinates: noCoordinatesCount,
        totalReturnedPosts: result.length
      });

      return result;
    } catch (error) {
      logger.error('Error fetching unprocessed posts:', error);
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
    const result = await this.pool.query(
      `SELECT * FROM processed_posts
       WHERE ST_DWithin(
         ST_MakePoint(longitude, latitude)::geography,
         ST_MakePoint($1, $2)::geography,
         $3 * 1000
       )`,
      [longitude, latitude, radiusKm]
    );
    
    return result.rows.map(this.toDTO);
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

      return result.map(this.toDTO);
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
} 