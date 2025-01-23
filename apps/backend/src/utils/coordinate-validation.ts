import { Coordinates, CoordinateSchema, VerificationResult, LocationDataSource } from '../types/location.types.js';

// Thailand's bounding box
const THAILAND_BOUNDS = {
  minLat: 5.613038,  // Southernmost point
  maxLat: 20.465143, // Northernmost point
  minLng: 97.343396, // Westernmost point
  maxLng: 105.636812 // Easternmost point
};

// Validate coordinates using Zod schema
export function validateCoordinates(coordinates: Coordinates): boolean {
  try {
    CoordinateSchema.parse(coordinates);
    return true;
  } catch (error) {
    return false;
  }
}

// Check if coordinates are within Thailand's bounds
export function isWithinThailand(coordinates: Coordinates): boolean {
  const { latitude, longitude } = coordinates;
  return (
    latitude >= THAILAND_BOUNDS.minLat &&
    latitude <= THAILAND_BOUNDS.maxLat &&
    longitude >= THAILAND_BOUNDS.minLng &&
    longitude <= THAILAND_BOUNDS.maxLng
  );
}

// Calculate distance between two points in kilometers using Haversine formula
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Convert degrees to radians
function toRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

// Cross-reference coordinates with multiple sources
export async function crossReferenceCoordinates(
  coordinates: Coordinates,
  nameTH: string,
  nameEN: string
): Promise<VerificationResult> {
  const results: VerificationResult[] = [];
  let totalConfidence = 0;
  let verifiedCount = 0;

  // Check OpenStreetMap
  try {
    const osmResult = await checkOpenStreetMap(nameTH, nameEN);
    if (osmResult.verified) {
      results.push(osmResult);
      totalConfidence += osmResult.confidence;
      verifiedCount++;
    }
  } catch (error) {
    console.error('OpenStreetMap verification failed:', error);
  }

  // Check Thailand Post Database (if available)
  try {
    const postResult = await checkThailandPost(nameTH);
    if (postResult.verified) {
      results.push(postResult);
      totalConfidence += postResult.confidence;
      verifiedCount++;
    }
  } catch (error) {
    console.error('Thailand Post verification failed:', error);
  }

  // If no results, return unverified
  if (results.length === 0) {
    return {
      verified: false,
      confidence: 0,
      source: LocationDataSource.MANUAL,
      message: 'No verification sources available'
    };
  }

  // Calculate average confidence and check distance threshold
  const avgConfidence = totalConfidence / verifiedCount;
  const allWithinThreshold = results.every(result => {
    if (!result.coordinates) return false;
    return calculateDistance(coordinates, result.coordinates) <= 5; // 5km threshold
  });

  return {
    verified: allWithinThreshold && avgConfidence >= 0.7,
    confidence: avgConfidence,
    source: results[0].source,
    coordinates: results[0].coordinates,
    message: allWithinThreshold ? 
      'Coordinates verified across multiple sources' : 
      'Coordinates differ significantly between sources'
  };
}

// Check coordinates against OpenStreetMap
async function checkOpenStreetMap(
  nameTH: string,
  nameEN: string
): Promise<VerificationResult> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nameEN)},Thailand&format=json`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const coordinates: Coordinates = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };

      if (validateCoordinates(coordinates) && isWithinThailand(coordinates)) {
        return {
          verified: true,
          confidence: 0.8,
          source: LocationDataSource.OPENSTREETMAP,
          coordinates,
          message: 'Verified using OpenStreetMap'
        };
      }
    }

    return {
      verified: false,
      confidence: 0,
      source: LocationDataSource.OPENSTREETMAP,
      message: 'Location not found in OpenStreetMap'
    };
  } catch (error) {
    console.error('OpenStreetMap API error:', error);
    return {
      verified: false,
      confidence: 0,
      source: LocationDataSource.OPENSTREETMAP,
      message: 'OpenStreetMap API error'
    };
  }
}

// Check coordinates against Thailand Post Database
async function checkThailandPost(nameTH: string): Promise<VerificationResult> {
  // TODO: Implement Thailand Post API integration when available
  return {
    verified: false,
    confidence: 0,
    source: LocationDataSource.THAILAND_POST,
    message: 'Thailand Post verification not implemented'
  };
} 