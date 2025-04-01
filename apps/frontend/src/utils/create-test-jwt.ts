/**
 * JWT Token Generator for Testing
 * 
 * This utility creates a valid JWT token for testing authentication.
 * Note: This is for development/testing only and should not be used in production.
 */

// Simple base64url encoding function for browser environment
const base64url = (str: string): string => {
  // Use browser-native btoa instead of Node.js Buffer
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// Create a JWT token with custom payload
export const createTestJWT = (
  payload: Record<string, any> = {},
  expiresInMinutes: number = 60
): string => {
  // JWT Header (algorithm & token type)
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Current timestamp in seconds
  const now = Math.floor(Date.now() / 1000);
  
  // Default payload with standard claims
  const defaultPayload = {
    sub: '999', // subject (user ID)
    name: 'Test User',
    email: 'test@example.com',
    role: 1,
    iat: now, // issued at
    exp: now + (expiresInMinutes * 60), // expiration time
  };
  
  // Merge default payload with custom payload
  const finalPayload = { ...defaultPayload, ...payload };
  
  // Encode header and payload
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(finalPayload));
  
  // For testing purposes, we'll use a simple signature
  // In production, this would be cryptographically signed
  const signature = base64url('test-signature-for-development-only');
  
  // Combine to form JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Create an expired JWT token
export const createExpiredJWT = (
  payload: Record<string, any> = {},
  expiredMinutesAgo: number = 10
): string => {
  const now = Math.floor(Date.now() / 1000);
  return createTestJWT({
    ...payload,
    exp: now - (expiredMinutesAgo * 60) // Set expiration in the past
  }, 60); // The expiresInMinutes parameter is ignored in this case
};

// Function to set the test JWT in localStorage and auth store
export const setTestJWT = (
  expiresInMinutes: number = 60,
  customPayload: Record<string, any> = {}
): void => {
  try {
    // Create the JWT
    const token = createTestJWT(customPayload, expiresInMinutes);
    
    // Create user object
    const user = {
      id: customPayload.sub || '999',
      name: customPayload.name || 'Test User',
      email: customPayload.email || 'test@example.com',
      rbacRole: customPayload.role || 1,
      organizationId: customPayload.organizationId || 'test-org',
      organizationName: customPayload.organizationName || 'Test Organization'
    };
    
    // Store in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      position: user.rbacRole,
      office_id: user.organizationId,
      office_name: user.organizationName
    }));
    
    // Update auth store if available
    try {
      const { useAuthStore } = require('@/stores/authStore');
      if (useAuthStore && typeof useAuthStore.getState === 'function') {
        useAuthStore.getState().login(user, token);
        console.log('✅ Auth store updated with test JWT');
      }
    } catch (error) {
      console.error('❌ Error updating auth store:', error);
    }
    
    console.log('✅ Test JWT created and stored:', {
      token: `${token.substring(0, 20)}...`,
      expiresIn: `${expiresInMinutes} minutes`,
      user
    });
  } catch (error) {
    console.error('❌ Error creating test JWT:', error);
    throw error;
  }
};

// Function to set an expired JWT for testing expiration handling
export const setExpiredJWT = (
  expiredMinutesAgo: number = 10,
  customPayload: Record<string, any> = {}
): void => {
  try {
    const token = createExpiredJWT(customPayload, expiredMinutesAgo);
    
    // Store in localStorage only (don't update auth store)
    localStorage.setItem('token', token);
    
    console.log('✅ Expired test JWT created and stored:', {
      token: `${token.substring(0, 20)}...`,
      expiredMinutesAgo,
    });
  } catch (error) {
    console.error('❌ Error creating expired test JWT:', error);
    throw error;
  }
};

// Export functions to window for console testing
(window as any).testJWT = {
  create: createTestJWT,
  createExpired: createExpiredJWT,
  set: setTestJWT,
  setExpired: setExpiredJWT
}; 