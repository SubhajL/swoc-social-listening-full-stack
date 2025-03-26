// TRAP SCRIPT - THIS REPLACES THE OLD THAIWATER SYNC SCRIPT
// This script logs when it's called to help identify what is calling it

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// Create logs directory if it doesn't exist
const logsDir = path.join(backendRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFile = path.join(logsDir, 'thaiwater-sync-trap.log');

// Function to log the call
function logCall() {
  const now = new Date();
  const args = process.argv.slice(2);
  const timestamp = now.toISOString();
  const message = `[${timestamp}] The deprecated thaiwater-sync.mjs script was called with args: ${JSON.stringify(args)}\n`;
  
  console.log('========== DEPRECATED SCRIPT ==========');
  console.log('⚠️  WARNING: You are calling a deprecated script that has been replaced by sync-hii-data.mjs');
  console.log('Please update your scheduler or job to use the new script:');
  console.log('  npm run sync:hii');
  console.log('This call has been logged but no sync operation was performed.');
  console.log('=========================================');
  
  // Get process information
  let processInfo = '';
  try {
    processInfo = `Parent PID: ${process.ppid}\n`;
    processInfo += `Command: ${process.argv.join(' ')}\n`;
    
    // Try to get environment variables that might indicate how this was called
    const relevantEnvVars = ['NODE_ENV', 'SCHEDULER_MODE', 'PWD', 'PATH'];
    processInfo += 'Environment:\n';
    for (const envVar of relevantEnvVars) {
      if (process.env[envVar]) {
        processInfo += `  ${envVar}=${process.env[envVar]}\n`;
      }
    }
    
    // Try to get the stack trace
    const stack = new Error().stack;
    if (stack) {
      processInfo += `Stack:\n${stack}\n`;
    }
  } catch (err) {
    processInfo = `Error getting process info: ${err.message}\n`;
  }
  
  // Write to log file
  fs.appendFileSync(logFile, message + processInfo + '\n');
}

// Main function
function main() {
  logCall();
  
  // Exit with success to prevent any issues with scheduled tasks
  process.exit(0);
}

// Run the main function
main();