import schedule from 'node-schedule';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createEnhancedLogger } from '../utils/enhanced-logger.js';
import { updateTaskStatus } from './track-sync-progress.mjs';

/**
 * MAIN CONSOLIDATED SCHEDULER
 * 
 * This is the primary and only scheduler to be used for all data synchronization tasks.
 * All other schedulers have been deprecated in favor of this consolidated approach.
 * 
 * Current scheduled tasks:
 * - Reservoir data sync: Daily at 9:00 AM
 * - HII rainfall data sync: Hourly at minute 40
 * - TMD data sync: Hourly at minute 55
 * - Task progress report: Daily at 9:15 AM
 * 
 * If you need to add new scheduled tasks, add them to this file only.
 */

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the root directory of the backend
const backendRoot = path.resolve(__dirname, '../..');

// Create logs directory if it doesn't exist
const logsDir = path.join(backendRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Lockfile path
const lockFilePath = path.join(backendRoot, '.scheduler.lock');

// Check if another instance is already running
if (fs.existsSync(lockFilePath)) {
  // Read the lockfile to get the PID
  try {
    const lockData = fs.readFileSync(lockFilePath, 'utf8');
    const pid = parseInt(lockData.trim(), 10);
    
    // Check if the process with that PID is still running
    try {
      process.kill(pid, 0); // This just tests if the process exists, doesn't actually kill it
      console.error(`Another scheduler instance is already running with PID ${pid}. Exiting.`);
      process.exit(1);
    } catch (e) {
      // Process with that PID doesn't exist, so we can proceed
      console.log(`Found stale lockfile from PID ${pid}. Proceeding with new instance.`);
    }
  } catch (e) {
    console.log('Invalid lockfile found. Proceeding with new instance.');
  }
}

// Create a new lockfile with current PID
fs.writeFileSync(lockFilePath, process.pid.toString(), 'utf8');

// Remove lockfile on exit
const cleanupLockfile = () => {
  try {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  } catch (e) {
    console.error('Failed to remove lockfile:', e);
  }
};

// Register cleanup for different signals
process.on('exit', cleanupLockfile);
process.on('SIGINT', () => {
  cleanupLockfile();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupLockfile();
  process.exit(0);
});
process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e);
  cleanupLockfile();
  process.exit(1);
});

// Create enhanced logger for the scheduler
const logger = createEnhancedLogger({
  jobType: 'SCHEDULER',
  filename: 'scheduler.log',
  isScheduled: true
});

// Script paths for direct access (used for progress tracking)
const progressScriptPath = path.join(__dirname, 'track-sync-progress.mjs');
const reportScriptPath = path.join(__dirname, 'generate-sync-report.mjs');
const telemetrySyncScriptPath = path.join(__dirname, 'telemetry/sync-telemetry.mjs');

// Log startup information
logger.info('Data sync scheduler starting', {
  component: 'Scheduler',
  operation: 'Startup',
  data: {
    scriptPath: __filename,
    workingDirectory: process.cwd(),
    nodeVersion: process.version,
    pid: process.pid,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      TZ: process.env.TZ
    }
  }
});

// Log environment information
logger.logEnvironment();

// Log data protection mode enabled
logger.info('Data preservation mode is ENABLED for all sync operations', {
  component: 'Scheduler',
  operation: 'DataProtection',
  data: {
    enabled: true,
    description: 'All sync operations will preserve existing data when new values are empty or null'
  }
});

