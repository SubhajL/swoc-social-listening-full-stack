// Script to update ThaiWater stations with amphure information using geocoding services
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import { setTimeout } from 'timers/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API keys and endpoints
const LONGDO_MAP_KEY = process.env.LONGDO_MAP_KEY || 'eb24259bfbfa85ad331a1b90eb091b4a';
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1Ijoic3ViaGFqIiwiYSI6ImNtNHdtdHYzMzBmY3AyanBwdW5nMmNpenAifQ.M6zea2D_TLnke3L7iwBUFg';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyANIYu6U53gD7ASCMRVz16lCC7KVa0yjwg';
const LONGDO_API_URL = 'https://api.longdo.com/map/services/address';
const MAPBOX_API_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Thai province to amphure mapping for fallback
let PROVINCE_AMPHURE_MAPPING = {};

// Load province-amphure mapping from file if it exists
try {
  const mappingPath = path.join(__dirname, 'thai-province-amphure-mapping.json');
  if (fs.existsSync(mappingPath)) {
    PROVINCE_AMPHURE_MAPPING = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`Loaded province-amphure mapping with ${Object.keys(PROVINCE_AMPHURE_MAPPING).length} provinces`);
  }
} catch (error) {
  console.log('Could not load province-amphure mapping:', error.message);
}

// Log API key status
console.log('API Keys Status:');
console.log(`- Longdo Map API Key: ${LONGDO_MAP_KEY !== 'YOUR_LONGDO_MAP_KEY' ? 'Configured' : 'Missing'}`);
console.log(`- Mapbox Access Token: ${MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN' ? 'Configured' : 'Missing'}`);
console.log(`- Google Maps API Key: ${GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY' ? 'Configured' : 'Missing'}`);

