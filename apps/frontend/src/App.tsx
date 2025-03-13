import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { 
  RouterProvider, 
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate
} from "react-router-dom";
import Index from "./pages/index";
import ComplaintForm from "./pages/ComplaintForm";
import StationCardEdit from "./pages/StationCardEdit";
import DocumentPreparation from "./pages/DocumentPreparation";
import ApprovalDashboard from "./pages/ApprovalDashboard";
import ApprovalStep from "./pages/ApprovalStep";
import SystemSetting from "./pages/SystemSetting";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useHydrateStore } from "./stores/storeHydration";
import { useEffect, useState, Suspense, useCallback } from "react";
import { JotaiProvider } from "./providers/JotaiProvider";
import { checkApiStatus } from "./utils/api-status";
import { RealTimeProvider } from "./contexts/RealTimeContext";
import { ApiConnectionError } from "./components/ApiConnectionError";
import { toast, useToast } from "@/components/ui/use-toast";
import AuthTest from '@/pages/AuthTest';
import { migrateLocalStorageToJotai } from "./utils/auth-migration";
import ErrorBoundary from "@/components/ErrorBoundary";
import { handleError } from "@/utils/errorHandling";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryClient } from "@tanstack/react-query";
import { useAuth } from "./contexts/AuthContext";

// Create a new query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Create router with data router API
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Redirect root to login */}
      <Route path="/" element={<Login />} />
      
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/auth-test" element={<AuthTest />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/complaint/create" element={
        <ProtectedRoute>
          <ComplaintForm />
        </ProtectedRoute>
      } />
      {/* Add a redirect route for /complaints/create to handle both URL patterns */}
      <Route path="/complaints/create" element={
        <ProtectedRoute>
          <Navigate to="/complaint/create" replace />
        </ProtectedRoute>
      } />
      <Route path="/station-card-edit" element={
        <ProtectedRoute>
          <Suspense fallback={<div>Loading...</div>}>
            <StationCardEdit />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/document-preparation" element={
        <ProtectedRoute>
          <Suspense fallback={<div>Loading...</div>}>
            <DocumentPreparation />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/approval-dashboard" element={
        <ProtectedRoute>
          <ApprovalDashboard />
        </ProtectedRoute>
      } />
      <Route path="/approval-step" element={
        <ProtectedRoute>
          <ApprovalStep />
        </ProtectedRoute>
      } />
      <Route path="/system-setting" element={
        <ProtectedRoute>
          <SystemSetting />
        </ProtectedRoute>
      } />
    </>
  ),
  {
    basename: "/",
  }
);

const App = () => {
  // State to track hydration status
  const [isHydrating, setIsHydrating] = useState(true);
  // State to track API status check
  const [apiStatus, setApiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  // State to track auth initialization
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const { toast } = useToast();
  const isHydrated = useHydrateStore();
  const { checkAuth } = useAuth();

  // Handle global errors
  const handleGlobalError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Global error caught:', error, errorInfo);
    
    // Use centralized error handling
    handleError({
      source: 'unknown',
      operation: 'globalError',
      originalError: error,
      component: 'App',
      details: {
        componentStack: errorInfo.componentStack
      }
    });
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[App] Initializing authentication state');
        // Migrate localStorage auth data to Jotai if needed
        migrateLocalStorageToJotai();
        
        // Check authentication status
        const isValid = await checkAuth();
        console.log('[App] Authentication check result:', isValid);
        
        setIsAuthInitialized(true);
      } catch (error) {
        console.error('[App] Error initializing authentication:', error);
        setIsAuthInitialized(true); // Still mark as initialized to prevent blocking the app
      }
    };
    
    initializeAuth();
  }, [checkAuth]);

  // Hydrate the Zustand store after React is initialized
  useEffect(() => {
    let isMounted = true;
    
    if (isHydrated) {
      const checkConnection = async () => {
        try {
          console.log('[App] Checking API status...');
          const isConnected = await checkApiStatus();
          console.log('[App] API status check result:', isConnected);
          
          if (isMounted) {
            setApiStatus(isConnected ? 'available' : 'unavailable');
            setIsHydrating(false);
            
            if (!isConnected) {
              console.error('[App] API server is not running');
              
              // Use centralized error handling
              handleError({
                source: 'apiCall',
                operation: 'checkApiStatus',
                originalError: new Error('API server is not running'),
                component: 'App'
              });
              
              // Show toast notification
              toast({
                title: "API เซิร์ฟเวอร์ไม่พร้อมใช้งาน",
                description: "ไม่สามารถเชื่อมต่อกับ API เซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า API เซิร์ฟเวอร์กำลังทำงานอยู่",
                variant: "destructive",
                duration: 10000, // Show for 10 seconds
              });
            }
          }
        } catch (error) {
          console.error('[App] Error checking API status:', error);
          if (isMounted) {
            setApiStatus('unavailable');
            setIsHydrating(false);
            
            // Use centralized error handling
            handleError({
              source: 'apiCall',
              operation: 'checkApiStatus',
              originalError: error instanceof Error ? error : new Error(String(error)),
              component: 'App'
            });
            
            // Show toast notification
            toast({
              title: "ไม่สามารถตรวจสอบสถานะ API เซิร์ฟเวอร์",
              description: "เกิดข้อผิดพลาดในการตรวจสอบสถานะ API เซิร์ฟเวอร์ กรุณาตรวจสอบว่า API เซิร์ฟเวอร์กำลังทำงานอยู่",
              variant: "destructive",
              duration: 10000, // Show for 10 seconds
            });
          }
        }
      };
      
      checkConnection();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isHydrated]);

  // Show loading state while hydrating or initializing auth
  if (isHydrating || !isAuthInitialized) {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <div className="flex items-center justify-center min-h-screen bg-[#F0F8FF]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-lg text-[#17254D]">
              กำลังโหลดข้อมูล...
            </p>
            <p className="mt-2 text-sm text-[#475569]">กรุณารอสักครู่...</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show API connection error if API is not connected
  if (apiStatus === 'unavailable') {
    return (
      <ErrorBoundary onError={handleGlobalError}>
        <div className="flex items-center justify-center min-h-screen bg-[#F0F8FF]">
          <div className="w-full max-w-3xl px-4">
            <ApiConnectionError 
              onRetry={async () => {
                setApiStatus('checking');
                try {
                  const isConnected = await checkApiStatus();
                  setApiStatus(isConnected ? 'available' : 'unavailable');
                } catch (error) {
                  setApiStatus('unavailable');
                  
                  // Use centralized error handling
                  handleError({
                    source: 'apiCall',
                    operation: 'retryApiConnection',
                    originalError: error instanceof Error ? error : new Error(String(error)),
                    component: 'App'
                  });
                }
              }}
              message="ไม่สามารถเชื่อมต่อกับ API เซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า API เซิร์ฟเวอร์กำลังทำงานอยู่"
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <JotaiProvider>
        <QueryClientProvider client={queryClient}>
          <RealTimeProvider>
            <TooltipProvider>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600">กำลังโหลด...</p>
                  </div>
                </div>
              }>
                <RouterProvider router={router} />
              </Suspense>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </RealTimeProvider>
        </QueryClientProvider>
      </JotaiProvider>
    </ErrorBoundary>
  );
};

export default App;