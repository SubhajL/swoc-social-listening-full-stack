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

// RID OAuth implementation based on their oauth.js
class RIDOAuthMessage {
  private parameters: Map<string, string>;

  constructor() {
    this.parameters = new Map();
  }

  setParameter(name: string, value: string) {
    this.parameters.set(name, value);
  }

  getParameterMap(): Map<string, string> {
    return new Map(this.parameters);
  }
}

class RIDOAuthAccessor {
  constructor(
    public consumerKey: string,
    public consumerSecret: string,
    public accessToken: string,
    public realm: string
  ) {}
}

export class RIDOAuth {
  private accessor: RIDOAuthAccessor;
  private timeOffset: number = 0;  // Store time offset between local and server

  constructor() {
    // Initialize with RID's OAuth credentials and base URL for realm
    this.accessor = new RIDOAuthAccessor(
      process.env.RID_CONSUMER_KEY || '364d90f1532f4e0190a91c56cf9e4045',
      process.env.RID_CONSUMER_SECRET || '6791161988d646aeb41d5730b73e2735',
      process.env.RID_ACCESS_TOKEN || '2Rx39Jq!cL&Reu5',
      'http://hyd-app.rid.go.th/webservice'
    );

    // Sync time with server on initialization
    this.syncTimeWithServer();
  }

