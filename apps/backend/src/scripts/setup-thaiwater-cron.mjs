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

// Cron schedule for HII data sync (daily at 12:00 UTC)
const HII_CRON_SCHEDULE = '0 12 * * *';

// Cron schedule for TMD data sync (daily at 12:30 UTC)
const TMD_CRON_SCHEDULE = '30 12 * * *';

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
  
  return `# ThaiWater data sync cron jobs
# Generated on ${new Date().toISOString()}

# Environment variables
PATH=${process.env.PATH}
NODE_ENV=${process.env.NODE_ENV || 'production'}
DATABASE_URL=${process.env.DATABASE_URL}

# HII data sync - Daily at 12:00 UTC
${HII_CRON_SCHEDULE} ${nodeExecutable} ${HII_SCRIPT_PATH} >> ${path.join(LOG_DIR, 'hii-sync.log')} 2>&1

# TMD data sync - Daily at 12:30 UTC
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
const installCrontab = () => {
  try {
    const { execSync } = require('child_process');
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
const setupCron = () => {
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
    if (installCrontab()) {
      logger.info('Cron jobs installed successfully');
    } else {
      logger.error('Failed to install cron jobs');
      process.exit(1);
    }
  }
  
  logger.info('Setup complete');
};

// Run the setup
setupCron(); 