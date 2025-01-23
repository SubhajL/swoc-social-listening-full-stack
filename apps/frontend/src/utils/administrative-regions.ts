export interface AdministrativeRegionCoordinates {
  latitude: number;
  longitude: number;
}

import {
  getTumbonCoordinates as getTumbonCoords,
  validateTumbonCoordinates
} from './coordinates/tumbon-coordinates';

import {
  getAmphureCoordinates as getAmphureCoords,
  validateAmphureCoordinates
} from './coordinates/amphure-coordinates';

export function getTumbonCoordinates(
  province: string,
  amphure: string,
  tumbon: string
): AdministrativeRegionCoordinates | null {
  const coordinates = getTumbonCoords(province, amphure, tumbon);
  if (coordinates && validateTumbonCoordinates(coordinates)) {
    return coordinates;
  }
  return null;
}

export function getAmphureCoordinates(
  province: string,
  amphure: string
): AdministrativeRegionCoordinates | null {
  const coordinates = getAmphureCoords(province, amphure);
  if (coordinates && validateAmphureCoordinates(coordinates)) {
    return coordinates;
  }
  return null;
}

// Thailand's bounding box for validation
export const THAILAND_BOUNDS = {
  minLat: 5.613038,  // Southernmost point
  maxLat: 20.465143, // Northernmost point
  minLng: 97.343396, // Westernmost point
  maxLng: 105.636812 // Easternmost point
} as const; 