import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

interface LocationData {
  lat: number;
  lng: number;
}

interface LocationCache {
  tumbon: Map<string, LocationData>;
  amphure: Map<string, LocationData>;
  province: Map<string, LocationData>;
}

export class LocationCacheService {
  private cache: LocationCache = {
    tumbon: new Map(),
    amphure: new Map(),
    province: new Map()
  };

  constructor(private readonly pool: Pool) {
    logger.info('LocationCacheService constructed');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Starting location cache initialization');
      
      // Load data from each table
      await Promise.all([
        this.loadTumbons(),
        this.loadAmphures(),
        this.loadProvinces()
      ]);
      
      const stats = this.getCacheStats();
      logger.info('Location cache initialized successfully', {
        ...stats,
        tumbonExample: Array.from(this.cache.tumbon.keys())[0],
        amphureExample: Array.from(this.cache.amphure.keys())[0],
        provinceExample: Array.from(this.cache.province.keys())[0]
      });
    } catch (error) {
      logger.error('Failed to initialize location cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async loadTumbons(): Promise<void> {
    try {
      logger.info('Loading tumbon data');
      const result = await this.pool.query(
        'SELECT name_th, latitude, longitude FROM tumbons WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
      );
      result.rows.forEach(row => {
        this.cache.tumbon.set(row.name_th, { lat: row.latitude, lng: row.longitude });
      });
      logger.info('Tumbon data loaded successfully', {
        count: this.cache.tumbon.size,
        firstKey: Array.from(this.cache.tumbon.keys())[0]
      });
    } catch (error) {
      logger.error('Failed to load tumbon data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async loadAmphures(): Promise<void> {
    try {
      logger.info('Loading amphure data');
      const result = await this.pool.query(
        'SELECT name_th, latitude, longitude FROM amphures WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
      );
      result.rows.forEach(row => {
        this.cache.amphure.set(row.name_th, { lat: row.latitude, lng: row.longitude });
      });
      logger.info('Amphure data loaded successfully', {
        count: this.cache.amphure.size
      });
    } catch (error) {
      logger.error('Failed to load amphure data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async loadProvinces(): Promise<void> {
    try {
      logger.info('Loading province data');
      const result = await this.pool.query(
        'SELECT name_th, latitude, longitude FROM provinces WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
      );
      result.rows.forEach(row => {
        this.cache.province.set(row.name_th, { lat: row.latitude, lng: row.longitude });
      });
      logger.info('Province data loaded successfully', {
        count: this.cache.province.size
      });
    } catch (error) {
      logger.error('Failed to load province data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  getLocation(
    tumbon?: string[],
    amphure?: string[],
    province?: string[]
  ): LocationData | null {
    // Try tumbon first
    if (tumbon?.length) {
      for (const t of tumbon) {
        const location = this.cache.tumbon.get(t);
        if (location) return location;
      }
    }

    // Then try amphure
    if (amphure?.length) {
      for (const a of amphure) {
        const location = this.cache.amphure.get(a);
        if (location) return location;
      }
    }

    // Finally try province
    if (province?.length) {
      for (const p of province) {
        const location = this.cache.province.get(p);
        if (location) return location;
      }
    }

    return null;
  }

  getCacheStats() {
    return {
      tumbonCount: this.cache.tumbon.size,
      amphureCount: this.cache.amphure.size,
      provinceCount: this.cache.province.size,
      totalLocations: this.cache.tumbon.size + this.cache.amphure.size + this.cache.province.size
    };
  }
} 