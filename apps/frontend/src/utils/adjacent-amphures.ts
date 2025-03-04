import { amphureCoordinates } from './coordinates/amphure-coordinates';
import { AdministrativeRegionCoordinates } from './administrative-regions';

// Maximum distance in kilometers to consider amphures as adjacent
const MAX_ADJACENT_DISTANCE_KM = 30;

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(
  coord1: AdministrativeRegionCoordinates,
  coord2: AdministrativeRegionCoordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
  const dLon = (coord2.longitude - coord1.longitude) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * (Math.PI / 180)) * Math.cos(coord2.latitude * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Find adjacent amphures based on the given province and amphure
 * @param province Province name
 * @param amphure Amphure name
 * @returns Array of adjacent amphures with their provinces
 */
export function findAdjacentAmphures(
  province: string,
  amphure: string
): Array<{ province: string; amphure: string; distance: number }> {
  // Get coordinates of the target amphure
  const targetCoordinates = amphureCoordinates[province]?.[amphure];
  
  if (!targetCoordinates) {
    console.warn(`No coordinates found for amphure: ${amphure} in province: ${province}`);
    return [];
  }
  
  const adjacentAmphures: Array<{ province: string; amphure: string; distance: number }> = [];
  
  // Iterate through all provinces and amphures to find adjacent ones
  Object.entries(amphureCoordinates).forEach(([provinceName, amphures]) => {
    Object.entries(amphures).forEach(([amphureName, coordinates]) => {
      // Skip the target amphure itself
      if (provinceName === province && amphureName === amphure) {
        return;
      }
      
      const distance = calculateDistance(targetCoordinates, coordinates);
      
      // Consider amphures within the maximum distance as adjacent
      if (distance <= MAX_ADJACENT_DISTANCE_KM) {
        adjacentAmphures.push({
          province: provinceName,
          amphure: amphureName,
          distance
        });
      }
    });
  });
  
  // Sort by distance (closest first)
  return adjacentAmphures.sort((a, b) => a.distance - b.distance);
}

/**
 * Get a list of adjacent amphures for the given province and amphure
 * @param province Province name
 * @param amphure Amphure name
 * @returns Array of adjacent amphures with their provinces
 */
export function getAdjacentAmphures(
  province?: string,
  amphure?: string
): Array<{ province: string; amphure: string }> {
  if (!province || !amphure) {
    console.warn('Province and amphure are required to find adjacent amphures');
    return [];
  }
  
  const adjacentAmphures = findAdjacentAmphures(province, amphure);
  
  // Return only province and amphure names
  return adjacentAmphures.map(({ province, amphure }) => ({
    province,
    amphure
  }));
} 