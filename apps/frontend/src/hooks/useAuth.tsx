import { useAtom, useAtomValue } from 'jotai';
import { useCallback } from 'react';
import {
  authStateAtom,
  isAuthenticatedAtom,
  userAtom,
  tokenAtom,
  isLoadingAtom,
  errorAtom,
  loginAtom,
  logoutAtom,
  checkAuthAtom,
  updateUserAtom,
  hasPermissionAtom,
  hasRoleAtom,
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
  const token = useAtomValue(tokenAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const error = useAtomValue(errorAtom);
  
  // Get auth action atoms
  const [, login] = useAtom(loginAtom);
  const [, logout] = useAtom(logoutAtom);
  const [, checkAuth] = useAtom(checkAuthAtom);
  const [, updateUser] = useAtom(updateUserAtom);
  
  // Get permission and role check functions
  const hasPermissionFn = useAtomValue(hasPermissionAtom);
  const hasRoleFn = useAtomValue(hasRoleAtom);
  
  // Map RBAC role number to role string
  const userRole = useCallback((): 'admin' | 'moderator' | 'user' | undefined => {
    if (!user) return undefined;
    
    switch (user.rbacRole) {
      case 3: return 'admin';
      case 2: return 'moderator';
      case 1: return 'user';
      default: return 'user';
    }
  }, [user]);
  
  // Define permissions based on RBAC role
  const userPermissions = useCallback((): string[] => {
    if (!user) return [];
    
    const basePermissions = ['read'];
    
    switch (user.rbacRole) {
      case 3: // Admin
        return [...basePermissions, 'write', 'delete', 'admin'];
      case 2: // Moderator
        return [...basePermissions, 'write'];
      case 1: // User
        return basePermissions;
      default:
        return basePermissions;
    }
  }, [user]);
  
  // Check if user has admin role
  const isAdmin = useCallback((): boolean => {
    return hasRoleFn('admin');
  }, [hasRoleFn]);
  
  // Check if user has moderator role
  const isModerator = useCallback((): boolean => {
    return hasRoleFn('moderator');
  }, [hasRoleFn]);
  
  return {
    // Auth state
    isAuthenticated,
    user,
    userRole: userRole(),
    userPermissions: userPermissions(),
    token,
    isLoading,
    error,
    
    // Auth actions
    login,
    logout,
    checkAuth,
    
    // Helper functions
    hasPermission: hasPermissionFn,
    hasRole: hasRoleFn,
    isAdmin,
    isModerator,
    updateProfile: updateUser
  };
}

/**
 * Create a hook for checking a specific permission
 * @param permission The permission to check
 * @returns A hook that returns a boolean indicating if the user has the permission
 */
export function createUseHasPermission(permission: string) {
  return () => {
    const { hasPermission } = useAuth();
    return hasPermission(permission);
  };
}

/**
 * Create a hook for checking a specific role
 * @param role The role to check
 * @returns A hook that returns a boolean indicating if the user has the role
 */
export function createUseHasRole(role: 'admin' | 'moderator' | 'user') {
  return () => {
    const { hasRole } = useAuth();
    return hasRole(role);
  };
}

// Pre-created hooks for common permissions and roles
export const useIsAdmin = createUseHasRole('admin');
export const useIsModerator = createUseHasRole('moderator');
export const useIsUser = createUseHasRole('user');

export const useCanRead = createUseHasPermission('read');
export const useCanWrite = createUseHasPermission('write');
export const useCanDelete = createUseHasPermission('delete'); 