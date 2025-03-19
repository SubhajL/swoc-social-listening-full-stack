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
    this.consumerSecret = process.env.RID_CONSUMER_SECRET || '1974b85763c2496d80911b48dfbb53af';
    this.realm = 'https://hyd-app.rid.go.th/webservice';
    
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
  private normalizeParameters(params: Record<string, string>): string {
    return Object.entries(params)
      .filter(([key]) => key !== 'oauth_signature') // Exclude signature
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${this.percentEncode(key)}=${this.percentEncode(val)}`)
      .join('&');
  }

  /**
   * Generates the OAuth signature base string
   */
  private generateBaseString(method: string, url: string, params: Record<string, string>): string {
    const baseString = `${method.toUpperCase()}&${this.percentEncode(url)}&${this.percentEncode(this.normalizeParameters(params))}`;
    
    logger.debug('OAuth base string generation', 'RIDOAuth', {
      method: method.toUpperCase(),
      url,
      normalizedParams: this.normalizeParameters(params),
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
   * Generates a signed URL with OAuth parameters in the query string
   * This follows the PHP example in the RID API documentation
   */
  public async getSignedUrl(
    url: string,
    method: string,
    requestBody: Record<string, any> = {}
  ): Promise<string> {
    try {
      logger.info('Starting OAuth signed URL generation', 'RIDOAuth', {
        url,
        method,
        requestBodyKeys: Object.keys(requestBody)
      });

      const timestamp = this.generateTimestamp();
      const nonce = this.generateNonce();
      
      // Create OAuth parameters
      const oauthParams: Record<string, string> = {
        oauth_consumer_key: this.consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_version: '1.0'
      };

      // Generate base string and signature
      const baseString = this.generateBaseString(method, url, oauthParams);
      const signature = this.sign(baseString);
      
      // Create parameter string
      const paramString = this.normalizeParameters(oauthParams);
      
      // Create signed URL
      const signedUrl = `${url}?${paramString}&oauth_signature=${this.percentEncode(signature)}`;
      
      logger.info('Generated OAuth signed URL', 'RIDOAuth', {
        url,
        method,
        signedUrlLength: signedUrl.length
      });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate OAuth signed URL', 'RIDOAuth', { 
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      
      throw error;
    }
  }

  /**
   * Generates the OAuth authorization header
   * Note: This method is kept for backward compatibility but is not used
   * as the RID API prefers the signed URL approach
   */
  public async getAuthorizationHeader(
    url: string,
    method: string,
    requestBody: Record<string, any> = {}
  ): Promise<string> {
    try {
      logger.info('Starting OAuth header generation', 'RIDOAuth', {
        url,
        method,
        requestBodyKeys: Object.keys(requestBody)
      });

      const timestamp = this.generateTimestamp();
      const nonce = this.generateNonce();
      
      // Create OAuth parameters
      const oauthParams: Record<string, string> = {
        oauth_consumer_key: this.consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_version: '1.0'
      };

      // Generate base string and signature
      const baseString = this.generateBaseString(method, url, oauthParams);
      const signature = this.sign(baseString);
      
      // Add signature to parameters
      oauthParams.oauth_signature = signature;

      // Build authorization header
      const headerParams = [
        `realm="${this.realm}"`,
        `oauth_consumer_key="${this.percentEncode(this.consumerKey)}"`,
        `oauth_nonce="${this.percentEncode(nonce)}"`,
        `oauth_signature_method="HMAC-SHA1"`,
        `oauth_timestamp="${timestamp}"`,
        `oauth_version="1.0"`,
        `oauth_signature="${this.percentEncode(signature)}"`
      ].join(', ');

      const authHeader = `OAuth ${headerParams}`;
      
      logger.info('Generated OAuth authorization header', 'RIDOAuth', {
        url,
        method,
        oauthParams: {
          oauth_consumer_key: oauthParams.oauth_consumer_key,
          oauth_nonce: oauthParams.oauth_nonce,
          oauth_timestamp: oauthParams.oauth_timestamp,
          oauth_signature_method: oauthParams.oauth_signature_method,
          oauth_version: oauthParams.oauth_version
        }
      });

      return authHeader;
    } catch (error) {
      logger.error('Failed to generate OAuth header', 'RIDOAuth', { 
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      
      throw error;
    }
  }
}

// Create a singleton instance for better performance
let ridOAuthInstance: RIDOAuth | null = null;

/**
 * Helper function to get OAuth header
 * @deprecated Use getSignedUrl instead
 */
export async function getOAuthHeader(
  url: string,
  method: string,
  requestBody: Record<string, any> = {}
): Promise<string> {
  if (!ridOAuthInstance) {
    ridOAuthInstance = new RIDOAuth();
  }
  return ridOAuthInstance.getAuthorizationHeader(url, method, requestBody);
}

/**
 * Helper function to get a signed URL with OAuth parameters
 */
export async function getSignedUrl(
  url: string,
  method: string,
  requestBody: Record<string, any> = {}
): Promise<string> {
  if (!ridOAuthInstance) {
    ridOAuthInstance = new RIDOAuth();
  }
  return ridOAuthInstance.getSignedUrl(url, method, requestBody);
}