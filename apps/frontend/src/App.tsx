import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/index";
import ComplaintForm from "./pages/ComplaintForm";
import StationCardEdit from "./pages/StationCardEdit";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter 
        basename="/" 
        future={{ 
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <TooltipProvider>
          <div className="relative">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/complaint/create" element={<ComplaintForm />} />
              <Route path="/station-card-edit" element={<StationCardEdit />} />
            </Routes>
            <Toaster />
            <Sonner />
            <div id="radix-hover-card-portal" className="fixed top-0 left-0 z-[9999]" />
          </div>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;