import { Sequelize } from 'sequelize';
import { QueryInterface } from 'sequelize';
import { logger } from '../utils/logger';
import { up as createApprovalRecords } from '../migrations/20240302_create_approval_records';
import { up as alterTelemetryReportColumns } from '../migrations/20240329_alter_telemetry_report_columns';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a Sequelize instance
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  logging: (msg: string) => logger.debug(msg),
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function runMigrations() {
  try {
    // Authenticate with the database
    await sequelize.authenticate();
    logger.info('Successfully connected to PostgreSQL database');
    
    // Get the QueryInterface
    const queryInterface: QueryInterface = sequelize.getQueryInterface();
    
    // Run migrations
    logger.info('Running migrations...');
    
    // Create approval_records table
    await createApprovalRecords(queryInterface);
    logger.info('Created approval_records table');

    // Alter telemetry report columns
    await alterTelemetryReportColumns(queryInterface);
    logger.info('Altered telemetry report columns');
    
    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations(); 