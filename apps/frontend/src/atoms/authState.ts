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
  (get) => get(authStateAtom).isAuthenticated
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
  (get, set) => {
    const { token, isAuthenticated } = get(authStateAtom);
    
    console.log('🔍 [Auth] Checking authentication status', { 
      isAuthenticated, 
      hasToken: !!token 
    });
    
    // If not authenticated, nothing to check
    if (!isAuthenticated || !token) {
      return false;
    }
    
    try {
      // Check if token is a JWT and if it's expired
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
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
          console.log('⚠️ [Auth] Token expired, logging out');
          set(logoutAtom);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ [Auth] Error checking token:', error);
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