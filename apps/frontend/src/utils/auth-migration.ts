/**
 * Authentication Migration Utility
 * 
 * This utility provides functions to migrate authentication state from Zustand to Jotai.
 * It can be used during the transition period to ensure a smooth migration.
 */

import { useAuthStore } from '@/stores/authStore';
import { loginAtom } from '@/atoms/authState';
import { useAtom } from 'jotai';

/**
 * Checks if there is existing Zustand auth state and migrates it to Jotai
 * @returns A boolean indicating if migration was performed
 */
export const migrateAuthStateToJotai = (): boolean => {
  try {
    console.log('🔄 [Auth Migration] Checking for Zustand auth state');
    
    // Get Zustand auth state
    const zustandAuthState = useAuthStore.getState();
    
    // Check if Zustand has auth state
    if (zustandAuthState.isAuthenticated && zustandAuthState.token && zustandAuthState.user) {
      console.log('🔄 [Auth Migration] Found Zustand auth state, migrating to Jotai');
      
      // Get Jotai login atom
      const [, login] = useAtom(loginAtom);
      
      // Migrate state to Jotai
      login({
        user: {
          id: zustandAuthState.user.id,
          name: zustandAuthState.user.name,
          email: zustandAuthState.user.email,
          rbacRole: zustandAuthState.user.rbacRole,
          organizationId: zustandAuthState.user.organizationId,
          organizationName: zustandAuthState.user.organizationName
        },
        token: zustandAuthState.token
      });
      
      console.log('✅ [Auth Migration] Successfully migrated auth state to Jotai');
      return true;
    }
    
    console.log('ℹ️ [Auth Migration] No Zustand auth state found, nothing to migrate');
    return false;
  } catch (error) {
    console.error('❌ [Auth Migration] Error migrating auth state:', error);
    return false;
  }
};

/**
 * Hook to migrate auth state from Zustand to Jotai
 * This should be used in a component that has access to the React context
 */
export const useMigrateAuthState = () => {
  const [, login] = useAtom(loginAtom);
  
  const migrateAuth = () => {
    try {
      console.log('🔄 [Auth Migration] Checking for Zustand auth state');
      
      // Get Zustand auth state
      const zustandAuthState = useAuthStore.getState();
      
      // Check if Zustand has auth state
      if (zustandAuthState.isAuthenticated && zustandAuthState.token && zustandAuthState.user) {
        console.log('🔄 [Auth Migration] Found Zustand auth state, migrating to Jotai');
        
        // Migrate state to Jotai
        login({
          user: {
            id: zustandAuthState.user.id,
            name: zustandAuthState.user.name,
            email: zustandAuthState.user.email,
            rbacRole: zustandAuthState.user.rbacRole,
            organizationId: zustandAuthState.user.organizationId,
            organizationName: zustandAuthState.user.organizationName
          },
          token: zustandAuthState.token
        });
        
        console.log('✅ [Auth Migration] Successfully migrated auth state to Jotai');
        return true;
      }
      
      console.log('ℹ️ [Auth Migration] No Zustand auth state found, nothing to migrate');
      return false;
    } catch (error) {
      console.error('❌ [Auth Migration] Error migrating auth state:', error);
      return false;
    }
  };
  
  return migrateAuth;
};

/**
 * Checks if there is existing auth state in localStorage and migrates it to Jotai
 * This can be used outside of React components
 */
export const migrateLocalStorageToJotai = () => {
  try {
    console.log('🔄 [Auth Migration] Checking for localStorage auth state');
    
    // Check for token and user in localStorage
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    
    if (token && userJson) {
      console.log('🔄 [Auth Migration] Found localStorage auth state');
      
      try {
        const userData = JSON.parse(userJson);
        
        // Store in Jotai format
        localStorage.setItem('auth-storage', JSON.stringify({
          state: {
            user: {
              id: String(userData.id),
              name: userData.name,
              email: userData.email,
              rbacRole: userData.position || 1,
              organizationId: userData.office_id || '',
              organizationName: userData.office_name || ''
            },
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          },
          version: 0
        }));
        
        console.log('✅ [Auth Migration] Successfully migrated localStorage auth state to Jotai format');
        return true;
      } catch (error) {
        console.error('❌ [Auth Migration] Error parsing user data:', error);
        return false;
      }
    }
    
    console.log('ℹ️ [Auth Migration] No localStorage auth state found, nothing to migrate');
    return false;
  } catch (error) {
    console.error('❌ [Auth Migration] Error migrating localStorage auth state:', error);
    return false;
  }
}; 