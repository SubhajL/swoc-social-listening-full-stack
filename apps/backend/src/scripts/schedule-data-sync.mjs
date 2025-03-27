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
function executeNpmCommand(command, taskName, logPrefix) {
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
  
  // Execute the npm command with the --scheduled flag and --preserve-data flag
  const fullCommand = `cd "${backendRoot}" && npm run ${command} -- --scheduled --preserve-data`;
  
  logger.debug(`Executing command: ${fullCommand}`, {
    component: 'Scheduler',
    operation: 'ExecuteCommand',
    data: { command: fullCommand }
  });
  
  // Execute the command
  const startTime = Date.now();
  exec(fullCommand, { env }, (error, stdout, stderr) => {
    const duration = Date.now() - startTime;
    
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
    operation: 'ReservoirSync',
    data: {
      time: new Date().toISOString(),
      schedule: 'daily at 9:00 AM'
    }
  });
  executeNpmCommand('sync:reservoir', 'reservoir_sync', 'reservoir data sync');
});

// Schedule HII rainfall data sync to run hourly at minute 40
const hiiJob = schedule.scheduleJob('40 * * * *', function() {
  executeNpmCommand('sync:hii', 'hii_sync', 'HII data sync (hourly)');
});

// TMD data sync job - schedule to run hourly at minute 55
const tmdJob = schedule.scheduleJob('55 * * * *', function() {
  executeNpmCommand('sync:tmd', 'tmd_sync', 'TMD data sync (hourly)');
});

// Schedule a daily task progress report
const progressJob = schedule.scheduleJob('15 9 * * *', function() {
  logger.info('Running daily task progress report and generating report', {
    component: 'Scheduler',
    operation: 'ReportGeneration'
  });
  
  const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' };
  
  // First update the task progress data
  exec(`node ${progressScriptPath}`, { env }, (error, stdout, stderr) => {
    if (error) {
      logger.error('Error running task progress report', {
        component: 'Scheduler',
        operation: 'ProgressReportFailed',
        error
      });
      return;
    }
    
    logger.info('Task progress data updated successfully', {
      component: 'Scheduler',
      operation: 'ProgressReportComplete'
    });
    
    // Then generate the human-readable report
    exec(`node ${reportScriptPath}`, { env }, (reportError, reportStdout, reportStderr) => {
      if (reportError) {
        logger.error('Error generating sync report', {
          component: 'Scheduler',
          operation: 'SyncReportFailed',
          error: reportError
        });
        return;
      }
      
      logger.info('Sync report generated successfully', {
        component: 'Scheduler',
        operation: 'SyncReportComplete'
      });
    });
  });
});

// Schedule telemetry sync jobs
// 1. Station sync at end of month
schedule.scheduleJob('0 0 28-31 * *', async () => {
  try {
    // Check if it's the last day of the month
    const now = new Date();
    const isLastDay = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    if (isLastDay) {
      logger.info('Starting monthly telemetry station sync', 'Scheduler');
      
      // Update task status to running
      await updateTaskStatus('telemetry_station_sync', 'running');
      
      // Run the telemetry sync script with --scheduled flag
      exec(`node ${telemetrySyncScriptPath} --scheduled`, (error, stdout, stderr) => {
        if (error) {
          logger.error('Telemetry station sync failed:', error);
          updateTaskStatus('telemetry_station_sync', 'failed');
          return;
        }
        
        if (stderr) {
          logger.warn('Telemetry station sync warnings:', stderr);
        }
        
        logger.info('Telemetry station sync completed:', stdout);
        updateTaskStatus('telemetry_station_sync', 'completed');
      });
    }
  } catch (error) {
    logger.error('Error in telemetry station sync job:', error);
    updateTaskStatus('telemetry_station_sync', 'failed');
  }
});

// 2. Data sync at :20 of every hour
schedule.scheduleJob('20 * * * *', async () => {
  try {
    logger.info('Starting hourly telemetry data sync', 'Scheduler');
    
    // Update task status to running
    await updateTaskStatus('telemetry_data_sync', 'running');
    
    // Run the telemetry sync script with --scheduled flag
    exec(`node ${telemetrySyncScriptPath} --scheduled`, (error, stdout, stderr) => {
      if (error) {
        logger.error('Telemetry data sync failed:', error);
        updateTaskStatus('telemetry_data_sync', 'failed');
        return;
      }
      
      if (stderr) {
        logger.warn('Telemetry data sync warnings:', stderr);
      }
      
      logger.info('Telemetry data sync completed:', stdout);
      updateTaskStatus('telemetry_data_sync', 'completed');
    });
  } catch (error) {
    logger.error('Error in telemetry data sync job:', error);
    updateTaskStatus('telemetry_data_sync', 'failed');
  }
});

// Log information about scheduled jobs
logger.info('Scheduler started successfully', {
  component: 'Scheduler',
  operation: 'Started',
  data: {
    jobs: [
      {
        name: 'reservoir_sync',
        schedule: 'daily at 9:00 AM',
        nextRun: reservoirJob.nextInvocation().toDate()
      },
      {
        name: 'hii_sync',
        schedule: 'hourly at minute 40',
        nextRun: hiiJob.nextInvocation().toDate()
      },
      {
        name: 'tmd_sync',
        schedule: 'hourly at minute 55', 
        nextRun: tmdJob.nextInvocation().toDate()
      },
      {
        name: 'progress_report',
        schedule: 'daily at 9:15 AM',
        nextRun: progressJob.nextInvocation().toDate()
      },
      {
        name: 'telemetry_station_sync',
        schedule: 'end of month',
        nextRun: 'Last day of each month'
      },
      {
        name: 'telemetry_data_sync',
        schedule: 'hourly at minute 20',
        nextRun: 'Every hour at :20'
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
  hiiJob.cancel();
  tmdJob.cancel();
  progressJob.cancel();
  
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