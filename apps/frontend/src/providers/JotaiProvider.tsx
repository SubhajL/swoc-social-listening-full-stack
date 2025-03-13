import React, { useEffect } from 'react';
import { Provider } from 'jotai';
import { migrateLocalStorageToJotai } from '@/utils/auth-migration';

interface JotaiProviderProps {
  children: React.ReactNode;
}

/**
 * JotaiProvider component that wraps the application with Jotai's Provider
 * This enables the use of Jotai atoms throughout the application
 */
export const JotaiProvider: React.FC<JotaiProviderProps> = ({ children }) => {
  // Ensure localStorage data is migrated to Jotai on provider mount
  useEffect(() => {
    console.log('[JotaiProvider] Initializing and migrating localStorage data to Jotai');
    migrateLocalStorageToJotai();
  }, []);
  
  return (
    <Provider>
      {children}
    </Provider>
  );
};

export default JotaiProvider; 