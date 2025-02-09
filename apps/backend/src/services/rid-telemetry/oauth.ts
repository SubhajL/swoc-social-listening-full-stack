import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { logger } from '../../../utils/logger';

// OAuth configuration for RID Telemetry API
export const oauth = new OAuth({
  consumer: {
    key: process.env.RID_CONSUMER_KEY || '0f8fad5b-d9cb-469f-a165',
    secret: process.env.RID_CONSUMER_SECRET || '7c9e6679-7425-40de-944b'
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string: string, key: string) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  }
});

// Helper to generate OAuth query parameters
export const getOAuthQueryString = (url: string, method: string = 'POST'): string => {
  const requestData = {
    url,
    method
  };

  const oauthData = oauth.authorize(requestData);
  
  logger.debug('Generated OAuth parameters', 'RidTelemetryOAuth', { 
    url,
    method,
    oauthParams: Object.fromEntries(Object.entries(oauthData)) 
  });

  return Object.entries(oauthData)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}; 