/**
 * Geocodes coordinates using Longdo Map API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeWithLongdo(lat, lng) {
  try {
    // Skip if no valid API key
    if (!LONGDO_MAP_KEY || LONGDO_MAP_KEY === 'YOUR_LONGDO_MAP_KEY') {
      console.log('  Skipping Longdo geocoding: No valid API key');
      return null;
    }

    // Ensure coordinates are valid numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('  Invalid coordinates for Longdo geocoding');
      return null;
    }
    
    console.log(`  Longdo request for coordinates: ${latitude},${longitude}`);
    
    // Construct request URL according to documentation
    const response = await axios.get(LONGDO_API_URL, {
      params: {
        key: LONGDO_MAP_KEY,
        lon: longitude,
        lat: latitude,
        locale: 'th',
        noelevation: 1  // We don't need elevation data
      }
    });

    // For debugging
    console.log(`  Longdo response: ${JSON.stringify(response.data)}`);

    if (response.data) {
      // Extract data according to the API documentation
      // The API returns: province, district, subdistrict, etc.
      
      // Clean up province name - ensure it has "จังหวัด" prefix
      let province = response.data.province || null;
      if (province) {
        if (province.startsWith('จ.')) {
          province = 'จังหวัด' + province.substring(2);
        } else if (!province.startsWith('จังหวัด')) {
          province = 'จังหวัด' + province;
        }
      }

      // Clean up amphoe (district) name - ensure it has "อำเภอ" or "เขต" prefix
      let amphoe = response.data.district || null;
      if (amphoe) {
        if (amphoe.startsWith('อ.')) {
          amphoe = 'อำเภอ' + amphoe.substring(2);
        } else if (amphoe.startsWith('เขต')) {
          // Already has correct prefix for Bangkok districts
        } else if (!amphoe.startsWith('อำเภอ')) {
          // Check if this is a Bangkok district
          if (province && (province.includes('กรุงเทพ') || province.includes('bangkok'))) {
            if (!amphoe.startsWith('เขต')) {
              amphoe = 'เขต' + amphoe;
            }
          } else {
            amphoe = 'อำเภอ' + amphoe;
          }
        }
      }

      // Clean up tambon (subdistrict) name - ensure it has "ตำบล" or "แขวง" prefix
      let tambon = response.data.subdistrict || null;
      if (tambon) {
        if (tambon.startsWith('ต.')) {
          tambon = 'ตำบล' + tambon.substring(2);
        } else if (tambon.startsWith('แขวง')) {
          // Already has correct prefix for Bangkok subdistricts
        } else if (!tambon.startsWith('ตำบล')) {
          // Check if this is a Bangkok subdistrict
          if (province && (province.includes('กรุงเทพ') || province.includes('bangkok'))) {
            if (!tambon.startsWith('แขวง')) {
              tambon = 'แขวง' + tambon;
            }
          } else {
            tambon = 'ตำบล' + tambon;
          }
        }
      }

      // Log what we found
      console.log(`  Longdo found: Province=${province || 'None'}, District=${amphoe || 'None'}, Subdistrict=${tambon || 'None'}`);

      return {
        province: province,
        amphoe: amphoe,
        tambon: tambon,
        source: 'longdo'
      };
    }
    
    console.log('  Longdo returned no usable data');
    return null;
  } catch (error) {
    console.error(`Longdo geocoding error: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

/**
 * Geocodes coordinates using Mapbox API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeWithMapbox(lat, lng) {
  // Skip if no valid token
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN') {
    console.log('  Skipping Mapbox geocoding: No valid access token');
    return null;
  }

  try {
    // Ensure coordinates are valid numbers
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    
    if (isNaN(longitude) || isNaN(latitude)) {
      console.error('  Invalid coordinates for Mapbox geocoding');
      return null;
    }
    
    // Use reverse geocoding endpoint with correct format
    // Format: /geocoding/v5/{endpoint}/{longitude},{latitude}.json
    const url = `${MAPBOX_API_URL}/${longitude.toFixed(6)},${latitude.toFixed(6)}.json`;
    
    console.log(`  Mapbox request URL: ${url}`);
    
    const response = await axios.get(url, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        language: 'th',
        country: 'th',
        types: 'region',  // Specify a single type as required by the API
        limit: 1          // Specify a limit as required by the API
      }
    });

    // For debugging
    console.log(`  Mapbox response status: ${response.status}`);
    
    if (response.data && response.data.features) {
      console.log(`  Mapbox response features: ${response.data.features.length}`);
      
      // Log the first feature for debugging
      if (response.data.features.length > 0) {
        console.log(`  First feature: ${JSON.stringify(response.data.features[0].place_name)}`);
      }
    }

    if (response.data && response.data.features && response.data.features.length > 0) {
      // Extract province and amphoe from features
      let province = null;
      let amphoe = null;
      let tambon = null;

      // Process features to extract administrative information
      for (const feature of response.data.features) {
        console.log(`  Feature: ${feature.place_type} - ${feature.text}`);
        
        // Check place_type to determine administrative level
        if (feature.place_type.includes('region')) {
          province = feature.text;
          console.log(`  Found province: ${province}`);
        } 
        
        // Check context for additional information
        if (feature.context) {
          for (const ctx of feature.context) {
            const id = ctx.id || '';
            if (id.startsWith('district')) {
              amphoe = ctx.text;
              console.log(`  Found amphoe from context: ${amphoe}`);
            } 
            else if (id.startsWith('region') && !province) {
              province = ctx.text;
              console.log(`  Found province from context: ${province}`);
            }
          }
        }
      }

      // Try a second request for district level if we found a province but no amphoe
      if (province && !amphoe) {
        console.log('  Found province but no amphoe, trying a second request for district level');
        
        try {
          const districtResponse = await axios.get(url, {
            params: {
              access_token: MAPBOX_ACCESS_TOKEN,
              language: 'th',
              country: 'th',
              types: 'district',  // Look specifically for district
              limit: 1
            }
          });
          
          if (districtResponse.data && 
              districtResponse.data.features && 
              districtResponse.data.features.length > 0) {
            
            const districtFeature = districtResponse.data.features[0];
            if (districtFeature.place_type.includes('district')) {
              amphoe = districtFeature.text;
              console.log(`  Found amphoe from district request: ${amphoe}`);
            }
          }
        } catch (districtError) {
          console.log(`  Error in district request: ${districtError.message}`);
        }
      }

      if (province || amphoe) {
        // Format province name to match Thai format if needed
        if (province && !province.startsWith('จังหวัด')) {
          province = `จังหวัด${province}`;
        }
        
        // Format amphoe name to match Thai format if needed
        if (amphoe && !amphoe.startsWith('อำเภอ')) {
          amphoe = `อำเภอ${amphoe}`;
        }
        
        return {
          province: province,
          amphoe: amphoe,
          tambon: tambon,
          source: 'mapbox'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Mapbox geocoding error: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

/**
 * Geocodes coordinates using Google Maps API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeWithGoogleMaps(lat, lng) {
  // Skip if no valid API key
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    console.log('  Skipping Google Maps geocoding: No valid API key');
    return null;
  }

  try {
    // Ensure coordinates are valid numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('  Invalid coordinates for Google Maps geocoding');
      return null;
    }
    
    console.log(`  Google Maps request for coordinates: ${latitude},${longitude}`);
    
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'th'
      }
    });

    // For debugging
    console.log(`  Google Maps response status: ${response.status}`);
    console.log(`  Google Maps response status text: ${response.data.status}`);
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      console.log(`  Google Maps results: ${response.data.results.length}`);
      
      // Log the first result for debugging
      if (response.data.results.length > 0) {
        console.log(`  First result types: ${JSON.stringify(response.data.results[0].types)}`);
      }
      
      let province = null;
      let amphoe = null;
      let tambon = null;
      
      // Process each result to extract administrative information
      for (const result of response.data.results) {
        // Extract address components
        if (result.address_components) {
          for (const component of result.address_components) {
            if (component.types.includes('administrative_area_level_1')) {
              province = component.long_name;
              console.log(`  Found province: ${province}`);
            } 
            else if (component.types.includes('administrative_area_level_2')) {
              amphoe = component.long_name;
              console.log(`  Found amphoe: ${amphoe}`);
            }
            else if (component.types.includes('administrative_area_level_3')) {
              tambon = component.long_name;
              console.log(`  Found tambon: ${tambon}`);
            }
          }
        }
      }
      
      if (province || amphoe) {
        // Format province name to match Thai format if needed
        if (province && !province.startsWith('จังหวัด')) {
          province = `จังหวัด${province}`;
        }
        
        // Format amphoe name to match Thai format if needed
        if (amphoe && !amphoe.startsWith('อำเภอ')) {
          amphoe = `อำเภอ${amphoe}`;
        }
        
        // Format tambon name to match Thai format if needed
        if (tambon && !tambon.startsWith('ตำบล')) {
          tambon = `ตำบล${tambon}`;
        }
        
        return {
          province: province,
          amphoe: amphoe,
          tambon: tambon,
          source: 'google'
        };
      }
    } else {
      console.log(`  Google Maps returned no results or error: ${response.data.status}`);
      console.log(`  Error message: ${response.data.error_message || 'No error message'}`);
    }
    
    return null;
  } catch (error) {
    console.error(`Google Maps geocoding error: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

/**
 * Try to get amphure from province-amphure mapping
 * @param {string} province - Province name
 * @returns {string|null} - Amphure name or null if not found
 */
