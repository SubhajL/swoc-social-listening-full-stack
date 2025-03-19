import schedule from 'node-schedule';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const thaiWaterScriptPath = path.join(__dirname, 'thaiwater-sync.mjs');
const tmdScriptPath = path.join(__dirname, 'sync-tmd-data.mjs');

// Schedule jobs to run at 8:00 AM every day
// The cron expression "0 8 * * *" means:
// - 0 seconds
// - 8 hours (8 AM)
// - Every day of the month
// - Every month
// - Every day of the week

// ThaiWater data sync job
const thaiWaterJob = schedule.scheduleJob('0 8 * * *', function() {
  const timestamp = new Date().toISOString();
  logger.info(`[RainfallScheduler] Starting scheduled ThaiWater data sync at ${timestamp}`);
  
  // Set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow self-signed certificates
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' };
  
  // Execute the sync script
  exec(`node ${thaiWaterScriptPath}`, { env }, (error, stdout, stderr) => {
    if (error) {
      logger.error('[RainfallScheduler] Error running ThaiWater sync script', {
        error: error.message,
        stderr
      });
      return;
    }
    
    if (stderr) {
      logger.warn('[RainfallScheduler] ThaiWater script produced stderr output', {
        stderr
      });
    }
    
    logger.info('[RainfallScheduler] ThaiWater sync script completed successfully', {
      stdout
    });
  });
});

// TMD data sync job - schedule to run 15 minutes after ThaiWater sync
const tmdJob = schedule.scheduleJob('15 8 * * *', function() {
  const timestamp = new Date().toISOString();
  logger.info(`[RainfallScheduler] Starting scheduled TMD data sync at ${timestamp}`);
  
  // Set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow self-signed certificates
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' };
  
  // Execute the sync script
  exec(`node ${tmdScriptPath}`, { env }, (error, stdout, stderr) => {
    if (error) {
      logger.error('[RainfallScheduler] Error running TMD sync script', {
        error: error.message,
        stderr
      });
      return;
    }
    
    if (stderr) {
      logger.warn('[RainfallScheduler] TMD script produced stderr output', {
        stderr
      });
    }
    
    logger.info('[RainfallScheduler] TMD sync script completed successfully', {
      stdout
    });
  });
});

logger.info('[RainfallScheduler] Scheduler started successfully');
logger.info('[RainfallScheduler] Next ThaiWater data sync scheduled for', thaiWaterJob.nextInvocation().toDate());
logger.info('[RainfallScheduler] Next TMD data sync scheduled for', tmdJob.nextInvocation().toDate());

// Keep the script running
process.on('SIGINT', function() {
  thaiWaterJob.cancel();
  tmdJob.cancel();
  logger.info('[RainfallScheduler] Scheduler stopped');
  process.exit(0);
}); 