  private async syncTimeWithServer(): Promise<void> {
    try {
      logger.info('Starting time sync with RID server', 'RIDOAuth', {
        timestamp: new Date().toISOString()
      });

      // Try multiple endpoints for time sync
      const timeEndpoints = [
        'http://hyd-app.rid.go.th/API/time',
        'http://hyd-app.rid.go.th/webservice/time',
        'http://hyd-app.rid.go.th/webservice/api/time'
      ];

      let serverTime: Date | null = null;
      let error: Error | null = null;

      interface TimeResponse {
        timestamp?: string;
        time?: string;
        serverTime?: string;
        date?: string;
      }

      for (const endpoint of timeEndpoints) {
        try {
          logger.debug('Trying time sync endpoint', 'RIDOAuth', {
            endpoint,
            timestamp: new Date().toISOString()
          });

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'User-Agent': 'RID-Telemetry-Client/1.0'
            }
          });

          if (!response.ok) {
            logger.warn('Time sync endpoint failed', 'RIDOAuth', {
              endpoint,
              status: response.status,
              statusText: response.statusText,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          // Try to get time from response body first
          const data = await response.json().catch(() => null) as TimeResponse | null;
          if (data) {
            const timeStr = data.timestamp || data.time || data.serverTime || data.date;
            if (timeStr) {
              serverTime = new Date(timeStr);
              logger.debug('Got server time from response body', 'RIDOAuth', {
                endpoint,
                timeStr,
                serverTime: serverTime.toISOString(),
                timestamp: new Date().toISOString()
              });
              break;
            }
          }

          // Fallback to response headers
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            serverTime = new Date(dateHeader);
            logger.debug('Got server time from response header', 'RIDOAuth', {
              endpoint,
              dateHeader,
              serverTime: serverTime.toISOString(),
              timestamp: new Date().toISOString()
            });
            break;
          }
        } catch (e) {
          error = e as Error;
          logger.warn('Time sync attempt failed', 'RIDOAuth', {
            endpoint,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : error,
            timestamp: new Date().toISOString()
          });
          continue;
        }
      }

      if (!serverTime) {
        throw error || new Error('Failed to sync time with any endpoint');
      }

      const localTime = new Date();
      this.timeOffset = serverTime.getTime() - localTime.getTime();
      
      logger.info('Time synchronized with RID server', 'RIDOAuth', {
        serverTime: serverTime.toISOString(),
        localTime: localTime.toISOString(),
        offset: this.timeOffset,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to sync time with RID server', 'RIDOAuth', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        timestamp: new Date().toISOString()
      });
      // Don't throw, just log the error and continue with default time
    }
  }

  private percentEncode(s: string): string {
    if (!s) return '';
    return encodeURIComponent(s)
      .replace(/!/g, '%21')
      .replace(/\*/g, '%2A')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/~/g, '%7E');
  }

  private generateNonce(): string {
    const nonce = crypto.randomBytes(32)
      .toString('base64')
      // Make URL safe
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
      
    logger.debug('Generated OAuth nonce', 'RIDOAuth', { 
      nonce,
      length: nonce.length,
      timestamp: new Date().toISOString()
    });
    return nonce;
  }

  private generateTimestamp(): string {
    // Use adjusted time accounting for server offset
    const adjustedTime = new Date(Date.now() + this.timeOffset);
    const timestamp = Math.floor(adjustedTime.getTime() / 1000).toString();
    
    logger.debug('Generated OAuth timestamp', 'RIDOAuth', { 
      timestamp,
      adjustedTime: adjustedTime.toISOString(),
      localTime: new Date().toISOString(),
      offset: this.timeOffset,
      unixTimestamp: parseInt(timestamp),
      humanReadable: new Date(parseInt(timestamp) * 1000).toISOString()
    });
    
    return timestamp;
  }

  private sign(baseString: string): string {
    const key = `${this.percentEncode(this.accessor.consumerSecret)}&`;
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(baseString);
    const signature = hmac.digest('base64');
    
    logger.debug('OAuth signature generation', 'RIDOAuth', {
      baseString,
      key,
      signature,
      components: {
        consumerSecret: this.accessor.consumerSecret,
        encodedSecret: this.percentEncode(this.accessor.consumerSecret),
        signatureLength: signature.length,
        signatureEncoding: 'base64'
      },
      timestamp: new Date().toISOString()
    });
    
    return signature;
  }

  private normalizeParameters(message: RIDOAuthMessage): string {
    const params = Array.from(message.getParameterMap().entries())
      .map(([key, value]) => ({
        key: this.percentEncode(key),
        value: this.percentEncode(value)
      }))
      .sort((a, b) => {
        if (a.key < b.key) return -1;
        if (a.key > b.key) return 1;
        if (a.value < b.value) return -1;
        if (a.value > b.value) return 1;
        return 0;
      });

    const normalizedString = params
      .map(({ key, value }) => `${key}=${value}`)
      .join('&');
      
    logger.debug('OAuth parameter normalization', 'RIDOAuth', {
      originalParams: Array.from(message.getParameterMap().entries()),
      normalizedParams: params,
      normalizedString
    });

    return normalizedString;
  }

  private generateBaseString(
    method: string,
    url: string,
    normalizedParameters: string
  ): string {
    return [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(normalizedParameters)
    ].join('&');
  }

  public async getAuthorizationHeader(
    url: string,
    method: string,
    requestBody: Record<string, any>
  ): Promise<string> {
    try {
      logger.info('Starting OAuth header generation', 'RIDOAuth', {
        url,
        method,
        requestBody,
        timestamp: new Date().toISOString()
      });

      // Ensure time is synced before generating header
      if (Math.abs(this.timeOffset) > 300000) { // Re-sync if offset > 5 minutes
        logger.info('Time offset exceeds 5 minutes, resyncing', 'RIDOAuth', {
          currentOffset: this.timeOffset,
          timestamp: new Date().toISOString()
        });
        await this.syncTimeWithServer();
      }

      const message = new RIDOAuthMessage();
      const timestamp = this.generateTimestamp();
      const nonce = this.generateNonce();

      logger.debug('Setting OAuth parameters', 'RIDOAuth', {
        consumer_key: this.accessor.consumerKey,
        nonce,
        oauth_timestamp: timestamp,
        signature_method: 'HMAC-SHA1',
        version: '1.0',
        log_timestamp: new Date().toISOString()
      });

      // Set OAuth parameters
      message.setParameter('oauth_consumer_key', this.accessor.consumerKey);
      message.setParameter('oauth_nonce', nonce);
      message.setParameter('oauth_timestamp', timestamp);
      message.setParameter('oauth_signature_method', 'HMAC-SHA1');
      message.setParameter('oauth_version', '1.0');

      // Do not include request body parameters in signature
      const normalizedParams = this.normalizeParameters(message);
      const baseString = this.generateBaseString(method, url, normalizedParams);
      const signature = this.sign(baseString);

      // Build authorization header
      const headerParams = [
        `realm="${this.accessor.realm}"`,
        `oauth_consumer_key="${this.percentEncode(this.accessor.consumerKey)}"`,
        `oauth_nonce="${this.percentEncode(nonce)}"`,
        `oauth_signature="${this.percentEncode(signature)}"`,
        `oauth_signature_method="HMAC-SHA1"`,
        `oauth_timestamp="${timestamp}"`,
        `oauth_version="1.0"`
      ].join(', ');

      const authHeader = `OAuth ${headerParams}`;
      
      logger.info('Generated OAuth authorization header', 'RIDOAuth', {
        url,
        method,
        requestBody,
        oauthParams: {
          realm: this.accessor.realm,
          consumer_key: this.accessor.consumerKey,
          nonce,
          signature,
          timestamp,
          adjustedTime: new Date(parseInt(timestamp) * 1000).toISOString()
        },
        normalizedParams,
        baseString,
        headerParams: headerParams.split(', '),
        fullHeader: authHeader,
        timestamp: new Date().toISOString()
      });

      return authHeader;
    } catch (error) {
      logger.error('Failed to generate OAuth header', 'RIDOAuth', { 
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        context: {
          url,
          method,
          requestBody
        },
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

// Export a singleton instance
const ridOAuth = new RIDOAuth();

export async function getOAuthHeader(
  url: string,
  method: string,
  requestBody: Record<string, any>
): Promise<string> {
  return ridOAuth.getAuthorizationHeader(url, method, requestBody);
}