/**
 * Authentication Testing Utility
 * 
 * This utility provides functions to test the authentication flow and diagnose issues.
 * It can be used during development to verify that the authentication is working correctly.
 */

import { useAuthStore } from '@/stores/authStore';

/**
 * Checks the current authentication state and logs detailed information
 */
export const checkAuthState = () => {
  console.group('🔍 [Auth Test] Authentication State Check');
  
  try {
    // Check auth store state
    const authState = useAuthStore.getState();
    console.log('Auth Store State:', {
      isAuthenticated: authState.isAuthenticated,
      hasToken: !!authState.token,
      tokenLength: authState.token?.length || 0,
      user: authState.user ? {
        id: authState.user.id,
        email: authState.user.email,
        rbacRole: authState.user.rbacRole,
      } : null,
    });
    
    // Check localStorage
    const localToken = localStorage.getItem('token');
    const localUser = localStorage.getItem('user');
    const authStorage = localStorage.getItem('auth-storage');
    
    console.log('localStorage State:', {
      hasDirectToken: !!localToken,
      hasDirectUser: !!localUser,
      hasAuthStorage: !!authStorage,
    });
    
    // Check token validity
    if (localToken) {
      try {
        const tokenParts = localToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiry = payload.exp * 1000;
          const now = Date.now();
          
          console.log('Direct Token Validation:', {
            isExpired: now > expiry,
            expiryTime: new Date(expiry).toISOString(),
            currentTime: new Date(now).toISOString(),
            timeRemaining: Math.floor((expiry - now) / 1000 / 60) + ' minutes',
            subject: payload.sub,
          });
        } else {
          console.warn('Direct token format is invalid');
        }
      } catch (error) {
        console.error('Error validating direct token:', error);
      }
    }
    
    // Check auth-storage token
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        const authToken = authData?.state?.token;
        
        if (authToken) {
          try {
            const tokenParts = authToken.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const expiry = payload.exp * 1000;
              const now = Date.now();
              
              console.log('Auth Storage Token Validation:', {
                isExpired: now > expiry,
                expiryTime: new Date(expiry).toISOString(),
                currentTime: new Date(now).toISOString(),
                timeRemaining: Math.floor((expiry - now) / 1000 / 60) + ' minutes',
                subject: payload.sub,
              });
            } else {
              console.warn('Auth storage token format is invalid');
            }
          } catch (error) {
            console.error('Error validating auth storage token:', error);
          }
        }
      } catch (error) {
        console.error('Error parsing auth-storage:', error);
      }
    }
    
    // Check for token consistency
    if (localToken && authState.token) {
      console.log('Token Consistency:', {
        areEqual: localToken === authState.token,
        directTokenLength: localToken.length,
        authStoreTokenLength: authState.token.length,
      });
    }
    
    // Provide recommendations
    if (!authState.isAuthenticated && !localToken) {
      console.log('Recommendation: User is not authenticated. Please log in.');
    } else if (!authState.isAuthenticated && localToken) {
      console.log('Recommendation: Auth store is not synchronized with localStorage. Consider refreshing the page or logging in again.');
    } else if (authState.isAuthenticated && !localToken) {
      console.log('Recommendation: localStorage is missing the token. Consider logging in again.');
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
  }
  
  console.groupEnd();
};

/**
 * Attempts to fix common authentication issues
 */
export const fixAuthIssues = () => {
  console.group('🔧 [Auth Test] Attempting to fix auth issues');
  
  try {
    const authState = useAuthStore.getState();
    const localToken = localStorage.getItem('token');
    const localUser = localStorage.getItem('user');
    
    // Case 1: Auth store has token but localStorage doesn't
    if (authState.isAuthenticated && authState.token && !localToken) {
      console.log('Fixing: Auth store has token but localStorage doesn\'t');
      localStorage.setItem('token', authState.token);
      
      if (authState.user && !localUser) {
        localStorage.setItem('user', JSON.stringify({
          id: authState.user.id,
          name: authState.user.name,
          email: authState.user.email,
          position: authState.user.rbacRole,
          office_id: authState.user.organizationId,
          office_name: authState.user.organizationName,
        }));
      }
    }
    
    // Case 2: localStorage has token but auth store doesn't
    if (!authState.isAuthenticated && localToken && localUser) {
      console.log('Fixing: localStorage has token but auth store doesn\'t');
      
      try {
        const userData = JSON.parse(localUser);
        
        // Check if token is valid
        const tokenParts = localToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiry = payload.exp * 1000;
          const now = Date.now();
          
          if (now < expiry) {
            // Token is valid, restore auth state
            const user = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              rbacRole: userData.position || 1,
              organizationId: userData.office_id || '',
              organizationName: userData.office_name || ''
            };
            
            // Update auth store
            useAuthStore.getState().login(user, localToken);
            console.log('Fixed: Auth store restored from localStorage');
          } else {
            console.log('Cannot fix: Token is expired');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } else {
          console.log('Cannot fix: Token format is invalid');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Error fixing auth state:', error);
      }
    }
    
    // Case 3: Both have tokens but they're different
    if (authState.isAuthenticated && authState.token && localToken && authState.token !== localToken) {
      console.log('Fixing: Tokens are inconsistent');
      
      // Prefer auth store token as source of truth
      localStorage.setItem('token', authState.token);
    }
    
    // Check if fixes worked
    const newAuthState = useAuthStore.getState();
    const newLocalToken = localStorage.getItem('token');
    
    console.log('Fix results:', {
      authStoreAuthenticated: newAuthState.isAuthenticated,
      authStoreHasToken: !!newAuthState.token,
      localStorageHasToken: !!newLocalToken,
      tokensConsistent: newAuthState.token === newLocalToken || (!newAuthState.token && !newLocalToken),
    });
  } catch (error) {
    console.error('Error fixing auth issues:', error);
  }
  
  console.groupEnd();
};

/**
 * Clears all authentication data for testing
 */
export const clearAuthData = () => {
  console.group('🧹 [Auth Test] Clearing auth data');
  
  try {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
    
    // Clear auth store
    useAuthStore.getState().logout();
    
    console.log('Auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
  
  console.groupEnd();
};

// Export a test function that can be called from the browser console
(window as any).testAuth = {
  check: checkAuthState,
  fix: fixAuthIssues,
  clear: clearAuthData,
}; 