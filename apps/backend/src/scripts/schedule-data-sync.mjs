import schedule from 'node-schedule';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { updateTaskStatus } from './track-sync-progress.mjs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script paths
const reservoirScriptPath = path.join(__dirname, 'sync-reservoir-data.mjs');
const thaiWaterScriptPath = path.join(__dirname, 'fetch-thaiwater-rainfall.mjs');
const tmdScriptPath = path.join(__dirname, 'sync-tmd-data.mjs');
const progressScriptPath = path.join(__dirname, 'track-sync-progress.mjs');
const reportScriptPath = path.join(__dirname, 'generate-sync-report.mjs');

// Helper function to execute a script
function executeScript(scriptPath, taskName, logPrefix) {
  const timestamp = new Date().toISOString();
  logger.info(`[DataSyncScheduler] Starting scheduled ${logPrefix} at ${timestamp}`);
  
  // Update task status to RUNNING
  updateTaskStatus(taskName, 'RUNNING', 0, null)
    .catch(err => {
      logger.error(`[DataSyncScheduler] Error updating task status for ${taskName}:`, {
        error: err.message
      });
    });
  
  // Set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow self-signed certificates
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' };
  
  // Execute the sync script
  exec(`node ${scriptPath}`, { env }, (error, stdout, stderr) => {
    if (error) {
      logger.error(`[DataSyncScheduler] Error running ${logPrefix} script`, {
        error: error.message,
        stderr
      });
      
      // Update task status to ERROR
      updateTaskStatus(taskName, 'ERROR', 0, error.message)
        .catch(err => {
          logger.error(`[DataSyncScheduler] Error updating task status for ${taskName}:`, {
            error: err.message
          });
        });
      return;
    }
    
    if (stderr) {
      logger.warn(`[DataSyncScheduler] ${logPrefix} script produced stderr output`, {
        stderr
      });
    }
    
    logger.info(`[DataSyncScheduler] ${logPrefix} script completed successfully`, {
      stdout
    });
    
    // After successful execution, run the progress tracker to update records count
    exec(`node ${progressScriptPath}`, { env }, (err) => {
      if (err) {
        logger.error(`[DataSyncScheduler] Error running progress tracker after ${logPrefix}:`, {
          error: err.message
        });
      }
    });
  });
}

// Schedule jobs to run at 9:00 AM every day for reservoir data
const reservoirJob = schedule.scheduleJob('0 9 * * *', function() {
  executeScript(reservoirScriptPath, 'reservoir_sync', 'reservoir data sync');
});

// Schedule ThaiWater rainfall data sync to run hourly at minute 0
const thaiWaterJob = schedule.scheduleJob('0 * * * *', function() {
  executeScript(thaiWaterScriptPath, 'thaiwater_sync', 'ThaiWater data sync (hourly)');
});

// TMD data sync job - schedule to run hourly at minute 15
const tmdJob = schedule.scheduleJob('15 * * * *', function() {
  executeScript(tmdScriptPath, 'tmd_sync', 'TMD data sync (hourly)');
});

// Schedule a daily task progress report
const progressJob = schedule.scheduleJob('15 9 * * *', function() {
  logger.info('[DataSyncScheduler] Running daily task progress report and generating report');
  
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' };
  
  // First update the task progress data
  exec(`node ${progressScriptPath}`, { env }, (error, stdout, stderr) => {
    if (error) {
      logger.error('[DataSyncScheduler] Error running task progress report:', {
        error: error.message,
        stderr
      });
      return;
    }
    
    logger.info('[DataSyncScheduler] Task progress data updated successfully');
    
    // Then generate the human-readable report
    exec(`node ${reportScriptPath}`, { env }, (reportError, reportStdout, reportStderr) => {
      if (reportError) {
        logger.error('[DataSyncScheduler] Error generating sync report:', {
          error: reportError.message,
          stderr: reportStderr
        });
        return;
      }
      
      logger.info('[DataSyncScheduler] Sync report generated successfully');
    });
  });
});

logger.info('[DataSyncScheduler] Scheduler started successfully');
logger.info('[DataSyncScheduler] Reservoir data sync: daily at 9:00 AM');
logger.info('[DataSyncScheduler] Next reservoir data sync scheduled for', reservoirJob.nextInvocation().toDate());
logger.info('[DataSyncScheduler] ThaiWater data sync: hourly at minute 0');
logger.info('[DataSyncScheduler] Next ThaiWater data sync scheduled for', thaiWaterJob.nextInvocation().toDate());
logger.info('[DataSyncScheduler] TMD data sync: hourly at minute 15');
logger.info('[DataSyncScheduler] Next TMD data sync scheduled for', tmdJob.nextInvocation().toDate());
logger.info('[DataSyncScheduler] Task progress report: daily at 9:15 AM');
logger.info('[DataSyncScheduler] Next task progress report scheduled for', progressJob.nextInvocation().toDate());

// Keep the script running
process.on('SIGINT', function() {
  reservoirJob.cancel();
  thaiWaterJob.cancel();
  tmdJob.cancel();
  progressJob.cancel();
  logger.info('[DataSyncScheduler] Scheduler stopped');
  process.exit(0);
}); 