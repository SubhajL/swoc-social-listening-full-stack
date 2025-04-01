import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Define user interface with RBAC role
export interface User {
  id: string;
  name: string;
  email: string;
  rbacRole: number; // 1, 2, or 3
  organizationId: string;
  organizationName: string;
}

// Define authentication state interface
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial authentication state
const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Create persistent auth state atom using localStorage
export const authStateAtom = atomWithStorage<AuthState>('auth-storage', initialAuthState);

// Create derived atoms for specific auth state properties
export const isAuthenticatedAtom = atom(
  (get) => {
    const authState = get(authStateAtom);
    // Check that we have both a user and a valid token
    return !!authState.user && !!authState.token && authState.isAuthenticated;
  }
);

export const userAtom = atom(
  (get) => get(authStateAtom).user
);

export const tokenAtom = atom(
  (get) => get(authStateAtom).token
);

export const isLoadingAtom = atom(
  (get) => get(authStateAtom).isLoading
);

export const errorAtom = atom(
  (get) => get(authStateAtom).error
);

// Create atoms for auth actions
export const loginAtom = atom(
  null,
  (get, set, { user, token }: { user: User, token: string }) => {
    console.log('🔑 [Auth] Login action triggered', { 
      userId: user.id, 
      email: user.email,
      rbacRole: user.rbacRole
    });
    
    // Update auth state
    set(authStateAtom, {
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
    
    // For backward compatibility, also store in localStorage directly
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      position: user.rbacRole,
      office_id: user.organizationId,
      office_name: user.organizationName
    }));
    
    console.log('✅ [Auth] Login successful');
  }
);

export const logoutAtom = atom(
  null,
  (get, set) => {
    console.log('🔑 [Auth] Logout action triggered');
    
    // Reset auth state to initial state
    set(authStateAtom, initialAuthState);
    
    // Clear localStorage items
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    console.log('✅ [Auth] Logout successful');
  }
);

