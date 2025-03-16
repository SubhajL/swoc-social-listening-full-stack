import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { unregisterAllServiceWorkers } from './utils/unregister-service-workers'
import { initAuthFromLocalStorage } from './atoms/authState'
import JotaiProvider from './providers/JotaiProvider'

// Initialize auth state from localStorage
initAuthFromLocalStorage();

// Function to initialize the app
const initializeApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('Root element not found');
    return;
  }
  
  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <JotaiProvider>
        <App />
      </JotaiProvider>
    </StrictMode>
  );
};

// Unregister any service workers that might be causing issues
unregisterAllServiceWorkers()
  .then(() => {
    console.log('Service worker cleanup complete, initializing app');
    initializeApp();
  })
  .catch(error => {
    console.error('Error during service worker cleanup:', error);
    // Initialize app anyway
    initializeApp();
  });
