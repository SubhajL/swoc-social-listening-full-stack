#!/usr/bin/env node

/**
 * Rainfall Sync Diagnostics Tool
 * 
 * This script performs diagnostics on the rainfall sync system:
 * - Tests database connectivity
 * - Verifies API endpoints
 * - Checks environment variables
 * - Validates script permissions
 * 
 * Usage:
 *   node sync-diagnostics.js [hii|tmd|all]
 */

import pg from 'pg';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import os from 'os';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Load environment variables
console.log(`${colors.blue}Loading environment configuration...${colors.reset}`);
const envPath = path.resolve(backendRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`${colors.green}✓ Environment file found at ${envPath}${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠ Environment file not found at ${envPath}, using process.env${colors.reset}`);
  dotenv.config();
}

// API configuration
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '98';
const THAIWATER_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';
const TMD_RAINFALL_API_MID = '244';
const TMD_RAINFALL_API_EID = '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw';

// Parse command line arguments
const args = process.argv.slice(2);
const targetSystem = args[0]?.toLowerCase() || 'all';

// Main diagnostic function
async function runDiagnostics() {
  console.log(`\n${colors.bold}${colors.cyan}=== Rainfall Sync System Diagnostics ====${colors.reset}\n`);
  
  // System info
  await checkSystemInfo();
  
  // Environment check
  checkEnvironmentVariables();
  
  // Database connectivity check
  await checkDatabaseConnection();
  
  // Check script files
  checkScriptFiles();
  
  // API connectivity check based on target
  if (targetSystem === 'all' || targetSystem === 'hii') {
    await checkThaiWaterApi();
  }
  
  if (targetSystem === 'all' || targetSystem === 'tmd') {
    await checkTmdApi();
  }
  
  console.log(`\n${colors.bold}${colors.cyan}=== Diagnostics Complete ====${colors.reset}\n`);
}

// Check system information
async function checkSystemInfo() {
  console.log(`${colors.bold}1. System Information${colors.reset}`);
  console.log(`   Operating System: ${os.platform()} ${os.release()}`);
  console.log(`   Node.js Version: ${process.version}`);
  console.log(`   Current Working Directory: ${process.cwd()}`);
  console.log(`   Backend Root: ${backendRoot}`);
  console.log(`   User: ${os.userInfo().username}`);
  console.log(`   Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB total, ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB free`);
  
  try {
    const { stdout } = await executeCommand('node --version');
    console.log(`   Node.js Path: ${stdout.trim()}`);
  } catch (error) {
    console.log(`${colors.red}✗ Error getting Node.js path: ${error.message}${colors.reset}`);
  }
  
  console.log();
}

// Check if required environment variables are set
function checkEnvironmentVariables() {
  console.log(`${colors.bold}2. Environment Variables${colors.reset}`);
  
  const requiredVars = [
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'
  ];
  
  const optionalVars = [
    'DB_SSL', 'DB_POOL_SIZE', 'NODE_ENV', 'TZ'
  ];
  
  let allRequired = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      const maskedValue = maskSensitiveValue(varName, process.env[varName]);
      console.log(`   ${colors.green}✓ ${varName}${colors.reset}: ${maskedValue}`);
    } else {
      console.log(`   ${colors.red}✗ ${varName}: Not set (Required)${colors.reset}`);
      allRequired = false;
    }
  });
  
  if (!allRequired) {
    console.log(`\n   ${colors.red}Missing required environment variables. Please check your .env file.${colors.reset}`);
  }
  
  console.log(`\n   ${colors.blue}Optional Variables:${colors.reset}`);
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      const maskedValue = maskSensitiveValue(varName, process.env[varName]);
      console.log(`   ${colors.green}✓ ${varName}${colors.reset}: ${maskedValue}`);
    } else {
      console.log(`   ${colors.yellow}○ ${varName}: Not set (Optional)${colors.reset}`);
    }
  });
  
  console.log();
}

