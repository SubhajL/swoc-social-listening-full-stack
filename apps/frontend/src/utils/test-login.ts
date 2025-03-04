/**
 * Test Login Utility
 * 
 * This utility provides functions to test the login flow and authentication.
 * It can be used during development to simulate a login without going through the UI.
 */

import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { checkAuthState, fixAuthIssues, clearAuthData } from './auth-test';

/**
 * Simulates a login with the provided credentials
 */
export const testLogin = async (email: string, password: string) => {
  console.group('🔍 [Test Login] Attempting login');
  
  try {
    // Clear any existing auth data
    clearAuthData();
    console.log('Cleared existing auth data');
    
    // Make login request
    console.log(`Attempting login with email: ${email}`);
    const response = await axios.post('/api/auth/login', { email, password });
    
    console.log('Login response:', {
      status: response.status,
      hasToken: !!response.data.token,
      hasUser: !!response.data.user,
    });
    
    if (response.data.token && response.data.user) {
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Update auth store
      const user = {
        id: String(response.data.user.id),
        name: response.data.user.name,
        email: response.data.user.email,
        rbacRole: response.data.user.position || 1,
        organizationId: response.data.user.office_id || '',
        organizationName: response.data.user.office_name || ''
      };
      
      useAuthStore.getState().login(user, response.data.token);
      
      console.log('✅ Login successful');
      toast.success('Login successful');
      
      // Check auth state after login
      checkAuthState();
      
      return true;
    } else {
      console.error('❌ Login failed: Missing token or user data');
      toast.error('Login failed: Missing token or user data');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
      
      toast.error(`Login failed: ${error.response.data.message || 'Unknown error'}`);
    } else {
      toast.error(`Login failed: ${error.message}`);
    }
    
    return false;
  } finally {
    console.groupEnd();
  }
};

/**
 * Creates a mock token for testing
 */
export const createMockToken = () => {
  console.group('🔍 [Test Login] Creating mock token');
  
  try {
    // Clear any existing auth data
    clearAuthData();
    
    // Create a mock user
    const mockUser = {
      id: '999',
      name: 'Test User',
      email: 'test@example.com',
      rbacRole: 1,
      organizationId: 'test-org',
      organizationName: 'Test Organization'
    };
    
    // Create a mock token (this is not a valid JWT, just for testing)
    const mockToken = 'mock-token-for-testing';
    
    // Store in localStorage
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      position: mockUser.rbacRole,
      office_id: mockUser.organizationId,
      office_name: mockUser.organizationName
    }));
    
    // Update auth store
    useAuthStore.getState().login(mockUser, mockToken);
    
    console.log('✅ Mock token created');
    toast.success('Mock token created');
    
    // Check auth state after creating mock token
    checkAuthState();
    
    return true;
  } catch (error: any) {
    console.error('❌ Error creating mock token:', error.message);
    toast.error(`Error creating mock token: ${error.message}`);
    return false;
  } finally {
    console.groupEnd();
  }
};

// Export a test function that can be called from the browser console
(window as any).testLogin = {
  login: testLogin,
  mockToken: createMockToken,
  checkAuth: checkAuthState,
  fixAuth: fixAuthIssues,
  clearAuth: clearAuthData
}; 