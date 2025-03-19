  // ... existing code ...
  logger.debug(`GOOGLE_MAPS_API_KEY: ${process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'not set'}`);
  
  // Load HII stations from API data file
  const hiiStationsPath = 'thaiwater_api_hii_stations.json';
  if (!fs.existsSync(hiiStationsPath)) {
    logger.error(`HII stations data file not found at ${hiiStationsPath}`);
    return;
  }
  // ... existing code ...