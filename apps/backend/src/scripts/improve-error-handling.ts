import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Paths to files that need to be updated
const TELEMETRY_SERVICE_PATH = path.resolve(__dirname, '../services/rid-telemetry/telemetry.service.ts');
const TELEMETRY_API_PATH = path.resolve(__dirname, '../api/telemetry.ts');
const TYPES_PATH = path.resolve(__dirname, '../services/rid-telemetry/types.ts');

/**
 * Improves error handling for empty data responses from the RID API
 */
async function improveErrorHandling() {
  try {
    console.log('Starting error handling improvements...');
    
    // Update types.ts to add empty data error type
    console.log(`Reading ${TYPES_PATH}...`);
    const typesContent = await readFile(TYPES_PATH, 'utf8');
    
    // Check if the file already has the EmptyDataError type
    if (typesContent.includes('export interface EmptyDataError')) {
      console.log('EmptyDataError type already exists in types.ts');
    } else {
      console.log('Adding EmptyDataError type to types.ts...');
      
      // Create updated content with the new type
      const updatedTypesContent = `${typesContent}

/**
 * Error type for empty data responses
 */
export interface EmptyDataError extends TelemetryError {
  stationId: string;
  date: string;
  reason?: 'SEASONAL' | 'STATION_OFFLINE' | 'NO_DATA' | 'UNKNOWN';
}`;
      
      // Write the updated content back to the file
      await writeFile(TYPES_PATH, updatedTypesContent);
      console.log('Successfully updated types.ts');
    }
    
    // Update telemetry.service.ts to handle empty data responses
    console.log(`Reading ${TELEMETRY_SERVICE_PATH}...`);
    const telemetryContent = await readFile(TELEMETRY_SERVICE_PATH, 'utf8');
    
    // Check if the file already has the handleEmptyData function
    if (telemetryContent.includes('function handleEmptyData')) {
      console.log('handleEmptyData function already exists in telemetry.service.ts');
    } else {
      console.log('Adding handleEmptyData function to telemetry.service.ts...');
      
      // Find the position to insert the new function (before getTelemetryData)
      const getTelemetryDataPosition = telemetryContent.indexOf('export async function getTelemetryData');
      
      if (getTelemetryDataPosition === -1) {
        console.error('Could not find getTelemetryData function in telemetry.service.ts');
        return;
      }
      
      // Create the new function
      const handleEmptyDataFunction = `/**
 * Handles empty data responses and provides context
 */
function handleEmptyData(stationId: string, date: string): EmptyDataError {
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
}

`;
      
      // Insert the new function
      const updatedTelemetryContent = telemetryContent.slice(0, getTelemetryDataPosition) + 
        handleEmptyDataFunction + 
        telemetryContent.slice(getTelemetryDataPosition);
      
      // Update the getTelemetryData function to use handleEmptyData
      const updatedGetTelemetryData = updatedTelemetryContent.replace(
        /const data = await makeRidApiRequest\(TELEMETRY_ENDPOINT, requestBody\);[\s\S]*?logger\.info\('Successfully fetched telemetry data'/,
        `const data = await makeRidApiRequest(TELEMETRY_ENDPOINT, requestBody);

    // Check if data is empty and handle appropriately
    if (Array.isArray(data) && data.length === 0) {
      throw handleEmptyData(request.stationid, request.timestart);
    }

    logger.info('Successfully fetched telemetry data'`
      );
      
      // Write the updated content back to the file
      await writeFile(TELEMETRY_SERVICE_PATH, updatedGetTelemetryData);
      console.log('Successfully updated telemetry.service.ts');
    }
    
    // Update telemetry.ts API to handle empty data errors
    console.log(`Reading ${TELEMETRY_API_PATH}...`);
    const apiContent = await readFile(TELEMETRY_API_PATH, 'utf8');
    
    // Check if the file already handles empty data errors
    if (apiContent.includes('EmptyDataError')) {
      console.log('telemetry.ts already handles empty data errors');
    } else {
      console.log('Updating telemetry.ts to handle empty data errors...');
      
      // Update the import statement
      const updatedImport = apiContent.replace(
        /import type { TelemetryError } from '\.\.\/services\/rid-telemetry\/types';/,
        `import type { TelemetryError, EmptyDataError } from '../services/rid-telemetry/types';`
      );
      
      // Update the error handling in the station_id endpoint
      const updatedErrorHandling = updatedImport.replace(
        /if \(error instanceof Error && 'status' in error\) {[\s\S]*?const telemetryError = error as TelemetryError;[\s\S]*?return res\.status\(telemetryError\.status \|\| 500\)\.json\({[\s\S]*?success: false,[\s\S]*?error: telemetryError\.message,[\s\S]*?details: telemetryError\.details[\s\S]*?}\);[\s\S]*?}/,
        `if (error instanceof Error && 'status' in error) {
      const telemetryError = error as TelemetryError;
      
      // Special handling for empty data errors
      if ('stationId' in telemetryError) {
        const emptyDataError = telemetryError as EmptyDataError;
        
        // Return a more user-friendly response for empty data
        return res.status(emptyDataError.status || 204).json({
          success: true,
          data: [],
          meta: {
            stationId: emptyDataError.stationId,
            date: emptyDataError.date,
            reason: emptyDataError.reason || 'UNKNOWN',
            message: emptyDataError.details
          }
        });
      }
      
      return res.status(telemetryError.status || 500).json({
        success: false,
        error: telemetryError.message,
        details: telemetryError.details
      });
    }`
      );
      
      // Write the updated content back to the file
      await writeFile(TELEMETRY_API_PATH, updatedErrorHandling);
      console.log('Successfully updated telemetry.ts');
    }
    
    console.log('Error handling improvements completed successfully!');
    console.log('Next steps:');
    console.log('1. Review the changes to ensure they match your codebase');
    console.log('2. Run tests to verify the improved error handling works correctly');
    console.log('3. Consider adding more specific error handling for different scenarios');
    
  } catch (error) {
    console.error('Error improving error handling:', error);
  }
}

// Run the improvements
improveErrorHandling().catch(console.error); 