# Map Component Implementation Fixes

Date: 2024-02-01
Type: CHANGE
Priority: High
Related Issue: #map-initialization

## Current Implementation Analysis

### Container Initialization Issues

1. **Container Ready Check**
```typescript
// Current problematic implementation
useEffect(() => {
  const checkContainer = () => {
    const container = mapContainer.current;
    console.log('Container Check:', {
      exists: !!container,
      dimensions: container?.getBoundingClientRect(),
      parentDimensions: container?.parentElement?.getBoundingClientRect(),
      isVisible: container?.offsetParent !== null,
      style: container?.style
    });
    
    if (container && container.offsetParent !== null) {
      setContainerReady(true);
    }
  };

  checkContainer();
  const timeoutId = setTimeout(checkContainer, 100);
  return () => clearTimeout(timeoutId);
}, []);
```

Issues:
- Single timeout may not be sufficient
- No error handling for container initialization failures
- No cleanup of container state on unmount

### Specific Fixes Required

1. **Robust Container Initialization**
```typescript
const [containerState, setContainerState] = useState<{
  ready: boolean;
  retries: number;
  error: Error | null;
}>({
  ready: false,
  retries: 0,
  error: null
});

useEffect(() => {
  const maxRetries = 5;
  const retryInterval = 200;
  let mounted = true;
  let retryTimeout: NodeJS.Timeout;

  const checkContainer = () => {
    const container = mapContainer.current;
    
    if (!mounted) return;

    if (container && container.offsetParent !== null) {
      setContainerState(prev => ({
        ...prev,
        ready: true,
        error: null
      }));
      return;
    }

    if (containerState.retries >= maxRetries) {
      setContainerState(prev => ({
        ...prev,
        error: new Error('Failed to initialize map container after multiple attempts')
      }));
      return;
    }

    setContainerState(prev => ({
      ...prev,
      retries: prev.retries + 1
    }));

    retryTimeout = setTimeout(checkContainer, retryInterval);
  };

  checkContainer();

  return () => {
    mounted = false;
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
  };
}, [containerState.retries]);
```

2. **Dimension Management**
```typescript
const [dimensions, setDimensions] = useState<{
  width: number;
  height: number;
} | null>(null);

useEffect(() => {
  if (!containerState.ready || !mapContainer.current) return;

  const updateDimensions = () => {
    const container = mapContainer.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    setDimensions({ width, height });
  };

  const resizeObserver = new ResizeObserver(updateDimensions);
  resizeObserver.observe(mapContainer.current);

  return () => resizeObserver.disconnect();
}, [containerState.ready]);
```

3. **Map Initialization Sequence**
```typescript
useEffect(() => {
  if (!containerState.ready || !dimensions || !token) {
    return;
  }

  if (mapRef.current) {
    return;
  }

  try {
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: mapStyle.default,
      center: [101.0, 15.0],
      zoom: 5.5,
      width: dimensions.width,
      height: dimensions.height
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  } catch (error) {
    setContainerState(prev => ({
      ...prev,
      error: error as Error
    }));
  }
}, [containerState.ready, dimensions, token]);
```

4. **Error Boundary Component**
```typescript
const MapErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (error) {
      // Log to error reporting service
      console.error('[Map Error]:', error);
    }
  }, [error]);

  if (hasError) {
    return (
      <div className="map-error-boundary">
        <h3>Map Loading Error</h3>
        <p>{error?.message || 'An unexpected error occurred'}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return children;
};
```

## Implementation Steps

1. Create new container state management
2. Implement robust initialization retry logic
3. Add dimension tracking with ResizeObserver
4. Update map initialization sequence
5. Add error boundary component
6. Update component exports

## Testing Requirements

1. **Container Initialization**
```typescript
describe('Map Container Initialization', () => {
  it('should handle container initialization retry', async () => {
    const { result } = renderHook(() => useMapContainer());
    
    await waitFor(() => {
      expect(result.current.containerState.retries).toBeGreaterThan(0);
    });
  });

  it('should handle successful container mount', async () => {
    render(<Map token="test-token" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });
});
```

## Performance Considerations

1. Add debouncing for dimension updates
2. Implement proper cleanup in useEffect hooks
3. Memoize callback functions
4. Add loading states for better UX

## Affected Files
- `apps/frontend/src/components/Map.tsx`
- `apps/frontend/src/components/map/MapError.tsx`
- `apps/frontend/src/hooks/useMapContainer.ts`

## Dependencies
- mapbox-gl
- ResizeObserver API
- React hooks

## Notes
- Implement changes incrementally
- Add comprehensive error logging
- Consider adding loading states
- Test on different viewport sizes 