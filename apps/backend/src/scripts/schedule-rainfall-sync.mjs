import schedule from 'node-schedule';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');
const hiiScriptPath = path.join(__dirname, 'sync-hii-data.mjs');
const tmdScriptPath = path.join(__dirname, 'sync-tmd-data.mjs');
const combinedScriptPath = path.join(__dirname, 'run-all-rainfall-sync.mjs');

// Load environment variables explicitly with absolute path
const envPath = path.resolve(backendRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(`[RainfallScheduler] Loaded environment variables from ${envPath}`);
} else {
  logger.warn(`[RainfallScheduler] Environment file not found at ${envPath}, using process.env`);
}

// Verify essential environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error(`[RainfallScheduler] Missing critical environment variables: ${missingVars.join(', ')}`);
}

// Track active executions to prevent overlapping
const activeJobs = {
  rainfall: false
};

// Function to execute a sync script with enhanced error handling
function executeScript(scriptPath, jobType) {
  const timestamp = new Date().toISOString();
  logger.info(`[RainfallScheduler] Starting scheduled ${jobType} data sync at ${timestamp}`);
  
  // Skip if previous execution is still running
  if (activeJobs[jobType.toLowerCase()]) {
    logger.warn(`[RainfallScheduler] Previous ${jobType} sync job is still running. Skipping this execution.`);
    return;
  }
  
  // Mark job as active
  activeJobs[jobType.toLowerCase()] = true;
  
  // Set environment variables with explicit paths and working directory
  const env = {
    ...process.env,
    NODE_TLS_REJECT_UNAUTHORIZED: '0',
    SCHEDULER_MODE: 'true'
  };
  
  // Execute the sync script with explicit working directory
  exec(`node ${scriptPath}`, { 
    env,
    cwd: backendRoot
  }, (error, stdout, stderr) => {
    // Mark job as complete
    activeJobs[jobType.toLowerCase()] = false;
    
    if (error) {
      logger.error(`[RainfallScheduler] Error running ${jobType} sync script`, {
        error: error.message,
        code: error.code,
        stderr
      });
      return;
    }
    
    if (stderr && stderr.trim() !== '') {
      logger.warn(`[RainfallScheduler] ${jobType} script produced stderr output`, {
        stderr
      });
    }
    
    logger.info(`[RainfallScheduler] ${jobType} sync script completed successfully`, {
      stdout: stdout.substring(0, 500) + (stdout.length > 500 ? '...[truncated]' : '')
    });
  });
}

// Schedule combined rainfall data sync job (HII + TMD)
const rainfallJob = schedule.scheduleJob('0 8 * * *', function() {
  executeScript(combinedScriptPath, 'Rainfall');
});

// Add health check job to verify database connectivity
const healthCheckJob = schedule.scheduleJob('0 * * * *', async function() {
  logger.info('[RainfallScheduler] Running hourly health check');
  
  try {
    // Import DB utilities on demand to avoid cyclic dependencies
    const { Pool } = await import('pg');
    
    // Test database connection with timeout
    const testPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000 // 5 second timeout for health check
    });
    
    // Set up proper error handler
    testPool.on('error', (err) => {
      logger.error('[RainfallScheduler] Health check - Unexpected error on idle client', {
        error: err.message
      });
    });
    
    const client = await testPool.connect();
    try {
      await client.query('SELECT NOW() as time');
      logger.info('[RainfallScheduler] Health check - Database connection successful');
    } finally {
      client.release();
    }
    
    await testPool.end();
  } catch (error) {
    logger.error('[RainfallScheduler] Health check - Database connection failed', {
      error: error.message,
      stack: error.stack
    });
  }
});

logger.info('[RainfallScheduler] Scheduler started successfully');
logger.info('[RainfallScheduler] Next combined rainfall data sync scheduled for', rainfallJob.nextInvocation().toDate());
logger.info('[RainfallScheduler] Next health check scheduled for', healthCheckJob.nextInvocation().toDate());

// Keep the script running
process.on('SIGINT', function() {
  rainfallJob.cancel();
  healthCheckJob.cancel();
  logger.info('[RainfallScheduler] Scheduler stopped');
  process.exit(0);
}); 