export const checkAuthAtom = atom(
  null,
  async (get, set) => {
    // Check current auth state
    const { token, isAuthenticated } = get(authStateAtom);
    
    // If not authenticated, check localStorage
    if (!isAuthenticated || !token) {
      console.log('🔍 [Auth] Not authenticated in Jotai state, checking localStorage');
      
      try {
        const localStorageToken = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        
        // If no token in localStorage, not authenticated
        if (!localStorageToken || !userJson) {
          console.log('ℹ️ [Auth] No token in localStorage');
          
          // Set consistent state
          set(authStateAtom, {
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          
          // Clear any stale auth localStorage items
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          return false;
        }
        
        // Validate token format and expiration
        try {
          // Check if token is still valid
          const tokenParts = localStorageToken.split('.');
          
          if (tokenParts.length !== 3) {
            console.log('❌ [Auth] localStorage token is not in valid JWT format');
            
            // Clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Clear Jotai auth state
            set(authStateAtom, {
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
            
            return false;
          }
          
          // Parse payload
          const payload = JSON.parse(atob(tokenParts[1]));
          
          // Check if token has expired
          const expiry = payload.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          
          console.log('🔍 [Auth] localStorage token validation', {
            isExpired: now > expiry,
            expiryTime: new Date(expiry).toISOString(),
            currentTime: new Date(now).toISOString(),
            timeRemaining: Math.floor((expiry - now) / 1000 / 60) + ' minutes'
          });
          
          if (now > expiry) {
            console.log('❌ [Auth] localStorage token is expired, clearing auth state');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Clear Jotai auth state
            set(authStateAtom, {
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
            
            return false;
          } else {
            // Token is valid, restore auth state
            const userData = JSON.parse(userJson);
            
            // Create user object for Jotai
            const user = {
              id: String(userData.id || userData.userId || ''),
              name: userData.name || '',
              email: userData.email || '',
              rbacRole: userData.position || userData.rbacRole || 1,
              organizationId: userData.office_id || userData.organizationId || '',
              organizationName: userData.office_name || userData.organizationName || ''
            };
            
            // Update Jotai auth state
            set(authStateAtom, {
              user,
              token: localStorageToken,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            console.log('✅ [Auth] Successfully restored auth state from localStorage');
            return true;
          }
        } catch (error) {
          console.error('❌ [Auth] Error validating localStorage token:', error);
          
          // Clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
          
          // Clear Jotai auth state
          set(authStateAtom, {
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          
          return false;
        }
      } catch (error) {
        console.error('❌ [Auth] Error checking localStorage:', error);
        return false;
      }
    }
    
    // Already authenticated in Jotai, verify token
    try {
      console.log('🔍 [Auth] Validating existing Jotai token');
      
      // Basic JWT validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('❌ [Auth] Token is not a valid JWT format');
        
        // Clear auth state
        set(authStateAtom, {
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Invalid token format'
        });
        
        // Also clear localStorage to maintain consistency
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        return false;
      }
      
      // Check if token is expired
      const payload = JSON.parse(atob(tokenParts[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      
      console.log('🔍 [Auth] Token validation', {
        isExpired: now > expiry,
        expiryTime: new Date(expiry).toISOString(),
        currentTime: new Date(now).toISOString(),
        timeRemaining: Math.floor((expiry - now) / 1000 / 60) + ' minutes'
      });
      
      if (now > expiry) {
        console.log('❌ [Auth] Token is expired, clearing auth state');
        
        // Clear auth state
        set(authStateAtom, {
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Token expired'
        });
        
        // Also clear localStorage to maintain consistency
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        return false;
      }
      
      // Ensure localStorage and Jotai state are in sync
      const localStorageToken = localStorage.getItem('token');
      if (localStorageToken !== token) {
        console.log('⚠️ [Auth] Synchronizing token between Jotai and localStorage');
        localStorage.setItem('token', token);
        
        if (get(authStateAtom).user) {
          localStorage.setItem('user', JSON.stringify(get(authStateAtom).user));
        }
      }
      
      console.log('✅ [Auth] Token is valid');
      return true;
    } catch (error) {
      console.error('❌ [Auth] Error validating token:', error);
      
      // Clear auth state
      set(authStateAtom, {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Error validating token'
      });
      
      // Also clear localStorage to maintain consistency
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return false;
    }
  }
);

export const updateUserAtom = atom(
  null,
  (get, set, userData: Partial<User>) => {
    const { user } = get(authStateAtom);
    
    if (!user) {
      console.warn('⚠️ [Auth] Cannot update user: No user is logged in');
      return;
    }
    
    console.log('🔄 [Auth] Updating user data', userData);
    
    // Update auth state with new user data
    set(authStateAtom, (prev) => ({
      ...prev,
      user: { ...user, ...userData }
    }));
    
    // Update localStorage user data for backward compatibility
    const localUser = localStorage.getItem('user');
    if (localUser) {
      try {
        const parsedUser = JSON.parse(localUser);
        localStorage.setItem('user', JSON.stringify({
          ...parsedUser,
          ...userData,
          position: userData.rbacRole || parsedUser.position,
          office_id: userData.organizationId || parsedUser.office_id,
          office_name: userData.organizationName || parsedUser.office_name
        }));
      } catch (error) {
        console.error('❌ [Auth] Error updating localStorage user:', error);
      }
    }
    
    console.log('✅ [Auth] User data updated successfully');
  }
);

// Helper functions for role and permission checks
export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user) return false;
  
  // Define permissions based on RBAC role
  const permissions: string[] = ['read']; // Base permission for all users
  
  switch (user.rbacRole) {
    case 3: // Admin
      permissions.push('write', 'delete', 'admin');
      break;
    case 2: // Moderator
      permissions.push('write');
      break;
    // case 1: User already has read permission
  }
  
  return permissions.includes(permission);
};

export const hasRole = (user: User | null, role: 'admin' | 'moderator' | 'user'): boolean => {
  if (!user) return false;
  
  const roleMap: Record<number, string> = {
    3: 'admin',
    2: 'moderator',
    1: 'user'
  };
  
  return roleMap[user.rbacRole] === role;
};

// Create atoms for permission and role checks
export const hasPermissionAtom = atom(
  (get) => (permission: string) => {
    const user = get(userAtom);
    return hasPermission(user, permission);
  }
);

export const hasRoleAtom = atom(
  (get) => (role: 'admin' | 'moderator' | 'user') => {
    const user = get(userAtom);
    return hasRole(user, role);
  }
);

// Initialize auth state from localStorage on page load
export const initAuthFromLocalStorage = () => {
  try {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    
    if (token && userJson) {
      const userData = JSON.parse(userJson);
      
      // Convert to User format
      const user: User = {
        id: String(userData.id),
        name: userData.name,
        email: userData.email,
        rbacRole: userData.position || 1,
        organizationId: userData.office_id || '',
        organizationName: userData.office_name || ''
      };
      
      // Create the initial state to be stored in localStorage
      const initializedState: AuthState = {
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
      
      // Store the initialized state in localStorage
      localStorage.setItem('auth-storage', JSON.stringify({
        state: initializedState,
        version: 0
      }));
      
      console.log('✅ [Auth] Initialized auth state from localStorage');
    }
  } catch (error) {
    console.error('❌ [Auth] Error initializing auth state from localStorage:', error);
  }
}; 