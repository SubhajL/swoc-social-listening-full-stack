#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTaskStatuses, checkReservoirData, checkRainfallData } from './track-sync-progress.mjs';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../../logs');

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// Generate status emoji
function getStatusEmoji(status) {
  switch (status) {
    case 'SUCCESS': return '✅';
    case 'RUNNING': return '🔄';
    case 'ERROR': return '❌';
    case 'PENDING': return '⏳';
    default: return '❓';
  }
}

// Generate the report
async function generateReport() {
  try {
    console.log('Generating data sync status report...');
    
    // Get task statuses
    const statusResult = await getTaskStatuses();
    if (!statusResult.success) {
      console.error('Error getting task statuses:', statusResult.error);
      return;
    }
    
    // Get reservoir data stats
    const reservoirResult = await checkReservoirData();
    const reservoirStats = reservoirResult.success ? reservoirResult.data : null;
    
    // Get rainfall data stats
    const rainfallResult = await checkRainfallData();
    const rainfallStats = rainfallResult.success ? rainfallResult.data : null;
    
    // Build the report
    let report = `# Data Sync Status Report\n\n`;
    report += `*Generated at: ${new Date().toLocaleString()}*\n\n`;
    
    report += `## Task Status Summary\n\n`;
    report += `| Task | Status | Last Run | Records Processed |\n`;
    report += `|------|--------|----------|-------------------|\n`;
    
    for (const task of statusResult.data) {
      report += `| ${task.task_name} | ${getStatusEmoji(task.status)} ${task.status} | ${formatDate(task.last_run)} | ${task.records_processed || 0} |\n`;
    }
    
    report += `\n## Detailed Statistics\n\n`;
    
    if (reservoirStats) {
      report += `### Reservoir Data\n\n`;
      report += `- Total records: ${reservoirStats.total_records || 0}\n`;
      report += `- Unique stations: ${reservoirStats.unique_stations || 0}\n`;
      report += `- Last updated: ${formatDate(reservoirStats.last_updated)}\n\n`;
    } else {
      report += `### Reservoir Data\n\n`;
      report += `- Error retrieving reservoir data stats\n\n`;
    }
    
    if (rainfallStats) {
      report += `### Rainfall Data\n\n`;
      report += `- Total records: ${rainfallStats.total_records || 0}\n`;
      report += `- Unique stations: ${rainfallStats.unique_stations || 0}\n`;
      report += `- Last updated: ${formatDate(rainfallStats.last_updated)}\n\n`;
    } else {
      report += `### Rainfall Data\n\n`;
      report += `- Error retrieving rainfall data stats${rainfallResult.error ? ': ' + rainfallResult.error : ''}\n\n`;
    }
    
    report += `## Error Details\n\n`;
    let hasErrors = false;
    
    for (const task of statusResult.data) {
      if (task.error_message) {
        hasErrors = true;
        report += `### ${task.task_name}\n\n`;
        report += `\`\`\`\n${task.error_message}\n\`\`\`\n\n`;
      }
    }
    
    if (!hasErrors) {
      report += `No errors reported for any tasks.\n`;
    }
    
    // Ensure log directory exists
    await fs.mkdir(logDir, { recursive: true });
    
    // Write the report
    const reportPath = path.join(logDir, 'sync-report.md');
    await fs.writeFile(reportPath, report);
    
    console.log(`Report generated and saved to: ${reportPath}`);
    
    // Print to console
    console.log('\n' + report);
    
    return reportPath;
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

// Run the function if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  generateReport().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { generateReport }; 