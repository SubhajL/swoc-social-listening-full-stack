import { ReactNode, useEffect } from 'react';
import { useAtom } from 'jotai';
import { checkAuthAtom } from '@/atoms/authState';
import { useAuth } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component
 * Checks authentication state on app load and provides it to all components
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, checkAuth } = useAuth();
  
  // Check authentication state on app load
  useEffect(() => {
    console.log('[AuthProvider] Checking authentication state');
    
    // Check if user is authenticated
    const isValid = checkAuth();
    
    console.log('[AuthProvider] Authentication check result:', { isAuthenticated: isValid });
  }, [checkAuth]);
  
  return <>{children}</>;
} 