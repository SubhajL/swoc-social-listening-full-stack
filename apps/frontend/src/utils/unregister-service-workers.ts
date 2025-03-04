/**
 * Utility to unregister all service workers
 * This can be called from the browser console to clean up any lingering service workers
 */

export const unregisterAllServiceWorkers = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length === 0) {
        console.log('No service workers found to unregister');
        return;
      }
      
      console.log(`Found ${registrations.length} service worker(s) to unregister`);
      
      for (const registration of registrations) {
        const unregistered = await registration.unregister();
        if (unregistered) {
          console.log(`✅ Service worker unregistered successfully: ${registration.scope}`);
        } else {
          console.warn(`⚠️ Failed to unregister service worker: ${registration.scope}`);
        }
      }
      
      console.log('🔄 All service workers unregistration complete');
      console.log('🔔 Please refresh the page for changes to take effect');
    } catch (error) {
      console.error('❌ Error unregistering service workers:', error);
    }
  } else {
    console.log('Service workers not supported in this browser');
  }
};

// Export a function that can be called from the browser console
export const cleanupServiceWorkers = (): void => {
  console.log('Starting service worker cleanup...');
  unregisterAllServiceWorkers()
    .then(() => {
      console.log('Service worker cleanup complete');
      console.log('Please refresh the page for changes to take effect');
    })
    .catch(error => {
      console.error('Error during service worker cleanup:', error);
    });
};

// Make the function available globally for easy access from the console
if (typeof window !== 'undefined') {
  (window as any).cleanupServiceWorkers = cleanupServiceWorkers;
}

export default unregisterAllServiceWorkers; 