// Database wrapper with enhanced logging
import pg from 'pg';
const { Pool } = pg;

/**
 * Creates a database pool with enhanced logging capabilities
 * @param {Object} logger - Enhanced logger instance
 * @param {Object} config - Database configuration (optional, uses env vars if not provided)
 * @returns {Object} Database pool with enhanced query methods
 */
export const createLoggingDbPool = (logger, config = null) => {
  // Create pool using provided config or environment variables
  const pool = new Pool(config);
  
  // Log pool creation
  logger.info('Database pool created', {
    component: 'Database',
    operation: 'PoolCreate',
    data: {
      host: config?.host || process.env.DB_HOST || 'default_host',
      port: config?.port || process.env.DB_PORT || '5432',
      database: config?.database || process.env.DB_NAME || 'default_db',
      user: config?.user || process.env.DB_USER || 'default_user',
      max: config?.max || process.env.DB_POOL_MAX || '10'
    }
  });
  
  // Log pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', {
      component: 'Database',
      operation: 'PoolError',
      error: err
    });
  });
  
  // Database operations that should be logged
  const enhancedPool = {
    /**
     * Enhanced query method with detailed logging
     */
    query: async (text, params) => {
      logger.debug('Executing database query', {
        component: 'Database',
        operation: 'Query',
        data: {
          query: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''),
          paramCount: params?.length || 0
        }
      });
      
      const startTime = Date.now();
      
      try {
        const result = await pool.query(text, params);
        
        const duration = Date.now() - startTime;
        logger.debug('Database query completed', {
          component: 'Database',
          operation: 'QueryResult',
          duration,
          data: {
            rowCount: result.rowCount,
            resultSize: result.rows?.length || 0
          }
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error('Database query failed', {
          component: 'Database',
          operation: 'QueryError',
          duration,
          data: {
            query: text.substring(0, 500),
            paramCount: params?.length || 0
          },
          error
        });
        
        throw error;
      }
    },
    
    /**
     * Begin a transaction with logging
     */
    beginTransaction: async () => {
      const client = await pool.connect();
      
      logger.debug('Beginning database transaction', {
        component: 'Database',
        operation: 'BeginTransaction'
      });
      
      try {
        await client.query('BEGIN');
        
        // Create a transaction object with methods that use this client
        const transaction = {
          // Enhanced query method that uses the transaction client
          query: async (text, params) => {
            logger.debug('Executing query in transaction', {
              component: 'Database',
              operation: 'TransactionQuery',
              data: {
                query: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
                paramCount: params?.length || 0
              }
            });
            
            const startTime = Date.now();
            
            try {
              const result = await client.query(text, params);
              
              const duration = Date.now() - startTime;
              logger.debug('Transaction query completed', {
                component: 'Database',
                operation: 'TransactionQueryResult',
                duration,
                data: {
                  rowCount: result.rowCount,
                  resultSize: result.rows?.length || 0
                }
              });
              
              return result;
            } catch (error) {
              const duration = Date.now() - startTime;
              
              logger.error('Transaction query failed', {
                component: 'Database',
                operation: 'TransactionQueryError',
                duration,
                data: {
                  query: text.substring(0, 500),
                  paramCount: params?.length || 0
                },
                error
              });
              
              throw error;
            }
          },
          
          // Commit the transaction
          commit: async () => {
            logger.debug('Committing transaction', {
              component: 'Database',
              operation: 'CommitTransaction'
            });
            
            const startTime = Date.now();
            
            try {
              await client.query('COMMIT');
              
              const duration = Date.now() - startTime;
              logger.info('Transaction committed successfully', {
                component: 'Database',
                operation: 'TransactionCommit',
                duration
              });
            } catch (error) {
              logger.error('Failed to commit transaction', {
                component: 'Database',
                operation: 'CommitError',
                error
              });
              
              throw error;
            } finally {
              client.release();
            }
          },
          
          // Rollback the transaction
          rollback: async () => {
            logger.debug('Rolling back transaction', {
              component: 'Database',
              operation: 'RollbackTransaction'
            });
            
            try {
              await client.query('ROLLBACK');
              
              logger.info('Transaction rolled back successfully', {
                component: 'Database',
                operation: 'TransactionRollback'
              });
            } catch (error) {
              logger.error('Failed to rollback transaction', {
                component: 'Database',
                operation: 'RollbackError',
                error
              });
            } finally {
              client.release();
            }
          }
        };
        
        return transaction;
      } catch (error) {
        client.release();
        logger.error('Failed to begin transaction', {
          component: 'Database',
          operation: 'BeginTransactionError',
          error
        });
        throw error;
      }
    },
    
    /**
     * Execute a callback within a transaction and handle commit/rollback
     */
    withTransaction: async (callback) => {
      const transaction = await enhancedPool.beginTransaction();
      
      try {
        const result = await callback(transaction);
        await transaction.commit();
        return result;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
    
    /**
     * End the pool with logging
     */
    end: async () => {
      logger.info('Closing database pool', {
        component: 'Database',
        operation: 'PoolEnd'
      });
      
      try {
        await pool.end();
        logger.info('Database pool closed successfully', {
          component: 'Database',
          operation: 'PoolEndSuccess'
        });
      } catch (error) {
        logger.error('Error closing database pool', {
          component: 'Database',
          operation: 'PoolEndError',
          error
        });
        throw error;
      }
    }
  };
  
  return enhancedPool;
}; 