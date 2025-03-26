#!/usr/bin/env node

/**
 * RID Telemetry Data Fetch - All Hydro Regions
 * 
 * This script fetches telemetry data from the RID API for all hydro regions (1-8)
 * and stores it in the database.
 * 
 * Usage:
 *   node fetch-all-hydro-regions.js [--date YYYY-MM-DD]
 * 
 * Options:
 *   --date: Fetch data for a specific date (default: today)
 * 
 * Examples:
 *   node fetch-all-hydro-regions.js
 *   node fetch-all-hydro-regions.js --date 2025-03-20
 */

const { spawn } = require('child_process');
const path = require('path');

// Print script usage
function printUsage() {
  console.log('Usage: node fetch-all-hydro-regions.js [--date YYYY-MM-DD]');
  console.log('');
  console.log('Options:');
  console.log('  --date: Fetch data for a specific date (default: today)');
  console.log('');
  console.log('Examples:');
  console.log('  node fetch-all-hydro-regions.js');
  console.log('  node fetch-all-hydro-regions.js --date 2025-03-20');
}

// Run the telemetry data fetch script for a specific hydro ID
function fetchTelemetryDataForHydroId(hydroId, dateString = null) {
  return new Promise((resolve, reject) => {
    // Use npm run instead of direct node call
    const args = ['run', 'fetch-telemetry', '--', hydroId];
    
    // Add date parameter if provided
    if (dateString) {
      args.push('--date', dateString);
    }
    
    console.log(`\n=== Fetching data for hydro ID ${hydroId} ===`);
    console.log(`Running: npm ${args.join(' ')}\n`);
    
    // Spawn the process using npm instead of node
    const childProcess = spawn('npm', args, {
      stdio: 'inherit' // Show output in the console
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✓ Successfully completed fetch for hydro ID ${hydroId}`);
        resolve();
      } else {
        console.error(`\n✗ Failed to fetch data for hydro ID ${hydroId} (exit code: ${code})`);
        resolve(); // We still resolve to continue with the next hydro ID
      }
    });
    
    childProcess.on('error', (err) => {
      console.error(`\n✗ Error executing fetch for hydro ID ${hydroId}:`, err.message);
      resolve(); // We still resolve to continue with the next hydro ID
    });
  });
}

// Main function
async function main() {
  try {
    console.log('=== RID Telemetry Data Fetch - All Hydro Regions ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let dateString = null;
    
    // Check for --help flag
    if (args.includes('--help') || args.includes('-h')) {
      printUsage();
      process.exit(0);
    }
    
    // Check for --date flag
    const dateIndex = args.indexOf('--date');
    if (dateIndex !== -1 && dateIndex + 1 < args.length) {
      dateString = args[dateIndex + 1];
      const parsedDate = new Date(dateString);
      
      if (!isNaN(parsedDate.getTime())) {
        console.log(`Will fetch data for date: ${parsedDate.toISOString().split('T')[0]}`);
      } else {
        console.error(`Invalid date format: ${dateString}`);
        console.error('Please use YYYY-MM-DD format');
        process.exit(1);
      }
    }
    
    // Define hydro IDs to fetch
    const hydroIds = [1, 2, 3, 4, 5, 6, 7, 8];
    
    // Process each hydro ID sequentially
    for (const hydroId of hydroIds) {
      await fetchTelemetryDataForHydroId(hydroId, dateString);
    }
    
    // Print final summary
    console.log('\n=== All Hydro Regions Fetch Summary ===');
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('Successfully executed fetch for all hydro regions.');
    
  } catch (error) {
    console.error('Error in main function:', error.message);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
}); 