import { useAtom, useAtomValue } from 'jotai';
import { useCallback } from 'react';
import {
  authStateAtom,
  loginAtom,
  logoutAtom,
  checkAuthAtom,
  isAuthenticatedAtom,
  userAtom,
  userRoleAtom,
  userPermissionsAtom,
  authTokenAtom,
  authLoadingAtom,
  authErrorAtom,
  createHasPermissionAtom,
  createHasRoleAtom,
  User
} from '../atoms/authState';

/**
 * Custom hook for authentication functionality
 * Provides a convenient interface for accessing and manipulating the auth state
 */
export function useAuth() {
  // Get auth state atoms
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const userRole = useAtomValue(userRoleAtom);
  const userPermissions = useAtomValue(userPermissionsAtom);
  const token = useAtomValue(authTokenAtom);
  const isLoading = useAtomValue(authLoadingAtom);
  const error = useAtomValue(authErrorAtom);
  
  // Get auth action atoms
  const [, login] = useAtom(loginAtom);
  const [, logout] = useAtom(logoutAtom);
  const [, checkAuth] = useAtom(checkAuthAtom);
  
  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!isAuthenticated || !userPermissions) return false;
    return userPermissions.includes(permission);
  }, [isAuthenticated, userPermissions]);
  
  // Check if user has a specific role
  const hasRole = useCallback((role: 'admin' | 'moderator' | 'user'): boolean => {
    if (!isAuthenticated || !userRole) return false;
    return userRole === role;
  }, [isAuthenticated, userRole]);
  
  // Check if user has admin role
  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);
  
  // Check if user has moderator role
  const isModerator = useCallback((): boolean => {
    return hasRole('moderator');
  }, [hasRole]);
  
  // Update user profile
  const updateProfile = useCallback((updatedUser: Partial<User>) => {
    // This would typically be an API call
    console.log('[Auth] Updating user profile:', updatedUser);
    // For now, we'll just log the update
  }, []);
  
  return {
    // Auth state
    isAuthenticated,
    user,
    userRole,
    userPermissions,
    token,
    isLoading,
    error,
    
    // Auth actions
    login,
    logout,
    checkAuth,
    
    // Helper functions
    hasPermission,
    hasRole,
    isAdmin,
    isModerator,
    updateProfile
  };
}

/**
 * Create a hook for checking a specific permission
 * @param permission The permission to check
 * @returns A hook that returns a boolean indicating if the user has the permission
 */
export function createUseHasPermission(permission: string) {
  const permissionAtom = createHasPermissionAtom(permission);
  return () => useAtomValue(permissionAtom);
}

/**
 * Create a hook for checking a specific role
 * @param role The role to check
 * @returns A hook that returns a boolean indicating if the user has the role
 */
export function createUseHasRole(role: 'admin' | 'moderator' | 'user') {
  const roleAtom = createHasRoleAtom(role);
  return () => useAtomValue(roleAtom);
}

// Pre-created hooks for common permissions and roles
export const useIsAdmin = createUseHasRole('admin');
export const useIsModerator = createUseHasRole('moderator');
export const useIsUser = createUseHasRole('user');

export const useCanRead = createUseHasPermission('read');
export const useCanWrite = createUseHasPermission('write');
export const useCanDelete = createUseHasPermission('delete'); 