import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import LoginSvg from '@/assets/icon/Login.svg';
import { useAuth } from '@/hooks/useAuth';
import { checkAuthAtom, loginAtom } from '@/atoms/authState';
import { useAtom } from 'jotai';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [, checkAuth] = useAtom(checkAuthAtom);
  const [, loginWithJotai] = useAtom(loginAtom);
  const location = useLocation();
  const from = location.state?.from || '/main';
  const restoreSession = location.state?.restoreSession || false;
  
  // Add debugging log on component mount
  useEffect(() => {
    console.log('🔍 [Login] Component mounted', {
      redirectFrom: location.state?.from,
      restoreSession: location.state?.restoreSession,
      localStorageToken: !!localStorage.getItem('token'),
      localStorageUser: !!localStorage.getItem('user'),
    });
    
    // Check if we need to restore session
    if (restoreSession) {
      console.log('🔍 [Login] Restore session flag detected, attempting to restore session');
      setIsRestoringSession(true);
      
      // Try to restore session from localStorage
      const existingToken = localStorage.getItem('token');
      const userJson = localStorage.getItem('user');
      
      if (existingToken && userJson) {
        try {
          const userData = JSON.parse(userJson);
          
          // Create user object for Jotai
          const user = {
            id: String(userData.id),
            name: userData.name || '',
            email: userData.email || '',
            rbacRole: userData.position || 1,
            organizationId: userData.office_id || '',
            organizationName: userData.office_name || ''
          };
          
          // Update Jotai state directly
          loginWithJotai({ user, token: existingToken });
          
          console.log('✅ [Login] Session restored from localStorage, redirecting to:', from);
          
          // Small delay to ensure state is updated
          setTimeout(() => {
            navigate(from, { replace: true });
            setIsRestoringSession(false);
          }, 100);
          
          return;
        } catch (error) {
          console.error('❌ [Login] Error restoring session:', error);
          setIsRestoringSession(false);
        }
      } else {
        console.log('❌ [Login] Cannot restore session, missing token or user data');
        setIsRestoringSession(false);
      }
    }
    
    // If user is already authenticated, redirect to the target page
    if (isAuthenticated) {
      console.log('✅ [Login] User is already authenticated, redirecting to:', from);
      navigate(from, { replace: true });
      return;
    }
    
    // Check for existing token in localStorage
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      console.log('🔍 [Login] Found existing token in localStorage');
      
      try {
        // Verify token format (simple check)
        const tokenParts = existingToken.split('.');
        if (tokenParts.length !== 3) {
          console.warn('⚠️ [Login] Token format is invalid, clearing token');
          localStorage.removeItem('token');
        } else {
          console.log('🔍 [Login] Token format appears valid');
          
          // Check if token is expired
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            const now = Date.now();
            
            console.log('🔍 [Login] Token expiry check:', {
              expiryTime: new Date(expiry).toISOString(),
              currentTime: new Date(now).toISOString(),
              isExpired: now > expiry,
              timeRemaining: Math.floor((expiry - now) / 1000 / 60) + ' minutes',
            });
            
            if (now > expiry) {
              console.warn('⚠️ [Login] Token is expired, clearing token');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              // Check auth will handle logout if needed
              checkAuth();
            } else {
              // Token is valid, try to restore session
              const userJson = localStorage.getItem('user');
              if (userJson) {
                try {
                  const userData = JSON.parse(userJson);
                  
                  // Create user object for Jotai
                  const user = {
                    id: String(userData.id),
                    name: userData.name || '',
                    email: userData.email || '',
                    rbacRole: userData.position || 1,
                    organizationId: userData.office_id || '',
                    organizationName: userData.office_name || ''
                  };
                  
                  // Update Jotai state directly
                  loginWithJotai({ user, token: existingToken });
                  
                  console.log('✅ [Login] Session restored from localStorage, redirecting to:', from);
                  
                  // Small delay to ensure state is updated
                  setTimeout(() => {
                    navigate(from, { replace: true });
                  }, 100);
                } catch (error) {
                  console.error('❌ [Login] Error restoring session from localStorage:', error);
                }
              }
            }
          } catch (error) {
            console.error('❌ [Login] Error parsing token payload:', error);
          }
        }
      } catch (error) {
        console.error('❌ [Login] Error checking token:', error);
      }
    } else {
      console.log('🔍 [Login] No existing token found in localStorage');
    }
  }, [location.state, checkAuth, isAuthenticated, navigate, from, restoreSession, loginWithJotai]);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email and password
    if (!email) {
      toast.error('กรุณากรอกอีเมล');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    
    if (!password) {
      toast.error('กรุณากรอกรหัสผ่าน');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔍 [Login] Attempting login with:', { email, passwordLength: password.length });
      
      // API call for authentication using our API client
      const response = await apiClient.login(email, password);
      
      console.log('✅ [Login] Login response received:', {
        hasToken: !!response?.token,
        hasUser: !!response?.user,
        userDetails: response?.user ? {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          position: response.user.position,
          office_id: response.user.office_id,
          password_changed: response.user.password_changed,
        } : null
      });
      
      // Check if response has the expected structure
      if (response && response.token) {
        if (response.user) {
          // Create user object for auth store
          const user = {
            id: String(response.user.id),
            name: response.user.name,
            email: response.user.email,
            rbacRole: response.user.position || 1, // Default to role 1 if not provided
            organizationId: response.user.office_id || '',
            organizationName: response.user.office_name || ''
          };
          
          // Update auth state using Jotai
          console.log('✅ [Login] Updating auth state with user and token');
          login({ user, token: response.token });
          
          // Check if password needs to be changed
          if (response.user?.password_changed === false) {
            console.log('🔍 [Login] First login detected, redirecting to password change');
            // Redirect to password change page
            navigate('/change-password', { state: { firstLogin: true } });
            return;
          }
          
          // Redirect to dashboard or original destination
          console.log('✅ [Login] Login successful, redirecting to:', from);
          navigate(from);
          toast.success('เข้าสู่ระบบสำเร็จ');
        } else {
          console.warn('⚠️ [Login] Response has token but no user data');
          toast.error('เข้าสู่ระบบไม่สำเร็จ: ไม่พบข้อมูลผู้ใช้');
        }
      } else {
        console.error('❌ [Login] Invalid response structure:', response);
        toast.error(response?.message || 'เข้าสู่ระบบไม่สำเร็จ: ข้อมูลตอบกลับไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('❌ [Login] Login error:', error);
      
      // Type guard for error handling
      const errorObj: Record<string, any> = error as Record<string, any>;
      
      console.error('❌ [Login] Error details:', {
        message: errorObj?.message,
        response: errorObj?.response?.data,
        status: errorObj?.response?.status,
        headers: errorObj?.response?.headers,
        config: errorObj?.config
      });
      
      // Safe access with type guard
      const errorMessage = 
        errorObj?.response?.data?.message || 
        errorObj?.message || 
        'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // If we're restoring the session, show a loading indicator
  if (isRestoringSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังเข้าสู่ระบบอัตโนมัติ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-start gap-2">
            <h1 className="text-2xl font-bold text-blue-900">เข้าสู่ระบบ</h1>
            <p className="text-gray-600">กรุณาเข้าสู่ระบบด้วยบัญชีผู้ใช้งานของคุณ</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="กรอกอีเมลของคุณ"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านของคุณ"
                    type={isVisible ? "text" : "password"}
                    className="w-full pr-10"
                  />
                  <button
                    className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
                    type="button"
                    onClick={toggleVisibility}
                  >
                    {isVisible ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center justify-center gap-2 mt-4 ${
                  isLoading 
                    ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed" 
                    : "bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white"
                } px-6 py-3 rounded-xl transition-colors duration-200`}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center text-sm text-gray-600">
            <p>หากคุณมีปัญหาในการเข้าสู่ระบบ กรุณาติดต่อผู้ดูแลระบบ</p>
          </CardFooter>
        </Card>
      </div>
      
      {/* Right side - Image */}
      <div className="hidden md:block md:w-1/2 bg-blue-100">
        <div className="h-full flex items-center justify-center p-8">
          <img 
            src={LoginSvg} 
            alt="Login" 
            className="max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default Login; 