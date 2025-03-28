import axios from 'axios';
import { logger } from '../../utils/logger.js';

interface GoogleMapsResponse {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
  status: string;
}

export interface LocationDetails {
  province: string | null;
  amphure: string | null;
  tambon: string | null;
  formatted_address: string | null;
}

export async function getLocationDetails(latitude: number, longitude: number): Promise<LocationDetails> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not found in environment variables');
    }

    const response = await axios.get<GoogleMapsResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );

    if (response.data.status !== 'OK' || !response.data.results.length) {
      logger.warn('No results found from Google Maps API', {
        latitude,
        longitude,
        status: response.data.status
      });
      return {
        province: null,
        amphure: null,
        tambon: null,
        formatted_address: null
      };
    }

    const result = response.data.results[0];
    const locationDetails: LocationDetails = {
      province: null,
      amphure: null,
      tambon: null,
      formatted_address: result.formatted_address
    };

    // Extract location details from address components
    for (const component of result.address_components) {
      if (component.types.includes('administrative_area_level_1')) {
        locationDetails.province = component.long_name;
      } else if (component.types.includes('administrative_area_level_2')) {
        locationDetails.amphure = component.long_name;
      } else if (component.types.includes('sublocality')) {
        locationDetails.tambon = component.long_name;
      }
    }

    return locationDetails;
  } catch (error) {
    logger.error('Error fetching location details from Google Maps API', {
      error: error instanceof Error ? error.message : String(error),
      latitude,
      longitude
    });
    return {
      province: null,
      amphure: null,
      tambon: null,
      formatted_address: null
    };
  }
} 