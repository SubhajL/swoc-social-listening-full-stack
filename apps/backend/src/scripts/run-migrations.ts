import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from '../config/database';
import path from 'path';
import { logger } from '../utils/logger';
import { Sequelize, QueryInterface } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

interface MigrationContext {
  queryInterface: QueryInterface;
  sequelize: Sequelize;
}

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create an Umzug instance for migrations
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.ts'),
    resolve: async ({ name, path, context }: { name: string; path?: string; context: MigrationContext }) => {
      // Load the migration file using dynamic import
      const migration = path ? await import(path) : null;
      if (!migration) {
        throw new Error(`Could not load migration from ${path}`);
      }
      
      return {
        name,
        up: async () => migration.up(context.queryInterface, context.sequelize),
        down: async () => migration.down(context.queryInterface, context.sequelize),
      };
    },
  },
  context: {
    queryInterface: sequelize.getQueryInterface(),
    sequelize
  },
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// Run migrations
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    const migrations = await umzug.up();
    logger.info(`Executed ${migrations.length} migrations`);
    
    if (migrations.length > 0) {
      logger.info('Migrations executed:');
      migrations.forEach((migration: { name: string }) => {
        logger.info(`- ${migration.name}`);
      });
    } else {
      logger.info('No pending migrations to execute');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the function
runMigrations(); 