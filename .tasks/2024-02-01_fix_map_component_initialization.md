# Fix Map Component Initialization Issues

Date: 2024-02-01
Type: CHANGE
Priority: High
Status: IN_PROGRESS

## Implementation Status

### Completed Tasks

1. ✅ Container Management Hook
   - Created `useMapContainer` hook with robust initialization
   - Implemented retry mechanism with configurable options
   - Added dimension tracking with ResizeObserver
   - Added proper cleanup and error handling

2. ✅ Type Definitions
   - Updated ProcessedPost interface
   - Added proper CategoryName enum
   - Fixed type issues with map properties

3. ✅ Map Component Updates
   - Integrated useMapContainer hook
   - Fixed category filtering
   - Added proper error handling
   - Implemented loading states

4. ✅ Error Handling
   - Created MapError component
   - Added toast notifications
   - Implemented retry mechanism

### Remaining Tasks

1. 🔄 Performance Optimizations
   - [ ] Add memoization for filtered posts
   - [ ] Optimize marker updates
   - [ ] Add virtualization for large datasets

2. 🔄 Testing
   - [ ] Add unit tests for useMapContainer
   - [ ] Add integration tests for Map component
   - [ ] Add performance benchmarks

3. 🔄 Documentation
   - [ ] Add JSDoc comments
   - [ ] Create usage examples
   - [ ] Document error scenarios

## Technical Details

### Current Implementation

1. Container Management:
```typescript
const {
  containerRef,
  containerState,
  isReady,
  hasError,
  error
} = useMapContainer({
  maxRetries: 5,
  retryInterval: 200,
  debounceDelay: 100
});
```

2. Error Handling:
```typescript
if (hasError) {
  return (
    <MapError 
      error={error} 
      onRetry={() => window.location.reload()} 
    />
  );
}
```

3. Loading States:
```typescript
{isLoading && (
  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
    <div className="loading-spinner" />
  </div>
)}
```

### Performance Considerations

1. Dimension Updates:
```typescript
const updateDimensions = useCallback(
  debounce(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    setDimensions({ width, height });
  }, debounceDelay),
  []
);
```

2. Post Filtering:
```typescript
const filteredPosts = useMemo(() => 
  apiPosts.filter(post => 
    isValidCoordinates(post) &&
    matchesAdministrativeArea(post, selectedProvince, selectedAmphure, selectedTumbon) &&
    (selectedCategories.length === 0 || selectedCategories.includes(post.category_name as CategoryName))
  ),
  [apiPosts, selectedCategories, selectedProvince, selectedAmphure, selectedTumbon]
);
```

## Testing Requirements

1. Container Initialization:
```typescript
describe('useMapContainer', () => {
  it('should handle initialization retry', async () => {
    const { result } = renderHook(() => useMapContainer());
    await waitFor(() => {
      expect(result.current.containerState.retries).toBeGreaterThan(0);
    });
  });
});
```

2. Map Integration:
```typescript
describe('Map', () => {
  it('should render map when container is ready', async () => {
    render(<Map token="test-token" />);
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });
});
```

## Next Steps

1. Performance
   - Implement post filtering optimization
   - Add marker clustering improvements
   - Optimize re-renders

2. Testing
   - Set up testing environment
   - Write comprehensive test suite
   - Add performance tests

3. Documentation
   - Document component API
   - Add usage examples
   - Create troubleshooting guide

## Notes
- Monitor performance with large datasets
- Consider adding fallback UI for error states
- Add telemetry for error tracking

## Description
The Map component is experiencing initialization issues related to container mounting and dimension calculations. This affects the proper rendering and functionality of the map interface.

## Technical Details

### Current Issues
1. Container Mounting Problems:
   - Container element is null during initialization
   - Container dimensions undefined
   - Container exists: false but isVisible: true
   
2. State Inconsistencies:
   - containerReady: false with isVisible: true
   - hasToken: true but container not ready
   - isLoading state transitions without container readiness

### Implementation Plan

1. Container Initialization:
   ```typescript
   // TODO: Implement proper container ref handling
   const containerRef = useRef<HTMLDivElement>(null);
   const [containerReady, setContainerReady] = useState(false);
   
   useEffect(() => {
     if (containerRef.current) {
       setContainerReady(true);
     }
   }, [containerRef.current]);
   ```

2. Dimension Handling:
   ```typescript
   // TODO: Add proper dimension calculations
   const [dimensions, setDimensions] = useState<{width: number; height: number} | null>(null);
   
   useEffect(() => {
     if (containerRef.current && containerReady) {
       const { clientWidth, clientHeight } = containerRef.current;
       setDimensions({ width: clientWidth, height: clientHeight });
     }
   }, [containerReady]);
   ```

3. Map Initialization:
   ```typescript
   // TODO: Update map initialization logic
   useEffect(() => {
     if (containerReady && dimensions && hasToken) {
       initializeMap();
     }
   }, [containerReady, dimensions, hasToken]);
   ```

### Affected Files
- apps/frontend/src/components/complaint/Map.tsx
- apps/frontend/src/utils/mapbox.ts

### Dependencies
- Mapbox GL JS
- React useRef/useEffect hooks

## Considerations

### Previous Changes
- Review any recent changes to Map component initialization
- Check for changes in container styling or layout

### Potential Impacts
- Map rendering performance
- User interaction with map features
- Data visualization accuracy

### Testing Requirements
1. Container mounting sequence
2. Dimension calculations
3. Map initialization timing
4. Responsive layout behavior
5. Error handling scenarios

## Related Issues
- Container ref management
- Component lifecycle handling
- Responsive layout integration

## Future Implications
- Consider implementing a more robust container initialization system
- Add better error boundaries for map component
- Implement loading states and fallbacks

## Notes
- Priority should be given to fixing the container mounting issue first
- Consider adding debug logging for initialization steps
- May need to review parent component layout structure 