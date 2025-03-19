import { setupPostGISForThaiWater } from './setup-postgis-for-thaiwater';
import { importThailandBoundaries } from './import-thailand-boundaries';
import { populateThaiWaterLocations } from './populate-thaiwater-locations';
import { logger } from '../utils/logger';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Main function to run the entire location update process in sequence:
 * 1. Set up PostGIS for ThaiWater stations
 * 2. Import Thailand administrative boundaries
 * 3. Populate ThaiWater stations with location data
 */
async function runLocationUpdate(options: {
  skipPostGIS?: boolean;
  skipBoundaries?: boolean;
  limit?: number;
  newOnly?: boolean;
}): Promise<void> {
  logger.info('[LocationUpdate] Starting the location update process');
  
  try {
    // Step 1: Set up PostGIS for ThaiWater stations
    if (!options.skipPostGIS) {
      logger.info('[LocationUpdate] Setting up PostGIS for ThaiWater stations');
      await setupPostGISForThaiWater();
      logger.info('[LocationUpdate] PostGIS setup completed');
    } else {
      logger.info('[LocationUpdate] Skipping PostGIS setup');
    }
    
    // Step 2: Import Thailand administrative boundaries
    if (!options.skipBoundaries) {
      logger.info('[LocationUpdate] Importing Thailand administrative boundaries');
      await importThailandBoundaries();
      logger.info('[LocationUpdate] Thailand boundaries import completed');
    } else {
      logger.info('[LocationUpdate] Skipping Thailand boundaries import');
    }
    
    // Step 3: Populate ThaiWater stations with location data
    logger.info('[LocationUpdate] Populating ThaiWater stations with location data');
    await populateThaiWaterLocations({
      limit: options.limit,
      newOnly: options.newOnly
    });
    logger.info('[LocationUpdate] ThaiWater stations location population completed');
    
    logger.info('[LocationUpdate] Location update process completed successfully');
  } catch (error) {
    logger.error('[LocationUpdate] Error during location update process:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('skip-postgis', {
    alias: 'p',
    type: 'boolean',
    description: 'Skip PostGIS setup',
    default: false
  })
  .option('skip-boundaries', {
    alias: 'b',
    type: 'boolean',
    description: 'Skip Thailand boundaries import',
    default: false
  })
  .option('limit', {
    alias: 'l',
    type: 'number',
    description: 'Limit the number of stations to process',
    default: undefined
  })
  .option('new-only', {
    alias: 'n',
    type: 'boolean',
    description: 'Only process stations without location data',
    default: false
  })
  .help()
  .alias('help', 'h')
  .argv as {
    skipPostgis?: boolean;
    skipBoundaries?: boolean;
    limit?: number;
    newOnly?: boolean;
  };

// Run the location update process
runLocationUpdate({
  skipPostGIS: argv.skipPostgis,
  skipBoundaries: argv.skipBoundaries,
  limit: argv.limit,
  newOnly: argv.newOnly
}).catch((error) => {
  logger.error('[LocationUpdate] Unhandled error:', error);
  process.exit(1);
}); 