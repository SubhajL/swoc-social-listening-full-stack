import { useEffect } from 'react';
import { useComplaintStore } from './complaintStore';

/**
 * Custom hook to manually hydrate the Zustand store
 * This should be used in the top-level component to ensure
 * the store is hydrated after React is fully initialized
 */
export const useHydrateStore = () => {
  useEffect(() => {
    // Get the persist object from the store
    const persistStore = useComplaintStore.persist;
    
    // Manually hydrate the store
    persistStore.rehydrate();
    
    // Log for debugging
    console.log('[StoreHydration] Manual hydration triggered');
  }, []);
}; 