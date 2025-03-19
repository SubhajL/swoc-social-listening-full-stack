import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '../scripts/sync-reservoir-data.mjs');

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

// Schedule the cron job to run at 6:00 AM every day
// Cron format: Minute Hour Day Month Day-of-week
// 0 6 * * * = At 6:00 AM every day
cron.schedule('0 6 * * *', () => {
  logger.info('[ReservoirCron] Running scheduled reservoir data sync at 6:00 AM');
  runReservoirSync();
});

// Log that the cron job has been scheduled
logger.info('[ReservoirCron] Reservoir data sync scheduled to run at 6:00 AM daily');

// Export the function for manual execution if needed
export { runReservoirSync }; 