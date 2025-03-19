import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

// Get the directory name using ES module approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the reservoir data sync script
 */
export function startReservoirCron(): void {
  logger.info('[ReservoirCron] Starting reservoir cron service');
  
  // Path to the reservoir-sync.mjs script
  const scriptPath = path.resolve(__dirname, './reservoir-sync.mjs');
  
  // Execute the script
  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      logger.error('[ReservoirCron] Error starting reservoir cron service', {
        error: error.message,
        stderr
      });
      return;
    }
    
    if (stderr) {
      logger.warn('[ReservoirCron] Reservoir cron service produced stderr output', {
        stderr
      });
    }
    
    logger.info('[ReservoirCron] Reservoir cron service started successfully', {
      stdout
    });
  });
} 