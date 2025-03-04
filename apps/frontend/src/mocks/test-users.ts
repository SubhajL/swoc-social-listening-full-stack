/**
 * Test Users for Development
 * 
 * This module provides a list of test users that can be used during development
 * to test the authentication flow without requiring a backend connection.
 * 
 * These users are used by:
 * 1. The Login component for direct authentication
 * 2. The MSW mock handlers for API mocking
 */

export interface TestUser {
  id: number;
  email: string;
  name: string;
  role: string;
  password: string;
  password_changed: boolean;
}

// List of test users for development
export const TEST_USERS: TestUser[] = [
  {
    id: 1,
    email: 'subhaj.limanond@gmail.com',
    name: 'Test User 1',
    role: 'admin',
    password: 'KttxEYTVrP', // System-generated password
    password_changed: false
  },
  {
    id: 2,
    email: 'test.user2@example.com',
    name: 'Test User 2',
    role: 'user',
    password: 'TestPassword123', // System-generated password
    password_changed: false
  }
];

/**
 * Add a new test user to the list
 * This function can be used to dynamically add new test users during development
 */
export const addTestUser = (user: TestUser): void => {
  // Check if user with this email already exists
  const existingUserIndex = TEST_USERS.findIndex(u => u.email === user.email);
  
  if (existingUserIndex !== -1) {
    // Update existing user
    TEST_USERS[existingUserIndex] = user;
  } else {
    // Add new user
    TEST_USERS.push(user);
  }
};

/**
 * Update a test user's password and password_changed status
 * This function is used by the mock handlers to update a user's password
 */
export const updateTestUserPassword = (userId: number, newPassword: string): boolean => {
  const userIndex = TEST_USERS.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return false;
  }
  
  TEST_USERS[userIndex] = {
    ...TEST_USERS[userIndex],
    password: newPassword,
    password_changed: true
  };
  
  return true;
}; 