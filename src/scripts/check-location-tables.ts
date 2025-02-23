import { db } from '../lib/db';
import { logger } from '../lib/logger';

async function main() {
  try {
    // Check provinces
    const provinceCount = await db.one('SELECT COUNT(*) FROM provinces');
    logger.info(`Total provinces: ${provinceCount.count}`);
    
    const provinces = await db.manyOrNone('SELECT * FROM provinces LIMIT 5');
    logger.info('Sample provinces:', provinces);

    // Check amphures
    const amphureCount = await db.one('SELECT COUNT(*) FROM amphures');
    logger.info(`Total amphures: ${amphureCount.count}`);
    
    const amphures = await db.manyOrNone('SELECT * FROM amphures LIMIT 5');
    logger.info('Sample amphures:', amphures);

  } catch (error) {
    logger.error('Error checking location tables:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 