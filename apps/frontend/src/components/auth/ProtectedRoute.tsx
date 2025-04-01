import { ReactNode, useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { storeConversationContext, getConversationContext } from "@/config";

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
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);
  
  // Add a ref to prevent repeated checks and redirect loops
  const hasCheckedRef = useRef(false);
  
  // Check authentication status on mount and when location changes
  useEffect(() => {
    const verifyAuth = async () => {
      // Only check auth once per component mount to prevent cycles
      if (hasCheckedRef.current) {
        console.log('[ProtectedRoute] Auth already checked, skipping redundant check');
        return;
      }
      
      hasCheckedRef.current = true;
      
      try {
        console.log('[ProtectedRoute] Verifying auth status...');
        const isValid = await checkAuth();
        
        // Store auth state in MCP context
        const context = getConversationContext();
        storeConversationContext({
          ...context,
          systemState: {
            ...context.systemState,
            isAuthenticated: isValid,
            currentRoute: location.pathname
          }
        });
        
        setIsValid(isValid);
        console.log('[ProtectedRoute] Auth verification complete:', { isValid });
      } catch (error) {
        console.error('[ProtectedRoute] Auth check error:', error);
        setIsValid(false);
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
    
    // Reset the check flag when location changes
    return () => {
      hasCheckedRef.current = false;
    };
  }, [checkAuth, location.pathname]);
  
  // Show loading state while validating
  if (isChecking) {
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