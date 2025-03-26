// Script to set up scheduled tasks for syncing ThaiWater data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import winston from 'winston';

const { createLogger, format, transports } = winston;

// Load environment variables
dotenv.config();

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the crontab file
const CRONTAB_FILE = path.join(__dirname, '..', '..', 'crontab');

// Cron schedule for HII data sync (every hour at minute 40)
const HII_CRON_SCHEDULE = '40 * * * *';

// Cron schedule for TMD data sync (every hour at minute 55)
const TMD_CRON_SCHEDULE = '55 * * * *';

// Get the absolute path to the scripts
const HII_SCRIPT_PATH = path.resolve(__dirname, 'insert-thaiwater-rainfall-data.mjs');
const TMD_SCRIPT_PATH = path.resolve(__dirname, 'sync-tmd-data.mjs');

// Get the absolute path to the log directory
const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');

// Create the log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  logger.info(`Created log directory: ${LOG_DIR}`);
}

// Generate the crontab content
const generateCrontabContent = () => {
  const nodeExecutable = process.execPath;
  
  // Check if DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL is not defined in environment variables. The cron jobs may fail to connect to the database.');
  }
  
  // Use the correct DATABASE_URL from the .env file
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://swoc-uat-gis-ssl-user:4c0b269f763d4ce1d1d59ba0e2ef1f9c@ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com:15435/swoc-uat-gis-ssl';
  
  return `# ThaiWater data sync cron jobs
# Generated on ${new Date().toISOString()}

# Environment variables
PATH=${process.env.PATH}
NODE_ENV=${process.env.NODE_ENV || 'production'}
DATABASE_URL=${databaseUrl}

# HII data sync - Every hour at minute 40
${HII_CRON_SCHEDULE} ${nodeExecutable} ${HII_SCRIPT_PATH} >> ${path.join(LOG_DIR, 'hii-sync.log')} 2>&1

# TMD data sync - Every hour at minute 55
${TMD_CRON_SCHEDULE} ${nodeExecutable} ${TMD_SCRIPT_PATH} >> ${path.join(LOG_DIR, 'tmd-sync.log')} 2>&1
`;
};

// Write the crontab file
const writeCrontabFile = (content) => {
  try {
    fs.writeFileSync(CRONTAB_FILE, content);
    logger.info(`Crontab file written to: ${CRONTAB_FILE}`);
    return true;
  } catch (error) {
    logger.error('Error writing crontab file', {
      error: error instanceof Error ? error.message : String(error),
      path: CRONTAB_FILE
    });
    return false;
  }
};

// Install the crontab
const installCrontab = async () => {
  try {
    const { execSync } = await import('child_process');
    execSync(`crontab ${CRONTAB_FILE}`);
    logger.info('Crontab installed successfully');
    return true;
  } catch (error) {
    logger.error('Error installing crontab', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
};

// Main function
const setupCron = async () => {
  logger.info('Setting up ThaiWater cron jobs');
  
  // Generate crontab content
  const crontabContent = generateCrontabContent();
  
  // Write crontab file
  if (!writeCrontabFile(crontabContent)) {
    logger.error('Failed to set up cron jobs');
    process.exit(1);
  }
  
  // Print instructions
  logger.info('Crontab file created successfully');
  logger.info('To install the crontab, run:');
  logger.info(`crontab ${CRONTAB_FILE}`);
  
  // Attempt to install the crontab if running with --install flag
  if (process.argv.includes('--install')) {
    if (await installCrontab()) {
      logger.info('Cron jobs installed successfully');
    } else {
      logger.error('Failed to install cron jobs');
      process.exit(1);
    }
  }
  
  logger.info('Setup complete');
};

// Run the setup
setupCron().catch(error => {
  logger.error('Error in setup', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}); 