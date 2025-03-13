import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Define user interface
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'moderator' | 'user';
  department?: string;
  permissions: string[];
  avatarUrl?: string;
  lastLogin?: string;
}

// Define authentication state interface
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // Timestamp when token expires
  isLoading: boolean;
  error: string | null;
}

// Initial authentication state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  isLoading: false,
  error: null
};

// Create persistent auth state atom using localStorage
// Note: We use atomWithStorage to persist auth state across page refreshes
export const authStateAtom = atomWithStorage<AuthState>('auth', initialAuthState);

// Create derived atoms for specific auth state properties
export const isAuthenticatedAtom = atom(
  (get) => get(authStateAtom).isAuthenticated
);

export const userAtom = atom(
  (get) => get(authStateAtom).user
);

export const userRoleAtom = atom(
  (get) => get(authStateAtom).user?.role
);

export const userPermissionsAtom = atom(
  (get) => get(authStateAtom).user?.permissions || []
);

export const authTokenAtom = atom(
  (get) => get(authStateAtom).token
);

export const authLoadingAtom = atom(
  (get) => get(authStateAtom).isLoading
);

export const authErrorAtom = atom(
  (get) => get(authStateAtom).error
);

// Create atoms for auth actions
export const loginAtom = atom(
  null,
  (get, set, credentials: { username: string; password: string }) => {
    // Set loading state
    set(authStateAtom, {
      ...get(authStateAtom),
      isLoading: true,
      error: null
    });

    // In a real implementation, this would be an API call
    // For now, we'll simulate a login with a timeout
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        try {
          // Simulate API response
          // In a real implementation, this would be the response from the API
          if (credentials.username === 'admin' && credentials.password === 'password') {
            const user: User = {
              id: '1',
              username: 'admin',
              email: 'admin@example.com',
              fullName: 'Admin User',
              role: 'admin',
              department: 'IT',
              permissions: ['read', 'write', 'delete'],
              avatarUrl: 'https://i.pravatar.cc/150?u=admin',
              lastLogin: new Date().toISOString()
            };

            const token = 'fake-jwt-token';
            const refreshToken = 'fake-refresh-token';
            const expiresAt = Date.now() + 3600000; // 1 hour from now

            // Update auth state
            set(authStateAtom, {
              isAuthenticated: true,
              user,
              token,
              refreshToken,
              expiresAt,
              isLoading: false,
              error: null
            });

            // Log successful login
            console.log('[Auth] Login successful:', { username: user.username, role: user.role });

            resolve();
          } else {
            // Simulate login failure
            set(authStateAtom, {
              ...initialAuthState,
              isLoading: false,
              error: 'Invalid username or password'
            });

            // Log login failure
            console.error('[Auth] Login failed:', { username: credentials.username });

            reject(new Error('Invalid username or password'));
          }
        } catch (error) {
          // Handle unexpected errors
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
          
          set(authStateAtom, {
            ...initialAuthState,
            isLoading: false,
            error: errorMessage
          });

          // Log error
          console.error('[Auth] Login error:', error);

          reject(error);
        }
      }, 1000); // Simulate network delay
    });
  }
);

export const logoutAtom = atom(
  null,
  (get, set) => {
    // Log logout attempt
    console.log('[Auth] Logging out user:', get(authStateAtom).user?.username);

    // Reset auth state to initial state
    set(authStateAtom, initialAuthState);

    // In a real implementation, you might want to invalidate the token on the server
    // and perform other cleanup tasks

    // Log successful logout
    console.log('[Auth] Logout successful');
  }
);

export const checkAuthAtom = atom(
  null,
  (get, set) => {
    const authState = get(authStateAtom);
    
    // If not authenticated, nothing to check
    if (!authState.isAuthenticated) {
      return false;
    }

    // Check if token is expired
    const isTokenExpired = authState.expiresAt ? Date.now() > authState.expiresAt : true;
    
    if (isTokenExpired) {
      console.log('[Auth] Token expired, logging out');
      set(authStateAtom, initialAuthState);
      return false;
    }

    return true;
  }
);

// Permission check function
export const hasPermission = (permissions: string[], permission: string): boolean => {
  return permissions.includes(permission);
};

// Create a permission check atom that takes a permission as a parameter
export const createHasPermissionAtom = (permission: string) => atom(
  (get) => {
    const permissions = get(userPermissionsAtom);
    return hasPermission(permissions, permission);
  }
);

// Role check function
export const hasRole = (userRole: string | undefined, role: 'admin' | 'moderator' | 'user'): boolean => {
  return userRole === role;
};

// Create a role check atom that takes a role as a parameter
export const createHasRoleAtom = (role: 'admin' | 'moderator' | 'user') => atom(
  (get) => {
    const userRole = get(userRoleAtom);
    return hasRole(userRole, role);
  }
); 