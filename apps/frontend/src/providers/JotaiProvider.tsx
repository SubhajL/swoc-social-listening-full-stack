import React from 'react';
import { Provider } from 'jotai';

interface JotaiProviderProps {
  children: React.ReactNode;
}

/**
 * JotaiProvider component that wraps the application with Jotai's Provider
 * This enables the use of Jotai atoms throughout the application
 */
export const JotaiProvider: React.FC<JotaiProviderProps> = ({ children }) => {
  return (
    <Provider>
      {children}
    </Provider>
  );
};

export default JotaiProvider; 