// Import dependencies for token decoding
import jwtDecode from 'jwt-decode';

// Utility function to check if token is expired
function isTokenExpired(token: string): boolean {
  try {
    const decoded: { exp: number } = jwtDecode(token);
    // JWT exp is in seconds
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Failed to decode token', error);
    return true; // assume expired on error
  }
}

// TODO: Implement token refresh logic if available
async function refreshAuthToken(): Promise<string | null> {
  // Placeholder for refresh logic. If refresh token is available, request a new token.
  // Otherwise, return null to indicate failure.
  console.warn('refreshAuthToken not implemented');
  return null;
}

// Create axios instance with corrected base URL to avoid duplicated '/api'
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL || '/api',
  // ... other axios config options ...
});

// Request interceptor to add auth token and handle expiration
apiClient.interceptors.request.use(async config => {
  // Assume getAuthToken() returns token from auth-storage
  const token = localStorage.getItem('authToken');
  if (token) {
    if (isTokenExpired(token)) {
      console.warn('[API] Token expired, attempting to refresh');
      const newToken = await refreshAuthToken();
      if (newToken) {
        localStorage.setItem('authToken', newToken);
        config.headers['Authorization'] = `Bearer ${newToken}`;
      } else {
        console.error('[API] Failed to refresh token, removing expired token');
        localStorage.removeItem('authToken');
        // Optionally trigger a logout or redirect here
      }
    } else {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Response interceptor to log errors
apiClient.interceptors.response.use(response => {
  return response;
}, error => {
  console.error('[API Error] Request failed:', error.response || error.message);
  return Promise.reject(error);
});

export default apiClient; 