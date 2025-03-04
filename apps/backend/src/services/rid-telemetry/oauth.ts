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
      process.env.RID_CONSUMER_KEY || '0f8fad5b-d9cb-469f-a165',
      process.env.RID_CONSUMER_SECRET || '7c9e6679-7425-40de-944b',
      process.env.RID_ACCESS_TOKEN || '2Rx39Jq!cL&Reu5',
      'https://hyd-app.rid.go.th/webservice'
    );

    // Sync time with server on initialization
    this.syncTimeWithServer();
  }

  private async syncTimeWithServer(): Promise<void> {
    try {
      const localStartTime = new Date();
      const mainEndpoint = 'https://hyd-app.rid.go.th/webservice/HydroAuthenticateService.svc/getHourlyTodayFromStationID';
      
      logger.info('Starting time sync with RID server', 'RIDOAuth', {
        localTime: {
          iso: localStartTime.toISOString(),
          unix: Math.floor(localStartTime.getTime() / 1000),
          thai: localStartTime.toLocaleString('th-TH'),
          year: localStartTime.getFullYear(),
          thaiYear: localStartTime.getFullYear() + 543
        },
        endpoint: mainEndpoint,
        timestamp: new Date().toISOString()
      });

      // Add detailed time sync logging
      const timeBeforeSync = new Date();
      const timeBeforeSyncUnix = Math.floor(timeBeforeSync.getTime() / 1000);
      
      logger.debug('Time sync details before', 'RIDOAuth', {
        localTime: {
          iso: timeBeforeSync.toISOString(),
          unix: timeBeforeSyncUnix,
          thai: timeBeforeSync.toLocaleString('th-TH'),
          year: timeBeforeSync.getFullYear(),
          thaiYear: timeBeforeSync.getFullYear() + 543
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        systemTime: {
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: Date.now(),
          timezoneOffset: new Date().getTimezoneOffset()
        }
      });

      const startTime = Date.now();
      const response = await fetch(mainEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'RID-Telemetry-Client/1.0',
          'Cache-Control': 'no-cache'
        }
      });

      const roundTripTime = Date.now() - startTime;
      const responseTime = startTime + Math.floor(roundTripTime / 2); // Approximate server time accounting for latency

      // Get server time from Date header
      const dateHeader = response.headers.get('date');
      let serverTime: Date;
      
      if (dateHeader) {
        serverTime = new Date(dateHeader);
        logger.debug('Got server time from response header', 'RIDOAuth', {
          endpoint: mainEndpoint,
          dateHeader,
          serverTime: serverTime.toISOString(),
          roundTripTime,
          timestamp: new Date().toISOString()
        });
      } else {
        // Fallback to response time if no Date header
        serverTime = new Date(responseTime);
        logger.debug('Using calculated response time', 'RIDOAuth', {
          endpoint: mainEndpoint,
          responseTime: serverTime.toISOString(),
          roundTripTime,
          timestamp: new Date().toISOString()
        });
      }

      const localTime = new Date();
      this.timeOffset = serverTime.getTime() - localTime.getTime();
      
      // Enhanced time sync logging
      logger.info('Time synchronized with RID server', 'RIDOAuth', {
        endpoint: mainEndpoint,
        serverTime: {
          iso: serverTime.toISOString(),
          unix: Math.floor(serverTime.getTime() / 1000),
          thai: serverTime.toLocaleString('th-TH'),
          year: serverTime.getFullYear(),
          thaiYear: serverTime.getFullYear() + 543
        },
        localTime: {
          iso: localTime.toISOString(),
          unix: Math.floor(localTime.getTime() / 1000),
          thai: localTime.toLocaleString('th-TH'),
          year: localTime.getFullYear(),
          thaiYear: localTime.getFullYear() + 543
        },
        offset: {
          milliseconds: this.timeOffset,
          seconds: Math.floor(this.timeOffset / 1000),
          minutes: Math.floor(this.timeOffset / 60000)
        },
        adjustedTime: {
          date: new Date(Date.now() + this.timeOffset).toISOString(),
          unix: Math.floor((Date.now() + this.timeOffset) / 1000),
          thai: new Date(Date.now() + this.timeOffset).toLocaleString('th-TH')
        },
        validation: {
          localUnix: Math.floor(localTime.getTime() / 1000),
          serverUnix: Math.floor(serverTime.getTime() / 1000),
          diffSeconds: Math.floor(Math.abs(serverTime.getTime() - localTime.getTime()) / 1000),
          yearCheck: {
            localYear: localTime.getFullYear(),
            serverYear: serverTime.getFullYear(),
            yearDiff: serverTime.getFullYear() - localTime.getFullYear()
          }
        }
      });

      // Validate the time offset is reasonable
      if (Math.abs(this.timeOffset) > 24 * 60 * 60 * 1000) { // More than 24 hours
        logger.warn('Large time offset detected', 'RIDOAuth', {
          offset: this.timeOffset,
          threshold: 24 * 60 * 60 * 1000,
          serverTime: {
            iso: serverTime.toISOString(),
            unix: Math.floor(serverTime.getTime() / 1000),
            thai: serverTime.toLocaleString('th-TH'),
            year: serverTime.getFullYear(),
            thaiYear: serverTime.getFullYear() + 543
          },
          localTime: {
            iso: localTime.toISOString(),
            unix: Math.floor(localTime.getTime() / 1000),
            thai: localTime.toLocaleString('th-TH'),
            year: localTime.getFullYear(),
            thaiYear: localTime.getFullYear() + 543
          },
          timestamp: new Date().toISOString()
        });
      }
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
    
    // Add year validation
    const year = adjustedTime.getFullYear();
    if (year !== 2025) {
      logger.warn('OAuth timestamp year mismatch', 'RIDOAuth', {
        expected: 2025,
        actual: year,
        timestamp: {
          unix: timestamp,
          iso: adjustedTime.toISOString(),
          thai: adjustedTime.toLocaleString('th-TH'),
          thaiYear: year + 543
        },
        timeOffset: this.timeOffset,
        systemTime: {
          now: Date.now(),
          nowDate: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });
    }
    
    logger.debug('Generated OAuth timestamp', 'RIDOAuth', { 
      timestamp,
      adjustedTime: adjustedTime.toISOString(),
      localTime: new Date().toISOString(),
      offset: this.timeOffset,
      formats: {
        unixTimestamp: parseInt(timestamp),
        humanReadable: new Date(parseInt(timestamp) * 1000).toISOString(),
        thaiCalendar: adjustedTime.toLocaleDateString('th-TH'),
        thaiDateTime: adjustedTime.toLocaleString('th-TH'),
        utcString: adjustedTime.toUTCString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: year,
        thaiYear: year + 543
      }
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
    // Get all parameters except oauth_signature
    const params = Array.from(message.getParameterMap().entries())
      .filter(([key]) => key !== 'oauth_signature')
      .map(([key, value]) => {
        // Handle nested objects by flattening with dot notation
        if (typeof value === 'object' && value !== null) {
          return Object.entries(value).map(([nestedKey, nestedValue]) => ({
            key: this.percentEncode(`${key}.${nestedKey}`),
            value: this.percentEncode(String(nestedValue))
          }));
        }
        return [{
          key: this.percentEncode(key),
          value: this.percentEncode(String(value))
        }];
      })
      .flat()
      // Sort exactly as RID does: first by encoded key, then by encoded value
      .sort((a, b) => {
        const keyCompare = a.key.localeCompare(b.key);
        if (keyCompare !== 0) return keyCompare;
        return a.value.localeCompare(b.value);
      });

    // Build normalized string exactly as RID does
    const normalizedString = params
      .map(({ key, value }) => `${key}=${value}`)
      .join('&');
      
    logger.debug('OAuth parameter normalization', 'RIDOAuth', {
      originalParams: Array.from(message.getParameterMap().entries()),
      filteredParams: params.map(p => ({ key: p.key, value: p.value })),
      normalizedString,
      analysis: {
        paramCount: params.length,
        excludedSignature: !message.getParameterMap().has('oauth_signature'),
        sortedKeys: params.map(p => p.key),
        timestamp: new Date().toISOString()
      }
    });

    return normalizedString;
  }

  private generateBaseString(
    method: string,
    url: string,
    normalizedParameters: string
  ): string {
    // Normalize URL exactly as RID does
    const normalizedUrl = this.normalizeUrl(url);

    // Build base string in exact RID format
    const baseString = [
      method.toUpperCase(),
      this.percentEncode(normalizedUrl),
      this.percentEncode(normalizedParameters)
    ].join('&');

    logger.debug('OAuth base string generation', 'RIDOAuth', {
      input: {
        method,
        url,
        normalizedParameters
      },
      processing: {
        normalizedUrl,
        encodedUrl: this.percentEncode(normalizedUrl),
        encodedParams: this.percentEncode(normalizedParameters)
      },
      output: baseString,
      timestamp: new Date().toISOString()
    });

    return baseString;
  }

  private normalizeUrl(url: string): string {
    // Parse URL
    const urlParts = new URL(url);
    
    // Convert scheme and host to lowercase
    const scheme = urlParts.protocol.toLowerCase().replace(':', '');
    const host = urlParts.host.toLowerCase();
    
    // Remove default ports
    const port = urlParts.port;
    const shouldRemovePort = 
      (scheme === 'http' && port === '80') ||
      (scheme === 'https' && port === '443');
    
    const normalizedPort = shouldRemovePort ? '' : (port ? `:${port}` : '');
    
    // Ensure path is present and normalized
    let path = urlParts.pathname;
    if (!path) {
      path = '/';
    }
    
    // Build normalized URL exactly as RID expects
    const normalizedUrl = `${scheme}://${host}${normalizedPort}${path}`;
    
    logger.debug('URL normalization', 'RIDOAuth', {
      original: url,
      parsed: {
        scheme,
        host,
        port,
        path
      },
      normalized: normalizedUrl,
      timestamp: new Date().toISOString()
    });
    
    return normalizedUrl;
  }

  // RID's example OAuth header format for comparison
  private readonly RID_EXAMPLE_FORMAT = {
    realm: 'https://hyd-app.rid.go.th/webservice',
    oauth_consumer_key: 'example_key',
    oauth_nonce: 'unique_nonce',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1234567890',
    oauth_version: '1.0',
    oauth_signature: 'calculated_signature'
  };

  private validateOAuthHeader(headerParams: string): void {
    try {
      // Parse our header
      const ourParams = new Map<string, string>();
      headerParams.replace('OAuth ', '').split(', ').forEach(param => {
        const [key, value] = param.split('=');
        ourParams.set(key, value.replace(/"/g, ''));
      });

      // Compare with RID's format
      const comparison = {
        hasAllRequiredParams: true,
        correctOrder: true,
        parameterAnalysis: {} as Record<string, {
          exists: boolean,
          format: string,
          matchesPattern: boolean
        }>
      };

      // Check each required parameter
      Object.keys(this.RID_EXAMPLE_FORMAT).forEach(param => {
        const value = ourParams.get(param);
        comparison.parameterAnalysis[param] = {
          exists: !!value,
          format: value || 'missing',
          matchesPattern: this.validateParameterFormat(param, value || '')
        };
        if (!value) {
          comparison.hasAllRequiredParams = false;
        }
      });

      // Check order
      const ridOrder = Object.keys(this.RID_EXAMPLE_FORMAT);
      const ourOrder = Array.from(ourParams.keys());
      comparison.correctOrder = ridOrder.every((param, index) => ourOrder[index] === param);

      // Log detailed comparison
      logger.debug('OAuth header validation', 'RIDOAuth', {
        ourHeader: Object.fromEntries(ourParams),
        ridFormat: this.RID_EXAMPLE_FORMAT,
        comparison,
        timestamp: new Date().toISOString()
      });

      // Log any issues found
      if (!comparison.hasAllRequiredParams || !comparison.correctOrder) {
        logger.warn('OAuth header validation issues', 'RIDOAuth', {
          issues: {
            missingParams: !comparison.hasAllRequiredParams,
            wrongOrder: !comparison.correctOrder,
            analysis: comparison.parameterAnalysis
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('OAuth header validation failed', 'RIDOAuth', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        headerParams,
        timestamp: new Date().toISOString()
      });
    }
  }

  private validateParameterFormat(param: string, value: string): boolean {
    const patterns: Record<string, RegExp> = {
      realm: /^http:\/\/[\w\-\.\/]+$/,
      oauth_consumer_key: /^[\w\-]+$/,
      oauth_nonce: /^[\w\-]+$/,
      oauth_signature_method: /^HMAC-SHA1$/,
      oauth_timestamp: /^\d+$/,
      oauth_version: /^1\.0$/,
      oauth_signature: /^[A-Za-z0-9+/=]+$/ // Base64 pattern
    };
    return patterns[param]?.test(value) ?? false;
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

      // Set OAuth parameters in RID's expected order
      message.setParameter('realm', this.accessor.realm);
      message.setParameter('oauth_consumer_key', this.accessor.consumerKey);
      message.setParameter('oauth_nonce', nonce);
      message.setParameter('oauth_signature_method', 'HMAC-SHA1');
      message.setParameter('oauth_timestamp', timestamp);
      message.setParameter('oauth_version', '1.0');

      // Do not include request body parameters in signature
      const normalizedParams = this.normalizeParameters(message);
      const baseString = this.generateBaseString(method, url, normalizedParams);
      const signature = this.sign(baseString);

      // Add signature last, as per RID's format
      message.setParameter('oauth_signature', signature);

      // Build authorization header in RID's exact order
      const headerParams = [
        `realm="${this.accessor.realm}"`,
        `oauth_consumer_key="${this.percentEncode(this.accessor.consumerKey)}"`,
        `oauth_nonce="${this.percentEncode(nonce)}"`,
        `oauth_signature_method="HMAC-SHA1"`,
        `oauth_timestamp="${timestamp}"`,
        `oauth_version="1.0"`,
        `oauth_signature="${this.percentEncode(signature)}"`
      ].join(', ');

      const authHeader = `OAuth ${headerParams}`;
      
      // Enhanced OAuth header logging
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
        headerAnalysis: {
          normalizedParams,
          baseString,
          headerParts: headerParams.split(', '),
          fullHeader: authHeader,
          parameterCount: headerParams.split(', ').length,
          signatureLength: signature.length
        },
        timestamp: new Date().toISOString()
      });

      // Validate the generated header
      this.validateOAuthHeader(authHeader);

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