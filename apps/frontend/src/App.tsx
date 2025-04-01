import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  RouterProvider, 
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useRouteError,
  isRouteErrorResponse
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
import { checkApiStatus } from '@/lib/api-status';
import { RealTimeProvider } from "./contexts/RealTimeContext";
import { ApiConnectionError } from "./components/ApiConnectionError";
import { toast, useToast } from "@/components/ui/use-toast";
import AuthTest from '@/pages/AuthTest';
import { migrateLocalStorageToJotai } from "./utils/auth-migration";
import { ErrorBoundary } from "@/components/error-boundary";
import { handleError } from "@/utils/errorHandling";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./hooks/useAuth";
import JotaiProvider from './providers/JotaiProvider';
import Dashboard from './pages/Dashboard';
import { MainPage } from './pages/MainPage';

// Create query client with configuration for better performance and reduced re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent re-fetching on window focus by default unless specifically enabled
      refetchOnWindowFocus: false,
      // Keep data valid for 5 minutes by default to reduce unnecessary fetches
      staleTime: 1000 * 60 * 5,
      // Keep data in cache for 10 minutes after becoming unused (replaces cacheTime)
      gcTime: 1000 * 60 * 10,
      // Don't retry by default - let individual queries configure this as needed
      retry: false,
      // Keep showing previous data while fetching for better UX
      placeholderData: (previousData: unknown) => previousData,
      // Only fetch when explicitly called, not automatically when focused or mounted
      refetchOnMount: false,
      // Always attempt to fetch data even if offline for reliable behavior
      networkMode: 'always',
    },
  },
});

// Custom error element
function RootErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  
  let errorMessage = "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  let errorTitle = "เกิดข้อผิดพลาด";
  
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      errorTitle = "ไม่พบหน้าที่ต้องการ";
      errorMessage = `ไม่พบหน้าที่ต้องการ: ${error.data}`;
    } else {
      errorMessage = error.data || error.statusText;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center">
          <AlertTriangle className="text-red-500 w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-center">{errorTitle}</h1>
          <p className="text-gray-600 mb-6 text-center">{errorMessage}</p>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
            >
              กลับไปหน้าก่อนหน้า
            </Button>
            <Button 
              onClick={() => navigate('/')}
            >
              กลับไปหน้าหลัก
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create a component to handle auth redirects
const AuthRedirect = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/main');
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return null;
};

// Create router
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<RootErrorBoundary />}>
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/auth-test" element={<AuthTest />} />
      
      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route path="/main" element={<MainPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/complaint-form" element={<ComplaintForm />} />
        <Route path="/complaint/create" element={<ComplaintForm />} />
        <Route path="/station-card-edit" element={<StationCardEdit />} />
        <Route path="/document-preparation" element={<DocumentPreparation />} />
        <Route path="/approval-dashboard" element={<ApprovalDashboard />} />
        <Route path="/approval-step" element={<ApprovalStep />} />
        <Route path="/system-setting" element={<SystemSetting />} />
      </Route>
    </Route>
  )
);

export const App = () => {
  // Call the hook directly at the top level of the component
  const isStoreHydrated = useHydrateStore();
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(true);
  const { toast } = useToast();

  // Check API connection
  useEffect(() => {
    const checkConnection = async () => {
      setIsCheckingApi(true);
      try {
        const status = await checkApiStatus(true);
        setIsApiConnected(status);
        
        // Show toast for reconnection
        if (status && !isApiConnected) {
          toast({
            title: "เชื่อมต่อ API สำเร็จ",
            description: "เชื่อมต่อกับ API เซิร์ฟเวอร์ได้สำเร็จแล้ว",
            variant: "default",
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error checking API status:', error);
        setIsApiConnected(false);
      } finally {
        setIsCheckingApi(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [isApiConnected, toast]);

  if (!isStoreHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isCheckingApi) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <div className="text-sm text-muted-foreground">กำลังตรวจสอบการเชื่อมต่อกับ API...</div>
      </div>
    );
  }

  if (!isApiConnected) {
    return <ApiConnectionError />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <RealTimeProvider>
              <TooltipProvider>
                <RouterProvider router={router} />
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </RealTimeProvider>
          </ThemeProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;