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
import { useHydrateStore } from "./stores/storeHydration";

const queryClient = new QueryClient();

// Create router with data router API
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Index />} />
      <Route path="/complaint/create" element={<ComplaintForm />} />
      <Route path="/station-card-edit" element={<StationCardEdit />} />
    </>
  ),
  {
    basename: "/",
  }
);

const App = () => {
  // Hydrate the Zustand store after React is initialized
  useHydrateStore();

  return (
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
  );
};

export default App;