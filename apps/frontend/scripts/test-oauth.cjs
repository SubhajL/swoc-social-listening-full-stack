// Load OAuth libraries
const fs = require('fs');
const path = require('path');

// Load OAuth library
const oauthJs = fs.readFileSync(path.join(__dirname, '../public/lib/oauth.js'), 'utf8');
const sha1Js = fs.readFileSync(path.join(__dirname, '../public/lib/sha1.js'), 'utf8');

// Create a minimal window-like environment
global.window = {};
global.document = {
  getElementsByTagName: () => []
};

// Create VM context and evaluate libraries
const vm = require('vm');
const context = vm.createContext({
  window: global.window,
  document: global.document,
  console: console
});

vm.runInContext(sha1Js, context);
vm.runInContext(oauthJs, context);

// Get OAuth from context
const OAuth = context.OAuth;

// Test configuration
const RID_API_URL = 'http://hyd-app.rid.go.th';
const endpoint = 'getDailyStationList';

// Create accessor object
const accessor = {
  consumerSecret: '2k639jfcL&keu8',
  tokenSecret: ''
};

// Create message object
const message = {
  action: `${RID_API_URL}/webservice/HydroAuthenticateService.svc/${endpoint}`,
  method: 'POST',
  parameters: []
};

console.log('1. Initial Message:', message);

// Add OAuth parameters in exact order from RID example
message.parameters.push(['oauth_consumer_key', 'swocsl']);
message.parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
message.parameters.push(['oauth_version', '1.0']);

console.log('2. After adding OAuth parameters:', message.parameters);

// Set timestamp and nonce after adding parameters
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = OAuth.nonce(6);
message.parameters.push(['oauth_timestamp', timestamp]);
message.parameters.push(['oauth_nonce', nonce]);

console.log('3. After adding timestamp and nonce:', {
  timestamp,
  nonce,
  parameters: message.parameters
});

// Add request data parameters
message.parameters.push(['hydro.StationID', '7']);
message.parameters.push(['hydro.TimeStart', '09/02/2567']);

console.log('4. After adding request parameters:', message.parameters);

// Get base string components
const normalizedUrl = OAuth.SignatureMethod.normalizeUrl(message.action);
const normalizedParams = OAuth.SignatureMethod.normalizeParameters(message.parameters);
const baseString = OAuth.SignatureMethod.getBaseString(message);

console.log('5. Base String Components:', {
  normalizedUrl,
  normalizedParams,
  baseString
});

// Generate signature
OAuth.SignatureMethod.sign(message, accessor);

// Get signature
const signature = OAuth.getParameter(message.parameters, "oauth_signature");
console.log('6. Generated Signature:', {
  raw: signature,
  encoded: OAuth.percentEncode(signature)
});

// Get authorization header using RID's exact format
const authHeader = OAuth.getAuthorizationHeader('', message.parameters);
console.log('7. Authorization Header:', authHeader);
console.log('7a. Header Components:', authHeader.split(',').map(part => part.trim()));

// Create request data object
const requestData = {
  hydro: {
    StationID: "7",
    TimeStart: "09/02/2567"
  }
};

// Print test commands
console.log('\nTest with curl:');
console.log(`curl -v -X POST "${message.action}" -H "Content-Type: application/json" -H "Authorization: ${authHeader}" -d '${JSON.stringify(requestData)}'`);

console.log('\nTest in browser console:\n');
console.log(`fetch("${message.action}", {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`${authHeader}\`
  },
  body: JSON.stringify(${JSON.stringify(requestData)})
}).then(r => r.text()).then(console.log).catch(console.error);
`);