function getAmphureFromMapping(province) {
  if (!province) return null;
  
  // Clean up province name for matching
  let cleanProvince = province.trim();
  
  // Try different formats of the province name
  const possibleFormats = [
    cleanProvince,
    // If province starts with "จังหวัด" try without it
    cleanProvince.startsWith('จังหวัด') ? cleanProvince.substring(7) : null,
    // If province doesn't start with "จังหวัด" try with it
    !cleanProvince.startsWith('จังหวัด') ? 'จังหวัด' + cleanProvince : null,
    // If province starts with "จ." convert to "จังหวัด"
    cleanProvince.startsWith('จ.') ? 'จังหวัด' + cleanProvince.substring(2) : null,
    // Special case for Bangkok
    cleanProvince.includes('กรุงเทพ') ? 'กรุงเทพมหานคร' : null,
    cleanProvince.includes('bangkok') ? 'กรุงเทพมหานคร' : null
  ].filter(Boolean); // Remove null values
  
  console.log(`  Trying to match province "${province}" with mapping using formats:`, possibleFormats);
  
  // Try each format
  for (const format of possibleFormats) {
    if (PROVINCE_AMPHURE_MAPPING[format] && PROVINCE_AMPHURE_MAPPING[format].length > 0) {
      // Use the first amphure in the list (usually the main district)
      console.log(`  Found match with format "${format}": ${PROVINCE_AMPHURE_MAPPING[format][0]}`);
      return PROVINCE_AMPHURE_MAPPING[format][0];
    }
  }
  
  // If no exact match, try a fuzzy match by checking if the province name contains any of our mapping keys
  // or if any of our mapping keys contain the province name
  for (const mappedProvince of Object.keys(PROVINCE_AMPHURE_MAPPING)) {
    // Skip empty mappings
    if (!PROVINCE_AMPHURE_MAPPING[mappedProvince] || PROVINCE_AMPHURE_MAPPING[mappedProvince].length === 0) {
      continue;
    }
    
    // Check if the province name contains the mapped province or vice versa
    const normalizedMappedProvince = mappedProvince.toLowerCase().replace(/จังหวัด|จ\./g, '').trim();
    const normalizedProvince = cleanProvince.toLowerCase().replace(/จังหวัด|จ\./g, '').trim();
    
    if (normalizedMappedProvince.includes(normalizedProvince) || normalizedProvince.includes(normalizedMappedProvince)) {
      console.log(`  Found fuzzy match: "${mappedProvince}" for "${province}": ${PROVINCE_AMPHURE_MAPPING[mappedProvince][0]}`);
      return PROVINCE_AMPHURE_MAPPING[mappedProvince][0];
    }
  }
  
  console.log(`  No matching amphure found in mapping for province "${province}"`);
  return null;
}

