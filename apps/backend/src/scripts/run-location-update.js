// This is a JavaScript version of the run-location-update.ts script
// for direct execution

// Import required modules
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  skipPostGIS: args.includes('--skip-postgis') || args.includes('-p'),
  skipBoundaries: args.includes('--skip-boundaries') || args.includes('-b'),
  newOnly: args.includes('--new-only') || args.includes('-n'),
  forceUpdate: args.includes('--force-update') || args.includes('-f')
};

// Check for limit flag
const limitArg = args.find(arg => arg.startsWith('--limit='));
if (limitArg) {
  options.limit = parseInt(limitArg.split('=')[1], 10);
}

// Helper function to run a JavaScript script
function runScript(scriptName, scriptArgs = []) {
  return new Promise((resolve, reject) => {
    console.log(`[LocationUpdate] Running ${scriptName}...`);
    
    const scriptPath = path.join(__dirname, `${scriptName}.js`);
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`[LocationUpdate] Script not found: ${scriptPath}`);
      return reject(new Error(`Script not found: ${scriptPath}`));
    }
    
    // Run the script using node
    const childProcess = spawn('node', [scriptPath, ...scriptArgs], {
      stdio: 'inherit',
      shell: true
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[LocationUpdate] ${scriptName} completed successfully`);
        resolve();
      } else {
        console.error(`[LocationUpdate] ${scriptName} failed with code ${code}`);
        reject(new Error(`Script failed with code ${code}`));
      }
    });
  });
}

// Main function to run the location update process
async function runLocationUpdate() {
  console.log('[LocationUpdate] Starting the location update process');
  
  try {
    // Step 1: Check the database
    console.log('[LocationUpdate] Checking the database');
    await runScript('check-database');
    
    // Step 2: Check the current location data
    console.log('[LocationUpdate] Checking the current location data');
    await runScript('check-location-data');
    
    // Step 3: Populate ThaiWater stations with location data
    console.log('[LocationUpdate] Populating ThaiWater stations with location data');
    
    const populateArgs = [];
    if (options.limit) {
      populateArgs.push(`--limit=${options.limit}`);
    }
    if (options.newOnly) {
      populateArgs.push('--new-only');
    }
    if (options.forceUpdate) {
      populateArgs.push('--force-update');
    }
    
    await runScript('populate-thaiwater-locations', populateArgs);
    console.log('[LocationUpdate] ThaiWater stations location population completed');
    
    // Step 4: Check the updated location data
    console.log('[LocationUpdate] Checking the updated location data');
    await runScript('check-location-data');
    
    console.log('[LocationUpdate] Location update process completed successfully');
  } catch (error) {
    console.error('[LocationUpdate] Error during location update process:', error.message);
    process.exit(1);
  }
}

// Run the location update process
runLocationUpdate().catch(error => {
  console.error('[LocationUpdate] Unhandled error:', error.message);
  process.exit(1);
}); 