import React from 'react';
import UserManager from '@/components/dev/UserManager';

/**
 * Development User Manager Page
 * 
 * This page is only accessible in development mode and provides
 * a UI for managing test users for authentication testing.
 */
const UserManagerPage: React.FC = () => {
  // Only render in development mode
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-4">This page is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <UserManager />
    </div>
  );
};

export default UserManagerPage; 