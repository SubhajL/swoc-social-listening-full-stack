import pkg from 'pg';
import type { PoolClient } from 'pg';
type PoolType = InstanceType<typeof Pool>;
const { Pool } = pkg;
import { logger } from './logger.js';

export class TransactionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TransactionError';
  }
}

export interface TransactionClient extends PoolClient {
  transactionDepth: number;
}

export async function withTransaction<T>(
  pool: PoolType,
  operation: (client: TransactionClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect() as TransactionClient;
  client.transactionDepth = 0;

  try {
    await client.query('BEGIN');
    client.transactionDepth++;
    
    const result = await operation(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    logger.error('Transaction failed:', error);
    await client.query('ROLLBACK');
    throw new TransactionError('Transaction failed', error);
  } finally {
    client.transactionDepth--;
    if (client.transactionDepth === 0) {
      client.release();
    }
  }
} 