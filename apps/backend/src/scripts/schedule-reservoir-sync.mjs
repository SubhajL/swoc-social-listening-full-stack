import schedule from 'node-schedule';
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

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, 'sync-reservoir-data.mjs');

// Log deprecation warning
logger.warn('[ReservoirScheduler] This scheduler is DEPRECATED. Use schedule-data-sync.mjs instead.', {
  component: 'Scheduler',
  operation: 'DeprecationWarning',
  data: {
    deprecatedFile: __filename,
    recommendedFile: 'schedule-data-sync.mjs'
  }
});

// DEPRECATED SCHEDULER - Scheduling code is commented out
/*
// Schedule job to run at 9:00 AM every day
// The cron expression "0 9 * * *" means:
// - 0 seconds
// - 9 hours (9 AM)
// - Every day of the month
// - Every month
// - Every day of the week
const job = schedule.scheduleJob('0 9 * * *', function() {
  const timestamp = new Date().toISOString();
  logger.info(`[ReservoirScheduler] Starting scheduled reservoir data sync at ${timestamp}`);
  
  // Set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow self-signed certificates
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' };
  
  // Execute the sync script
  exec(`node ${scriptPath}`, { env }, (error, stdout, stderr) => {
    if (error) {
      logger.error('[ReservoirScheduler] Error running sync script', {
        error: error.message,
        stderr
      });
      return;
    }
    
    if (stderr) {
      logger.warn('[ReservoirScheduler] Script produced stderr output', {
        stderr
      });
    }
    
    logger.info('[ReservoirScheduler] Sync script completed successfully', {
      stdout
    });
  });
});

logger.info('[ReservoirScheduler] Scheduler started successfully');
logger.info('[ReservoirScheduler] Next reservoir data sync scheduled for', job.nextInvocation().toDate());

// Keep the script running
process.on('SIGINT', function() {
  job.cancel();
  logger.info('[ReservoirScheduler] Scheduler stopped');
  process.exit(0);
}); 
*/ 