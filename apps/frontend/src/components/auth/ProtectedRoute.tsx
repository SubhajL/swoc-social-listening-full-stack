import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRole?: 'admin' | 'moderator' | 'user';
}

/**
 * Protected route component
 * Redirects unauthenticated users to the login page
 * Optionally checks for required permissions or roles
 */
export function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  requiredRole 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, hasRole, checkAuth, user, token } = useAuth();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  
  // Check authentication status on mount and when location changes
  useEffect(() => {
    let isMounted = true;
    
    const validateAuth = async () => {
      setIsValidating(true);
      
      console.log('[ProtectedRoute] Checking authentication status', {
        isAuthenticated,
        path: location.pathname,
        user: user ? {
          id: user.id,
          email: user.email,
          rbacRole: user.rbacRole
        } : null,
        hasToken: !!token,
        tokenLength: token?.length || 0
      });
      
      // Check for token in localStorage as a fallback
      const localStorageToken = localStorage.getItem('token');
      const hasLocalToken = !!localStorageToken && localStorageToken.length > 0;
      
      console.log('[ProtectedRoute] Local storage token check:', {
        hasLocalToken,
        tokenLength: hasLocalToken ? localStorageToken.length : 0
      });
      
      // Verify token is valid
      let authValid = false;
      if (isAuthenticated) {
        authValid = await checkAuth();
        console.log('[ProtectedRoute] Token validation result:', authValid);
      } else if (hasLocalToken) {
        // If Jotai state doesn't show authenticated but localStorage has a token,
        // try to validate and restore the session
        console.log('[ProtectedRoute] Found token in localStorage but not in auth state, attempting to restore');
        
        try {
          // Check if token is valid
          const tokenParts = localStorageToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            const now = Date.now();
            
            if (now < expiry) {
              console.log('[ProtectedRoute] localStorage token is valid, will redirect to trigger auth state restoration');
              // We'll handle this in the render logic below
              authValid = true;
            } else {
              console.log('[ProtectedRoute] localStorage token is expired');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          }
        } catch (error) {
          console.error('[ProtectedRoute] Error validating localStorage token:', error);
        }
      }
      
      if (isMounted) {
        setIsValid(authValid);
        setIsValidating(false);
      }
    };
    
    validateAuth();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, location.pathname, user, token, checkAuth]);
  
  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
        </div>
      </div>
    );
  }
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    // Special case: If we found a valid token in localStorage but Jotai state is not authenticated,
    // redirect to login with a special flag to trigger immediate redirect back
    const localStorageToken = localStorage.getItem('token');
    if (localStorageToken && isValid) {
      console.log('[ProtectedRoute] Valid token found in localStorage, redirecting to login to restore session');
      return <Navigate to="/login" state={{ from: location.pathname, restoreSession: true }} replace />;
    }
    
    console.log('[ProtectedRoute] User not authenticated, redirecting to login', {
      from: location.pathname
    });
    
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // Check if user has required role
  if (requiredRole && !hasRole(requiredRole)) {
    console.log('[ProtectedRoute] User does not have required role:', {
      requiredRole,
      userRole: user?.rbacRole
    });
    
    // Redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Check if user has all required permissions
  const missingPermissions = requiredPermissions.filter(permission => !hasPermission(permission));
  
  if (missingPermissions.length > 0) {
    console.log('[ProtectedRoute] User missing required permissions:', {
      missingPermissions,
      userRole: user?.rbacRole
    });
    
    // Redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated and has required permissions/role
  console.log('[ProtectedRoute] Access granted to:', {
    path: location.pathname,
    user: user ? {
      id: user.id,
      email: user.email,
      rbacRole: user.rbacRole
    } : null
  });
  
  return <>{children}</>;
} 