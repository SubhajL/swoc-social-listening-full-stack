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
  const { isAuthenticated, hasPermission, hasRole } = useAuth();
  const location = useLocation();
  
  // Check if user is authenticated
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] User not authenticated, redirecting to login');
    
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // Check if user has required role
  if (requiredRole && !hasRole(requiredRole)) {
    console.log('[ProtectedRoute] User does not have required role:', requiredRole);
    
    // Redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Check if user has all required permissions
  const missingPermissions = requiredPermissions.filter(permission => !hasPermission(permission));
  
  if (missingPermissions.length > 0) {
    console.log('[ProtectedRoute] User missing required permissions:', missingPermissions);
    
    // Redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated and has required permissions/role
  return <>{children}</>;
} 