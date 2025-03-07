import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useHydrateStore } from "./stores/storeHydration";
import { useEffect, useState, Suspense } from "react";
import { JotaiProvider } from "./providers/JotaiProvider";
import { checkApiStatus } from "./utils/api-status";
import { RealTimeProvider } from "./contexts/RealTimeContext";
import { ApiConnectionError } from "./components/ApiConnectionError";
import { toast } from "@/components/ui/use-toast";
import AuthTest from '@/pages/AuthTest';

// Create a new query client with optimized configuration
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
      <Route path="/" element={<Navigate to="/login" replace />} />
      
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
      <Route path="/station-card-edit" element={
        <ProtectedRoute>
          <StationCardEdit />
        </ProtectedRoute>
      } />
      <Route path="/document-preparation" element={
        <ProtectedRoute>
          <DocumentPreparation />
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

// Check API connection on app start
const checkApiConnection = async () => {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error(`API health check failed: ${response.status}`);
    }
    console.log('✅ API connection successful');
  } catch (error) {
    console.error('❌ API connection failed:', error);
    toast({
      title: "API Connection Error",
      description: "Could not connect to the API. Please check your connection.",
    });
  }
};

// Call API check on app start
checkApiConnection();

const App = () => {
  // State to track hydration status
  const [isHydrating, setIsHydrating] = useState(true);
  // State to track API status check
  const [isCheckingApi, setIsCheckingApi] = useState(true);
  // State to track API connection status
  const [isApiConnected, setIsApiConnected] = useState(true);
  
  // Hydrate the Zustand store after React is initialized
  const isHydrated = useHydrateStore();
  
  // Check API status on startup - only once
  useEffect(() => {
    let isMounted = true;
    
    const checkApi = async () => {
      try {
        console.log('[App] Checking API status on startup');
        const isConnected = await checkApiStatus();
        
        if (isMounted) {
          setIsApiConnected(isConnected);
          setIsCheckingApi(false);
          
          if (!isConnected) {
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
          setIsApiConnected(false);
          setIsCheckingApi(false);
          
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
    
    checkApi();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Set hydration status once complete
  useEffect(() => {
    if (isHydrated) {
      console.log('[App] Store hydration complete, rendering app');
      
      // Add a small delay to ensure all hydration effects are complete
      const timer = setTimeout(() => {
        setIsHydrating(false);
      }, 100);
      
      // Cleanup timer if component unmounts
      return () => clearTimeout(timer);
    }
  }, [isHydrated]);
  
  // Show loading state while hydrating or checking API
  if (isHydrating || isCheckingApi) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F8FF]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg text-[#17254D]">
            {isHydrating ? 'กำลังโหลดข้อมูล...' : 'กำลังตรวจสอบการเชื่อมต่อ...'}
          </p>
          <p className="mt-2 text-sm text-[#475569]">กรุณารอสักครู่...</p>
        </div>
      </div>
    );
  }
  
  // Show API connection error if API is not connected
  if (!isApiConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F8FF]">
        <div className="w-full max-w-3xl px-4">
          <ApiConnectionError 
            onRetry={async () => {
              setIsCheckingApi(true);
              try {
                const isConnected = await checkApiStatus();
                setIsApiConnected(isConnected);
              } catch (error) {
                setIsApiConnected(false);
              } finally {
                setIsCheckingApi(false);
              }
            }}
            message="ไม่สามารถเชื่อมต่อกับ API เซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า API เซิร์ฟเวอร์กำลังทำงานอยู่"
          />
        </div>
      </div>
    );
  }

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <RealTimeProvider>
          <TooltipProvider>
            <div className="relative">
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen bg-[#F0F8FF]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-600">กำลังโหลด...</p>
                  </div>
                </div>
              }>
                <RouterProvider router={router} />
              </Suspense>
              <Toaster />
              <Sonner />
              <div id="radix-hover-card-portal" className="fixed top-0 left-0 z-[9999]" />
            </div>
          </TooltipProvider>
        </RealTimeProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
};

export default App;