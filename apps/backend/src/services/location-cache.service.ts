import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../utils/logger.js';
import { normalizeThaiLocationName } from '../utils/string-utils.js';
import { CoordinateSource } from '../types/processed-post.dto.js';

interface Coordinates {
  lat: number;
  lng: number;
  source: CoordinateSource;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  lastAccessed: Date | null;
  averageLatency: number;
  totalLatency: number;
  requests: number;
}

interface LocationCache {
  tumbon: Map<string, Coordinates>;
  amphure: Map<string, Coordinates>;
  province: Map<string, Coordinates>;
  metrics: {
    tumbon: CacheMetrics;
    amphure: CacheMetrics;
    province: CacheMetrics;
  };
}

interface LocationRow {
  id: string;
  name_th: string;
  latitude: number;
  longitude: number;
  province_name_th?: string;
}

export class LocationCacheService {
  private cache: LocationCache = {
    tumbon: new Map(),
    amphure: new Map(),
    province: new Map(),
    metrics: {
      tumbon: this.initializeMetrics(),
      amphure: this.initializeMetrics(),
      province: this.initializeMetrics()
    }
  };

  constructor(private pool: pkg.Pool) {}

  async initialize(): Promise<void> {
    try {
      logger.info('Starting location cache initialization');
      logger.info('Loading location hierarchy');
      await this.loadLocationHierarchy();
      logger.info('Location hierarchy loaded');
      logger.info('Loading tumbon data');
      await this.loadTumbons();
      logger.info('Tumbon data loaded');
      logger.info('Loading province data');
      await this.loadProvinces();
      logger.info('Province data loaded');
      logger.info('Loading amphure data');
      await this.loadAmphures();
      logger.info('Amphure data loaded');
      logger.info('Resolving missing coordinates through hierarchy');
      await this.resolveMissingCoordinates();
      logger.info('Coordinate resolution completed');
      
      // Log cache statistics
      logger.info('Cache initialization completed', {
        tumbonCount: this.cache.tumbon.size,
        amphureCount: this.cache.amphure.size,
        provinceCount: this.cache.province.size,
        sampleTumbon: Array.from(this.cache.tumbon.keys())[0],
        sampleAmphure: Array.from(this.cache.amphure.keys())[0],
        sampleProvince: Array.from(this.cache.province.keys())[0]
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize location cache', {
        error: err.message,
        stack: err.stack,
        details: error
      });
      throw error;
    }
  }

