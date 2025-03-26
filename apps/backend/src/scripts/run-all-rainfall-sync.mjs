// Script to run both HII (ThaiWater) and TMD rainfall data sync jobs
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = __dirname;
const backendRoot = path.resolve(__dirname, '../../');

// Load environment variables
const envPath = path.resolve(backendRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
  console.warn(`Warning: .env file not found at ${envPath}, using process.env or default values`);
}

// Create logs directory if it doesn't exist
const logsDir = path.join(backendRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a lock file mechanism to prevent overlapping executions
const lockFilePath = path.join(logsDir, 'rainfall-sync.lock');

// Check if a lock file exists
if (fs.existsSync(lockFilePath)) {
  const lockFileContent = fs.readFileSync(lockFilePath, 'utf8');
  const lockData = JSON.parse(lockFileContent);
  const lockTime = new Date(lockData.timestamp);
  const currentTime = new Date();
  const diffMinutes = (currentTime - lockTime) / (1000 * 60);
  
  // If the lock is older than 60 minutes, assume it's stale
  if (diffMinutes < 60) {
    console.error(`Another rainfall sync process is already running (PID: ${lockData.pid}). Started at ${lockTime.toISOString()}`);
    process.exit(1);
  } else {
    console.warn(`Found stale lock file (older than 60 minutes). Removing and proceeding.`);
    fs.unlinkSync(lockFilePath);
  }
}

// Create a lock file
fs.writeFileSync(lockFilePath, JSON.stringify({
  pid: process.pid,
  timestamp: new Date().toISOString()
}));

// Function to run a script and return a promise
function runScript(scriptPath, extraArgs = '') {
  return new Promise((resolve, reject) => {
    const cmdArgs = extraArgs ? `${scriptPath} ${extraArgs}` : `${scriptPath} --scheduled`;
    const process = exec(`node ${cmdArgs}`, {
      cwd: backendRoot
    });
    
    console.log(`Running script: node ${cmdArgs}`);
    
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data;
      console.log(data);
    });
    
    process.stderr.on('data', (data) => {
      output += data;
      console.error(data);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ code, output });
      } else {
        reject(new Error(`Script exited with code ${code}\n${output}`));
      }
    });
  });
}

// Main function to run both sync jobs
async function main() {
  console.log(`Starting rainfall data sync jobs at ${new Date().toISOString()}`);
  
  const hiiScriptPath = path.join(scriptsDir, 'sync-hii-data.mjs');
  const tmdScriptPath = path.join(scriptsDir, 'sync-tmd-data.mjs');
  
  try {
    // Run HII (ThaiWater) sync first
    console.log('Starting HII data sync...');
    await runScript(hiiScriptPath);
    console.log('HII data sync completed successfully');
    
    // Then run TMD sync
    console.log('Starting TMD data sync...');
    await runScript(tmdScriptPath);
    console.log('TMD data sync completed successfully');
    
    console.log(`All rainfall data sync jobs completed successfully at ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`Error running rainfall data sync jobs: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // Always remove the lock file when done
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  }
}

// Run the main function
main(); 