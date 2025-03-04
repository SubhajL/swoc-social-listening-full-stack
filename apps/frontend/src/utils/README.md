# Authentication Testing Utilities

This directory contains utilities for testing authentication in the SWOC Social Listening application.

## Overview

The authentication testing utilities provide tools for:

1. Testing the login flow
2. Checking authentication state
3. Creating mock tokens for testing
4. Generating valid and expired JWT tokens
5. Fixing common authentication issues
6. Clearing authentication data

## Available Utilities

### `auth-test.ts`

Provides functions for checking and managing authentication state:

- `checkAuthState()`: Logs detailed information about the current authentication state
- `fixAuthIssues()`: Attempts to fix common authentication issues
- `clearAuthData()`: Clears all authentication data from localStorage and the auth store

### `test-login.ts`

Provides functions for testing the login flow:

- `testLogin(email, password)`: Simulates a login with the provided credentials
- `createMockToken()`: Creates a mock token for testing

### `create-test-jwt.ts`

Provides functions for generating JWT tokens for testing:

- `createTestJWT(payload, expiresInMinutes)`: Creates a valid JWT token with custom payload
- `createExpiredJWT(payload, expiredMinutesAgo)`: Creates an expired JWT token
- `setTestJWT(expiresInMinutes, customPayload)`: Sets a valid JWT token in localStorage and auth store
- `setExpiredJWT(expiredMinutesAgo, customPayload)`: Sets an expired JWT token in localStorage

## Using the Auth Test Page

The Auth Test page (`/auth-test`) provides a UI for testing authentication:

1. **Current Auth State**: Shows the current authentication state
2. **Test Login**: Test login with email and password
3. **JWT Token Generator**: Create valid or expired JWT tokens
4. **Auth Utilities**: Check auth state, fix issues, or clear auth data

## Testing from the Console

You can also use these utilities from the browser console:

```javascript
// Check authentication state
testAuth.check();

// Fix authentication issues
testAuth.fix();

// Clear authentication data
testAuth.clear();

// Test login
testLogin.login('user@example.com', 'password');

// Create mock token
testLogin.mockToken();

// Create JWT token
testJWT.create({ role: 2 }, 60);

// Set JWT token in localStorage and auth store
testJWT.set(60, { role: 2 });

// Create expired JWT token
testJWT.setExpired(10, { role: 2 });
```

## Testing the ApprovalDashboard

The ApprovalDashboard requires authentication. To test it:

1. Use the Auth Test page to create a valid token
2. Click "Go to Approval Dashboard"
3. Verify that the dashboard loads and displays records

To test authentication error handling:

1. Use the Auth Test page to create an expired token
2. Click "Go to Approval Dashboard"
3. Verify that you are redirected to the login page

## Test Plan

For a comprehensive test plan, see [test-plan.md](./test-plan.md). 