import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}