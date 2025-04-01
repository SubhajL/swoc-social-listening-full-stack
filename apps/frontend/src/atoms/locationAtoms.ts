import { atom } from 'jotai';

// Create atoms with simple default values
export const currentAmphureAtom = atom<string | undefined>(
  undefined
);

export const currentProvinceAtom = atom<string | undefined>(
  undefined
);

// Create derived atoms that will compare values before updating
export const setCurrentAmphureAtom = atom(
  null,
  (get, set, value: string | undefined) => {
    // Only update if the value actually changed
    const currentValue = get(currentAmphureAtom);
    if (value !== currentValue) {
      set(currentAmphureAtom, value);
      console.log(`[setCurrentAmphureAtom] Updated amphure: ${value}`);
    } else {
      console.log(`[setCurrentAmphureAtom] Amphure unchanged, skipping update: ${value}`);
    }
  }
);

export const setCurrentProvinceAtom = atom(
  null,
  (get, set, value: string | undefined) => {
    // Only update if the value actually changed
    const currentValue = get(currentProvinceAtom);
    if (value !== currentValue) {
      set(currentProvinceAtom, value);
      console.log(`[setCurrentProvinceAtom] Updated province: ${value}`);
    } else {
      console.log(`[setCurrentProvinceAtom] Province unchanged, skipping update: ${value}`);
    }
  }
);

// Create a debug atom that won't cause rerenders
export const locationDebugAtom = atom(
  (get) => {
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    // Only log when debugging is enabled
    if (process.env.NODE_ENV === 'development') {
      console.log('[locationDebugAtom] Location state changed:', {
        amphure,
        province,
        timestamp: new Date().toISOString()
      });
    }
    
    return { amphure, province };
  }
); 