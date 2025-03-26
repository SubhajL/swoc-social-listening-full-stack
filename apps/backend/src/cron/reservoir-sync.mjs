import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

/**
 * DEPRECATED SCHEDULER - DO NOT USE
 * 
 * This scheduler is deprecated and has been replaced by the consolidated scheduler in:
 * apps/backend/src/scripts/schedule-data-sync.mjs
 * 
 * Please use the consolidated scheduler for all data synchronization tasks.
 * This file is kept for reference only and the scheduling functionality has been disabled.
 */

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '../scripts/sync-reservoir-data.mjs');

// Log deprecation warning
logger.warn('[ReservoirCron] This scheduler is DEPRECATED. Use schedule-data-sync.mjs instead.', {
  component: 'Scheduler',
  operation: 'DeprecationWarning',
  data: {
    deprecatedFile: __filename,
    recommendedFile: '../scripts/schedule-data-sync.mjs'
  }
});

/**
 * Executes the reservoir data sync script
 */
function runReservoirSync() {
  logger.info('[ReservoirCron] Starting scheduled reservoir data sync');
  
  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      logger.error('[ReservoirCron] Error executing reservoir sync script', {
        error: error.message,
        stderr
      });
      return;
    }
    
    if (stderr) {
      logger.warn('[ReservoirCron] Reservoir sync script produced stderr output', {
        stderr
      });
    }
    
    logger.info('[ReservoirCron] Reservoir sync script executed successfully', {
      stdout
    });
  });
}

// DEPRECATED SCHEDULER - Scheduling code is commented out
/*
// Schedule the cron job to run at 6:00 AM every day
// Cron format: Minute Hour Day Month Day-of-week
// 0 6 * * * = At 6:00 AM every day
cron.schedule('0 6 * * *', () => {
  logger.info('[ReservoirCron] Running scheduled reservoir data sync at 6:00 AM');
  runReservoirSync();
});

// Log that the cron job has been scheduled
logger.info('[ReservoirCron] Reservoir data sync scheduled to run at 6:00 AM daily');
*/

// Export the function for manual execution if needed
export { runReservoirSync }; 