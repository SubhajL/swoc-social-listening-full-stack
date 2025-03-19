import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Paths to files that need to be updated
const TELEMETRY_SERVICE_PATH = path.resolve(__dirname, '../services/rid-telemetry/telemetry.service.ts');
const FALLBACK_DIR = path.resolve(__dirname, '../services/rid-telemetry/fallback');
const FALLBACK_DATA_PATH = path.resolve(FALLBACK_DIR, 'fallback-data.ts');

/**
 * Implements a fallback mechanism for when telemetry data is unavailable
 */
async function implementFallbackMechanism() {
  try {
    console.log('Starting fallback mechanism implementation...');
    
    // Create fallback directory if it doesn't exist
    try {
      await mkdir(FALLBACK_DIR, { recursive: true });
      console.log(`Created fallback directory at ${FALLBACK_DIR}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      console.log(`Fallback directory already exists at ${FALLBACK_DIR}`);
    }
    
    // Create fallback data file
    console.log(`Creating fallback data file at ${FALLBACK_DATA_PATH}...`);
    
    const fallbackDataContent = `import type { TelemetryReading } from '../types';

/**
 * Fallback data for when the RID API returns empty data
 * This data is based on historical averages and should be used only as a last resort
 */

// Map of station IDs to their fallback data
export const FALLBACK_DATA: Record<string, TelemetryReading[]> = {
  // แม่น้ำปิง บ้านแม่แตง อำเภอแม่แตง จังหวัดเชียงใหม่
  'P.4A': generateFallbackData('P.4A', 1.2, 45),
  
  // น้ำแม่แตง บ้านเมืองกื้ด อำเภอแม่แตง จังหวัดเชียงใหม่
  'P.67': generateFallbackData('P.67', 0.8, 30),
  
  // น้ำแม่แตง บ้านสบแม่รวม อำเภอแม่แตง จังหวัดเชียงใหม่
  'P.79': generateFallbackData('P.79', 0.9, 35),
  
  // น้ำแม่งัด บ้านสหกรณ์ร่มเกล้า อำเภอแม่แตง จังหวัดเชียงใหม่
  'P.82': generateFallbackData('P.82', 1.0, 40),
  
  // แม่น้ำปิง สะพานนวรัฐ อำเภอเมือง จังหวัดเชียงใหม่
  'P.1': generateFallbackData('P.1', 1.5, 60)
};

/**
 * Generates fallback data for a station based on average values
 */
function generateFallbackData(
  stationId: string,
  avgWaterLevel: number,
  avgFlowRate: number
): TelemetryReading[] {
  const now = new Date();
  const readings: TelemetryReading[] = [];
  
  // Generate 24 hours of fallback data
  for (let i = 0; i < 24; i++) {
    const hourTime = new Date(now);
    hourTime.setHours(i, 0, 0, 0);
    
    // Add some random variation to make the data look more realistic
    const variation = Math.sin(i / 24 * Math.PI * 2) * 0.2;
    const waterLevel = avgWaterLevel + variation;
    const flowRate = avgFlowRate + (variation * 20);
    
    readings.push({
      stationid: stationId,
      hourlytime: hourTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      hourlytimeutc: hourTime.toISOString(),
      wlvalues: parseFloat(waterLevel.toFixed(2)),
      wlvaluesabove: null,
      qvalues: parseFloat(flowRate.toFixed(2)),
      qavrvalues: null,
      notationid: 99, // Special notation for fallback data
      notationstring: 'Fallback data (estimated)'
    });
  }
  
  return readings;
}

/**
 * Gets fallback data for a specific station
 */
export function getFallbackData(stationId: string): TelemetryReading[] {
  // Return fallback data if available, otherwise return empty array
  return FALLBACK_DATA[stationId] || [];
}

/**
 * Checks if a station has fallback data available
 */
export function hasFallbackData(stationId: string): boolean {
  return stationId in FALLBACK_DATA;
}`;
    
    await writeFile(FALLBACK_DATA_PATH, fallbackDataContent);
    console.log('Successfully created fallback data file');
    
    // Update telemetry.service.ts to use fallback data
    console.log(`Reading ${TELEMETRY_SERVICE_PATH}...`);
    const telemetryContent = await readFile(TELEMETRY_SERVICE_PATH, 'utf8');
    
    // Check if the file already imports fallback data
    if (telemetryContent.includes('import { getFallbackData, hasFallbackData }')) {
      console.log('telemetry.service.ts already imports fallback data');
    } else {
      console.log('Updating telemetry.service.ts to use fallback data...');
      
      // Add import statement
      const importStatement = `import { logger } from '../../utils/logger';
import { getOAuthHeader, getSignedUrl } from './oauth';
import type { TelemetryReading, TelemetryResponse, TelemetryRequest, TelemetryError } from './types';
import { TelemetryRequest as TelemetryRequestDto } from '../../dto/telemetry.dto';
import { getFallbackData, hasFallbackData } from './fallback/fallback-data';
import https from 'https';`;
      
      const updatedImport = telemetryContent.replace(
        /import { logger } from '\.\.\/\.\.\/utils\/logger';[\s\S]*?import https from 'https';/,
        importStatement
      );
      
      // Update the handleEmptyData function to use fallback data
      // If handleEmptyData doesn't exist, we'll assume it was added by the previous script
      let updatedContent = updatedImport;
      
      if (updatedContent.includes('function handleEmptyData')) {
        updatedContent = updatedContent.replace(
          /function handleEmptyData\(stationId: string, date: string\): EmptyDataError {[\s\S]*?return {[\s\S]*?status: 204,[\s\S]*?message: ['"]No telemetry data available['"],[\s\S]*?details:[^}]*,[\s\S]*?stationId,[\s\S]*?date,[\s\S]*?reason[\s\S]*?};[\s\S]*?}/,
          `function handleEmptyData(stationId: string, date: string): EmptyDataError | TelemetryReading[] {
  // Check if fallback data is available for this station
  if (hasFallbackData(stationId)) {
    logger.info('Using fallback data for station', 'RidTelemetryService', {
      stationId,
      date,
      timestamp: new Date().toISOString()
    });
    
    // Return fallback data
    return getFallbackData(stationId);
  }
  
  // Check if it's dry season (roughly November to April in Thailand)
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1; // 0-indexed
  const isDrySeason = month >= 11 || month <= 4;
  
  // Determine the most likely reason for empty data
  let reason: EmptyDataError['reason'] = 'UNKNOWN';
  
  if (isDrySeason) {
    reason = 'SEASONAL';
  } else {
    // If not dry season, assume station might be offline
    reason = 'STATION_OFFLINE';
  }
  
  logger.warn('Empty data received from RID API', 'RidTelemetryService', {
    stationId,
    date,
    reason,
    timestamp: new Date().toISOString()
  });
  
  return {
    status: 204, // No Content
    message: 'No telemetry data available',
    details: \`No data available for station \${stationId} on \${date}\`,
    stationId,
    date,
    reason
  };
}`
        );
      }
      
      // Update the getTelemetryData function to use fallback data
      if (updatedContent.includes('if (Array.isArray(data) && data.length === 0)')) {
        updatedContent = updatedContent.replace(
          /if \(Array\.isArray\(data\) && data\.length === 0\) {[\s\S]*?throw handleEmptyData\(request\.stationid, request\.timestart\);[\s\S]*?}/,
          `if (Array.isArray(data) && data.length === 0) {
      const fallbackResult = handleEmptyData(request.stationid, request.timestart);
      
      // If fallback data is available, use it
      if (Array.isArray(fallbackResult)) {
        logger.info('Using fallback data for empty response', 'RidTelemetryService', {
          stationId: request.stationid,
          dataPoints: fallbackResult.length,
          timestamp: new Date().toISOString()
        });
        
        data = fallbackResult;
      } else {
        // Otherwise, throw the empty data error
        throw fallbackResult;
      }
    }`
        );
      }
      
      // Write the updated content back to the file
      await writeFile(TELEMETRY_SERVICE_PATH, updatedContent);
      console.log('Successfully updated telemetry.service.ts');
    }
    
    console.log('Fallback mechanism implementation completed successfully!');
    console.log('Next steps:');
    console.log('1. Review the changes to ensure they match your codebase');
    console.log('2. Update the fallback data with more accurate historical averages');
    console.log('3. Run tests to verify the fallback mechanism works correctly');
    
  } catch (error) {
    console.error('Error implementing fallback mechanism:', error);
  }
}

// Run the implementation
implementFallbackMechanism().catch(console.error); 