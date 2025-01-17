import pkg from 'pg';
import type { QueryResultRow } from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;
import { ProcessedPost } from '../types/processed-post.js';
import { ProcessedPostDTO } from '../types/processed-post.dto.js';
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

interface BatchUpdateStatus {
  id: string;
  status: ProcessedPost['status'];
}

interface BatchUpdateLocation {
  id: string;
  tumbon?: string;
  amphure?: string;
  province?: string;
}

interface BatchUpdateSensor {
  id: string;
  sensorId: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class ProcessedPostService {
  private transactionManager: TransactionManager;
  private batchProgressManager: BatchProgressManager;
  private io: Server;

  constructor(
    private readonly pool: PoolType,
    io: Server
  ) {
    this.transactionManager = new TransactionManager(pool);
    this.batchProgressManager = new BatchProgressManager();
    this.io = io;
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
      ...post,
      created_at: post.created_at.toISOString(),
      updated_at: post.updated_at.toISOString()
    };
  }

  async createPost(data: Omit<ProcessedPost, 'processed_post_id' | 'created_at' | 'updated_at'>): Promise<ProcessedPostDTO> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        `INSERT INTO processed_posts (
          processed_post_id,
          category_name,
          sub1_category_name,
          location,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
        [
          randomUUID(),
          data.category_name,
          data.sub1_category_name,
          data.location,
          data.status
        ]
      );

      const post = result[0];
      this.io.to('posts').emit('post:create', post);
      return this.toDTO(post);
    } catch (error) {
      logger.error('Error creating post:', error);
      throw new DatabaseError('Failed to create post', error);
    }
  }

  async getUnprocessedPosts(): Promise<ProcessedPostDTO[]> {
    try {
      const posts = await this.executeQuery<ProcessedPost>(
        'SELECT * FROM processed_posts WHERE status = $1',
        ['unprocessed']
      );

      return posts.map(this.toDTO);
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

  async getPostsByLocation(latitude: number, longitude: number, radiusKm: number, client: PoolType | TransactionClient = this.pool): Promise<ProcessedPostDTO[]> {
    try {
      const result = await this.executeQuery<ProcessedPost>(`
        SELECT *, 
        ( 6371 * acos( cos( radians($1) ) 
          * cos( radians(location->>'latitude') ) 
          * cos( radians(location->>'longitude') - radians($2) ) 
          + sin( radians($1) ) 
          * sin( radians(location->>'latitude') ) ) AS distance 
        FROM processed_posts 
        HAVING distance < $3 
        ORDER BY distance;
      `, [latitude, longitude, radiusKm], client);

      return result.map(this.toDTO);
    } catch (error) {
      logger.error('Error fetching posts by location:', error);
      throw new Error('Failed to fetch posts by location');
    }
  }

  async updatePostStatus(id: string, status: ProcessedPost['status'], client: PoolType | TransactionClient = this.pool): Promise<ProcessedPostDTO | null> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        'UPDATE processed_posts SET status = $1, updated_at = NOW() WHERE processed_post_id = $2 RETURNING *',
        [status, id],
        client
      );

      if (result.length === 0) {
        return null;
      }

      const post = result[0];
      this.io.to('posts').emit('post:update', post);
      return this.toDTO(post);
    } catch (error) {
      logger.error(`Error updating post status for id ${id}:`, error);
      throw new Error('Failed to update post status');
    }
  }

  async updateLocationDetails(
    id: string,
    tumbon?: string,
    amphure?: string,
    province?: string,
    client: PoolType | TransactionClient = this.pool
  ): Promise<ProcessedPostDTO | null> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        `UPDATE processed_posts 
         SET location = jsonb_set(
           jsonb_set(
             jsonb_set(
               location::jsonb,
               '{tumbon}',
               $2::jsonb
             ),
             '{amphure}',
             $3::jsonb
           ),
           '{province}',
           $4::jsonb
         ),
         updated_at = NOW()
         WHERE processed_post_id = $1
         RETURNING *`,
        [id, JSON.stringify(tumbon), JSON.stringify(amphure), JSON.stringify(province)],
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

  async updateNearestSensor(id: string, sensorId: string, client: PoolType | TransactionClient = this.pool): Promise<ProcessedPostDTO | null> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        'UPDATE processed_posts SET nearest_sensor_id = $1, updated_at = NOW() WHERE processed_post_id = $2 RETURNING *',
        [sensorId, id],
        client
      );

      if (result.length === 0) {
        return null;
      }

      const post = result[0];
      return this.toDTO(post);
    } catch (error) {
      logger.error(`Error updating nearest sensor for post ${id}:`, error);
      throw new Error('Failed to update nearest sensor');
    }
  }

  async getRecentPosts(minutes: number = 5, client: PoolType | TransactionClient = this.pool): Promise<ProcessedPostDTO[]> {
    try {
      const result = await this.executeQuery<ProcessedPost>(
        'SELECT * FROM processed_posts WHERE created_at >= NOW() - INTERVAL \'$1 minutes\' ORDER BY created_at DESC',
        [minutes],
        client
      );

      return result.map(this.toDTO);
    } catch (error) {
      logger.error('Error fetching recent posts:', error);
      throw new Error('Failed to fetch recent posts');
    }
  }

  async updatePostWithTransaction(
    id: string,
    updates: {
      status?: ProcessedPost['status'];
      location?: {
        tumbon?: string;
        amphure?: string;
        province?: string;
      };
      nearest_sensor_id?: string;
    },
    client: PoolType | TransactionClient = this.pool
  ): Promise<ProcessedPostDTO> {
    return this.transactionManager.withTransaction(async (client) => {
      // First verify the post exists
      const post = await this.getPostById(id, client);
      
      if (updates.status) {
        await this.updatePostStatus(id, updates.status, client);
      }

      if (updates.location) {
        await this.updateLocationDetails(
          id,
          updates.location.tumbon,
          updates.location.amphure,
          updates.location.province,
          client
        );
      }

      if (updates.nearest_sensor_id) {
        await this.updateNearestSensor(id, updates.nearest_sensor_id, client);
      }

      return this.getPostById(id, client);
    });
  }

  async batchUpdateStatus(updates: BatchUpdateStatus[]): Promise<ProcessedPostDTO[]> {
    return this.transactionManager.withTransaction(async (client) => {
      try {
        const result = await this.executeQuery<ProcessedPost>(`
          UPDATE processed_posts 
          SET 
            status = u.status,
            updated_at = NOW()
          FROM (
            SELECT UNNEST($1::uuid[]) as id, 
                   UNNEST($2::text[]) as status
          ) u 
          WHERE processed_post_id = u.id
          RETURNING *
        `, [
          updates.map(u => u.id),
          updates.map(u => u.status)
        ], client);

        return result.map(this.toDTO);
      } catch (error) {
        logger.error('Batch status update failed:', error);
        throw new DatabaseError('Failed to update post statuses', error);
      }
    });
  }

  async batchUpdateLocation(updates: BatchUpdateLocation[]): Promise<ProcessedPostDTO[]> {
    return this.transactionManager.withTransaction(async (client) => {
      try {
        const result = await this.executeQuery<ProcessedPost>(`
          UPDATE processed_posts 
          SET 
            location = jsonb_set(
              jsonb_set(
                jsonb_set(
                  location::jsonb,
                  '{tumbon}',
                  COALESCE(u.tumbon::jsonb, location->'tumbon')
                ),
                '{amphure}',
                COALESCE(u.amphure::jsonb, location->'amphure')
              ),
              '{province}',
              COALESCE(u.province::jsonb, location->'province')
            ),
            updated_at = NOW()
          FROM (
            SELECT 
              UNNEST($1::uuid[]) as id,
              UNNEST($2::text[]) as tumbon,
              UNNEST($3::text[]) as amphure,
              UNNEST($4::text[]) as province
          ) u 
          WHERE processed_post_id = u.id
          RETURNING *
        `, [
          updates.map(u => u.id),
          updates.map(u => u.tumbon),
          updates.map(u => u.amphure),
          updates.map(u => u.province)
        ], client);

        return result.map(this.toDTO);
      } catch (error) {
        logger.error('Batch location update failed:', error);
        throw new DatabaseError('Failed to update post locations', error);
      }
    });
  }

  async batchUpdateSensors(updates: BatchUpdateSensor[]): Promise<ProcessedPostDTO[]> {
    return this.transactionManager.withTransaction(async (client) => {
      try {
        const result = await this.executeQuery<ProcessedPost>(`
          UPDATE processed_posts 
          SET 
            nearest_sensor_id = u.sensor_id,
            updated_at = NOW()
          FROM (
            SELECT UNNEST($1::uuid[]) as id, 
                   UNNEST($2::text[]) as sensor_id
          ) u 
          WHERE processed_post_id = u.id
          RETURNING *
        `, [
          updates.map(u => u.id),
          updates.map(u => u.sensorId)
        ], client);

        return result.map(this.toDTO);
      } catch (error) {
        logger.error('Batch sensor update failed:', error);
        throw new DatabaseError('Failed to update post sensors', error);
      }
    });
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES,
    delay: number = RETRY_DELAY
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(operation, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async batchUpdatePostsWithProgress(
    updates: Array<{
      id: string;
      status?: ProcessedPost['status'];
      location?: {
        tumbon?: string;
        amphure?: string;
        province?: string;
      };
      nearest_sensor_id?: string;
    }>
  ): Promise<BatchOperation> {
    const batchId = randomUUID();
    const batch = this.batchProgressManager.createBatch(batchId, updates.length);

    // Process in chunks to avoid overwhelming the database
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < updates.length; i += chunkSize) {
      chunks.push(updates.slice(i, i + chunkSize));
    }

    // Process each chunk
    for (const chunk of chunks) {
      await this.transactionManager.withTransaction(async (client) => {
        const promises = chunk.map(async (update) => {
          try {
            batch.progress.inProgress++;
            
            await this.withRetry(async () => {
              if (update.status) {
                await this.updatePostStatus(update.id, update.status, client);
              }
              if (update.location) {
                await this.updateLocationDetails(
                  update.id,
                  update.location.tumbon,
                  update.location.amphure,
                  update.location.province,
                  client
                );
              }
              if (update.nearest_sensor_id) {
                await this.updateNearestSensor(update.id, update.nearest_sensor_id, client);
              }
            });

            this.batchProgressManager.markCompleted(batchId, update.id);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error 
              ? error.message 
              : 'Unknown error occurred';
            this.batchProgressManager.addError(batchId, update.id, errorMessage);
          }
        });

        await Promise.all(promises);
      });
    }

    // Schedule cleanup after 1 hour
    setTimeout(() => {
      this.batchProgressManager.cleanupBatch(batchId);
    }, 60 * 60 * 1000);

    this.io.to('posts').emit('batch:progress', batch.progress);
    return batch;
  }

  getBatchProgress(batchId: string): BatchProgress | undefined {
    return this.batchProgressManager.getBatchProgress(batchId);
  }
} 