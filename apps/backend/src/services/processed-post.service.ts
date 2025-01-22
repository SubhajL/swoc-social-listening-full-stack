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
import { readPool } from '../lib/db.js';

// Comment out write operation interfaces since we don't need them now
/* interface BatchUpdateLocation {
  id: string;
  tumbon?: string;
  amphure?: string;
  province?: string;
}

interface BatchUpdateSensor {
  id: string;
  sensorId: string;
} */

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class ProcessedPostService {
  private transactionManager: TransactionManager;
  private batchProgressManager: BatchProgressManager;
  private io: Server;

  constructor(io: Server) {
    this.transactionManager = new TransactionManager(readPool);
    this.batchProgressManager = new BatchProgressManager();
    this.io = io;
  }

  private async executeQuery<T extends QueryResultRow>(
    query: string,
    params: any[],
    client: PoolType | TransactionClient = readPool
  ): Promise<T[]> {
    try {
      logger.debug('Executing SQL query:', {
        query,
        params,
        queryLength: query.length,
        paramCount: params.length
      });

      // Log each parameter with its position
      params.forEach((param, index) => {
        logger.debug(`Parameter ${index + 1}:`, {
          value: param,
          type: typeof param
        });
      });

      const result = await client.query<T>(query, params);
      logger.debug('Query result:', {
        rowCount: result.rowCount,
        fields: result.fields.map(f => f.name)
      });
      return result.rows;
    } catch (error) {
      const pgError = error as any;
      logger.error('SQL Error:', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          code: pgError.code,
          detail: pgError.detail,
          hint: pgError.hint,
          position: pgError.position,
          internalQuery: pgError.internalQuery,
          where: pgError.where,
          schema: pgError.schema,
          table: pgError.table,
          column: pgError.column,
          dataType: pgError.dataType,
          constraint: pgError.constraint,
          file: pgError.file,
          line: pgError.line,
          routine: pgError.routine
        } : error,
        query,
        params,
        queryLength: query.length
      });

      // Handle specific PostgreSQL error codes
      switch (pgError.code) {
        case '42501': // Permission denied
          throw new DatabaseError(
            'Permission denied for database operation. Please contact your administrator.',
            error
          );
        case '42P01': // Undefined table
          throw new DatabaseError(
            `Table "${pgError.table}" does not exist`,
            error
          );
        case '42703': // Undefined column
          throw new DatabaseError(
            `Column "${pgError.column}" does not exist`,
            error
          );
        case '28000': // Invalid authorization
          throw new DatabaseError(
            'Invalid database credentials',
            error
          );
        case '3D000': // Invalid database
          throw new DatabaseError(
            'Database does not exist',
            error
          );
        case '08006': // Connection failure
          throw new DatabaseError(
            'Failed to connect to database. Please try again later.',
            error
          );
        case '23505': // Unique violation
          throw new DatabaseError(
            'Duplicate key value violates unique constraint',
            error
          );
        case '23503': // Foreign key violation
          throw new DatabaseError(
            'Foreign key violation',
            error
          );
        default:
          throw new DatabaseError(
            'An unexpected database error occurred',
            error
          );
      }
    }
  }

  private toDTO(post: ProcessedPost): ProcessedPostDTO {
    return {
      processed_post_id: post.processed_post_id,
      text: post.text,
      category_name: post.category_name,
      sub1_category_name: post.sub1_category_name,
      profile_name: post.profile_name,
      post_date: post.post_date?.toISOString(),
      post_url: post.post_url,
      latitude: post.latitude,
      longitude: post.longitude,
      tumbon: post.tumbon,
      amphure: post.amphure,
      province: post.province
    };
  }

  async getUnprocessedPosts(): Promise<ProcessedPostDTO[]> {
    try {
      logger.info('Executing query to fetch recent posts');
      const result = await this.executeQuery<ProcessedPost>(
        `SELECT processed_post_id, text FROM public.processed_posts LIMIT 1`,
        []
      );

      logger.info(`Found ${result.length} posts`);
      return result.map(this.toDTO);
    } catch (error) {
      logger.error('Error in getUnprocessedPosts:', { error });
      throw error;
    }
  }

  async getPostById(id: string, client: PoolType | TransactionClient = readPool): Promise<ProcessedPostDTO> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        `SELECT 
          processed_post_id,
          text,
          category_name,
          sub1_category_name,
          profile_name,
          post_date,
          post_url,
          latitude,
          longitude,
          tumbon,
          amphure,
          province
        FROM processed_posts 
        WHERE processed_post_id = $1`,
        [id],
        client
      );

      if (result.length === 0) {
        throw new PostNotFoundError(id);
      }

      return this.toDTO(result[0]);
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
    const result = await this.executeQuery<ProcessedPost>(
      `SELECT 
        processed_post_id,
        text,
        category_name,
        sub1_category_name,
        profile_name,
        post_date,
        post_url,
        latitude,
        longitude,
        tumbon,
        amphure,
        province
      FROM processed_posts
      WHERE ST_DWithin(
        ST_MakePoint(longitude, latitude)::geography,
        ST_MakePoint($1, $2)::geography,
        $3 * 1000
      )`,
      [longitude, latitude, radiusKm]
    );
    
    return result.map(this.toDTO);
  }

  async getRecentPosts(minutes: number = 5): Promise<ProcessedPostDTO[]> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        `SELECT 
          processed_post_id,
          text,
          category_name,
          sub1_category_name,
          profile_name,
          post_date,
          post_url,
          latitude,
          longitude,
          tumbon,
          amphure,
          province
        FROM processed_posts 
        WHERE post_date >= NOW() - INTERVAL '$1 minutes'
        ORDER BY post_date DESC`,
        [minutes]
      );

      return result.map(this.toDTO);
    } catch (error) {
      logger.error('Error fetching recent posts:', error);
      throw new Error('Failed to fetch recent posts');
    }
  }

  // Comment out all write operations since we don't need them now
  /* async updateLocationDetails(...) {...}
  async updateNearestSensor(...) {...}
  async updatePostWithTransaction(...) {...}
  async batchUpdateLocation(...) {...}
  async batchUpdateSensors(...) {...}
  async batchUpdatePostsWithProgress(...) {...}
  async createPost(...) {...} */
} 