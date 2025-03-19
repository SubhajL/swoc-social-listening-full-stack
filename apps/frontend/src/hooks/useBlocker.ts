import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, useBeforeUnload } from 'react-router-dom';

// Try to import the unstable_useBlocker if available
let unstable_useBlocker: any;
try {
  // @ts-ignore - This is an experimental API
  unstable_useBlocker = require('react-router-dom').unstable_useBlocker;
} catch (e) {
  // If not available, we'll use our custom implementation
  unstable_useBlocker = null;
}

type LocationType = { pathname: string };

/**
 * A custom hook that provides a way to block navigation when a condition is met.
 * This is a simplified version for React Router v6 which doesn't have the same blocking API as v5.
 * 
 * @param shouldBlock A function that returns true if navigation should be blocked
 * @returns An object with the blocker state and methods to control it
 */
export function useBlocker(
  shouldBlock: (args: { currentLocation: LocationType, nextLocation: LocationType }) => boolean
) {
  const navigate = useNavigate();
  const location = useLocation();
  const [blockedLocation, setBlockedLocation] = useState<LocationType | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Use the unstable_useBlocker if available
  if (unstable_useBlocker) {
    const blocker = unstable_useBlocker(
      (tx: any) => {
        return shouldBlock({
          currentLocation: { pathname: location.pathname },
          nextLocation: { pathname: tx.location.pathname }
        });
      }
    );

    return {
      state: blocker.state,
      location: blocker.location || { pathname: '' },
      blocked: blocker.state === 'blocked',
      proceed: () => {
        if (blocker.state === 'blocked') {
          blocker.proceed();
        }
      },
      reset: () => {
        if (blocker.state === 'blocked') {
          blocker.reset();
        }
      },
      blockedLocation: blocker.location
    };
  }

  // Set up the beforeunload event listener to prevent accidental browser navigation
  useBeforeUnload(
    useCallback(
      (event) => {
        if (shouldBlock({ currentLocation: location, nextLocation: { pathname: '' } })) {
          event.preventDefault();
          return (event.returnValue = 'You have unsaved changes. Are you sure you want to leave?');
        }
      },
      [location, shouldBlock]
    )
  );

  // This effect runs when the location changes
  useEffect(() => {
    // We can't directly block navigation in React Router v6
    // Instead, we'll track if we should show a prompt
    const checkNavigation = () => {
      // If we're already showing a prompt, don't do anything
      if (showPrompt) return;

      // Check if we should block navigation to the current location
      const shouldBlockNavigation = shouldBlock({
        currentLocation: { pathname: location.pathname },
        nextLocation: { pathname: location.pathname }
      });

      if (shouldBlockNavigation) {
        setShowPrompt(true);
        setBlockedLocation({ pathname: location.pathname });
      }
    };

    checkNavigation();
  }, [location, shouldBlock, showPrompt]);

  const proceed = useCallback(() => {
    if (blockedLocation) {
      setShowPrompt(false);
      setBlockedLocation(null);
      navigate(blockedLocation.pathname);
    }
  }, [blockedLocation, navigate]);

  const reset = useCallback(() => {
    setShowPrompt(false);
    setBlockedLocation(null);
  }, []);

  return {
    // Return properties that match the expected interface
    state: showPrompt ? 'blocked' : 'unblocked',
    location: blockedLocation || { pathname: '' },
    blocked: showPrompt,
    proceed,
    reset,
    blockedLocation
  };
} 