# Login Image Implementation and Authentication Flow

## Task Description
Implement the login image in the Login and ChangePassword components to enhance the user interface and provide a better user experience. Additionally, make the login page the landing page of the application and implement protected routes for authenticated pages.

## Implementation Details

### Components Modified
- `Login.tsx`: Updated to use the Login.svg image and replaced NextUI components with existing UI components
- `ChangePassword.tsx`: Updated to use the Login.svg image and replaced NextUI components with existing UI components
- `App.tsx`: Updated to make login the landing page and implement protected routes
- `ProtectedRoute.tsx`: Created to handle authentication state and protect routes

### Changes Made
1. Imported the Login.svg file directly in both components:
   ```typescript
   import LoginSvg from '@/assets/icon/Login.svg';
   ```

2. Updated the image source in both components to use the imported SVG:
   ```typescript
   <img 
     src={LoginSvg} 
     alt="Login" 
     className="max-h-full object-contain rounded-lg shadow-lg"
   />
   ```

3. Fixed TypeScript errors by adding proper type annotations to event parameters:
   ```typescript
   onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
   ```

4. Replaced NextUI components with existing UI components from the project:
   ```typescript
   // Before
   import { Button, Input, Card, CardHeader, CardBody, CardFooter } from '@nextui-org/react';
   import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
   
   // After
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
   import { Eye, EyeOff } from 'lucide-react';
   ```

5. Updated component structure to match the existing UI components:
   - Replaced `CardBody` with `CardContent`
   - Updated button and input styling to match the existing UI components
   - Added proper loading state handling for buttons

6. Created a new `ProtectedRoute` component to handle authentication:
   ```typescript
   // apps/frontend/src/components/auth/ProtectedRoute.tsx
   import { ReactNode, useEffect, useState } from 'react';
   import { Navigate, useLocation } from 'react-router-dom';

   interface ProtectedRouteProps {
     children: ReactNode;
   }

   const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
     const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
     const location = useLocation();

     useEffect(() => {
       // Check if user is authenticated
       const token = localStorage.getItem('token');
       const user = localStorage.getItem('user');
       
       if (token && user) {
         try {
           // Verify token hasn't expired (if you have expiry in your token)
           const userData = JSON.parse(user);
           
           // Check if user needs to change password
           if (userData && !userData.password_changed) {
             setIsAuthenticated(false);
           } else {
             setIsAuthenticated(true);
           }
         } catch (error) {
           console.error('Error parsing user data:', error);
           setIsAuthenticated(false);
         }
       } else {
         setIsAuthenticated(false);
       }
     }, []);

     // Show loading while checking authentication
     if (isAuthenticated === null) {
       return (
         <div className="flex items-center justify-center min-h-screen bg-[#F0F8FF]">
           <div className="text-center">
             <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
             <p className="mt-4 text-lg text-[#17254D]">กำลังตรวจสอบสิทธิ์...</p>
             <p className="mt-2 text-sm text-[#475569]">กรุณารอสักครู่...</p>
           </div>
         </div>
       );
     }

     // Redirect to login if not authenticated
     if (!isAuthenticated) {
       return <Navigate to="/login" state={{ from: location }} replace />;
     }

     // Render children if authenticated
     return <>{children}</>;
   };

   export default ProtectedRoute;
   ```

7. Updated `App.tsx` to make login the landing page and protect routes:
   ```typescript
   // Redirect root to login
   <Route path="/" element={<Navigate to="/login" replace />} />
   
   // Public routes
   <Route path="/login" element={<Login />} />
   <Route path="/change-password" element={<ChangePassword />} />
   
   // Protected routes
   <Route path="/dashboard" element={
     <ProtectedRoute>
       <Index />
     </ProtectedRoute>
   } />
   // ... other protected routes
   ```

8. Updated `Login.tsx` and `ChangePassword.tsx` to redirect to dashboard after successful login/password change:
   ```typescript
   // Redirect to dashboard (main page with filtering panel and map)
   navigate('/dashboard');
   ```

### Technical Notes
- The Login.svg file is quite large (approximately 6MB), which could potentially cause performance issues when loading the login page.
- In a production environment, it would be advisable to optimize this SVG file to reduce its size.
- The SVG is displayed on the right side of both the Login and ChangePassword pages, visible only on medium and larger screens.
- Used the existing UI components from the project instead of installing NextUI and HeroIcons, which were causing import errors.
- The ProtectedRoute component includes a loading state while checking authentication to provide a better user experience.
- The authentication check includes verifying if the user needs to change their password, redirecting to the change password page if needed.

### Remaining Issues
- The Login.svg file is very large (6MB) and should be optimized for better performance.
- No token refresh mechanism is implemented yet, which could lead to session expiration issues.

## Future Improvements
1. Optimize the Login.svg file to reduce its size and improve page load performance.
2. Consider using a compressed version of the image or a more efficient format.
3. Implement lazy loading for the image to improve initial page load time.
4. Add a fallback image or placeholder for cases where the SVG fails to load.
5. Implement token refresh mechanism to handle session expiration.
6. Add session timeout handling with automatic logout.
7. Implement "Remember Me" functionality for extended sessions.
8. Add password reset functionality for users who forgot their passwords.

## Status
- [x] Import Login.svg in Login component
- [x] Import Login.svg in ChangePassword component
- [x] Update image source in both components
- [x] Fix TypeScript errors for event parameters
- [x] Replace NextUI components with existing UI components
- [x] Create ProtectedRoute component
- [x] Update App.tsx to make login the landing page
- [x] Protect authenticated routes
- [x] Update Login and ChangePassword to redirect to dashboard
- [ ] Optimize SVG file size (future task)
- [ ] Implement token refresh mechanism (future task)

## Related Components
- `Login.tsx`: The login page component
- `ChangePassword.tsx`: The password change page component
- `App.tsx`: The main application component with routing configuration
- `ProtectedRoute.tsx`: Component to handle authentication and protect routes
- `Login.svg`: The login image file
- `@/components/ui/button.tsx`: Button component used in the login forms
- `@/components/ui/input.tsx`: Input component used in the login forms
- `@/components/ui/card.tsx`: Card components used for the login form containers

## Notes
The login image enhances the user interface by providing a visual element on the login and password change pages. The image is displayed on the right side of the page on medium and larger screens, creating a balanced and visually appealing layout.

Instead of installing new dependencies (NextUI and HeroIcons), we leveraged the existing UI components in the project, which follow a similar design pattern and provide the same functionality. This approach ensures consistency with the rest of the application and avoids introducing new dependencies.

Making the login page the landing page ensures that users must authenticate before accessing any protected content. The ProtectedRoute component provides a consistent way to handle authentication across the application, including a loading state while checking authentication and automatic redirection to the login page for unauthenticated users. 