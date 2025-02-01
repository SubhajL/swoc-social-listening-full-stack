# Fix Map Container Initialization

Date: 2024-02-01
Type: CHANGE
Priority: High
Related Issue: #map-initialization

## Description
The Map component is experiencing container initialization issues, specifically with useEffect dependency management and container mounting sequence. This task focuses on implementing a robust container initialization system with proper dependency tracking.

## Technical Analysis

### Current Issues
1. Container ref management:
   ```typescript
   // Current problematic pattern
   useEffect(() => {
     if (containerRef.current) {
       setContainerReady(true);
     }
   }, [containerRef.current]); // Incorrect dependency
   ```

2. State synchronization:
   - Container ready state not properly synced with ref existence
   - Dimension calculations happening before container is ready
   - Token validation not properly sequenced with container initialization

### Implementation Plan

1. **Container State Management**
```typescript
interface ContainerState {
  ready: boolean;
  dimensions: { width: number; height: number } | null;
  error: Error | null;
}

const [containerState, setContainerState] = useState<ContainerState>({
  ready: false,
  dimensions: null,
  error: null
});
```

2. **Proper useEffect Dependencies**
```typescript
// Container Initialization
useEffect(() => {
  let mounted = true;
  
  const initializeContainer = () => {
    if (!containerRef.current || !mounted) return;
    
    try {
      setContainerState(prev => ({
        ...prev,
        ready: true
      }));
    } catch (error) {
      setContainerState(prev => ({
        ...prev,
        error: error as Error
      }));
    }
  };

  initializeContainer();
  
  return () => {
    mounted = false;
  };
}, []); // Empty dependency array for initial mount only

// Dimension Tracking
useEffect(() => {
  if (!containerState.ready || !containerRef.current) return;
  
  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      setContainerState(prev => ({
        ...prev,
        dimensions: {
          width: entry.contentRect.width,
          height: entry.contentRect.height
        }
      }));
    }
  });

  observer.observe(containerRef.current);
  
  return () => observer.disconnect();
}, [containerState.ready]);
```

3. **Debug Logging System**
```typescript
// Development logging
if (process.env.NODE_ENV === 'development') {
  useEffect(() => {
    console.debug('[Map] Container State:', {
      ready: containerState.ready,
      dimensions: containerState.dimensions,
      error: containerState.error
    });
  }, [containerState]);
}
```

### Testing Strategy

1. **Unit Tests**
```typescript
describe('Map Container Initialization', () => {
  it('should initialize container correctly', () => {
    const { result } = renderHook(() => useMapContainer());
    expect(result.current.containerState.ready).toBe(false);
    
    act(() => {
      // Simulate container mount
    });
    
    expect(result.current.containerState.ready).toBe(true);
  });
  
  it('should handle resize events', async () => {
    const { result } = renderHook(() => useMapContainer());
    
    act(() => {
      // Trigger resize observer
    });
    
    expect(result.current.containerState.dimensions).toBeDefined();
  });
});
```

2. **Integration Tests**
```typescript
describe('Map Integration', () => {
  it('should initialize map after container is ready', async () => {
    render(<Map />);
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Verify map initialization
  });
});
```

### Performance Optimizations

1. **Debounced Dimension Updates**
```typescript
const debouncedDimensionUpdate = useCallback(
  debounce((width: number, height: number) => {
    setContainerState(prev => ({
      ...prev,
      dimensions: { width, height }
    }));
  }, 100),
  []
);
```

2. **Memoized Callbacks**
```typescript
const handleContainerMount = useCallback(() => {
  if (!containerRef.current) return;
  setContainerState(prev => ({ ...prev, ready: true }));
}, []);
```

## Affected Files
- `apps/frontend/src/components/Map/index.tsx`
- `apps/frontend/src/components/Map/hooks/useMapContainer.ts`
- `apps/frontend/src/components/Map/types.ts`

## Dependencies
- ResizeObserver API
- React useEffect/useCallback hooks
- Debounce utility

## Testing Requirements
1. Container mounting sequence verification
2. Dimension calculation accuracy
3. Error handling coverage
4. Memory leak prevention
5. Performance impact assessment

## Notes
- Implement changes incrementally to maintain stability
- Add comprehensive error boundaries
- Consider fallback UI for error states
- Document all state transitions 