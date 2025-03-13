import { ReactNode, useEffect } from 'react';
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
  
  // Check authentication status on mount and when location changes
  useEffect(() => {
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
    
    // Verify token is valid
    if (isAuthenticated) {
      const isValid = checkAuth();
      console.log('[ProtectedRoute] Token validation result:', isValid);
    }
  }, [isAuthenticated, location.pathname, user, token, checkAuth]);
  
  // Check if user is authenticated
  if (!isAuthenticated) {
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