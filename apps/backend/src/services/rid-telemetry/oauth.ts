import crypto from 'crypto';
import { logger } from '../../utils/logger';

/**
 * ⚠️ PARTIALLY LOCKED IMPLEMENTATION - DO NOT MODIFY CORE FUNCTIONALITY
 * Last Lock Date: 2025-02-09
 * 
 * The following features are locked and should not be modified:
 * 1. Core OAuth 1.0a Protocol:
 *    - HMAC-SHA1 signature method implementation
 *    - Parameter encoding and normalization
 *    - Nonce generation
 *    - Timestamp synchronization
 * 
 * 2. Security Features:
 *    - Parameter percent-encoding
 *    - Signature generation
 *    - Time synchronization
 *    - Authorization header handling
 * 
 * 3. Error Handling:
 *    - Error logging
 *    - Error responses
 *    - Signature validation
 * 
 * Additional features and enhancements should be implemented separately
 * without modifying the core locked functionality.
 */

export class RIDOAuth {
  private consumerKey: string;
  private consumerSecret: string;
  private realm: string;

  constructor() {
    this.consumerKey = process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a';
    this.consumerSecret = process.env.RID_CONSUMER_SECRET || '38b992bd1c9d445ba5305bc90edd2b4a';
    this.realm = 'http://hyd-app.rid.go.th/webservice';
    
    logger.info('RIDOAuth initialized', 'RIDOAuth', {
      consumerKeyLength: this.consumerKey.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generates a timestamp for OAuth (UTC-based Unix timestamp)
   */
  private generateTimestamp(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    logger.debug('Generated OAuth timestamp', 'RIDOAuth', {
      timestamp,
      utcTime: new Date().toISOString()
    });
    
    return timestamp;
  }

  /**
   * Generates a secure random nonce for OAuth
   */
  private generateNonce(): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    logger.debug('Generated OAuth nonce', 'RIDOAuth', { nonce });
    return nonce;
  }

  /**
   * Percent-encodes a string according to OAuth 1.0a spec
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/\*/g, '%2A')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
  }

  /**
   * Normalizes parameters for OAuth signature base string
   */
  private normalizeParameters(params: Array<[string, string]>): string {
    return params
      .filter(([key]) => key !== 'oauth_signature') // Exclude signature
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${this.percentEncode(key)}=${this.percentEncode(val)}`)
      .join('&');
  }

  /**
   * Generates the OAuth signature base string
   */
  private generateBaseString(method: string, url: string, params: Array<[string, string]>): string {
    // Create parameter string
    const paramString = this.normalizeParameters(params);
    
    // Create signature base string
    const baseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(paramString)
    ].join('&');
    
    logger.debug('OAuth base string generation', 'RIDOAuth', {
      method: method.toUpperCase(),
      url,
      normalizedParams: paramString,
      baseStringLength: baseString.length
    });
    
    return baseString;
  }

  /**
   * Signs the OAuth request
   */
  private sign(baseString: string): string {
    const signingKey = `${this.consumerSecret}&`;
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');
    
    logger.debug('OAuth signature generation', 'RIDOAuth', {
      baseStringLength: baseString.length,
      signature
    });
    
    return signature;
  }

  /**
   * Generates OAuth 1.0a authorization header
   * @param url The request URL
   * @param method The HTTP method
   * @param params URL parameters as a string
   * @returns OAuth authorization header
   */
  async getAuthorizationHeader(
    url: string,
    method: string,
    params: string
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    // Create parameter string for signature
    const paramString = params ? `&${params}` : '';

    // Create signature base string
    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(`oauth_consumer_key=${this.consumerKey}&oauth_nonce=${nonce}&oauth_signature_method=HMAC-SHA1&oauth_timestamp=${timestamp}&oauth_version=1.0${paramString}`)
    ].join('&');

    // Generate signature
    const signature = crypto
      .createHmac('sha1', this.consumerSecret)
      .update(baseString)
      .digest('base64');

    // Create authorization header
    return `OAuth realm="${url}", oauth_consumer_key="${this.consumerKey}", oauth_nonce="${nonce}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_version="1.0", oauth_signature="${encodeURIComponent(signature)}"`;
  }
}

// Create a singleton instance for better performance
let ridOAuthInstance: RIDOAuth | null = null;

/**
 * Generates OAuth 1.0a authorization header
 * @param url The request URL
 * @param method The HTTP method
 * @param params URL parameters as a string
 * @returns OAuth authorization header
 */
export async function getOAuthHeader(
  url: string,
  method: string,
  params: string
): Promise<string> {
  if (!ridOAuthInstance) {
    ridOAuthInstance = new RIDOAuth();
  }
  return ridOAuthInstance.getAuthorizationHeader(url, method, params);
}

/**
 * Helper function to get a signed URL with OAuth parameters
 * @deprecated Use getOAuthHeader instead
 */
export async function getSignedUrl(
  url: string,
  method: string,
  requestBody: Record<string, any> = {}
): Promise<string> {
  if (!ridOAuthInstance) {
    ridOAuthInstance = new RIDOAuth();
  }
  return ridOAuthInstance.getAuthorizationHeader(url, method, requestBody);
}