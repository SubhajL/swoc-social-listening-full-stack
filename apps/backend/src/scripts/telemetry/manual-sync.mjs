#!/usr/bin/env node

import { syncStations, syncTelemetryData } from './sync-telemetry.mjs';
import { logger } from '../../utils/logger.ts';

async function manualSync() {
  try {
    // Run station sync
    logger.info('Starting manual station sync', 'ManualSync');
    await syncStations();
    logger.info('Station sync completed', 'ManualSync');

    // Run telemetry data sync
    logger.info('Starting manual telemetry data sync', 'ManualSync');
    await syncTelemetryData();
    logger.info('Telemetry data sync completed', 'ManualSync');

    process.exit(0);
  } catch (error) {
    logger.error('Manual sync failed:', error);
    process.exit(1);
  }
}

// Run the manual sync
manualSync(); 