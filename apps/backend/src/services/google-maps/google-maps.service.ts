import axios from 'axios';
import { logger } from '../../utils/logger.js';

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
}

interface GoogleMapsResponse {
  results: GoogleMapsResult[];
  status: string;
  error_message?: string;
}

export interface LocationDetails {
  province: string | null;
  amphure: string | null;
  formatted_address: string | null;
}

export class GoogleMapsError extends Error {
  constructor(message: string, public readonly status?: string, public readonly error_message?: string) {
    super(message);
    this.name = 'GoogleMapsError';
  }
}

/**
 * Parses address components from Google Maps API response
 */
function parseAddressComponents(components: GoogleMapsAddressComponent[]): { province: string | null, amphure: string | null } {
  let province = null, amphure = null;
  
  for (const comp of components) {
    if (comp.types.includes('administrative_area_level_1')) {
      province = comp.long_name;
    }
    if (comp.types.includes('administrative_area_level_2')) {
      amphure = comp.long_name;
    }
  }
  
  return { province, amphure };
}

export async function getLocationDetails(latitude: number, longitude: number): Promise<LocationDetails> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new GoogleMapsError('Google Maps API key not found in environment variables');
    }

    // Validate coordinates are within Thailand's bounds
    if (latitude < 5.613038 || latitude > 20.465143 || longitude < 97.343396 || longitude > 105.636812) {
      logger.warn('Coordinates outside Thailand bounds', { latitude, longitude });
      return {
        province: null,
        amphure: null,
        formatted_address: null
      };
    }

    const response = await axios.get<GoogleMapsResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=th&region=TH&result_type=administrative_area_level_1|administrative_area_level_2`
    );

    if (response.data.status !== 'OK' || !response.data.results.length) {
      logger.warn('No results found from Google Maps API', {
        latitude,
        longitude,
        status: response.data.status,
        error_message: response.data.error_message
      });
      return {
        province: null,
        amphure: null,
        formatted_address: null
      };
    }

    const result = response.data.results[0];
    const { province, amphure } = parseAddressComponents(result.address_components);
    
    const locationDetails: LocationDetails = {
      province,
      amphure,
      formatted_address: result.formatted_address
    };

    // Log successful resolution
    logger.info('Successfully resolved location details', {
      latitude,
      longitude,
      locationDetails
    });

    return locationDetails;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error fetching location details from Google Maps API', {
      error: errorMessage,
      latitude,
      longitude,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (axios.isAxiosError(error)) {
      throw new GoogleMapsError(
        'Failed to fetch location details from Google Maps API',
        error.response?.data?.status,
        error.response?.data?.error_message
      );
    }
    
    throw new GoogleMapsError(errorMessage);
  }
} 