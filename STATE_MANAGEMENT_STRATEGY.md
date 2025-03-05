# State Management Strategy

## Overview
This document outlines our approach to state management in the application, defining which parts use Zustand and which parts use Jotai.

## Keep Zustand For
- **Map and visualization system (LOCKED)**
  - Map.tsx and map-core.ts
  - Layer management and clustering
  - Real-time updates and filtering

- **Station management system (LOCKED)**
  - MonitoringStationCard.tsx
  - RainStationCard.tsx
  - WaterLevelInfo.tsx
  - Station selection and filtering logic

- **Authentication and RBAC system**
  - authStore.ts
  - ProtectedRoute.tsx
  - Login.tsx and ChangePassword.tsx
  - JWT token management and RBAC

- **Filter panel and data filtering (LOCKED)**
  - FilterPanel.tsx
  - MainPage.tsx
  - Complex multi-select filtering
  - Hierarchical category filtering

- **Approval workflow system**
  - ApprovalDashboard.tsx
  - ApprovalStep.tsx
  - Multi-step workflow with state persistence

- **Store hydration system**
  - storeHydration.ts
  - Persistence management
  - Hydration status tracking

- **Real-time updates system**
  - RealTimeContext.tsx
  - WebSocket or polling-based updates

- **API client and data fetching**
  - api-client.ts
  - rid-telemetry.service.ts
  - Error handling and retry mechanisms

## Consider Jotai For
- **Form state management**
  - ComplaintForm.tsx
  - Form validation and state
  - Field-level updates

- **Inter-page data passing**
  - Data that needs to persist between page navigations
  - Shared state between non-locked components

- **UI state that doesn't interact with LOCKED features**
  - Modal visibility
  - Accordion open/closed state
  - Tab selection

- **New features not dependent on existing Zustand stores**
  - Features built from scratch
  - Self-contained components

## Implementation Strategy
1. **Create clear boundaries between state systems**
   - Document which components use which system
   - Minimize cross-system dependencies

2. **Use adapter patterns where systems need to interact**
   - Create hooks that abstract the state management implementation
   - Provide consistent interfaces regardless of underlying system

3. **Implement feature flags to control which system is active**
   - Allow toggling between implementations for testing
   - Facilitate gradual migration

4. **Focus on type safety improvements independent of state management**
   - Replace `any` types with proper types
   - Create consistent interfaces for data structures

5. **Take incremental approach to migration**
   - Start with non-locked, self-contained features
   - Test thoroughly before expanding scope
   - Document progress and learnings

## Rollback Strategy
If issues arise with Jotai implementation:
1. Identify affected components
2. Restore Zustand implementation
3. Update import statements and hooks
4. Test thoroughly after each change
5. Document what worked and what didn't

## Future Considerations
- Reassess this strategy after 3 months
- Consider full migration if Jotai proves successful in limited scope
- Evaluate performance and developer experience with both systems

## Specific Rollback Steps

### 1. Create a Rollback Branch
```bash
git checkout -b rollback/zustand-for-locked-features
```

### 2. Identify and Revert Jotai Changes in Locked Features
For each locked feature that was migrated to Jotai:
- Check LOCKS.md for the list of locked features
- Look for components that now use Jotai atoms instead of Zustand stores
- Restore the original Zustand implementation

### 3. Update Import Statements
```typescript
// Revert from:
import { useAtom } from 'jotai';
import { someAtom } from '../atoms/someData';

// Back to:
import { useSomeStore } from '../stores/someStore';
```

### 4. Restore Zustand Store Access
```typescript
// Revert from:
const [data, setData] = useAtom(someAtom);

// Back to:
const data = useSomeStore(state => state.data);
const setData = useSomeStore(state => state.setData);
```

### 5. Fix Component Props and Types
If component props were changed to accommodate Jotai, restore them to be compatible with Zustand.

### 6. Restore Store Hydration
Ensure the Zustand store hydration is properly restored in the application initialization.

### 7. Test Each Component After Rollback
After rolling back each component:
- Test its functionality thoroughly
- Verify it interacts correctly with other components
- Check that persistence works as expected

### 8. Create a Hybrid Approach for Non-Locked Features
- Keep Jotai where it's working well (non-locked features)
- Create adapter hooks for interaction between systems
- Document the hybrid approach clearly

### 9. Commit the Rollback Changes
```bash
git add .
git commit -m "Roll back to Zustand for locked features while keeping Jotai for non-locked features"
``` 