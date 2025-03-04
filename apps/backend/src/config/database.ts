import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';
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

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Successfully connected to PostgreSQL database with Sequelize');
  } catch (error) {
    logger.error('Error connecting to the database with Sequelize', error);
    process.exit(-1);
  }
}

// Call the test function
testConnection();

export default sequelize; 