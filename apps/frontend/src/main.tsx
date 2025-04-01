import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { unregisterAllServiceWorkers } from './utils/unregister-service-workers'
import { initAuthFromLocalStorage } from './atoms/authState'

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
      <App />
    </StrictMode>
  );
};

// Initialize the app
initializeApp();

// Unregister any service workers
unregisterAllServiceWorkers();
