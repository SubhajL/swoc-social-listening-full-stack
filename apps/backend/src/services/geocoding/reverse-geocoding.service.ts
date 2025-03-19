import axios from 'axios';
import { logger } from '../../utils/logger';

interface GeocodingResult {
  province: string;
  amphure: string;
  tambon: string;
}

interface GoogleMapsAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleMapsResult {
  address_components: GoogleMapsAddressComponent[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  types: string[];
}

interface GoogleMapsResponse {
  status: string;
  results: GoogleMapsResult[];
  error_message?: string;
}

/**
 * Reverse geocodes coordinates to get administrative boundaries using Google Maps API
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @returns Object containing province, amphure, and tambon or null if geocoding fails
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  try {
    logger.info(`[ReverseGeocoding] Geocoding coordinates: ${lat}, ${lng}`);
    
    const response = await axios.get<GoogleMapsResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`
    );
    
    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      logger.warn(`[ReverseGeocoding] No results found for coordinates: ${lat}, ${lng}`, {
        status: response.data.status,
        errorMessage: response.data.error_message
      });
      return null;
    }
    
    // Extract administrative components from results
    let province = '';
    let amphure = '';
    let tambon = '';
    
    // Process each result to extract the different administrative levels
    for (const result of response.data.results) {
      for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_1')) {
          province = component.long_name;
        } else if (component.types.includes('administrative_area_level_2')) {
          amphure = component.long_name;
        } else if (component.types.includes('administrative_area_level_3')) {
          tambon = component.long_name;
        }
      }
    }
    
    // Clean up the administrative names
    // Remove "จังหวัด" prefix from province if present
    if (province.startsWith('จังหวัด')) {
      province = province.substring('จังหวัด'.length).trim();
    }
    
    // Remove "อำเภอ" or "เขต" prefix from amphure if present
    if (amphure.startsWith('อำเภอ')) {
      amphure = amphure.substring('อำเภอ'.length).trim();
    } else if (amphure.startsWith('เขต')) {
      amphure = amphure.substring('เขต'.length).trim();
    }
    
    // Remove "ตำบล" or "แขวง" prefix from tambon if present
    if (tambon.startsWith('ตำบล')) {
      tambon = tambon.substring('ตำบล'.length).trim();
    } else if (tambon.startsWith('แขวง')) {
      tambon = tambon.substring('แขวง'.length).trim();
    }
    
    logger.info(`[ReverseGeocoding] Successfully geocoded coordinates: ${lat}, ${lng}`, {
      province,
      amphure,
      tambon
    });
    
    return {
      province,
      amphure,
      tambon
    };
  } catch (error) {
    logger.error('[ReverseGeocoding] Error geocoding coordinates', {
      lat, 
      lng, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Validates if coordinates are within Thailand's boundaries
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @returns Boolean indicating if coordinates are within Thailand
 */
export function isWithinThailand(lat: number, lng: number): boolean {
  // Thailand's approximate bounding box
  const THAILAND_BOUNDS = {
    north: 20.5,
    south: 5.5,
    east: 105.5,
    west: 97.5
  };
  
  return (
    lat >= THAILAND_BOUNDS.south &&
    lat <= THAILAND_BOUNDS.north &&
    lng >= THAILAND_BOUNDS.west &&
    lng <= THAILAND_BOUNDS.east
  );
} 