/**
 * Geocodes coordinates using multiple services with fallback
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string, source: string}>}
 */
async function geocodeCoordinates(lat, lng) {
  // Try Longdo first
  const longdoResult = await geocodeWithLongdo(lat, lng);
  
  // If Longdo returns complete data with amphoe, use it
  if (longdoResult && longdoResult.amphoe) {
    console.log(`  Found location with Longdo: Province=${longdoResult.province}, Amphoe=${longdoResult.amphoe}`);
    return longdoResult;
  }
  
  // If Longdo returns province but no amphoe, try to get amphoe from mapping
  if (longdoResult && longdoResult.province && !longdoResult.amphoe) {
    const amphoe = getAmphureFromMapping(longdoResult.province);
    if (amphoe) {
      console.log(`  Using amphoe from mapping: ${amphoe} for province ${longdoResult.province}`);
      return {
        ...longdoResult,
        amphoe: amphoe,
        source: 'longdo+mapping'
      };
    }
  }
  
  // If Longdo fails or doesn't return amphoe (and mapping didn't help), try Mapbox
  console.log('  Longdo geocoding incomplete, trying Mapbox...');
  const mapboxResult = await geocodeWithMapbox(lat, lng);
  
  // If Mapbox returns complete data with amphoe, use it
  if (mapboxResult && mapboxResult.amphoe) {
    console.log(`  Found location with Mapbox: Province=${mapboxResult.province}, Amphoe=${mapboxResult.amphoe}`);
    return mapboxResult;
  }
  
  // If Mapbox returns province but no amphoe, try to get amphoe from mapping
  if (mapboxResult && mapboxResult.province && !mapboxResult.amphoe) {
    const amphoe = getAmphureFromMapping(mapboxResult.province);
    if (amphoe) {
      console.log(`  Using amphoe from mapping: ${amphoe} for province ${mapboxResult.province}`);
      return {
        ...mapboxResult,
        amphoe: amphoe,
        source: 'mapbox+mapping'
      };
    }
  }
  
  // If Mapbox fails or doesn't return amphoe (and mapping didn't help), try Google Maps
  console.log('  Mapbox geocoding incomplete, trying Google Maps...');
  const googleResult = await geocodeWithGoogleMaps(lat, lng);
  
  // If Google Maps returns complete data with amphoe, use it
  if (googleResult && googleResult.amphoe) {
    console.log(`  Found location with Google Maps: Province=${googleResult.province}, Amphoe=${googleResult.amphoe}`);
    return googleResult;
  }
  
  // If Google Maps returns province but no amphoe, try to get amphoe from mapping
  if (googleResult && googleResult.province && !googleResult.amphoe) {
    const amphoe = getAmphureFromMapping(googleResult.province);
    if (amphoe) {
      console.log(`  Using amphoe from mapping: ${amphoe} for province ${googleResult.province}`);
      return {
        ...googleResult,
        amphoe: amphoe,
        source: 'google+mapping'
      };
    }
  }
  
  // Return the best result we have, prioritizing Longdo, then Mapbox, then Google Maps
  if (longdoResult && longdoResult.province) {
    console.log(`  Partial result from Longdo: Province=${longdoResult.province}, but no Amphoe - this is acceptable`);
    return longdoResult;
  }
  
  if (mapboxResult && mapboxResult.province) {
    console.log(`  Partial result from Mapbox: Province=${mapboxResult.province}, but no Amphoe - this is acceptable`);
    return mapboxResult;
  }
  
  if (googleResult && googleResult.province) {
    console.log(`  Partial result from Google Maps: Province=${googleResult.province}, but no Amphoe - this is acceptable`);
    return googleResult;
  }
  
  console.log('  Geocoding failed with all services');
  return null;
}

