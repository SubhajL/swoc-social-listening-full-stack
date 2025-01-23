import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { LocationResolutionError } from '../errors/index.js';
import { TransactionManager, TransactionClient } from '../utils/transaction-manager.js';
import { geocodingClient } from '../config/mapbox.js';
import { v4 as uuidv4 } from 'uuid';
import {
  AdministrativeLevel,
  LocationDataSource,
  Province,
  Amphure,
  Tumbon,
  LocationSearchParams,
  LocationUpdate,
  VerificationResult
} from '../types/location.types.js';
import { LocationModel } from '../models/location.model.js';
import {
  validateCoordinates,
  isWithinThailand,
  crossReferenceCoordinates
} from '../utils/coordinate-validation.js';

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

export class LocationService {
  private transactionManager: TransactionManager;
  private locationModel: LocationModel;

  constructor(private readonly pool: Pool) {
    this.transactionManager = new TransactionManager(pool);
    this.locationModel = new LocationModel(pool);
  }

  async resolveLocation(
    input: Coordinates | ThaiAddress,
    client: Pool | TransactionClient = this.pool
  ): Promise<LocationDetails> {
    try {
      if ('latitude' in input && 'longitude' in input) {
        // Try Mapbox first
        try {
          const mapboxResult = await this.reverseGeocodeWithMapbox(input);
          return {
            ...mapboxResult,
            coordinates: input,
            source: 'coordinates'
          };
        } catch (error) {
          // Fallback to PostGIS
          logger.warn('Mapbox reverse geocoding failed, falling back to PostGIS:', error);
          const address = await this.reverseGeocode(input);
          return {
            ...address,
            coordinates: input,
            source: 'coordinates'
          };
        }
      } else {
        // Try Mapbox first
        try {
          const coordinates = await this.geocodeWithMapbox(input);
          return {
            ...input,
            coordinates,
            source: 'address'
          };
        } catch (error) {
          // Fallback to PostGIS
          logger.warn('Mapbox geocoding failed, falling back to PostGIS:', error);
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

  private async reverseGeocodeWithMapbox(coordinates: Coordinates): Promise<ThaiAddress> {
    const response = await geocodingClient
      .reverseGeocode({
        query: [coordinates.longitude, coordinates.latitude],
        countries: ['th'],
        types: ['region', 'district', 'locality'],
        limit: 1
      })
      .send();

    if (!response.body.features.length) {
      throw new LocationResolutionError('Location not found in Thailand');
    }

    const feature = response.body.features[0];
    const context = feature.context || [];

    // Parse Mapbox response into Thai administrative units
    const address: ThaiAddress = {};
    context.forEach(item => {
      if (item.id.startsWith('locality')) address.tumbon = item.text;
      if (item.id.startsWith('district')) address.amphure = item.text;
      if (item.id.startsWith('region')) address.province = item.text;
    });

    return address;
  }

  private async geocodeWithMapbox(address: ThaiAddress): Promise<Coordinates> {
    const query = [
      address.tumbon,
      address.amphure,
      address.province,
      'Thailand'
    ].filter(Boolean).join(', ');

    const response = await geocodingClient
      .forwardGeocode({
        query,
        countries: ['th'],
        limit: 1
      })
      .send();

    if (!response.body.features.length) {
      throw new LocationResolutionError('Address not found');
    }

    const feature = response.body.features[0];
    if (!feature.center) {
      throw new LocationResolutionError('No coordinates found for address');
    }

    const [longitude, latitude] = feature.center;
    return { latitude, longitude };
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

  // Initialize database tables
  async initialize(): Promise<void> {
    await this.locationModel.initializeTables();
  }

  // Add or update a province
  async upsertProvince(province: Omit<Province, 'id' | 'createdAt' | 'lastUpdated'>): Promise<void> {
    if (!validateCoordinates(province.coordinates) || !isWithinThailand(province.coordinates)) {
      throw new Error('Invalid coordinates for province');
    }

    const verificationResult = await this.verifyCoordinates(
      province.coordinates,
      province.nameTH,
      province.nameEN,
      AdministrativeLevel.PROVINCE
    );

    await this.locationModel.upsertProvince({
      ...province,
      id: uuidv4(),
      verified: verificationResult.verified,
      source: verificationResult.source,
      lastVerified: verificationResult.verified ? new Date() : null,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
  }

  // Add or update an amphure
  async upsertAmphure(amphure: Omit<Amphure, 'id' | 'createdAt' | 'lastUpdated'>): Promise<void> {
    if (!validateCoordinates(amphure.coordinates) || !isWithinThailand(amphure.coordinates)) {
      throw new Error('Invalid coordinates for amphure');
    }

    const verificationResult = await this.verifyCoordinates(
      amphure.coordinates,
      amphure.nameTH,
      amphure.nameEN,
      AdministrativeLevel.AMPHURE
    );

    await this.locationModel.upsertAmphure({
      ...amphure,
      id: uuidv4(),
      verified: verificationResult.verified,
      source: verificationResult.source,
      lastVerified: verificationResult.verified ? new Date() : null,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
  }

  // Add or update a tumbon
  async upsertTumbon(tumbon: Omit<Tumbon, 'id' | 'createdAt' | 'lastUpdated'>): Promise<void> {
    if (!validateCoordinates(tumbon.coordinates) || !isWithinThailand(tumbon.coordinates)) {
      throw new Error('Invalid coordinates for tumbon');
    }

    const verificationResult = await this.verifyCoordinates(
      tumbon.coordinates,
      tumbon.nameTH,
      tumbon.nameEN,
      AdministrativeLevel.TUMBON
    );

    await this.locationModel.upsertTumbon({
      ...tumbon,
      id: uuidv4(),
      verified: verificationResult.verified,
      source: verificationResult.source,
      lastVerified: verificationResult.verified ? new Date() : null,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
  }

  // Search locations based on parameters
  async searchLocations(params: LocationSearchParams): Promise<(Province | Amphure | Tumbon)[]> {
    return this.locationModel.searchLocations(params);
  }

  // Update location verification status
  async updateLocationVerification(
    id: string,
    level: AdministrativeLevel,
    coordinates: { latitude: number; longitude: number }
  ): Promise<void> {
    const locations = await this.searchLocations({ level });
    const location = locations.find(loc => loc.id === id);

    if (!location) {
      throw new Error(`Location with ID ${id} not found`);
    }

    const verificationResult = await this.verifyCoordinates(
      coordinates,
      location.nameTH,
      location.nameEN,
      level
    );

    const update: LocationUpdate = {
      coordinates: verificationResult.coordinates || coordinates,
      source: verificationResult.source,
      verified: verificationResult.verified,
      lastVerified: new Date()
    };

    await this.locationModel.updateLocationVerification(id, level, update);
  }

  // Verify coordinates against multiple sources
  private async verifyCoordinates(
    coordinates: { latitude: number; longitude: number },
    nameTH: string,
    nameEN: string,
    level: AdministrativeLevel
  ): Promise<VerificationResult> {
    // First, validate coordinates are within Thailand
    if (!validateCoordinates(coordinates) || !isWithinThailand(coordinates)) {
      return {
        verified: false,
        confidence: 0,
        source: LocationDataSource.MANUAL,
        message: 'Coordinates are invalid or outside Thailand'
      };
    }

    // Cross-reference with available sources
    const verificationResult = await crossReferenceCoordinates(
      coordinates,
      nameTH,
      nameEN
    );

    // Add level-specific verification logic if needed
    switch (level) {
      case AdministrativeLevel.PROVINCE:
        // Provinces should have higher verification standards
        return {
          ...verificationResult,
          verified: verificationResult.verified && verificationResult.confidence >= 0.8
        };

      case AdministrativeLevel.AMPHURE:
        // Amphures can use standard verification
        return verificationResult;

      case AdministrativeLevel.TUMBON:
        // Tumbons might have less available data
        return {
          ...verificationResult,
          verified: verificationResult.verified && verificationResult.confidence >= 0.6
        };

      default:
        return verificationResult;
    }
  }
} 