// Test database connection
async function checkDatabaseConnection() {
  console.log(`${colors.bold}3. Database Connectivity${colors.reset}`);
  
  // Check if required DB vars are set
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.log(`   ${colors.red}✗ Cannot test database connection: Missing required environment variables${colors.reset}`);
    return;
  }
  
  // Create database configuration
  const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000 // 10 seconds timeout for diagnostics
  };
  
  const { Pool } = pg;
  const pool = new Pool(dbConfig);
  
  try {
    console.log(`   Connecting to database at ${dbConfig.host}:${dbConfig.port}...`);
    
    const client = await pool.connect();
    console.log(`   ${colors.green}✓ Successfully connected to database${colors.reset}`);
    
    try {
      // Check PostgreSQL version
      const versionResult = await client.query('SELECT version()');
      console.log(`   ${colors.green}✓ PostgreSQL version: ${versionResult.rows[0].version.split(',')[0]}${colors.reset}`);
      
      // Check if required tables exist
      console.log(`   Checking required tables...`);
      const tableResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('thaiwater_tele_stations', 'thaiwater_rainfall_data_new')
      `);
      
      const existingTables = tableResult.rows.map(row => row.table_name);
      
      ['thaiwater_tele_stations', 'thaiwater_rainfall_data_new'].forEach(tableName => {
        if (existingTables.includes(tableName)) {
          console.log(`   ${colors.green}✓ Table ${tableName} exists${colors.reset}`);
        } else {
          console.log(`   ${colors.red}✗ Table ${tableName} does not exist${colors.reset}`);
        }
      });
      
      // Check row counts if tables exist
      if (existingTables.includes('thaiwater_tele_stations')) {
        const stationCount = await client.query('SELECT COUNT(*) FROM thaiwater_tele_stations');
        console.log(`   ${colors.green}✓ thaiwater_tele_stations has ${stationCount.rows[0].count} rows${colors.reset}`);
      }
      
      if (existingTables.includes('thaiwater_rainfall_data_new')) {
        const dataCount = await client.query('SELECT COUNT(*) FROM thaiwater_rainfall_data_new');
        console.log(`   ${colors.green}✓ thaiwater_rainfall_data_new has ${dataCount.rows[0].count} rows${colors.reset}`);
        
        // Check recent data
        const recentData = await client.query(`
          SELECT MAX(rainfall_datetime) as latest_timestamp 
          FROM thaiwater_rainfall_data_new
        `);
        
        if (recentData.rows[0].latest_timestamp) {
          const latestDate = new Date(recentData.rows[0].latest_timestamp);
          const now = new Date();
          const daysDifference = (now - latestDate) / (1000 * 60 * 60 * 24);
          
          if (daysDifference < 1) {
            console.log(`   ${colors.green}✓ Latest rainfall data is from ${latestDate.toISOString()} (today)${colors.reset}`);
          } else if (daysDifference < 2) {
            console.log(`   ${colors.yellow}⚠ Latest rainfall data is from ${latestDate.toISOString()} (yesterday)${colors.reset}`);
          } else {
            console.log(`   ${colors.red}✗ Latest rainfall data is from ${latestDate.toISOString()} (${Math.round(daysDifference)} days old)${colors.reset}`);
          }
        } else {
          console.log(`   ${colors.red}✗ No rainfall timestamp data found${colors.reset}`);
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Failed to connect to database: ${error.message}${colors.reset}`);
    console.log(`   ${colors.yellow}  Detail: ${error.detail || 'No additional details'}${colors.reset}`);
  } finally {
    // Close the pool
    await pool.end();
  }
  
  console.log();
}

// Check script files
function checkScriptFiles() {
  console.log(`${colors.bold}4. Script Files${colors.reset}`);
  
  const scriptFiles = [
    { name: 'HII Data Sync', path: path.join(__dirname, 'sync-hii-data.mjs') },
    { name: 'TMD Data Sync', path: path.join(__dirname, 'sync-tmd-data.mjs') },
    { name: 'Combined Rainfall Sync', path: path.join(__dirname, 'run-all-rainfall-sync.mjs') },
    { name: 'Scheduler', path: path.join(__dirname, 'schedule-rainfall-sync.mjs') }
  ];
  
  scriptFiles.forEach(script => {
    if (fs.existsSync(script.path)) {
      const stats = fs.statSync(script.path);
      const permissions = getFilePermissions(stats);
      const lastModified = new Date(stats.mtime).toISOString();
      
      console.log(`   ${colors.green}✓ ${script.name}${colors.reset}`);
      console.log(`     Path: ${script.path}`);
      console.log(`     Size: ${stats.size} bytes`);
      console.log(`     Permissions: ${permissions}`);
      console.log(`     Last Modified: ${lastModified}`);
      
      if (!stats.mode & 0o100) {
        console.log(`     ${colors.yellow}⚠ Script may not be executable${colors.reset}`);
      }
    } else {
      console.log(`   ${colors.red}✗ ${script.name}: File not found${colors.reset}`);
      console.log(`     Expected path: ${script.path}`);
    }
    console.log();
  });
}

