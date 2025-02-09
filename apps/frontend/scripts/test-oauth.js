import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load OAuth library
const oauthJs = fs.readFileSync(path.join(__dirname, '../public/lib/oauth.js'), 'utf8');
const sha1Js = fs.readFileSync(path.join(__dirname, '../public/lib/sha1.js'), 'utf8');

// Create a minimal window-like environment
global.window = {};
global.document = {
  getElementsByTagName: () => []
};

// Make OAuth global
global.OAuth = {};

// Evaluate the libraries
eval(sha1Js);
eval(oauthJs);

// Test configuration
const RID_API_URL = 'http://hyd-app.rid.go.th/webservice/HydroAuthenticateService.svc';
const CONSUMER_KEY = '0f8fad5b-d9cb-469f-a165';
const CONSUMER_SECRET = '7c9e6679-7425-40de-944b';

// Create test request
const endpoint = 'getHourlyTodayFromStationID';
const requestData = {
  hydro: {
    StationID: "1234",
    TimeStart: "09/02/2567"
  }
};

// Create OAuth message
const message = {
  action: `${RID_API_URL}/${endpoint}`,
  method: 'POST',
  parameters: []
};

console.log('1. Initial Message:', message);

// Add OAuth parameters
global.OAuth.setTimestampAndNonce(message);
global.OAuth.setParameter(message, "oauth_consumer_key", CONSUMER_KEY);
global.OAuth.setParameter(message, "oauth_version", "1.0");
global.OAuth.setParameter(message, "oauth_signature_method", "HMAC-SHA1");

console.log('2. After adding OAuth parameters:', {
  timestamp: global.OAuth.getParameter(message.parameters, "oauth_timestamp"),
  nonce: global.OAuth.getParameter(message.parameters, "oauth_nonce"),
  parameters: message.parameters
});

// Add request data parameters
if (requestData?.hydro) {
  Object.entries(requestData.hydro).forEach(([key, value]) => {
    global.OAuth.setParameter(message, `hydro.${key}`, value);
  });
}

console.log('3. After adding request parameters:', message.parameters);

// Generate signature
const accessor = {
  consumerSecret: CONSUMER_SECRET,
  tokenSecret: ''
};

// Get base string
const baseString = global.OAuth.SignatureMethod.getBaseString(message);
console.log('4. Base String:', baseString);

// Sign message
global.OAuth.SignatureMethod.sign(message, accessor);

// Get signature
const signature = global.OAuth.getParameter(message.parameters, "oauth_signature");
console.log('5. Generated Signature:', signature);

// Get authorization header
const authHeader = global.OAuth.getAuthorizationHeader("", message.parameters);
console.log('6. Authorization Header:', authHeader);

// Print curl command for testing
console.log('\nTest with curl:');
console.log(`curl -v -X POST "${RID_API_URL}/${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: ${authHeader}" \\
  -d '${JSON.stringify(requestData)}'`); 