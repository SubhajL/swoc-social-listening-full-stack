import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  RouterProvider, 
  createBrowserRouter,
  createRoutesFromElements,
  Route
} from "react-router-dom";
import Index from "./pages/index";
import ComplaintForm from "./pages/ComplaintForm";
import StationCardEdit from "./pages/StationCardEdit";
import DocumentPreparation from "./pages/DocumentPreparation";
import ApprovalDashboard from "./pages/ApprovalDashboard";
import ApprovalStep from "./pages/ApprovalStep";
import SystemSetting from "./pages/SystemSetting";
import { useHydrateStore } from "./stores/storeHydration";
import { useEffect, useState } from "react";
import { JotaiProvider } from "./providers/JotaiProvider";

const queryClient = new QueryClient();

// Create router with data router API
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Index />} />
      <Route path="/complaint/create" element={<ComplaintForm />} />
      <Route path="/station-card-edit" element={<StationCardEdit />} />
      <Route path="/document-preparation" element={<DocumentPreparation />} />
      <Route path="/approval-dashboard" element={<ApprovalDashboard />} />
      <Route path="/approval-step" element={<ApprovalStep />} />
      <Route path="/system-setting" element={<SystemSetting />} />
    </>
  ),
  {
    basename: "/",
  }
);

const App = () => {
  // State to track hydration status
  const [isHydrating, setIsHydrating] = useState(true);
  
  // Hydrate the Zustand store after React is initialized
  const isHydrated = useHydrateStore();
  
  // Set hydration status once complete
  useEffect(() => {
    if (isHydrated) {
      console.log('[App] Store hydration complete, rendering app');
      
      // Add a small delay to ensure all hydration effects are complete
      setTimeout(() => {
        setIsHydrating(false);
      }, 100);
    }
  }, [isHydrated]);
  
  // Show loading state while hydrating
  if (isHydrating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F8FF]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg text-[#17254D]">กำลังโหลดข้อมูล...</p>
          <p className="mt-2 text-sm text-[#475569]">กรุณารอสักครู่...</p>
        </div>
      </div>
    );
  }

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="relative">
            <RouterProvider router={router} />
            <Toaster />
            <Sonner />
            <div id="radix-hover-card-portal" className="fixed top-0 left-0 z-[9999]" />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
};

export default App;