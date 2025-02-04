import { LocationCacheService } from '../services/location-cache.service.js';
import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../utils/logger.js';

async function testCacheImprovements() {
  // Initialize database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'swoc_social_listening',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  try {
    // Initialize location cache service
    const locationCache = new LocationCacheService(pool);
    await locationCache.initialize();

    // Test 1: Verify amphure cache initialization
    const stats = locationCache.getCacheStats();
    logger.info('Cache Statistics:', stats);

    // Test 2: Test location lookups with monitoring
    const testLocations = [
      { tumbon: 'บางนา', amphure: 'บางนา', province: 'กรุงเทพมหานคร' },
      { tumbon: '', amphure: 'เมืองเชียงใหม่', province: 'เชียงใหม่' },
      { tumbon: '', amphure: 'หาดใหญ่', province: 'สงขลา' }
    ];

    for (const loc of testLocations) {
      const result = locationCache.getLocation(loc.tumbon, loc.amphure, loc.province);
      logger.info('Location lookup result:', {
        input: loc,
        result,
        cacheStats: locationCache.getCacheStats()
      });
    }

    // Test 3: Verify metrics
    const finalStats = locationCache.getCacheStats();
    logger.info('Final Cache Metrics:', {
      tumbon: {
        hitRate: finalStats.tumbon.hitRate,
        averageLatency: finalStats.tumbon.metrics.averageLatency,
        totalRequests: finalStats.tumbon.metrics.requests
      },
      amphure: {
        hitRate: finalStats.amphure.hitRate,
        averageLatency: finalStats.amphure.metrics.averageLatency,
        totalRequests: finalStats.amphure.metrics.requests
      },
      province: {
        hitRate: finalStats.province.hitRate,
        averageLatency: finalStats.province.metrics.averageLatency,
        totalRequests: finalStats.province.metrics.requests
      }
    });

  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

testCacheImprovements().catch(console.error); 