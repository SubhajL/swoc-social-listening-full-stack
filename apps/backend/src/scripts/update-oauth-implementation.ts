import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Paths to files that need to be updated
const OAUTH_FILE_PATH = path.resolve(__dirname, '../services/rid-telemetry/oauth.ts');
const TELEMETRY_SERVICE_PATH = path.resolve(__dirname, '../services/rid-telemetry/telemetry.service.ts');

/**
 * Updates the OAuth implementation to prioritize URL-based authentication
 */
async function updateOAuthImplementation() {
  try {
    console.log('Starting OAuth implementation update...');
    
    // Update oauth.ts
    console.log(`Reading ${OAUTH_FILE_PATH}...`);
    const oauthContent = await readFile(OAUTH_FILE_PATH, 'utf8');
    
    // Check if the file already has the getSignedUrl function
    if (oauthContent.includes('export async function getSignedUrl')) {
      console.log('getSignedUrl function already exists in oauth.ts');
    } else {
      console.log('Adding getSignedUrl function to oauth.ts...');
      
      // Create updated content with the new function
      const updatedOauthContent = `${oauthContent}

/**
 * Generates a signed URL with OAuth parameters for RID API
 * This approach is more reliable than using Authorization headers
 */
export async function getSignedUrl(
  endpoint: string,
  method: string,
  requestBody: Record<string, any>
): Promise<string> {
  // Generate timestamp and nonce
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0'
  };
  
  // Create parameter string
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => \`\${encodeURIComponent(key)}=\${encodeURIComponent(value)}\`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(endpoint),
    encodeURIComponent(paramString)
  ].join('&');
  
  // Create signing key
  const signingKey = \`\${CONSUMER_SECRET}&\`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
  
  logger.debug('OAuth signature generation', 'RidOAuth', {
    endpoint,
    method,
    timestamp: new Date().toISOString()
  });
  
  // Create signed URL (for PHP style)
  const signedUrl = \`\${endpoint}?\${paramString}&oauth_signature=\${encodeURIComponent(signature)}\`;
  
  logger.info('Generated OAuth signed URL', 'RidOAuth', {
    endpoint,
    method,
    timestamp: new Date().toISOString()
  });
  
  return signedUrl;
}`;
      
      // Write the updated content back to the file
      await writeFile(OAUTH_FILE_PATH, updatedOauthContent);
      console.log('Successfully updated oauth.ts');
    }
    
    // Update telemetry.service.ts to use the signed URL approach
    console.log(`Reading ${TELEMETRY_SERVICE_PATH}...`);
    const telemetryContent = await readFile(TELEMETRY_SERVICE_PATH, 'utf8');
    
    // Check if the file already uses getSignedUrl
    if (telemetryContent.includes('getSignedUrl(')) {
      console.log('telemetry.service.ts already uses getSignedUrl');
    } else {
      console.log('Updating telemetry.service.ts to use getSignedUrl...');
      
      // Replace the makeRidApiRequest function to use getSignedUrl
      const makeRidApiRequestRegex = /async function makeRidApiRequest\([^{]*{[\s\S]*?}/;
      const updatedMakeRidApiRequest = `async function makeRidApiRequest(
  endpoint: string,
  requestBody: Record<string, any>,
  retryCount = 0
): Promise<any> {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey(endpoint, requestBody);
    
    // Check cache first
    const cachedResponse = responseCache[cacheKey];
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
      logger.debug('Using cached response', 'RidTelemetryService', {
        endpoint,
        cacheAge: \`\${(Date.now() - cachedResponse.timestamp) / 1000}s\`
      });
      return cachedResponse.data;
    }
    
    // Get signed URL with OAuth parameters
    logger.info('Starting OAuth signed URL generation', 'RidTelemetryService', {
      endpoint,
      timestamp: new Date().toISOString()
    });
    const signedUrl = await getSignedUrl(endpoint, 'POST', requestBody);

    // Make API request
    const response = await axios.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        },
        timeout: 30000, // 30 seconds timeout
        validateStatus: () => true, // Handle all status codes in our code
        // @ts-ignore - httpsAgent is valid but TypeScript doesn't recognize it
        httpsAgent: new https.Agent({ 
          rejectUnauthorized: false // Allow self-signed certificates
        })
      }
    );`;
      
      const updatedTelemetryContent = telemetryContent.replace(makeRidApiRequestRegex, updatedMakeRidApiRequest);
      
      // Write the updated content back to the file
      await writeFile(TELEMETRY_SERVICE_PATH, updatedTelemetryContent);
      console.log('Successfully updated telemetry.service.ts');
    }
    
    console.log('OAuth implementation update completed successfully!');
    console.log('Next steps:');
    console.log('1. Review the changes to ensure they match your codebase');
    console.log('2. Run tests to verify the updated implementation works correctly');
    console.log('3. Update any other files that might be using the old approach');
    
  } catch (error) {
    console.error('Error updating OAuth implementation:', error);
  }
}

// Run the update
updateOAuthImplementation().catch(console.error); 