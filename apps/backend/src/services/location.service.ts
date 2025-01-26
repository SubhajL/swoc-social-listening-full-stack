import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { LocationResolutionError } from '../errors/index.js';
import { TransactionManager, TransactionClient } from '../utils/transaction-manager.js';
import axios from 'axios';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface ThaiAddress {
  tumbon?: string;
  amphure?: string;
  province?: string;
}

interface LocationDetails extends ThaiAddress {
  coordinates: Coordinates;
  source: 'coordinates' | 'address' | 'both';
}

interface GoogleMapsResponse {
  status: string;
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      }
    },
    formatted_address: string;
    place_id: string;
    types: string[];
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>
  }>;
  error_message?: string;
}

export class LocationService {
  private transactionManager: TransactionManager;
  private googleMapsApiKey: string;

  constructor(private readonly pool: Pool) {
    this.transactionManager = new TransactionManager(pool);
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.googleMapsApiKey) {
      logger.error('Google Maps API key is not set');
    }
  }

  async resolveLocation(
    input: Coordinates | ThaiAddress,
    client: Pool | TransactionClient = this.pool
  ): Promise<LocationDetails> {
    try {
      if ('latitude' in input && 'longitude' in input) {
        // Try Google Maps first
        try {
          const address = await this.reverseGeocodeWithGoogleMaps(input);
          return {
            ...address,
            coordinates: input,
            source: 'coordinates'
          };
        } catch (error) {
          // Fallback to PostGIS
          logger.warn('Google Maps reverse geocoding failed, falling back to PostGIS:', error);
          const address = await this.reverseGeocode(input);
          return {
            ...address,
            coordinates: input,
            source: 'coordinates'
          };
        }
      } else {
        // Try Google Maps first
        try {
          const query = [
            input.tumbon,
            input.amphure,
            input.province,
            'Thailand'
          ].filter(Boolean).join(', ');
          const coordinates = await this.geocodeWithGoogleMaps(query);
          return {
            ...input,
            coordinates,
            source: 'address'
          };
        } catch (error) {
          // Fallback to PostGIS
          logger.warn('Google Maps geocoding failed, falling back to PostGIS:', error);
          const coordinates = await this.geocode(input);
          return {
            ...input,
            coordinates,
            source: 'address'
          };
        }
      }
    } catch (error) {
      logger.error('Location resolution failed:', error);
      throw new LocationResolutionError('Failed to resolve location', error);
    }
  }

  private async reverseGeocodeWithGoogleMaps(coordinates: Coordinates): Promise<ThaiAddress> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${this.googleMapsApiKey}&language=th&region=TH`;
    
    logger.info('Making Google Maps reverse geocoding request:', { url: url.replace(this.googleMapsApiKey, '[REDACTED]') });
    
    try {
      const response = await axios.get<GoogleMapsResponse>(url);
      
      logger.info('Google Maps API Response:', {
        status: response.data.status,
        resultCount: response.data.results?.length,
        errorMessage: response.data.error_message
      });
      
      if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new LocationResolutionError(`Location not found in Thailand. Status: ${response.data.status}, Error: ${response.data.error_message || 'No error message'}`);
      }

      // Parse Google Maps response into Thai administrative units
      const address: ThaiAddress = {};
      const result = response.data.results[0];
      const addressComponents = result.address_components || [];

      logger.info('Processing address components:', { components: addressComponents });

      addressComponents.forEach(component => {
        if (component.types.includes('administrative_area_level_3')) {
          address.tumbon = component.long_name;
        }
        if (component.types.includes('administrative_area_level_2')) {
          address.amphure = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          address.province = component.long_name;
        }
      });

      logger.info('Parsed Thai address:', address);
      return address;
    } catch (error) {
      if (error instanceof Error) {
        const axiosError = error as { 
          response?: { 
            status: number; 
            statusText: string; 
            data: any;
            headers: any;
          };
          config?: {
            url?: string;
            method?: string;
            headers?: any;
          };
        };
        logger.error('Google Maps API Error:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          response: axiosError.response ? {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            data: axiosError.response.data,
            headers: axiosError.response.headers
          } : 'No response data',
          config: axiosError.config ? {
            url: axiosError.config.url?.replace(this.googleMapsApiKey, '[REDACTED]'),
            method: axiosError.config.method,
            headers: axiosError.config.headers
          } : 'No config data'
        });
      } else {
        logger.error('Non-Error object thrown:', error);
      }
      throw error;
    }
  }

  private async geocodeWithGoogleMaps(query: string): Promise<Coordinates> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${this.googleMapsApiKey}&language=th&region=TH`;
    
    logger.info('Making Google Maps geocoding request:', { 
      url: url.replace(this.googleMapsApiKey, '[REDACTED]'),
      query 
    });
    
    try {
      const response = await axios.get<GoogleMapsResponse>(url);
      
      logger.info('Google Maps API Response:', {
        status: response.data.status,
        resultCount: response.data.results?.length,
        errorMessage: response.data.error_message,
        results: response.data.results?.map(result => ({
          formattedAddress: result.formatted_address,
          location: result.geometry?.location,
          placeId: result.place_id,
          types: result.types,
          addressComponents: result.address_components?.map(comp => ({
            longName: comp.long_name,
            shortName: comp.short_name,
            types: comp.types
          }))
        }))
      });
      
      if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new LocationResolutionError(`Address not found. Status: ${response.data.status}, Error: ${response.data.error_message || 'No error message'}`);
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      logger.info('Found coordinates:', {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id
      });

      return {
        latitude: location.lat,
        longitude: location.lng
      };
    } catch (error) {
      if (error instanceof Error) {
        const axiosError = error as { 
          response?: { 
            status: number; 
            statusText: string; 
            data: any;
            headers: any;
          };
          config?: {
            url?: string;
            method?: string;
            headers?: any;
          };
        };
        logger.error('Google Maps API Error:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          response: axiosError.response ? {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            data: axiosError.response.data,
            headers: axiosError.response.headers
          } : 'No response data',
          config: axiosError.config ? {
            url: axiosError.config.url?.replace(this.googleMapsApiKey, '[REDACTED]'),
            method: axiosError.config.method,
            headers: axiosError.config.headers
          } : 'No config data'
        });
      } else {
        logger.error('Non-Error object thrown:', error);
      }
      throw error;
    }
  }

  private async reverseGeocode(coordinates: Coordinates): Promise<ThaiAddress> {
    try {
      const result = await this.pool.query<ThaiAddress>(`
        SELECT 
          t.tumbon_name as tumbon,
          a.amphure_name as amphure,
          p.province_name as province
        FROM thai_administrative_boundaries t
        JOIN amphures a ON t.amphure_id = a.amphure_id
        JOIN provinces p ON a.province_id = p.province_id
        WHERE ST_Contains(
          t.geometry,
          ST_SetSRID(ST_Point($1, $2), 4326)
        )
        LIMIT 1
      `, [coordinates.longitude, coordinates.latitude]);

      if (result.rows.length === 0) {
        throw new LocationResolutionError('Location not found in Thailand');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Reverse geocoding failed:', error);
      throw new LocationResolutionError('Failed to reverse geocode coordinates', error);
    }
  }

  private async geocode(address: ThaiAddress): Promise<Coordinates> {
    try {
      const result = await this.pool.query<Coordinates>(`
        SELECT 
          ST_X(ST_Centroid(t.geometry)) as longitude,
          ST_Y(ST_Centroid(t.geometry)) as latitude
        FROM thai_administrative_boundaries t
        JOIN amphures a ON t.amphure_id = a.amphure_id
        JOIN provinces p ON a.province_id = p.province_id
        WHERE 
          ($1::text IS NULL OR t.tumbon_name = $1) AND
          ($2::text IS NULL OR a.amphure_name = $2) AND
          ($3::text IS NULL OR p.province_name = $3)
        LIMIT 1
      `, [address.tumbon, address.amphure, address.province]);

      if (result.rows.length === 0) {
        throw new LocationResolutionError('Address not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Geocoding failed:', error);
      throw new LocationResolutionError('Failed to geocode address', error);
    }
  }

  async findNearestSensor(
    coordinates: Coordinates,
    client: Pool | TransactionClient = this.pool
  ): Promise<string> {
    try {
      const result = await this.pool.query<{ sensor_id: string }>(`
        SELECT 
          sensor_id,
          ST_Distance(
            ST_SetSRID(ST_Point($1, $2), 4326),
            location
          ) as distance
        FROM sensors
        ORDER BY distance
        LIMIT 1
      `, [coordinates.longitude, coordinates.latitude]);

      if (result.rows.length === 0) {
        throw new LocationResolutionError('No sensors found');
      }

      return result.rows[0].sensor_id;
    } catch (error) {
      logger.error('Finding nearest sensor failed:', error);
      throw new LocationResolutionError('Failed to find nearest sensor', error);
    }
  }
} 