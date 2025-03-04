# Authentication and ApprovalDashboard Test Plan

This document outlines a comprehensive test plan for verifying the authentication flow and ApprovalDashboard functionality in the SWOC Social Listening application.

## Prerequisites

- The application is running with both frontend and backend servers
- The frontend is accessible at http://localhost:8080
- The backend API is accessible at http://localhost:3000

## Test 1: Authentication Flow Testing

### 1.1 Basic Login Flow

1. Navigate to http://localhost:8080/auth-test
2. Verify the AuthTest page loads and displays the current authentication state (should show not authenticated)
3. Enter valid credentials in the test login form:
   - Email: [valid email]
   - Password: [valid password]
4. Click "Test Login" button
5. Expected results:
   - Success toast notification appears
   - Authentication state section updates to show:
     - Authenticated: Yes
     - Has Token: Yes
     - User email and role are displayed correctly

### 1.2 Token Storage Verification

1. After successful login, click "Check Auth State" button
2. Open browser console and verify:
   - Token is stored in localStorage
   - Token is stored in auth-storage
   - Token format is valid (JWT with three parts)
   - Token is not expired
   - Auth store state is synchronized with localStorage

### 1.3 Mock Token Testing

1. Click "Clear Auth Data" button to reset authentication state
2. Verify authentication state shows not authenticated
3. Click "Create Mock Token" button
4. Expected results:
   - Success toast notification appears
   - Authentication state updates to show:
     - Authenticated: Yes
     - Has Token: Yes
     - User: test@example.com
     - Role: 1

### 1.4 Authentication Repair Testing

1. Manually create an inconsistent state:
   - Click "Clear Auth Data"
   - Open browser console and run:
     ```javascript
     localStorage.setItem('token', 'invalid-token');
     ```
2. Click "Check Auth State" button and verify console shows inconsistency
3. Click "Fix Auth Issues" button
4. Expected results:
   - Console shows attempt to fix issues
   - Since token is invalid, it should be removed
   - Authentication state should show not authenticated

## Test 2: ApprovalDashboard Access Testing

### 2.1 Unauthenticated Access

1. Clear authentication data by clicking "Clear Auth Data" button
2. Click "Go to Approval Dashboard" button
3. Expected results:
   - Should be redirected to login page
   - URL should include return path parameter

### 2.2 Authenticated Access

1. Return to AuthTest page
2. Create a mock token or log in with valid credentials
3. Click "Go to Approval Dashboard" button
4. Expected results:
   - ApprovalDashboard page should load
   - Records should be fetched from the API (check network tab)
   - Records should be displayed in the table

### 2.3 Token Expiration Handling

1. Create a mock token with an expired timestamp
2. Navigate to ApprovalDashboard
3. Expected results:
   - Should detect expired token
   - Should redirect to login page
   - Should show appropriate error message

## Test 3: API Authentication Testing

### 3.1 API Request Headers

1. Log in with valid credentials
2. Navigate to ApprovalDashboard
3. Open browser network tab
4. Observe requests to `/api/approval-records`
5. Expected results:
   - Request should include Authorization header with Bearer token
   - Response should return status 200 with data

### 3.2 Invalid Token Handling

1. Create an invalid authentication state:
   - Log in successfully
   - Manually modify token in localStorage to be invalid
2. Refresh the page
3. Expected results:
   - API requests should fail with 401 status
   - Application should handle the error gracefully
   - User should be redirected to login page

## Test 4: RBAC Role Verification

### 4.1 Role-Based Access Control

1. Log in with different user roles (1, 2, and 3)
2. Navigate to ApprovalDashboard
3. Expected results:
   - Users with role 1 should see all records
   - Users with role 2 should see only records with position >= 2
   - Users with role 3 should see only records with position = 3

## Troubleshooting Guide

If tests fail, check the following:

1. **Authentication State Issues**:
   - Check browser console for detailed authentication state logs
   - Verify token format and expiration
   - Check for inconsistencies between localStorage and auth store

2. **API Connection Issues**:
   - Verify backend server is running
   - Check network requests for proper headers
   - Examine response status codes and error messages

3. **Token Storage Issues**:
   - Clear browser storage and try again
   - Check for conflicts between different storage mechanisms
   - Verify token is being correctly passed to API requests

4. **Redirect Issues**:
   - Check URL parameters after redirects
   - Verify route configuration in App.tsx
   - Check navigation logic in components 