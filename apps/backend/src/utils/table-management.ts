import { Pool } from 'pg';
import { logger } from './logger';

/**
 * Enables or disables a table by renaming it with a prefix
 * @param pool - Database connection pool
 * @param tableName - Name of the table to enable/disable
 * @param enable - Whether to enable (true) or disable (false) the table
 */
export async function toggleTable(pool: Pool, tableName: string, enable: boolean): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if table exists
    const tableExists = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )`,
      [tableName]
    );

    if (!tableExists.rows[0].exists) {
      logger.warn(`Table ${tableName} does not exist, skipping toggle operation`, {
        component: 'TableManagement',
        operation: 'ToggleTable',
        data: { tableName, enable }
      });
      return;
    }

    // Check if table is already in desired state
    const disabledTableName = `disabled_${tableName}`;
    const isDisabled = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )`,
      [disabledTableName]
    );

    if (enable && !isDisabled.rows[0].exists) {
      logger.info(`Table ${tableName} is already enabled`, {
        component: 'TableManagement',
        operation: 'ToggleTable',
        data: { tableName }
      });
      return;
    }

    if (!enable && isDisabled.rows[0].exists) {
      logger.info(`Table ${tableName} is already disabled`, {
        component: 'TableManagement',
        operation: 'ToggleTable',
        data: { tableName }
      });
      return;
    }

    // Perform the toggle operation
    if (enable) {
      await client.query(`ALTER TABLE ${disabledTableName} RENAME TO ${tableName}`);
      logger.info(`Enabled table ${tableName}`, {
        component: 'TableManagement',
        operation: 'ToggleTable',
        data: { tableName }
      });
    } else {
      await client.query(`ALTER TABLE ${tableName} RENAME TO ${disabledTableName}`);
      logger.info(`Disabled table ${tableName}`, {
        component: 'TableManagement',
        operation: 'ToggleTable',
        data: { tableName }
      });
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Failed to toggle table ${tableName}`, {
      component: 'TableManagement',
      operation: 'ToggleTable',
      error: error instanceof Error ? error.message : String(error),
      data: { tableName, enable }
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Enables multiple tables
 * @param pool - Database connection pool
 * @param tableNames - Array of table names to enable
 */
export async function enableTables(pool: Pool, tableNames: string[]): Promise<void> {
  for (const tableName of tableNames) {
    await toggleTable(pool, tableName, true);
  }
}

/**
 * Disables multiple tables
 * @param pool - Database connection pool
 * @param tableNames - Array of table names to disable
 */
export async function disableTables(pool: Pool, tableNames: string[]): Promise<void> {
  for (const tableName of tableNames) {
    await toggleTable(pool, tableName, false);
  }
} 