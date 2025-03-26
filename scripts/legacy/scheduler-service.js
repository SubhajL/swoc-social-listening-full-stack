#!/usr/bin/env node

/**
 * Scheduler Service
 * 
 * This script runs as a service to execute scheduled jobs defined in the
 * scheduler-config.json file. It handles scheduling, logging, and error recovery.
 * 
 * Usage:
 *   node scheduler-service.js [command]
 * 
 * Commands:
 *   run            - Start the scheduler service in the foreground
 *   run-once       - Run all enabled jobs once and exit
 *   list           - List all jobs and their schedules
 *   status         - Show the status of all jobs
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');
const dotenv = require('dotenv');
const pidusage = require('pidusage');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Paths
const CURRENT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(CURRENT_DIR, '..');
const CONFIG_FILE = path.join(CURRENT_DIR, 'scheduler-config.json');
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');

// Configuration
const PID_FILE = path.join(__dirname, '../.scheduler.pid');
const LOG_FILE = path.join(__dirname, '../logs/scheduler.log');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Job status tracking
const jobStatus = {
  lastRun: {},
  nextRun: {},
  running: {},
  lastResult: {},
  failures: {}
};

// Load configuration
function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(configData);
  } catch (err) {
    console.error(`Error loading config file: ${err.message}`);
    return { jobs: [] };
  }
}

// Format date for logs
function formatDate(date) {
  return date.toISOString();
}

// Log message to console and file
function log(message, jobName = null) {
  const timestamp = formatDate(new Date());
  const prefix = jobName ? `[${timestamp}] [${jobName}]` : `[${timestamp}]`;
  const logMessage = `${prefix} ${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  const logFile = path.join(LOGS_DIR, 'scheduler.log');
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Execute a command
function executeCommand(command, jobName) {
  return new Promise((resolve, reject) => {
    log(`Executing command: ${command}`, jobName);
    
    // Split command into parts
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    // Set job as running
    jobStatus.running[jobName] = true;
    jobStatus.lastRun[jobName] = new Date();
    
    // Create log files for this job run
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const stdoutFile = path.join(LOGS_DIR, `${jobName.replace(/\s+/g, '-')}-${timestamp}.log`);
    const stderrFile = path.join(LOGS_DIR, `${jobName.replace(/\s+/g, '-')}-${timestamp}.err`);
    
    const stdoutStream = fs.createWriteStream(stdoutFile, { flags: 'a' });
    const stderrStream = fs.createWriteStream(stderrFile, { flags: 'a' });
    
    // Start the process
    const childProcess = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      shell: true
    });
    
    // Handle output
    childProcess.stdout.pipe(stdoutStream);
    childProcess.stderr.pipe(stderrStream);
    
    childProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line) log(`[STDOUT] ${line}`, jobName);
      });
    });
    
    childProcess.stderr.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line) log(`[STDERR] ${line}`, jobName);
      });
    });
    
    // Handle process exit
    childProcess.on('close', (code) => {
      jobStatus.running[jobName] = false;
      
      if (code === 0) {
        log(`Command completed successfully with exit code ${code}`, jobName);
        jobStatus.lastResult[jobName] = 'success';
        jobStatus.failures[jobName] = 0;
        resolve(code);
      } else {
        log(`Command failed with exit code ${code}`, jobName);
        jobStatus.lastResult[jobName] = 'failure';
        jobStatus.failures[jobName] = (jobStatus.failures[jobName] || 0) + 1;
        reject(new Error(`Command failed with exit code ${code}`));
      }
      
      // Close streams
      stdoutStream.end();
      stderrStream.end();
    });
    
    // Handle process error
    childProcess.on('error', (err) => {
      jobStatus.running[jobName] = false;
      log(`Error executing command: ${err.message}`, jobName);
      jobStatus.lastResult[jobName] = 'error';
      jobStatus.failures[jobName] = (jobStatus.failures[jobName] || 0) + 1;
      
      // Close streams
      stdoutStream.end();
      stderrStream.end();
      
      reject(err);
    });
  });
}

// Check if a job is running
function isJobRunning(jobName) {
  return jobStatus.running[jobName] === true;
}

// Run a job
async function runJob(job) {
  const { name, command, enabled } = job;
  
  if (!enabled) {
    log(`Job is disabled, skipping`, name);
    return;
  }
  
  if (isJobRunning(name)) {
    log(`Job is already running, skipping`, name);
    return;
  }
  
  try {
    log(`Starting job`, name);
    await executeCommand(command, name);
    log(`Job completed successfully`, name);
  } catch (err) {
    log(`Job failed: ${err.message}`, name);
  }
}

// Calculate next run time for a job
function calculateNextRun(schedule) {
  try {
    const cronInstance = cron.schedule(schedule, () => {});
    return cronInstance.nextDate();
  } catch (err) {
    return null;
  }
}

// Print job status
function printJobStatus() {
  const config = loadConfig();
  const { jobs } = config;
  
  console.log('\nJob Status:');
  console.log('==========\n');
  
  if (jobs.length === 0) {
    console.log('No jobs configured');
    return;
  }
  
  jobs.forEach(job => {
    const { name, schedule, command, enabled } = job;
    
    console.log(`Job: ${name}`);
    console.log(`Enabled: ${enabled ? 'Yes' : 'No'}`);
    console.log(`Schedule: ${schedule}`);
    console.log(`Command: ${command}`);
    
    if (jobStatus.lastRun[name]) {
      console.log(`Last Run: ${jobStatus.lastRun[name].toISOString()}`);
    } else {
      console.log('Last Run: Never');
    }
    
    if (jobStatus.nextRun[name]) {
      console.log(`Next Run: ${jobStatus.nextRun[name].toISOString()}`);
    } else {
      console.log('Next Run: Not scheduled');
    }
    
    console.log(`Status: ${jobStatus.running[name] ? 'Running' : 'Idle'}`);
    
    if (jobStatus.lastResult[name]) {
      console.log(`Last Result: ${jobStatus.lastResult[name]}`);
    }
    
    if (jobStatus.failures[name] > 0) {
      console.log(`Failures: ${jobStatus.failures[name]}`);
    }
    
    console.log('');
  });
}

// Print job list
function printJobList() {
  const config = loadConfig();
  const { jobs } = config;
  
  console.log('\nScheduled Jobs:');
  console.log('==============\n');
  
  if (jobs.length === 0) {
    console.log('No jobs configured');
    return;
  }
  
  jobs.forEach(job => {
    const { name, schedule, command, enabled, description } = job;
    
    console.log(`Job: ${name}`);
    if (description) console.log(`Description: ${description}`);
    console.log(`Enabled: ${enabled ? 'Yes' : 'No'}`);
    console.log(`Schedule: ${schedule}`);
    console.log(`Command: ${command}`);
    console.log('');
  });
}

// Run all jobs once
async function runAllJobs() {
  const config = loadConfig();
  const { jobs } = config;
  
  log('Running all enabled jobs once');
  
  const promises = jobs.filter(job => job.enabled).map(job => runJob(job));
  
  try {
    await Promise.all(promises);
    log('All jobs completed');
  } catch (err) {
    log(`Error running jobs: ${err.message}`);
  }
}

// Start the scheduler service
function startService() {
  const config = loadConfig();
  const { jobs } = config;
  
  log('Starting scheduler service');
  
  // Schedule all jobs
  jobs.forEach(job => {
    const { name, schedule, enabled } = job;
    
    if (!enabled) {
      log(`Job "${name}" is disabled, skipping`, name);
      return;
    }
    
    try {
      log(`Scheduling job "${name}" with schedule: ${schedule}`, name);
      
      const task = cron.schedule(schedule, () => {
        runJob(job);
      });
      
      jobStatus.nextRun[name] = calculateNextRun(schedule);
      
      log(`Next run at: ${jobStatus.nextRun[name]}`, name);
    } catch (err) {
      log(`Error scheduling job "${name}": ${err.message}`, name);
    }
  });
  
  log('Scheduler service started');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('Received SIGINT signal, shutting down...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('Received SIGTERM signal, shutting down...');
    process.exit(0);
  });
}

// Main function
function main() {
  const command = process.argv[2] || 'help';
  
  switch (command) {
    case 'run':
      startService();
      break;
    case 'run-once':
      runAllJobs().then(() => process.exit(0));
      break;
    case 'list':
      printJobList();
      break;
    case 'status':
      printJobStatus();
      break;
    default:
      console.log('Usage: node scheduler-service.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  run       - Start the scheduler service in the foreground');
      console.log('  run-once  - Run all enabled jobs once and exit');
      console.log('  list      - List all jobs and their schedules');
      console.log('  status    - Show the status of all jobs');
      process.exit(1);
  }
}

main(); 
main(); 
main(); 
main(); 
main(); 