/**
 * API Testing Utility
 * 
 * This utility provides functions to test the backend API endpoints.
 * It can be used during development to verify that the backend API
 * is working correctly with the frontend.
 */

import axiosInstance from '@/lib/api-client';

// Define interfaces for request and response types
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    password_changed: boolean;
  };
  message?: string;
}

interface ChangePasswordRequest {
  userId: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Test the login API endpoint
 */
export const testLoginApi = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    console.log('Testing login API with credentials:', credentials);
    const response = await axiosInstance.post('/auth/login', credentials);
    console.log('Login API response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Login API error:', error.response?.data || error.message);
    return error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Test the change password API endpoint
 */
export const testChangePasswordApi = async (
  data: ChangePasswordRequest, 
  token: string
): Promise<ChangePasswordResponse> => {
  try {
    console.log('Testing change password API with data:', data);
    const response = await axiosInstance.post('/auth/change-password', data, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Change password API response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Change password API error:', error.response?.data || error.message);
    return error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Run all API tests
 */
export const runApiTests = async () => {
  console.log('=== Running API Tests ===');
  
  // Test login with valid credentials
  const loginResponse = await testLoginApi({
    email: 'subhaj.limanond@gmail.com',
    password: 'KttxEYTVrP'
  });
  
  if (!loginResponse.success || !loginResponse.token) {
    console.error('Login test failed');
    return;
  }
  
  // Test change password
  const changePasswordResponse = await testChangePasswordApi(
    {
      userId: loginResponse.user?.id || '',
      newPassword: 'NewPassword123'
    },
    loginResponse.token
  );
  
  if (!changePasswordResponse.success) {
    console.error('Change password test failed');
    return;
  }
  
  // Test login with new password
  const newLoginResponse = await testLoginApi({
    email: 'subhaj.limanond@gmail.com',
    password: 'NewPassword123'
  });
  
  if (!newLoginResponse.success) {
    console.error('Login with new password test failed');
    return;
  }
  
  console.log('All API tests passed!');
}; 