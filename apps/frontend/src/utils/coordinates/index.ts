import { AdministrativeRegionCoordinates } from '../administrative-regions';
import central from './provinces/central.json';

// Types for the JSON structure
interface CoordinateData {
  latitude: number;
  longitude: number;
  verified?: boolean;  // Flag to mark if coordinates are verified
  source?: string;     // Source of the coordinates (e.g., 'Google Maps', 'OpenStreetMap', etc.)
}

interface TumbonData {
  [tumbon: string]: CoordinateData;
}

interface AmphureData {
  coordinates: CoordinateData;
  tumbons: TumbonData;
}

interface ProvinceData {
  coordinates: CoordinateData;
  amphures: {
    [amphure: string]: AmphureData;
  };
}

interface RegionData {
  [province: string]: ProvinceData;
}

// Load all region data
const regions: RegionData[] = [
  central,
  // Add other regions as they are implemented
];

export function findCoordinates(
  province: string,
  amphure?: string,
  tumbon?: string
): (AdministrativeRegionCoordinates & { verified?: boolean; source?: string }) | null {
  try {
    // Search through all regions
    for (const region of regions) {
      const provinceData = region[province];
      if (!provinceData) continue;

      // If only province is provided
      if (!amphure) return provinceData.coordinates;

      const amphureData = provinceData.amphures[amphure];
      if (!amphureData) continue;

      // If only province and amphure are provided
      if (!tumbon) return amphureData.coordinates;

      // If all three are provided
      const tumbonData = amphureData.tumbons[tumbon];
      if (tumbonData) return tumbonData;
    }

    return null;
  } catch (error) {
    console.error('Error finding coordinates:', error);
    return null;
  }
}

export function validateCoordinates(coordinates: AdministrativeRegionCoordinates): boolean {
  if (!coordinates) return false;
  
  const { latitude, longitude } = coordinates;
  
  // Thailand's approximate bounding box
  const THAILAND_BOUNDS = {
    minLat: 5.613038,  // Southernmost point
    maxLat: 20.465143, // Northernmost point
    minLng: 97.343396, // Westernmost point
    maxLng: 105.636812 // Easternmost point
  };

  return (
    latitude >= THAILAND_BOUNDS.minLat &&
    latitude <= THAILAND_BOUNDS.maxLat &&
    longitude >= THAILAND_BOUNDS.minLng &&
    longitude <= THAILAND_BOUNDS.maxLng
  );
} 