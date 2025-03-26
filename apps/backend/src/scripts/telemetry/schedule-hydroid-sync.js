#!/usr/bin/env node

/**
 * Scheduled Hydroid Data Sync
 * 
 * This script fetches telemetry data for specific hydro regions
 * based on configured priorities and intervals.
 * 
 * Used by the scheduler service for targeted data synchronization.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration for which hydro regions to sync and their priority
const HYDRO_REGIONS = [
  // Region ID, Priority (1-5, 1 is highest), Description
  [3, 3, "Northeast region"],
  [4, 3, "Central region"],
  [5, 4, "Eastern region"],
  [6, 4, "Western region"],
  [7, 5, "Southern region"],
  [8, 5, "Northern region"]
];

// Path to the last sync tracking file
const LAST_SYNC_FILE = path.join(__dirname, '.hydroid-last-sync.json');

// Default sync intervals based on priority (in hours)
const PRIORITY_INTERVALS = {
  1: 1,    // Priority 1: Every hour
  2: 2,    // Priority 2: Every 2 hours
  3: 4,    // Priority 3: Every 4 hours
  4: 6,    // Priority 4: Every 6 hours
  5: 12    // Priority 5: Every 12 hours
};

// Read the last sync times
function getLastSyncTimes() {
  try {
    if (fs.existsSync(LAST_SYNC_FILE)) {
      const data = fs.readFileSync(LAST_SYNC_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading last sync times: ${err.message}`);
  }
  
  // Return empty object if file doesn't exist or can't be read
  return {};
}

// Save the last sync times
function saveLastSyncTimes(syncTimes) {
  try {
    fs.writeFileSync(LAST_SYNC_FILE, JSON.stringify(syncTimes, null, 2));
  } catch (err) {
    console.error(`Error saving last sync times: ${err.message}`);
  }
}

// Check if a region needs to be synced based on its priority and last sync time
function needsSync(regionId, priority, lastSyncTimes) {
  const now = Date.now();
  const lastSync = lastSyncTimes[regionId] || 0;
  const interval = PRIORITY_INTERVALS[priority] || 24; // Default to once a day
  
  // Convert interval from hours to milliseconds
  const intervalMs = interval * 60 * 60 * 1000;
  
  return (now - lastSync) >= intervalMs;
}

// Fetch telemetry data for a specific hydro region
function fetchHydroRegion(regionId) {
  return new Promise((resolve) => {
    console.log(`Fetching telemetry data for hydro region ${regionId}...`);
    
    // Use the npm script to fetch data
    const child = spawn('npm', ['run', 'sync:hydroid:single', '--', regionId.toString()], {
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully fetched data for hydro region ${regionId}`);
        resolve(true);
      } else {
        console.error(`Failed to fetch data for hydro region ${regionId} (exit code: ${code})`);
        resolve(false);
      }
    });
    
    child.on('error', (err) => {
      console.error(`Error fetching data for hydro region ${regionId}: ${err.message}`);
      resolve(false);
    });
  });
}

// Main function
async function main() {
  console.log('Starting scheduled hydroid data sync...');
  console.log(`Current time: ${new Date().toISOString()}`);
  
  // Read last sync times
  const lastSyncTimes = getLastSyncTimes();
  
  console.log('Checking which regions need to be synced...');
  
  // Track updates to sync times
  const updatedSyncTimes = { ...lastSyncTimes };
  let syncCount = 0;
  
  // Check and sync each region
  for (const [regionId, priority, description] of HYDRO_REGIONS) {
    const lastSync = lastSyncTimes[regionId] ? new Date(lastSyncTimes[regionId]).toISOString() : 'never';
    console.log(`Region ${regionId} (${description}): Priority ${priority}, Last sync: ${lastSync}`);
    
    if (needsSync(regionId, priority, lastSyncTimes)) {
      console.log(`Region ${regionId} needs to be synced.`);
      
      // Fetch data for this region
      const success = await fetchHydroRegion(regionId);
      
      if (success) {
        // Update last sync time
        updatedSyncTimes[regionId] = Date.now();
        syncCount++;
      }
    } else {
      console.log(`Region ${regionId} does not need to be synced yet.`);
    }
  }
  
  // Save updated sync times
  saveLastSyncTimes(updatedSyncTimes);
  
  console.log(`\nScheduled sync completed: ${syncCount} regions synchronized.`);
}

// Run the main function
main().catch(err => {
  console.error('Error in scheduled hydroid sync:', err);
  process.exit(1);
}); 