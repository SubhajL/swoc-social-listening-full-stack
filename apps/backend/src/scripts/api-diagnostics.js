// API Diagnostics Script
// Tests API connectivity using the exact implementation from working sync scripts
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// For ES modules, we need to create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create logs directory if it doesn't exist
const LOG_DIRECTORY = path.resolve(process.cwd(), '../../logs');
if (!fs.existsSync(LOG_DIRECTORY)) {
  fs.mkdirSync(LOG_DIRECTORY, { recursive: true });
}

// Log filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.resolve(LOG_DIRECTORY, `API-Diagnostics-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Simple logging function
function log(level, message, data = {}) {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...data
  };
  
  // Output to console
  console.log(`[${level.toUpperCase()}] ${message}`);
  if (data.error) console.error(data.error);
  if (data.data && typeof data.data === 'object') {
    console.log('Data:', JSON.stringify(data.data, null, 2).substring(0, 500) + '...');
  }
  
  // Write to log file
  logStream.write(JSON.stringify(entry) + '\n');
}

// =====================================
// API CONFIGURATION FROM WORKING SCRIPTS
// =====================================

// Common API endpoint
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// =====================================
// API CREDENTIALS - CURRENT AND NEW
// =====================================

// HII API credentials
const HII_CONFIGS = [
  {
    name: "HII Rainfall (Current)",
    mid: '98',
    eid: 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w'
  },
  {
    name: "HII Alternative",
    mid: '105',
    eid: 'CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg'
  }
];

// TMD API credentials
const TMD_CONFIGS = [
  {
    name: "TMD Station (Current)",
    mid: '264',
    eid: 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA'
  },
  {
    name: "TMD Rainfall (Current)",
    mid: '265',
    eid: 'bUYiAzxWG7FOCpDcrRVLCM6FOz93aCRDCU7k3y6RbLz3kLTPOlRZrJHTRr9LIeD-pFsFTSF6CWTxXxkVp1IKjQ'
  },
  {
    name: "TMD Alternative",
    mid: '244',
    eid: '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw'
  }
];

// =====================================
// TEST FUNCTIONS
// =====================================

/**
 * Test API call using GET method (from test-thaiwater-api.js)
 */
async function testGetApi(name, mid, eid) {
  log('info', `Testing ${name} API using GET method...`);
  
  try {
    // This is the exact URL format used in the working test script
    const url = `${THAIWATER_API_ENDPOINT}?mid=${mid}&eid=${encodeURIComponent(eid)}`;
    
    log('info', `Calling API URL: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 30000,  // 30 second timeout
      headers: {
        'User-Agent': 'SWOC-Rainfall-Sync/1.0'
      }
    });
    
    if (response.status !== 200) {
      log('error', `${name} API GET request failed with status ${response.status}`, {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }
    
    const responseData = response.data;
    log('info', `${name} API GET response received`, {
      status: response.status,
      isArray: Array.isArray(responseData),
      dataLength: Array.isArray(responseData) ? responseData.length : 'N/A',
      data: {
        sample: Array.isArray(responseData) 
          ? responseData.slice(0, 2) 
          : (typeof responseData === 'object' ? responseData : { raw: String(responseData).substring(0, 500) })
      }
    });
    
    return true;
  } catch (error) {
    log('error', `${name} API GET request failed`, {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Test API call using POST method (alternative method)
 */
async function testPostApi(name, mid, eid) {
  log('info', `Testing ${name} API using POST method...`);
  
  try {
    const payload = {
      mid: mid,
      eid: eid
    };
    
    log('info', `Calling API with payload`, { data: payload });
    
    const response = await axios.post(THAIWATER_API_ENDPOINT, payload, {
      timeout: 30000,  // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SWOC-Rainfall-Sync/1.0'
      }
    });
    
    if (response.status !== 200) {
      log('error', `${name} API POST request failed with status ${response.status}`, {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }
    
    const responseData = response.data;
    log('info', `${name} API POST response received`, {
      status: response.status,
      isArray: Array.isArray(responseData),
      dataLength: Array.isArray(responseData) ? responseData.length : 'N/A',
      data: {
        sample: Array.isArray(responseData) 
          ? responseData.slice(0, 2) 
          : (typeof responseData === 'object' ? responseData : { raw: String(responseData).substring(0, 500) })
      }
    });
    
    return true;
  } catch (error) {
    log('error', `${name} API POST request failed`, {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Run all API diagnostics
 */
async function runApiDiagnostics() {
  log('info', '=== Starting API Diagnostics ===', {
    timestamp: new Date().toISOString(),
    logFile: logFile
  });
  
  log('info', '=== IMPORTANT NOTE ===');
  log('info', 'The test-thaiwater-api.js script uses GET requests with URL parameters, not POST requests with JSON body.');
  log('info', 'This diagnostic will test both methods, but GET should be used in the sync scripts.');
  
  // Test HII Endpoints
  log('info', '=== Testing HII API Endpoints ===');
  for (const config of HII_CONFIGS) {
    log('info', `Testing ${config.name} (mid=${config.mid})...`);
    const getSuccess = await testGetApi(config.name, config.mid, config.eid);
    const postSuccess = await testPostApi(config.name, config.mid, config.eid);
    log('info', `${config.name} results:`, {
      data: {
        GET: getSuccess ? 'SUCCESS' : 'FAILED',
        POST: postSuccess ? 'SUCCESS' : 'FAILED'
      }
    });
  }
  
  // Test TMD Endpoints
  log('info', '=== Testing TMD API Endpoints ===');
  for (const config of TMD_CONFIGS) {
    log('info', `Testing ${config.name} (mid=${config.mid})...`);
    const getSuccess = await testGetApi(config.name, config.mid, config.eid);
    const postSuccess = await testPostApi(config.name, config.mid, config.eid);
    log('info', `${config.name} results:`, {
      data: {
        GET: getSuccess ? 'SUCCESS' : 'FAILED',
        POST: postSuccess ? 'SUCCESS' : 'FAILED'
      }
    });
  }
  
  // Summarize results
  log('info', '=== API Diagnostics Complete ===', {
    timestamp: new Date().toISOString(),
    logFile: logFile
  });
  
  // Close log stream
  logStream.end();
}

// Run the diagnostics
runApiDiagnostics().catch(error => {
  log('error', 'Unhandled error in diagnostics', { error: error.message, stack: error.stack });
  logStream.end();
}); 