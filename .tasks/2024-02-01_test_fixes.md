# Test Fixes for Map and FilterPanel Components

## Date: 2024-02-01

## Type: CHANGE

## Description
Fixed test failures in the Map and FilterPanel components by improving mock implementations and test assertions.

## Technical Details

### Implementation
1. FilterPanel Test Fixes:
   - Added proper mocks for Radix UI components (Checkbox and Select)
   - Added data-testid attribute to province select container
   - Updated province selection test to use proper role and label
   - Fixed subcategory selection test assertions

2. Map Test Fixes:
   - Improved mapbox-gl mock implementation
   - Fixed GeoJSONSource mock typing and implementation
   - Added proper cleanup in beforeEach
   - Updated test assertions to match GeoJSON structure
   - Fixed mock ordering to prevent undefined references

### Affected Files
- `apps/frontend/src/components/__tests__/Map.test.tsx`
- `apps/frontend/src/components/filters/__tests__/FilterPanel.test.tsx`
- `apps/frontend/src/components/filters/FilterPanel.tsx`

## Considerations

### Previous Changes
- Related to previous map component initialization fixes
- Builds on earlier FilterPanel component improvements

### Potential Impacts
- More reliable test suite
- Better test coverage for map interactions
- Improved mock implementations for future tests

### Alternatives Considered
- Using real Radix UI components in tests (rejected for complexity)
- Testing map functionality without mocks (rejected for external dependencies)

## Related Issues
- Fixes test failures in Map component
- Resolves FilterPanel test inconsistencies 