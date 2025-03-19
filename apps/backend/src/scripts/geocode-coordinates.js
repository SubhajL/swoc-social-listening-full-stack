// Script to use Google Maps API to find administrative location for specific coordinates
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Geocode coordinates using Google Maps API
 */
async function geocodeCoordinates() {
  console.log('Geocoding coordinates using Google Maps API...');
  
  // Get API key from environment variables
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('Error: Google Maps API key not found in environment variables');
    process.exit(1);
  }
  
  console.log(`Using Google Maps API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Coordinates to geocode
  const coordinates = [
    { latitude: 9.4668, longitude: 100.045, name: "เกาะสมุย (Koh Samui)" }
  ];
  
  const results = [];
  
  try {
    for (const coord of coordinates) {
      console.log(`\nGeocoding coordinates: ${coord.latitude}, ${coord.longitude} (${coord.name})`);
      
      // Call Google Maps Geocoding API
      const geocodeResult = await reverseGeocode(coord.latitude, coord.longitude, apiKey);
      
      // Process and display results
      const locationInfo = processGeocodeResult(geocodeResult, coord);
      results.push(locationInfo);
      
      console.log('\nLocation Information:');
      console.log(JSON.stringify(locationInfo, null, 2));
    }
    
    // Save results to file
    const resultsFile = 'geocode_results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${resultsFile}`);
    
  } catch (error) {
    console.error(`Error geocoding coordinates: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

/**
 * Call Google Maps Geocoding API to reverse geocode coordinates
 * 
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} apiKey - Google Maps API key
 * @returns {Object} - Geocoding API response
 */
async function reverseGeocode(latitude, longitude, apiKey) {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  const params = {
    latlng: `${latitude},${longitude}`,
    key: apiKey,
    language: 'th', // Get results in Thai language
    result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3'
  };
  
  console.log(`Making request to Google Maps Geocoding API...`);
  
  try {
    const response = await axios.get(url, { params });
    
    console.log(`API Response Status: ${response.data.status}`);
    
    if (response.data.status !== 'OK') {
      console.error(`API Error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error calling Google Maps API: ${error.message}`);
    throw error;
  }
}

/**
 * Process geocode result to extract administrative information
 * 
 * @param {Object} geocodeResult - Google Maps Geocoding API response
 * @param {Object} coordinates - Original coordinates
 * @returns {Object} - Processed location information
 */
function processGeocodeResult(geocodeResult, coordinates) {
  const locationInfo = {
    coordinates: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      name: coordinates.name
    },
    formatted_address: null,
    administrative_areas: {
      province: null,
      amphure: null,
      tambon: null
    },
    raw_components: []
  };
  
  if (geocodeResult.status !== 'OK' || !geocodeResult.results || geocodeResult.results.length === 0) {
    locationInfo.error = geocodeResult.status;
    locationInfo.error_message = geocodeResult.error_message || 'No results found';
    return locationInfo;
  }
  
  // Get the most detailed result
  const result = geocodeResult.results[0];
  locationInfo.formatted_address = result.formatted_address;
  
  // Extract administrative components
  if (result.address_components) {
    locationInfo.raw_components = result.address_components;
    
    for (const component of result.address_components) {
      // Extract province (administrative_area_level_1)
      if (component.types.includes('administrative_area_level_1')) {
        locationInfo.administrative_areas.province = component.long_name;
      }
      
      // Extract amphure/district (administrative_area_level_2)
      if (component.types.includes('administrative_area_level_2')) {
        locationInfo.administrative_areas.amphure = component.long_name;
      }
      
      // Extract tambon/subdistrict (administrative_area_level_3)
      if (component.types.includes('administrative_area_level_3')) {
        locationInfo.administrative_areas.tambon = component.long_name;
      }
    }
  }
  
  // Check if the location is in water
  const isWater = checkIfWater(result);
  locationInfo.is_water = isWater;
  
  // Add all results for reference
  locationInfo.all_results = geocodeResult.results.map(r => ({
    formatted_address: r.formatted_address,
    types: r.types
  }));
  
  return locationInfo;
}

/**
 * Check if the location is in water
 * 
 * @param {Object} result - Google Maps Geocoding API result
 * @returns {boolean} - True if the location is in water
 */
function checkIfWater(result) {
  if (!result || !result.types) {
    return false;
  }
  
  // Check if any of these types are present
  const waterTypes = ['natural_feature', 'point_of_interest', 'establishment'];
  const isWaterFeature = result.types.some(type => waterTypes.includes(type));
  
  // Check if administrative areas are missing
  const hasAdminAreas = result.address_components.some(component => 
    component.types.includes('administrative_area_level_1') || 
    component.types.includes('administrative_area_level_2')
  );
  
  return isWaterFeature || !hasAdminAreas;
}

// Run the function
geocodeCoordinates().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 