  private initializeMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      lastAccessed: null,
      averageLatency: 0,
      totalLatency: 0,
      requests: 0
    };
  }

  private updateMetrics(
    type: 'tumbon' | 'amphure' | 'province',
    found: boolean,
    latency: number
  ): void {
    const metrics = this.cache.metrics[type];
    metrics.requests++;
    metrics.lastAccessed = new Date();
    metrics.totalLatency += latency;
    metrics.averageLatency = metrics.totalLatency / metrics.requests;
    
    if (found) {
      metrics.hits++;
    } else {
      metrics.misses++;
    }

    logger.debug(`Cache ${type} metrics updated`, {
      type,
      found,
      latency,
      hitRate: (metrics.hits / metrics.requests * 100).toFixed(2) + '%',
      metrics
    });
  }

  private async loadLocationHierarchy(): Promise<void> {
    try {
      const result = await this.pool.query<LocationRow>(`
        SELECT 
          t.id as tumbon_id,
          t.amphure_id,
          a.province_id,
          t.name_th,
          t.amphure_id as parent_id,
          t.latitude,
          t.longitude
        FROM tumbons t
        JOIN amphures a ON t.amphure_id = a.id
      `);
      
      logger.info(`Loaded ${result.rowCount} location hierarchy records`);
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to load location hierarchy', {
        error: err.message,
        stack: err.stack,
        details: error
      });
      throw error;
    }
  }

  private async loadTumbons(): Promise<void> {
    try {
      const result = await this.pool.query<LocationRow>('SELECT id, name_th, latitude, longitude FROM tumbons');
      logger.debug('Loaded raw tumbon data', {
        totalRows: result.rowCount,
        sampleRow: result.rows[0]
      });
      
      let normalizedCount = 0;
      let failedNormalization = 0;

      result.rows.forEach(row => {
        if (row.latitude && row.longitude) {
          const normalizedName = normalizeThaiLocationName(row.name_th);
          if (normalizedName) {
            this.cache.tumbon.set(normalizedName, {
              lat: row.latitude,
              lng: row.longitude,
              source: 'direct'
            });
            normalizedCount++;
            logger.debug('Normalized and cached tumbon', {
              original: row.name_th,
              normalized: normalizedName,
              coordinates: { lat: row.latitude, lng: row.longitude }
            });
          } else {
            failedNormalization++;
            logger.warn('Failed to normalize tumbon name:', {
              id: row.id,
              name_th: row.name_th,
              nameBytes: Buffer.from(row.name_th).length
            });
          }
        }
      });

      logger.info('Tumbon cache loading completed', {
        total: result.rowCount,
        withCoordinates: normalizedCount,
        failedNormalization,
        cacheSize: this.cache.tumbon.size
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to load tumbon data', {
        error: err.message,
        stack: err.stack,
        details: error
      });
      throw error;
    }
  }

  private async loadProvinces(): Promise<void> {
    try {
      const result = await this.pool.query<LocationRow>('SELECT id, name_th, latitude, longitude FROM provinces');
      logger.debug('Loaded raw province data', {
        totalRows: result.rowCount,
        sampleRow: result.rows[0]
      });
      
      let normalizedCount = 0;
      let failedNormalization = 0;

      result.rows.forEach(row => {
        if (row.latitude && row.longitude) {
          const normalizedName = normalizeThaiLocationName(row.name_th);
          if (normalizedName) {
            this.cache.province.set(normalizedName, {
              lat: row.latitude,
              lng: row.longitude,
              source: 'direct'
            });
            normalizedCount++;
            logger.debug('Normalized and cached province', {
              original: row.name_th,
              normalized: normalizedName,
              coordinates: { lat: row.latitude, lng: row.longitude }
            });
          } else {
            failedNormalization++;
            logger.warn('Failed to normalize province name:', {
              id: row.id,
              name_th: row.name_th
            });
          }
        }
      });

      logger.info('Province cache loading completed', {
        total: result.rowCount,
        withCoordinates: normalizedCount,
        failedNormalization,
        cacheSize: this.cache.province.size
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to load province data', {
        error: err.message,
        stack: err.stack,
        details: error
      });
      throw error;
    }
  }

  private async loadAmphures(): Promise<void> {
    try {
      // Log total amphures first
      const totalResult = await this.pool.query('SELECT COUNT(*) as total FROM amphures');
      const totalAmphures = parseInt(totalResult.rows[0].total);
      logger.info('Total amphures in database:', { total: totalAmphures });

      // Enhanced query to include province context
      const result = await this.pool.query<LocationRow & { province_name_th: string }>(`
        SELECT 
          a.id, 
          a.name_th, 
          a.latitude, 
          a.longitude,
          p.name_th as province_name_th
        FROM amphures a
        JOIN provinces p ON a.province_id = p.id 
        WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
      `);
      
      const rowCount = result.rowCount || 0;
      
      logger.info('Amphures with coordinates:', { 
        total: rowCount,
        percentage: ((rowCount / totalAmphures) * 100).toFixed(2) + '%'
      });
      
      let normalizedCount = 0;
      let failedNormalization = 0;
      let missingCoordinates = 0;
      const normalizedNames = new Set<string>();

      result.rows.forEach(row => {
        if (!row.latitude || !row.longitude) {
          missingCoordinates++;
          logger.warn('Amphure missing coordinates:', {
            id: row.id,
            name_th: row.name_th
          });
          return;
        }

        // Create both simple and qualified normalized names
        const simpleNormalizedName = normalizeThaiLocationName(row.name_th);
        const qualifiedNormalizedName = row.province_name_th ? 
          normalizeThaiLocationName(`${row.name_th}_${row.province_name_th}`) :
          simpleNormalizedName;

        if (simpleNormalizedName && qualifiedNormalizedName) {
          // Store both simple and qualified names in cache
          const coordinates = {
            lat: row.latitude,
            lng: row.longitude,
            source: 'direct' as const
          };

          // Store with simple name if not already exists
          if (!this.cache.amphure.has(simpleNormalizedName)) {
            this.cache.amphure.set(simpleNormalizedName, coordinates);
          }

          // Always store with qualified name
          this.cache.amphure.set(qualifiedNormalizedName, coordinates);
          
          normalizedNames.add(qualifiedNormalizedName);
          normalizedCount++;
          
          logger.debug('Normalized and cached amphure', {
            id: row.id,
            original: row.name_th,
            simpleNormalized: simpleNormalizedName,
            qualifiedNormalized: qualifiedNormalizedName,
            coordinates
          });
        } else {
          failedNormalization++;
          logger.warn('Failed to normalize amphure name:', {
            id: row.id,
            name_th: row.name_th,
            province_name_th: row.province_name_th,
            nameBytes: Buffer.from(row.name_th).length
          });
        }
      });

      logger.info('Amphure cache loading completed', {
        totalInDb: totalAmphures,
        withCoordinates: result.rowCount,
        normalizedAndCached: normalizedCount,
        failedNormalization,
        missingCoordinates,
        cacheSize: this.cache.amphure.size,
        normalizedNames: Array.from(normalizedNames).slice(0, 10) // Log first 10 for sample
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to load amphure data', {
        error: err.message,
        stack: err.stack,
        details: error
      });
      throw error;
    }
  }

  private async resolveMissingCoordinates(): Promise<void> {
    try {
      // Implement coordinate resolution logic here if needed
      logger.info('No missing coordinates to resolve');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to resolve missing coordinates', {
        error: err.message,
        stack: err.stack,
        details: error
      });
      throw error;
    }
  }

  getLocation(
    tumbon?: string,
    amphure?: string,
    province?: string
  ): Coordinates | null {
    logger.debug('Looking up location', {
      tumbon,
      amphure,
      province
    });

    const startTime = process.hrtime();

    // Try tumbon first
    if (tumbon) {
      const normalizedTumbon = normalizeThaiLocationName(tumbon);
      if (normalizedTumbon) {
        const location = this.cache.tumbon.get(normalizedTumbon);
        const latency = process.hrtime(startTime)[1] / 1000000;
        this.updateMetrics('tumbon', !!location, latency);
        
        if (location) {
          return location;
        }
      }
    }

    // Then try amphure with enhanced lookup
    if (amphure) {
      // Try qualified name first if province is available
      if (province) {
        const qualifiedName = normalizeThaiLocationName(`${amphure}_${province}`);
        if (qualifiedName) {
          const location = this.cache.amphure.get(qualifiedName);
          const latency = process.hrtime(startTime)[1] / 1000000;
          this.updateMetrics('amphure', !!location, latency);
          
          if (location) {
            logger.debug('Found amphure location using qualified name', {
              amphure,
              province,
              qualifiedName,
              location
            });
            return location;
          }
        }
      }

      // Fallback to simple name if qualified lookup fails
      const normalizedAmphure = normalizeThaiLocationName(amphure);
      if (normalizedAmphure) {
        const location = this.cache.amphure.get(normalizedAmphure);
        const latency = process.hrtime(startTime)[1] / 1000000;
        this.updateMetrics('amphure', !!location, latency);
        
        if (location) {
          logger.debug('Found amphure location using simple name', {
            amphure,
            normalizedAmphure,
            location
          });
          return location;
        } else {
          logger.debug('Amphure not found in cache', {
            original: amphure,
            normalized: normalizedAmphure,
            withProvince: province,
            cacheSize: this.cache.amphure.size
          });
        }
      }
    }

    // Finally try province
    if (province) {
      const normalizedProvince = normalizeThaiLocationName(province);
      if (normalizedProvince) {
        const location = this.cache.province.get(normalizedProvince);
        const latency = process.hrtime(startTime)[1] / 1000000;
        this.updateMetrics('province', !!location, latency);
        
        if (location) {
          return location;
        }
      }
    }

    logger.debug('No location found in any cache');
    return null;
  }

  getCacheStats() {
    return {
      tumbon: {
        total: this.cache.tumbon.size,
        sample: Array.from(this.cache.tumbon.keys()).slice(0, 3),
        metrics: this.cache.metrics.tumbon,
        hitRate: this.calculateHitRate('tumbon')
      },
      amphure: {
        total: this.cache.amphure.size,
        sample: Array.from(this.cache.amphure.keys()).slice(0, 3),
        metrics: this.cache.metrics.amphure,
        hitRate: this.calculateHitRate('amphure')
      },
      province: {
        total: this.cache.province.size,
        sample: Array.from(this.cache.province.keys()).slice(0, 3),
        metrics: this.cache.metrics.province,
        hitRate: this.calculateHitRate('province')
      }
    };
  }

  private calculateHitRate(type: 'tumbon' | 'amphure' | 'province'): string {
    const metrics = this.cache.metrics[type];
    if (metrics.requests === 0) return '0%';
    return (metrics.hits / metrics.requests * 100).toFixed(2) + '%';
  }
}
