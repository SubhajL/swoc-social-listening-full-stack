/**
 * Utility to test API connections and help diagnose issues
 * This can be called from the browser console
 */

// Test the API health endpoint
export const testApiHealth = async (): Promise<void> => {
  try {
    console.log('Testing API health endpoint...');
    const response = await fetch('/api/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API health check successful:', data);
    } else {
      console.error(`❌ API health check failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
    }
  } catch (error) {
    console.error('❌ API health check error:', error);
  }
};

// Test the approval records endpoint
export const testApprovalRecords = async (rbacRole = 1): Promise<void> => {
  try {
    console.log(`Testing approval records endpoint with RBAC role ${rbacRole}...`);
    
    // Get the auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No authentication token found in localStorage');
      console.log('Please log in first to get a valid token');
      return;
    }
    
    console.log('Using token:', token);
    
    const response = await fetch(`/api/approval-records?rbacRole=${rbacRole}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Approval records fetch successful:', data);
    } else {
      console.error(`❌ Approval records fetch failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
    }
  } catch (error) {
    console.error('❌ Approval records fetch error:', error);
  }
};

// Test all API endpoints
export const testAllEndpoints = async (): Promise<void> => {
  await testApiHealth();
  await testApprovalRecords();
};

// Export a function that can be called from the browser console
export const testApiConnection = (): void => {
  console.log('Starting API connection tests...');
  testAllEndpoints()
    .then(() => {
      console.log('API connection tests complete');
    })
    .catch(error => {
      console.error('Error during API connection tests:', error);
    });
};

// Make the functions available globally for easy access from the console
if (typeof window !== 'undefined') {
  (window as any).testApiConnection = testApiConnection;
  (window as any).testApiHealth = testApiHealth;
  (window as any).testApprovalRecords = testApprovalRecords;
}

export default testApiConnection; 