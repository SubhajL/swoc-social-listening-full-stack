import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { unregisterAllServiceWorkers } from './utils/unregister-service-workers'
import { initAuthFromLocalStorage } from './atoms/authState'

// Initialize auth state from localStorage
initAuthFromLocalStorage();

// Unregister any service workers that might be causing issues
unregisterAllServiceWorkers().then(() => {
  console.log('Service worker cleanup complete, initializing app');
  
  // Initialize app without MSW
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}).catch(error => {
  console.error('Error during service worker cleanup:', error);
  
  // Initialize app anyway
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
});
