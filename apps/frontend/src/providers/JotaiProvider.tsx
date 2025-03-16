import { useEffect, ReactNode } from 'react';
import { Provider } from 'jotai';
import { migrateLocalStorageToJotai } from '@/utils/auth-migration';

interface JotaiProviderProps {
  children: ReactNode;
}

/**
 * JotaiProvider component that wraps the application with Jotai's Provider
 * This enables the use of Jotai atoms throughout the application
 */
export const JotaiProvider = ({ children }: JotaiProviderProps) => {
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