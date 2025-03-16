# Task: Fix RID API Endpoints and Frontend Rendering Issues

## Context
- **Task ID**: 2025-03-15_2
- **Created**: 2025-03-15
- **Created by**: Subhajit
- **Main branch**: task/fix-stationcardeditedit-component
- **Task branch**: task/refactor-stationcardeditedit-auth
- **YOLO MODE**: on

## Task Description
This task addresses multiple issues encountered during the development of the social listening platform:

1. Resolve OAuth authentication issues with RID Telemetry API endpoints that are returning empty stack responses
2. Complete the implementation of Amphure and Province geocoding from latitude/longitude coordinates using Google Maps API for ThaiWater, TMD, and HII API endpoints
3. Fix JSX transformation issues encountered when implementing rendering in WaterLevelInfoCard and WaterLevelInfoContent components
4. Switch from SWC to Babel for JSX transformation to resolve persistent rendering issues

## Progress Summary

### 1. RID Telemetry API OAuth Issues
- [2025-03-14] [IN PROGRESS]: Identified OAuth authentication issues with RID Telemetry API endpoints
- [2025-03-14] [IN PROGRESS]: Implemented proper OAuth token request flow but still receiving empty stack responses
- [2025-03-15] [IN PROGRESS]: Investigating API response headers and error codes to determine the cause of empty responses
- [2025-03-15] [PENDING]: Need to contact RID API team for additional documentation on API requirements

### 2. Geocoding Implementation for ThaiWater Integration
- [2025-03-13] [COMPLETED]: Implemented Google Maps Geocoding API integration for converting coordinates to address components
- [2025-03-14] [COMPLETED]: Created utility functions to extract Amphure and Province information from geocoding results
- [2025-03-14] [COMPLETED]: Implemented caching mechanism to reduce API calls for frequently accessed locations
- [2025-03-15] [COMPLETED]: Integrated geocoding with ThaiWater, TMD, and HII API endpoints
- [2025-03-15] [COMPLETED]: Added error handling and fallback mechanisms for geocoding failures

### 3. JSX Transformation Issues
- [2025-03-12] [IDENTIFIED]: Encountered JSX transformation issues when implementing WaterLevelInfoCard and WaterLevelInfoContent components
- [2025-03-13] [ATTEMPTED]: Tried updating SWC configuration to fix JSX transformation
- [2025-03-13] [UNSUCCESSFUL]: SWC configuration changes did not resolve the JSX transformation issues
- [2025-03-14] [ATTEMPTED]: Tried different SWC plugins and presets to support JSX transformation
- [2025-03-14] [UNSUCCESSFUL]: Continued to encounter JSX transformation errors with SWC

### 4. Switch from SWC to Babel
- [2025-03-15] [COMPLETED]: Decided to switch from SWC to Babel for JSX transformation
- [2025-03-15] [COMPLETED]: Updated Vite configuration to use Babel with appropriate presets:
  - @babel/preset-env
  - @babel/preset-react
  - @babel/preset-typescript
- [2025-03-15] [COMPLETED]: Modified TypeScript configuration to set "jsx": "preserve" to allow Babel to handle JSX transformation
- [2025-03-15] [COMPLETED]: Installed necessary Babel dependencies
- [2025-03-15] [COMPLETED]: Successfully built and ran the application with Babel JSX transformation
- [2025-03-15] [COMPLETED]: Verified that WaterLevelInfoCard and WaterLevelInfoContent components render correctly

## Next Steps
1. Continue investigating RID Telemetry API OAuth issues:
   - Analyze network requests in detail
   - Test with different OAuth parameters
   - Contact RID API team for support if needed
   
2. Optimize geocoding implementation:
   - Implement more robust caching
   - Add batch geocoding for multiple locations
   - Improve error handling for edge cases
   
3. Complete the implementation of WaterLevelInfoCard and WaterLevelInfoContent components:
   - Finalize UI design
   - Implement data fetching from multiple sources
   - Add loading states and error handling
   
4. Document the Babel configuration for future reference:
   - Create documentation on JSX transformation setup
   - Add comments to configuration files
   - Update development guidelines 