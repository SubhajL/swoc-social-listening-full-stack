import { z } from 'zod';

// Coordinate validation schema
export const CoordinateSchema = z.object({
  latitude: z.number()
    .min(5.613038)  // Thailand's southernmost point
    .max(20.465143), // Thailand's northernmost point
  longitude: z.number()
    .min(97.343396)  // Thailand's westernmost point
    .max(105.636812) // Thailand's easternmost point
});

export type Coordinates = z.infer<typeof CoordinateSchema>;

// Data source enumeration
export enum LocationDataSource {
  GISTDA = 'GISTDA',
  THAILAND_POST = 'THAILAND_POST',
  OPENSTREETMAP = 'OPENSTREETMAP',
  GEOCODING = 'GEOCODING',
  MANUAL = 'MANUAL'
}

// Administrative level enumeration
export enum AdministrativeLevel {
  PROVINCE = 'PROVINCE',
  AMPHURE = 'AMPHURE',
  TUMBON = 'TUMBON'
}

// Base location interface
export interface BaseLocation {
  id: string;
  nameTH: string;
  nameEN: string;
  coordinates: Coordinates;
  source: LocationDataSource;
  verified: boolean;
  lastVerified: Date | null;
  lastUpdated: Date;
  createdAt: Date;
}

// Location interfaces for each administrative level
export interface Tumbon extends BaseLocation {
  level: AdministrativeLevel.TUMBON;
  amphureId: string;
  postalCode?: string;
}

export interface Amphure extends BaseLocation {
  level: AdministrativeLevel.AMPHURE;
  provinceId: string;
  tumbons?: Tumbon[];
}

export interface Province extends BaseLocation {
  level: AdministrativeLevel.PROVINCE;
  amphures?: Amphure[];
}

// Location update interfaces
export interface LocationUpdate {
  coordinates?: Coordinates;
  source?: LocationDataSource;
  verified?: boolean;
  lastVerified?: Date;
}

// Verification result interface
export interface VerificationResult {
  verified: boolean;
  confidence: number;
  source: LocationDataSource;
  coordinates?: Coordinates;
  message?: string;
}

// Location search parameters
export interface LocationSearchParams {
  level?: AdministrativeLevel;
  nameTH?: string;
  nameEN?: string;
  provinceId?: string;
  amphureId?: string;
  verified?: boolean;
  source?: LocationDataSource;
} 