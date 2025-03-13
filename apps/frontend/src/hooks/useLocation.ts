import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import {
  locationStateAtom,
  amphureAtom,
  provinceAtom,
  coordinatesAtom,
  updateLocationAtom,
  resetLocationAtom,
  LocationState
} from '@/atoms/locationState';

/**
 * Custom hook for managing location state
 * Provides a comprehensive interface for accessing and manipulating location data
 */
export function useLocation() {
  // Get the full location state
  const [locationState, setLocationState] = useAtom(locationStateAtom);
  
  // Get individual location properties
  const [amphure, setAmphure] = useAtom(amphureAtom);
  const [province, setProvince] = useAtom(provinceAtom);
  const [coordinates, setCoordinates] = useAtom(coordinatesAtom);
  
  // Get action atoms
  const updateLocation = useSetAtom(updateLocationAtom);
  const resetLocation = useSetAtom(resetLocationAtom);
  
  // Helper function to update both amphure and province at once
  const updateLocationData = useCallback((newAmphure?: string, newProvince?: string) => {
    const updates: Partial<LocationState> = {};
    
    if (newAmphure !== undefined) {
      updates.amphure = newAmphure;
    }
    
    if (newProvince !== undefined) {
      updates.province = newProvince;
    }
    
    if (Object.keys(updates).length > 0) {
      console.log('[useLocation] Updating location data:', updates);
      updateLocation(updates);
    }
  }, [updateLocation]);
  
  // Helper function to check if location data is valid
  const hasValidLocationData = useCallback(() => {
    return !!amphure || !!province;
  }, [amphure, province]);
  
  // Helper function to get formatted location string
  const getFormattedLocation = useCallback(() => {
    if (amphure && province) {
      return `${amphure}, ${province}`;
    } else if (amphure) {
      return amphure;
    } else if (province) {
      return province;
    }
    return 'ไม่ระบุตำแหน่ง';
  }, [amphure, province]);
  
  return {
    // Full state
    locationState,
    setLocationState,
    
    // Individual properties
    amphure,
    setAmphure,
    province,
    setProvince,
    coordinates,
    setCoordinates,
    
    // Action functions
    updateLocation,
    resetLocation,
    updateLocationData,
    
    // Helper functions
    hasValidLocationData,
    getFormattedLocation,
    
    // Metadata
    lastUpdated: locationState.lastUpdated
  };
} 