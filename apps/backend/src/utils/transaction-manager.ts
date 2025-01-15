import { Pool, PoolClient } from 'pg';
import { logger } from './logger.js';
import { DatabaseError } from '../errors/index.js';

export interface TransactionClient extends PoolClient {
  transactionDepth: number;
}

export class TransactionManager {
  constructor(private readonly pool: Pool) {}

  async withTransaction<T>(
    operation: (client: TransactionClient) => Promise<T>,
    client?: TransactionClient
  ): Promise<T> {
    const shouldManageClient = !client;
    const managedClient = client || (await this.pool.connect() as TransactionClient);
    
    if (!managedClient.transactionDepth) {
      managedClient.transactionDepth = 0;
    }

    try {
      if (managedClient.transactionDepth === 0) {
        await managedClient.query('BEGIN');
      }
      managedClient.transactionDepth++;

      const result = await operation(managedClient);

      if (managedClient.transactionDepth === 1) {
        await managedClient.query('COMMIT');
      }
      
      return result;
    } catch (error) {
      if (managedClient.transactionDepth === 1) {
        await managedClient.query('ROLLBACK');
      }
      throw new DatabaseError('Transaction failed', error);
    } finally {
      managedClient.transactionDepth--;
      if (shouldManageClient && managedClient.transactionDepth === 0) {
        managedClient.release();
      }
    }
  }
} 