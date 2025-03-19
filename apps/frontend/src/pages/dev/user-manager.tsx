import { useState, useEffect } from 'react';
import UserManager from '@/components/dev/UserManager';

/**
 * Development User Manager Page
 * 
 * This page is only accessible in development mode and provides
 * a UI for managing test users for authentication testing.
 */
const UserManagerPage = () => {
  // Only render in development mode
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Not Available</h1>
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Manager</h1>
      <UserManager />
    </div>
  );
};

export default UserManagerPage; 