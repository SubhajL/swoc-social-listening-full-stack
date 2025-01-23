import { Pool } from 'pg';
import { config } from 'dotenv';
import { LocationService } from '../services/location.service.js';
import {
  AdministrativeLevel,
  LocationDataSource,
  Province,
  Amphure,
  Tumbon
} from '../types/location.types.js';

// Load environment variables
config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME
};

// Initialize database pool
const pool = new Pool(dbConfig);
const locationService = new LocationService(pool);

// Rate limiting helper
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process location data with rate limiting
async function processWithRateLimit<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  delayMs: number = 1000
): Promise<void> {
  for (const item of items) {
    try {
      await processor(item);
      await delay(delayMs);
    } catch (error) {
      console.error('Error processing item:', error);
    }
  }
}

// Main population function
async function populateLocations(): Promise<void> {
  try {
    // Initialize database tables
    await locationService.initialize();
    console.log('Database tables initialized');

    // Load data from JSON files
    const centralData = await import('../../src/utils/coordinates/provinces/central.json', { assert: { type: 'json' } });
    const northData = await import('../../src/utils/coordinates/provinces/north.json', { assert: { type: 'json' } });
    const northeastData = await import('../../src/utils/coordinates/provinces/northeast.json', { assert: { type: 'json' } });
    const eastData = await import('../../src/utils/coordinates/provinces/east.json', { assert: { type: 'json' } });
    const westData = await import('../../src/utils/coordinates/provinces/west.json', { assert: { type: 'json' } });
    const southData = await import('../../src/utils/coordinates/provinces/south.json', { assert: { type: 'json' } });

    // Combine all region data
    const allRegions = [
      { name: 'Central', data: centralData.default },
      { name: 'North', data: northData.default },
      { name: 'Northeast', data: northeastData.default },
      { name: 'East', data: eastData.default },
      { name: 'West', data: westData.default },
      { name: 'South', data: southData.default }
    ];

    // Process each region
    for (const region of allRegions) {
      console.log(`Processing ${region.name} region...`);

      // Process provinces
      for (const [provinceName, provinceData] of Object.entries(region.data)) {
        const province = provinceData as any;
        
        try {
          // Add province
          await locationService.upsertProvince({
            nameTH: provinceName,
            nameEN: province.nameEN || provinceName,
            coordinates: province.coordinates,
            level: AdministrativeLevel.PROVINCE,
            source: LocationDataSource.MANUAL,
            verified: false
          });

          // Process amphures
          for (const [amphureName, amphureData] of Object.entries(province.amphures)) {
            const amphure = amphureData as any;
            
            try {
              // Add amphure
              await locationService.upsertAmphure({
                nameTH: amphureName,
                nameEN: amphure.nameEN || amphureName,
                coordinates: amphure.coordinates,
                level: AdministrativeLevel.AMPHURE,
                provinceId: province.id,
                source: LocationDataSource.MANUAL,
                verified: false
              });

              // Process tumbons
              for (const [tumbonName, tumbonData] of Object.entries(amphure.tumbons)) {
                const tumbon = tumbonData as any;
                
                try {
                  // Add tumbon
                  await locationService.upsertTumbon({
                    nameTH: tumbonName,
                    nameEN: tumbon.nameEN || tumbonName,
                    coordinates: tumbon.coordinates,
                    level: AdministrativeLevel.TUMBON,
                    amphureId: amphure.id,
                    postalCode: tumbon.postalCode,
                    source: LocationDataSource.MANUAL,
                    verified: false
                  });
                } catch (error) {
                  console.error(`Error adding tumbon ${tumbonName}:`, error);
                }

                // Rate limiting for tumbons
                await delay(500);
              }
            } catch (error) {
              console.error(`Error adding amphure ${amphureName}:`, error);
            }

            // Rate limiting for amphures
            await delay(1000);
          }
        } catch (error) {
          console.error(`Error adding province ${provinceName}:`, error);
        }

        // Rate limiting for provinces
        await delay(2000);
      }

      console.log(`Completed processing ${region.name} region`);
    }

    console.log('Location data population completed successfully');
  } catch (error) {
    console.error('Error populating location data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the population script
populateLocations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 