#!/usr/bin/env node

/**
 * Autostart Manager
 * 
 * ⚠️ WARNING: THIS SCRIPT IS DEPRECATED ⚠️
 * 
 * This script sets up auto-starting for the ROOT scheduler, which is NOT recommended.
 * 
 * INSTEAD, please use the backend scheduler:
 * cd apps/backend && npm run scheduler:start
 * 
 * For more information, see:
 * apps/backend/src/scripts/SCHEDULER.md
 * 
 * This script sets up the scheduler service to start automatically on system boot.
 * It supports both systemd (Linux) and launchd (macOS) systems.
 * 
 * Usage:
 *   node autostart-manager.js [command]
 * 
 * Commands:
 *   install   - Install the autostart configuration
 *   uninstall - Remove the autostart configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Paths
const CURRENT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCHEDULER_SCRIPT = path.join(PROJECT_ROOT, 'scripts/legacy/scheduler-service.js');
const SYSTEM_TYPE = process.platform;

// Service name
const SERVICE_NAME = 'swoc-telemetry-scheduler';

// Check for root privileges on Linux/macOS
function isRoot() {
  return process.getuid && process.getuid() === 0;
}

// Check platform
function getPlatform() {
  const platform = os.platform();
  
  if (platform === 'linux') {
    return 'linux';
  } else if (platform === 'darwin') {
    return 'macos';
  } else if (platform === 'win32') {
    return 'windows';
  } else {
    return 'unknown';
  }
}

// Install systemd service (Linux)
function installSystemd() {
  if (!isRoot()) {
    console.error('Error: This command requires root privileges on Linux.');
    console.error('Please run with sudo: sudo npm run autostart:install');
    return false;
  }
  
  // Create systemd service file
  const serviceFile = `/etc/systemd/system/${SERVICE_NAME}.service`;
  const serviceContent = `[Unit]
Description=SWOC Telemetry Data Scheduler Service
After=network.target

[Service]
Type=simple
User=${process.env.SUDO_USER || process.env.USER}
WorkingDirectory=${PROJECT_ROOT}
ExecStart=/usr/bin/node ${SCHEDULER_SCRIPT} run
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
`;

  try {
    fs.writeFileSync(serviceFile, serviceContent);
    console.log(`Created systemd service file: ${serviceFile}`);
    
    // Reload systemd
    execSync('systemctl daemon-reload');
    console.log('Reloaded systemd configuration.');
    
    // Enable and start the service
    execSync(`systemctl enable ${SERVICE_NAME}`);
    console.log(`Enabled ${SERVICE_NAME} service to start on boot.`);
    
    execSync(`systemctl start ${SERVICE_NAME}`);
    console.log(`Started ${SERVICE_NAME} service.`);
    
    return true;
  } catch (err) {
    console.error(`Error installing systemd service: ${err.message}`);
    return false;
  }
}

// Install launchd service (macOS)
function installLaunchd() {
  // Create launchd plist file in user's LaunchAgents directory
  const launchAgentsDir = path.join(os.homedir(), 'Library/LaunchAgents');
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
  }
  
  const plistFile = path.join(launchAgentsDir, `dev.swoc.${SERVICE_NAME}.plist`);
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>dev.swoc.${SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${SCHEDULER_SCRIPT}</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${PROJECT_ROOT}</string>
    <key>StandardOutPath</key>
    <string>${PROJECT_ROOT}/logs/scheduler-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJECT_ROOT}/logs/scheduler-stderr.log</string>
</dict>
</plist>`;

  try {
    fs.writeFileSync(plistFile, plistContent);
    console.log(`Created launchd plist file: ${plistFile}`);
    
    // Load the service
    execSync(`launchctl load -w ${plistFile}`);
    console.log(`Loaded ${SERVICE_NAME} service to start on boot.`);
    
    return true;
  } catch (err) {
    console.error(`Error installing launchd service: ${err.message}`);
    return false;
  }
}

// Install Windows service
function installWindows() {
  console.log('Windows service installation is not yet implemented.');
  console.log('Please manually set up the scheduler to run on startup:');
  console.log(`1. Create a shortcut to: node ${SCHEDULER_SCRIPT} run`);
  console.log('2. Place the shortcut in your Windows Startup folder.');
  return false;
}

// Uninstall systemd service (Linux)
function uninstallSystemd() {
  if (!isRoot()) {
    console.error('Error: This command requires root privileges on Linux.');
    console.error('Please run with sudo: sudo npm run autostart:uninstall');
    return false;
  }
  
  const serviceFile = `/etc/systemd/system/${SERVICE_NAME}.service`;
  
  try {
    // Check if service exists
    if (!fs.existsSync(serviceFile)) {
      console.log('Service is not installed.');
      return true;
    }
    
    // Stop and disable the service
    try {
      execSync(`systemctl stop ${SERVICE_NAME}`);
      console.log(`Stopped ${SERVICE_NAME} service.`);
    } catch (err) {
      console.log(`Service was not running: ${err.message}`);
    }
    
    try {
      execSync(`systemctl disable ${SERVICE_NAME}`);
      console.log(`Disabled ${SERVICE_NAME} service.`);
    } catch (err) {
      console.log(`Could not disable service: ${err.message}`);
    }
    
    // Remove the service file
    fs.unlinkSync(serviceFile);
    console.log(`Removed systemd service file: ${serviceFile}`);
    
    // Reload systemd
    execSync('systemctl daemon-reload');
    console.log('Reloaded systemd configuration.');
    
    return true;
  } catch (err) {
    console.error(`Error uninstalling systemd service: ${err.message}`);
    return false;
  }
}

// Uninstall launchd service (macOS)
function uninstallLaunchd() {
  const plistFile = path.join(os.homedir(), `Library/LaunchAgents/dev.swoc.${SERVICE_NAME}.plist`);
  
  try {
    // Check if service exists
    if (!fs.existsSync(plistFile)) {
      console.log('Service is not installed.');
      return true;
    }
    
    // Unload the service
    try {
      execSync(`launchctl unload -w ${plistFile}`);
      console.log(`Unloaded ${SERVICE_NAME} service.`);
    } catch (err) {
      console.log(`Could not unload service: ${err.message}`);
    }
    
    // Remove the plist file
    fs.unlinkSync(plistFile);
    console.log(`Removed launchd plist file: ${plistFile}`);
    
    return true;
  } catch (err) {
    console.error(`Error uninstalling launchd service: ${err.message}`);
    return false;
  }
}

// Uninstall Windows service
function uninstallWindows() {
  console.log('Windows service uninstallation is not yet implemented.');
  console.log('Please manually remove the scheduler from startup:');
  console.log('1. Delete the shortcut from your Windows Startup folder.');
  return false;
}

// Main installation function
function install() {
  console.log('\n⚠️  WARNING: This autostart manager is DEPRECATED ⚠️\n');
  console.log('Installing this service would start the ROOT scheduler, which is NOT recommended.');
  console.log('It may cause conflicts with the backend scheduler that is already running.\n');
  console.log('INSTEAD, please use the backend scheduler:');
  console.log('  cd apps/backend && npm run scheduler:start\n');
  console.log('For more information, see:');
  console.log('  apps/backend/src/scripts/SCHEDULER.md\n');
  console.log('Installation aborted for your safety.');
  
  // Uncomment the code below if you REALLY want to install the root scheduler
  // (This is not recommended)
  /*
  const platform = getPlatform();
  
  if (platform === 'linux') {
    if (!isRoot()) {
      console.error('Error: This operation requires sudo privileges on Linux.');
      console.log('Please run again with sudo.');
      return false;
    }
    return installSystemd();
  } else if (platform === 'macos') {
    return installLaunchd();
  } else if (platform === 'windows') {
    return installWindows();
  } else {
    console.error(`Error: Unsupported platform: ${platform}`);
    return false;
  }
  */
  
  return false;
}

// Uninstall autostart
function uninstall() {
  console.log('Uninstalling autostart configuration...');
  
  const platform = getPlatform();
  
  switch (platform) {
    case 'linux':
      return uninstallSystemd();
    case 'macos':
      return uninstallLaunchd();
    case 'windows':
      return uninstallWindows();
    default:
      console.error(`Unsupported platform: ${platform}`);
      return false;
  }
}

// Main function
function main() {
  const command = process.argv[2] || 'help';
  
  switch (command) {
    case 'install':
      const success = install();
      process.exit(success ? 0 : 1);
      break;
    case 'uninstall':
      const uninstallSuccess = uninstall();
      process.exit(uninstallSuccess ? 0 : 1);
      break;
    default:
      console.log('Usage: node autostart-manager.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  install   - Install the autostart configuration');
      console.log('  uninstall - Remove the autostart configuration');
      process.exit(1);
  }
}

main(); 