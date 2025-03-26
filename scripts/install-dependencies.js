#!/usr/bin/env node

/**
 * Dependency Installer
 * 
 * This script installs the required dependencies for the scheduler service.
 * It checks if the dependencies are already installed and installs only
 * what's missing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths
const CURRENT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(CURRENT_DIR, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

// Dependencies required for the scheduler
const REQUIRED_DEPENDENCIES = {
  'node-cron': '^3.0.3',
  'dotenv': '^16.4.7',
  'pidusage': '^3.0.2'
};

// Check if package.json exists
if (!fs.existsSync(PACKAGE_JSON_PATH)) {
  console.error('Error: package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

// Check if dependencies exist
const missingDependencies = {};
const currentDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

Object.keys(REQUIRED_DEPENDENCIES).forEach(dep => {
  if (!currentDependencies[dep]) {
    missingDependencies[dep] = REQUIRED_DEPENDENCIES[dep];
  }
});

// Install missing dependencies
if (Object.keys(missingDependencies).length > 0) {
  console.log('Installing missing dependencies...');
  
  // Build install command
  const dependencies = Object.keys(missingDependencies)
    .map(dep => `${dep}@${missingDependencies[dep]}`)
    .join(' ');
  
  // Detect package manager
  let packageManager = 'npm';
  
  if (fs.existsSync(path.join(PROJECT_ROOT, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(PROJECT_ROOT, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  }
  
  // Install command based on package manager
  const installCommand = packageManager === 'npm' 
    ? `npm install ${dependencies}` 
    : packageManager === 'yarn' 
      ? `yarn add ${dependencies}` 
      : `pnpm add ${dependencies}`;
  
  console.log(`Using ${packageManager} to install dependencies...`);
  console.log(`Running: ${installCommand}`);
  
  try {
    execSync(installCommand, { 
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    console.log('Dependencies installed successfully.');
  } catch (error) {
    console.error(`Error installing dependencies: ${error.message}`);
    console.error('Please install the following dependencies manually:');
    Object.keys(missingDependencies).forEach(dep => {
      console.log(`  - ${dep}@${missingDependencies[dep]}`);
    });
    process.exit(1);
  }
} else {
  console.log('All required dependencies are already installed.');
}

// Create logs directory if it doesn't exist
const logsDir = path.join(PROJECT_ROOT, 'logs');
if (!fs.existsSync(logsDir)) {
  console.log('Creating logs directory...');
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Logs directory created successfully.');
}

console.log('Setup completed successfully. You can now use the scheduler service.');
console.log('To view available commands, run: npm run scheduler:list'); 