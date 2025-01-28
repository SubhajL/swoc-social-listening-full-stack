import { logger } from '../utils/logger';
import { main } from './update_location_data_enhanced';

logger.info('Starting location data update process...');

main()
  .then(() => {
    logger.info('Location data update completed successfully');
    process.exit(0);
  })
  .catch((error: Error | unknown) => {
    logger.error('Location data update failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }); 