// Check ThaiWater (HII) API connectivity
async function checkThaiWaterApi() {
  console.log(`${colors.bold}5. HII API Connectivity${colors.reset}`);
  
  try {
    console.log(`   Testing HII API endpoint...`);
    
    // Test request for station data
    const stationResponse = await axios.post(THAIWATER_API_ENDPOINT, {
      'mid': THAIWATER_API_MID,
      'eid': THAIWATER_API_EID,
      'eid_type': 'station',
      'params': {}
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    if (stationResponse.data && stationResponse.data.result) {
      console.log(`   ${colors.green}✓ Successfully connected to HII API${colors.reset}`);
      console.log(`   ${colors.green}✓ Received station data with ${stationResponse.data.result.length} stations${colors.reset}`);
    } else {
      console.log(`   ${colors.red}✗ API response did not contain expected station data${colors.reset}`);
      console.log(`   Response: ${JSON.stringify(stationResponse.data).substring(0, 200)}...`);
    }
    
    // Test request for rainfall data (minimal to avoid large response)
    const rainfallResponse = await axios.post(THAIWATER_API_ENDPOINT, {
      'mid': THAIWATER_API_MID,
      'eid': THAIWATER_API_EID,
      'eid_type': 'rain',
      'params': {
        'limit': 5
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    if (rainfallResponse.data && rainfallResponse.data.result) {
      console.log(`   ${colors.green}✓ Successfully received rainfall data${colors.reset}`);
      console.log(`   ${colors.green}✓ Sample data count: ${rainfallResponse.data.result.length}${colors.reset}`);
    } else {
      console.log(`   ${colors.red}✗ API response did not contain expected rainfall data${colors.reset}`);
      console.log(`   Response: ${JSON.stringify(rainfallResponse.data).substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Failed to connect to HII API: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
  }
  
  console.log();
}

// Check TMD API connectivity
async function checkTmdApi() {
  console.log(`${colors.bold}6. TMD API Connectivity${colors.reset}`);
  
  const axiosInstance = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'SWOC-Diagnostics/1.0'
    },
    maxRedirects: 5
  });
  
  // Disable SSL certificate validation for diagnostics
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  try {
    console.log(`   Testing TMD Stations API endpoint...`);
    
    // Test stations endpoint with a small request
    const stationsResponse = await axiosInstance.post(THAIWATER_API_ENDPOINT, {
      mid: TMD_STATION_API_MID,
      eid: TMD_STATION_API_EID,
      param: {
        limit: 1
      }
    });
    
    console.log(`   ${colors.green}✓ Successfully connected to TMD Stations API${colors.reset}`);
    console.log(`   ${colors.green}✓ Received data with status code ${stationsResponse.status}${colors.reset}`);
    
    // Test rainfall endpoint
    console.log(`   Testing TMD Rainfall API endpoint...`);
    
    const rainfallResponse = await axiosInstance.post(THAIWATER_API_ENDPOINT, {
      mid: TMD_RAINFALL_API_MID,
      eid: TMD_RAINFALL_API_EID,
      param: {
        limit: 1
      }
    });
    
    console.log(`   ${colors.green}✓ Successfully connected to TMD Rainfall API${colors.reset}`);
    console.log(`   ${colors.green}✓ Received data with status code ${rainfallResponse.status}${colors.reset}`);
    
    // Check response data
    if (rainfallResponse.data && Array.isArray(rainfallResponse.data)) {
      console.log(`   ${colors.green}✓ API response format is valid${colors.reset}`);
      console.log(`   ${colors.blue}ℹ Sample data: ${JSON.stringify(rainfallResponse.data.slice(0, 1)).substring(0, 100)}...${colors.reset}`);
    } else {
      console.log(`   ${colors.yellow}⚠ API response format is unexpected${colors.reset}`);
      console.log(`   ${colors.blue}ℹ Received: ${JSON.stringify(rainfallResponse.data).substring(0, 100)}...${colors.reset}`);
    }
  } catch (error) {
    console.log(`   ${colors.red}✗ Failed to connect to TMD API: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log(`   ${colors.red}  Status: ${error.response.status}${colors.reset}`);
      console.log(`   ${colors.red}  Data: ${JSON.stringify(error.response.data).substring(0, 200)}${colors.reset}`);
    }
  }
  
  console.log();
}

// Helper function to mask sensitive values
function maskSensitiveValue(name, value) {
  const sensitiveVars = ['DB_PASSWORD', 'DB_USER', 'API_KEY', 'SECRET'];
  
  if (sensitiveVars.includes(name)) {
    if (!value) return 'not set';
    if (value.length <= 3) return '***'; // Too short to show anything
    return value.substring(0, 2) + '***' + value.substring(value.length - 2);
  }
  
  return value;
}

// Helper function to get file permissions in human-readable format
function getFilePermissions(stats) {
  const mode = stats.mode;
  const result = [];
  
  // Owner permissions
  result.push((mode & 0o400) ? 'r' : '-');
  result.push((mode & 0o200) ? 'w' : '-');
  result.push((mode & 0o100) ? 'x' : '-');
  
  // Group permissions
  result.push((mode & 0o40) ? 'r' : '-');
  result.push((mode & 0o20) ? 'w' : '-');
  result.push((mode & 0o10) ? 'x' : '-');
  
  // Other permissions
  result.push((mode & 0o4) ? 'r' : '-');
  result.push((mode & 0o2) ? 'w' : '-');
  result.push((mode & 0o1) ? 'x' : '-');
  
  return result.join('');
}

// Helper function to execute shell commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// Run the diagnostics
runDiagnostics().catch(error => {
  console.error(`${colors.red}Unhandled error in diagnostics: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
}); 