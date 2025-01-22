import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../errors/index.js';

interface TablePermission {
  table: string;
  permissions: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
}

export class DatabaseHealthService {
  constructor(private readonly pool: Pool) {}

  async checkConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT current_database(), current_user');
      client.release();
      
      logger.info('Database connection successful:', {
        database: result.rows[0].current_database,
        user: result.rows[0].current_user
      });
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw new DatabaseError('Failed to connect to database', error);
    }
  }

  async checkTablePermissions(requiredPermissions: TablePermission[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      for (const { table, permissions } of requiredPermissions) {
        // Check if table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);

        if (!tableExists.rows[0].exists) {
          throw new DatabaseError(`Table ${table} does not exist`);
        }

        // Check permissions
        const permissionQuery = await client.query(`
          SELECT grantee, privilege_type 
          FROM information_schema.role_table_grants 
          WHERE table_name = $1 
          AND grantee = current_user
        `, [table]);

        const grantedPermissions = new Set(
          permissionQuery.rows.map(row => row.privilege_type)
        );

        const missingPermissions = permissions.filter(
          perm => !grantedPermissions.has(perm)
        );

        if (missingPermissions.length > 0) {
          throw new DatabaseError(
            `Missing required permissions on table ${table}: ${missingPermissions.join(', ')}`
          );
        }

        logger.info(`Verified permissions for table ${table}:`, {
          required: permissions,
          granted: Array.from(grantedPermissions)
        });
      }
    } finally {
      client.release();
    }
  }

  async validateDatabaseSetup(): Promise<void> {
    try {
      // Check basic connection
      await this.checkConnection();

      // Check permissions for critical tables
      await this.checkTablePermissions([
        {
          table: 'processed_posts',
          permissions: ['SELECT']
        }
        // Add more tables as needed
      ]);

      logger.info('Database setup validation completed successfully');
    } catch (error) {
      logger.error('Database setup validation failed:', error);
      throw error;
    }
  }
} 