// Helper function to execute a sync command using npm run
async function executeNpmCommand(command, taskName, logPrefix) {
  const timestamp = new Date().toISOString();
  
  logger.info(`Starting scheduled ${logPrefix}`, {
    component: 'Scheduler',
    operation: 'StartTask',
    data: {
      task: taskName,
      command,
      timestamp
    }
  });
  
  // Update task status to RUNNING
  updateTaskStatus(taskName, 'RUNNING', 0, null)
    .catch(err => {
      logger.error(`Error updating task status for ${taskName}`, {
        component: 'Scheduler',
        operation: 'StatusUpdateFailed',
        error: err
      });
    });
  
  // Set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow self-signed certificates
  // Also set SCHEDULER_MODE to ensure sync scripts know they're running in scheduled mode
  const env = { 
    ...process.env, 
    NODE_TLS_REJECT_UNAUTHORIZED: '0',
    SCHEDULER_MODE: 'true',
    PRESERVE_DATA: 'true'
  };

  // Determine which tables need to be enabled/disabled based on the task
  let tablesToToggle = [];
  switch (taskName) {
    case 'telemetry_stations':
      tablesToToggle = ['telemetry_data_stations'];
      break;
    case 'thaiwater':
      tablesToToggle = ['thaiwater_tele_stations'];
      break;
    case 'reservoir':
      tablesToToggle = ['reservoir_locations'];
      break;
  }

  // Enable required tables before sync
  if (tablesToToggle.length > 0) {
    logger.info(`Enabling station/location tables for ${taskName}`, {
      component: 'Scheduler',
      operation: 'EnableTables',
      data: { tables: tablesToToggle }
    });

    for (const table of tablesToToggle) {
      const enableCommand = `cd "${backendRoot}" && npm run table:enable -- --table=${table}`;
      await new Promise((resolve, reject) => {
        exec(enableCommand, { env }, (error) => {
          if (error) {
            logger.error(`Failed to enable table ${table}`, {
              component: 'Scheduler',
              operation: 'EnableTableFailed',
              error: error.message
            });
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }
  
  // Execute the npm command with the --scheduled flag and --preserve-data flag
  const fullCommand = `cd "${backendRoot}" && npm run ${command} -- --scheduled --preserve-data`;
  
  logger.debug(`Executing command: ${fullCommand}`, {
    component: 'Scheduler',
    operation: 'ExecuteCommand',
    data: { command: fullCommand }
  });
  
  // Execute the command
  const startTime = Date.now();
  exec(fullCommand, { env }, async (error, stdout, stderr) => {
    const duration = Date.now() - startTime;
    
    // Disable tables after sync (whether successful or not)
    if (tablesToToggle.length > 0) {
      logger.info(`Disabling tables for ${taskName}`, {
        component: 'Scheduler',
        operation: 'DisableTables',
        data: { tables: tablesToToggle }
      });

      for (const table of tablesToToggle) {
        const disableCommand = `cd "${backendRoot}" && npm run table:disable -- --table=${table}`;
        exec(disableCommand, { env }, (disableError) => {
          if (disableError) {
            logger.error(`Failed to disable table ${table}`, {
              component: 'Scheduler',
              operation: 'DisableTableFailed',
              error: disableError.message
            });
          }
        });
      }
    }
    
    if (error) {
      logger.error(`Error running ${logPrefix} command`, {
        component: 'Scheduler',
        operation: 'CommandFailed',
        duration,
        data: {
          task: taskName,
          error: error.message,
          stderr,
          exitCode: error.code
        }
      });
      
      // Update task status to ERROR
      updateTaskStatus(taskName, 'ERROR', 0, error.message)
        .catch(err => {
          logger.error(`Error updating task status for ${taskName}`, {
            component: 'Scheduler',
            operation: 'StatusUpdateFailed',
            error: err
          });
        });
      return;
    }
    
    if (stderr && stderr.trim().length > 0) {
      logger.warn(`${logPrefix} command produced stderr output`, {
        component: 'Scheduler',
        operation: 'CommandWarning',
        data: {
          task: taskName,
          stderr
        }
      });
    }
    
    logger.info(`${logPrefix} command completed successfully`, {
      component: 'Scheduler',
      operation: 'CommandSuccess',
      duration,
      data: {
        task: taskName,
        stdout: stdout.trim().length > 500 ? `${stdout.substring(0, 500)}...` : stdout
      }
    });
    
    // After successful execution, run the progress tracker to update records count
    logger.debug(`Running progress tracker for ${taskName}`, {
      component: 'Scheduler',
      operation: 'ProgressTracking'
    });
    
    exec(`node ${progressScriptPath}`, { env }, (err, progStdout, progStderr) => {
      if (err) {
        logger.error(`Error running progress tracker after ${logPrefix}`, {
          component: 'Scheduler',
          operation: 'ProgressTrackingFailed',
          error: err
        });
      } else {
        logger.debug(`Progress tracker completed for ${taskName}`, {
          component: 'Scheduler',
          operation: 'ProgressTrackingComplete'
        });
      }
    });
  });
}

// Schedule jobs to run at 9:00 AM every day for reservoir data
const reservoirJob = schedule.scheduleJob('0 9 * * *', function() {
  logger.info('Executing reservoir data sync (consolidated scheduler)', {
    component: 'Scheduler',
    operation: 'ScheduleJob',
    data: { job: 'reservoir' }
  });
  executeNpmCommand('sync:reservoir', 'reservoir', 'Reservoir data');
});

// Schedule telemetry data sync to run every hour at minute 20
const telemetryDataJob = schedule.scheduleJob('20 * * * *', function() {
  logger.info('Executing telemetry data sync (consolidated scheduler)', {
    component: 'Scheduler',
    operation: 'ScheduleJob',
    data: { job: 'telemetry_data' }
  });
  executeNpmCommand('sync:telemetry:scheduled --data-only', 'telemetry_data', 'Telemetry data');
});

// Schedule telemetry stations sync to run at 10:10 on the last day of each month
const telemetryStationsJob = schedule.scheduleJob('10 10 28-31 * *', function() {
  // Check if it's the last day of the month
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (today.getMonth() !== tomorrow.getMonth()) {
    logger.info('Executing telemetry stations sync (consolidated scheduler)', {
      component: 'Scheduler',
      operation: 'ScheduleJob',
      data: { job: 'telemetry_stations' }
    });
    executeNpmCommand('sync:telemetry:scheduled --stations-only', 'telemetry_stations', 'Telemetry stations');
  }
});

// Schedule ThaiWater sync to run every hour at minute 40
const thaiWaterJob = schedule.scheduleJob('40 * * * *', function() {
  logger.info('Executing ThaiWater sync (consolidated scheduler)', {
    component: 'Scheduler',
    operation: 'ScheduleJob',
    data: { job: 'thaiwater' }
  });
  executeNpmCommand('sync:thaiwater', 'thaiwater', 'ThaiWater data');
});

// Schedule TMD sync to run every hour at minute 55
const tmdJob = schedule.scheduleJob('55 * * * *', function() {
  logger.info('Executing TMD sync (consolidated scheduler)', {
    component: 'Scheduler',
    operation: 'ScheduleJob',
    data: { job: 'tmd' }
  });
  executeNpmCommand('sync:tmd', 'tmd', 'TMD data');
});

// Schedule progress report to run at 9:15 AM every day
const progressReportJob = schedule.scheduleJob('15 9 * * *', function() {
  logger.info('Generating sync progress report (consolidated scheduler)', {
    component: 'Scheduler',
    operation: 'ScheduleJob',
    data: { job: 'progress_report' }
  });
  executeNpmCommand('generate-report', 'progress_report', 'Progress report');
});

// Log all scheduled jobs
logger.info('All scheduled jobs have been initialized', {
  component: 'Scheduler',
  operation: 'InitializeJobs',
  data: {
    jobs: [
      { name: 'reservoir', schedule: '0 9 * * *' },
      { name: 'telemetry_data', schedule: '20 * * * *' },
      { name: 'telemetry_stations', schedule: '10 10 28-31 * *' },
      { name: 'thaiwater', schedule: '40 * * * *' },
      { name: 'tmd', schedule: '55 * * * *' },
      { name: 'progress_report', schedule: '15 9 * * *' }
    ]
  }
});

// Log information about scheduled jobs
logger.info('Scheduler started successfully', {
  component: 'Scheduler',
  operation: 'Started',
  data: {
    jobs: [
      {
        name: 'reservoir',
        schedule: 'daily at 9:00 AM',
        nextRun: reservoirJob.nextInvocation().toDate()
      },
      {
        name: 'telemetry_data',
        schedule: 'hourly at minute 20',
        nextRun: telemetryDataJob.nextInvocation().toDate()
      },
      {
        name: 'telemetry_stations',
        schedule: 'end of month',
        nextRun: telemetryStationsJob.nextInvocation().toDate()
      },
      {
        name: 'thaiwater',
        schedule: 'hourly at minute 40',
        nextRun: thaiWaterJob.nextInvocation().toDate()
      },
      {
        name: 'tmd',
        schedule: 'hourly at minute 55',
        nextRun: tmdJob.nextInvocation().toDate()
      },
      {
        name: 'progress_report',
        schedule: 'daily at 9:15 AM',
        nextRun: progressReportJob.nextInvocation().toDate()
      }
    ]
  }
});

// Log memory usage at startup
logger.logMemoryUsage('SchedulerStartup');

// Keep the script running and handle graceful shutdown
process.on('SIGINT', function() {
  logger.info('Received SIGINT signal, shutting down scheduler', {
    component: 'Scheduler',
    operation: 'Shutdown'
  });
  
  reservoirJob.cancel();
  telemetryDataJob.cancel();
  telemetryStationsJob.cancel();
  thaiWaterJob.cancel();
  tmdJob.cancel();
  progressReportJob.cancel();
  
  logger.info('All scheduled jobs cancelled', {
    component: 'Scheduler',
    operation: 'JobsCancelled'
  });
  
  // Give logger a chance to write remaining logs
  setTimeout(() => {
    process.exit(0);
  }, 500);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in scheduler', {
    component: 'Scheduler',
    operation: 'UncaughtException',
    error
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection in scheduler', {
    component: 'Scheduler',
    operation: 'UnhandledRejection',
    data: {
      reason: reason instanceof Error ? reason.stack : String(reason)
    }
  });
}); 