/**
 * Updates a station with location information
 * @param {object} client - Database client
 * @param {number} stationId - Station ID
 * @param {object} locationData - Location data
 * @param {boolean} dryRun - Whether to run in dry-run mode
 * @returns {Promise<boolean>}
 */
async function updateStationLocation(client, stationId, locationData, dryRun = false) {
  try {
    if (dryRun) {
      console.log(`  [DRY RUN] Would update station ${stationId} with:`, locationData);
      return true;
    }
    
    const query = `
      UPDATE thaiwater_tele_stations
      SET 
        province = $1,
        amphure = $2,
        tambon = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE tele_station_id = $4
    `;
    
    await client.query(query, [
      locationData.province,
      locationData.amphoe,
      locationData.tambon,
      stationId
    ]);
    
    return true;
  } catch (error) {
    console.error(`Error updating station ${stationId}:`, error.message);
    return false;
  }
}

/**
 * Updates ThaiWater stations with location information using geocoding
 * @param {object} options - Options for updating
 * @returns {Promise<void>}
 */
async function updateThaiWaterAmphureWithGeocoding(options = {}) {
  const { limit = 10, all = false, dryRun = false, onlyMissing = true } = options;
  
  console.log('Starting update of ThaiWater stations with geocoding...');
  console.log(`Options: limit=${limit}, all=${all}, dryRun=${dryRun}, onlyMissing=${onlyMissing}`);
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Begin transaction if not in dry-run mode
      if (!dryRun) {
        await client.query('BEGIN');
      }
      
      // Get stations that need geocoding
      let stationsQuery = `
        SELECT 
          tele_station_id,
          tele_station_name,
          tele_station_lat,
          tele_station_long,
          province,
          amphure,
          tambon
        FROM thaiwater_tele_stations
        WHERE tele_station_lat IS NOT NULL 
          AND tele_station_long IS NOT NULL
      `;
      
      // If only updating stations with missing amphure
      if (onlyMissing) {
        stationsQuery += ` AND (amphure IS NULL OR amphure = '' OR amphure = 'Unknown')`;
      }
      
      // Add limit if not processing all stations
      if (!all) {
        stationsQuery += ` LIMIT ${limit}`;
      }
      
      const stationsResult = await client.query(stationsQuery);
      const stations = stationsResult.rows;
      
      console.log(`Found ${stations.length} stations to update with geocoding`);
      
      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;
      
      // Process each station
      for (let i = 0; i < stations.length; i++) {
        const station = stations[i];
        console.log(`Processing station ${i+1}/${stations.length}: ID ${station.tele_station_id}, Name: ${station.tele_station_name || 'Unknown'}`);
        
        // Skip if coordinates are invalid
        const lat = parseFloat(station.tele_station_lat);
        const lng = parseFloat(station.tele_station_long);
        
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          console.log(`  Skipping station ${station.tele_station_id} due to invalid coordinates: lat=${station.tele_station_lat}, lng=${station.tele_station_long}`);
          skippedCount++;
          continue;
        }
        
        console.log(`  Geocoding coordinates: lat=${lat}, lng=${lng}`);
        
        // Geocode the coordinates
        const locationData = await geocodeCoordinates(lat, lng);
        
        if (locationData && locationData.province) {
          // Update the station even if amphoe is missing
          const updated = await updateStationLocation(client, station.tele_station_id, locationData, dryRun);
          
          if (updated) {
            successCount++;
            if (!dryRun) {
              if (locationData.amphoe) {
                console.log(`  Updated station ${station.tele_station_id} with province=${locationData.province}, amphoe=${locationData.amphoe}`);
              } else {
                console.log(`  Updated station ${station.tele_station_id} with province=${locationData.province}, amphoe=<blank>`);
              }
            }
          } else {
            failureCount++;
            console.log(`  Failed to update station ${station.tele_station_id}`);
          }
        } else {
          failureCount++;
          console.log(`  No location data found for station ${station.tele_station_id}`);
        }
        
        // Add a delay between requests to avoid rate limiting
        if (i < stations.length - 1) {
          await setTimeout(500); // 500ms delay
        }
      }
      
      // Commit transaction if not in dry-run mode
      if (!dryRun) {
        await client.query('COMMIT');
      } else {
        console.log('\n[DRY RUN] No changes were made to the database');
        console.log('Note: Stations with province information but missing amphure are considered successfully updated');
      }
      
      console.log('\nUpdate completed:');
      console.log(`  Successful updates: ${successCount} (includes stations with province but no amphure)`);
      console.log(`  Failed updates: ${failureCount}`);
      console.log(`  Skipped stations: ${skippedCount}`);
      console.log(`  Success rate: ${(successCount / (stations.length - skippedCount) * 100).toFixed(2)}%`);
      
    } catch (error) {
      // Rollback transaction on error if not in dry-run mode
      if (!dryRun) {
        await client.query('ROLLBACK');
      }
      console.error('Error during update:', error);
    } finally {
      // Release client back to pool
      client.release();
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

/**
 * Parse command line arguments
 * @returns {object} - Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: 10,
    all: false,
    dryRun: false,
    onlyMissing: true,
    help: false
  };
  
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--include-existing') {
      options.onlyMissing = false;
    } else if (arg.startsWith('--limit=')) {
      const limitValue = parseInt(arg.split('=')[1], 10);
      if (!isNaN(limitValue) && limitValue > 0) {
        options.limit = limitValue;
      }
    }
  }
  
  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log('Usage: node update-thaiwater-amphure-geocoding.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h        Show this help message');
  console.log('  --limit=N         Limit updating to N stations (default: 10)');
  console.log('  --all             Update all stations needing geocoding');
  console.log('  --dry-run         Run without updating the database');
  console.log('  --include-existing Include stations that already have amphure information');
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  // Check if API keys are available
  if (LONGDO_MAP_KEY === 'YOUR_LONGDO_MAP_KEY') {
    console.error('Error: No Longdo Map API key found in environment variables.');
    console.error('Please set LONGDO_MAP_KEY in your .env file.');
    process.exit(1);
  }
  
  // Run the update
  await updateThaiWaterAmphureWithGeocoding(options);
}

// Run the main function
main()
  .then(() => {
    console.log('\nScript completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 