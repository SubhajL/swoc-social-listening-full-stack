import * as cron from 'node-cron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Schedules regular updates of the administrative location data for ThaiWater stations
 * - Runs the populate-thaiwater-locations.ts script on a schedule
 * - Logs the output of the script
 */
function scheduleLocationUpdates(): void {
  logger.info('[LocationScheduler] Starting location update scheduler');
  
  // Schedule the location population script to run once a week (Sunday at 1:00 AM)
  cron.schedule('0 1 * * 0', () => {
    logger.info('[LocationScheduler] Running scheduled location population');
    
    // Path to the populate-thaiwater-locations.ts script
    const scriptPath = path.join(__dirname, 'populate-thaiwater-locations.ts');
    
    // Run the script using ts-node
    const childProcess: ChildProcess = spawn('ts-node', [scriptPath], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Log stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      logger.info(`[LocationScheduler] ${data.toString().trim()}`);
    });
    
    // Log stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      logger.error(`[LocationScheduler] ${data.toString().trim()}`);
    });
    
    // Log when the process exits
    childProcess.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info('[LocationScheduler] Location population completed successfully');
      } else {
        logger.error(`[LocationScheduler] Location population failed with code ${code}`);
      }
    });
  });
  
  // Also schedule a check for new stations without location data daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    logger.info('[LocationScheduler] Running daily check for new stations without location data');
    
    // Path to the populate-thaiwater-locations.ts script with a limit flag
    const scriptPath = path.join(__dirname, 'populate-thaiwater-locations.ts');
    
    // Run the script with a limit to only process new stations
    const childProcess: ChildProcess = spawn('ts-node', [scriptPath, '--limit=100', '--new-only'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Log stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      logger.info(`[LocationScheduler] ${data.toString().trim()}`);
    });
    
    // Log stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      logger.error(`[LocationScheduler] ${data.toString().trim()}`);
    });
    
    // Log when the process exits
    childProcess.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info('[LocationScheduler] Daily location check completed successfully');
      } else {
        logger.error(`[LocationScheduler] Daily location check failed with code ${code}`);
      }
    });
  });
  
  logger.info('[LocationScheduler] Location update scheduler started');
  logger.info('[LocationScheduler] Weekly full update scheduled for Sunday at 1:00 AM');
  logger.info('[LocationScheduler] Daily check for new stations scheduled for 2:00 AM');
}

// Start the scheduler
scheduleLocationUpdates();

// Keep the process running
process.on('SIGINT', () => {
  logger.info('[LocationScheduler] Scheduler stopped');
  process.exit(0);
});

logger.info('[LocationScheduler] Press Ctrl+C to stop the scheduler');

// Note: You need to install the node-cron package:
// npm install node-cron
// npm install @types/node-cron --save-dev 