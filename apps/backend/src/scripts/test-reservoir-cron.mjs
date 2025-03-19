import { fileURLToPath } from 'url';
import path from 'path';
import { exec } from 'child_process';
import { logger } from '../utils/logger.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cronScriptPath = path.resolve(__dirname, '../cron/reservoir-sync.mjs');

logger.info('[TestReservoirCron] Starting test of reservoir cron job');
logger.info(`[TestReservoirCron] Cron script path: ${cronScriptPath}`);

// Execute the cron script
exec(`node ${cronScriptPath}`, (error, stdout, stderr) => {
  if (error) {
    logger.error('[TestReservoirCron] Error executing reservoir cron script', {
      error: error.message,
      stderr
    });
    process.exit(1);
  }
  
  if (stderr) {
    logger.warn('[TestReservoirCron] Reservoir cron script produced stderr output', {
      stderr
    });
  }
  
  logger.info('[TestReservoirCron] Reservoir cron script executed successfully', {
    stdout
  });
  
  logger.info('[TestReservoirCron] Test completed successfully');
  process.exit(0);
}); 