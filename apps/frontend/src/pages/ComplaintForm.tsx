import { Card } from "@/components/ui/card";
import { ComplaintHeader } from "@/components/complaint/ComplaintHeader";
import { WaterLevelInfo } from "@/components/complaint/WaterLevelInfo";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { useComplaint } from "@/hooks/useComplaint";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ComplaintDTO } from "@/dto/complaint.dto";
import { toast } from "sonner";
import { ProcessedPost } from "@/types/processed-post";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, useCallback, useMemo, useRef, useTransition, Suspense } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { useAtom, useSetAtom } from 'jotai';
import { 
  titleAtom, 
  descriptionAtom, 
  locationAtom, 
  coordinatesAtom, 
  processedPostsAtom, 
  selectedPostIdsAtom, 
  isSubmittingAtom, 
  isSubmittedAtom, 
  submissionErrorAtom, 
  currentStepAtom 
} from '@/atoms/complaintData';
import { navigationStateAtom, navigateToStationCardEditAtom, resetNavigationStateAtom } from '@/atoms/navigationState';
import { useComplaintData } from "@/atoms/hooks";
import { useStationData } from "@/atoms/hooks";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { ComplaintInfoCard, WaterLevelInfoCard, WaterManagementPlanCard } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Link } from "react-router-dom";
import { useLocation as useJotaiLocation } from '@/hooks/useLocation';
import { handleError, parseError } from '@/utils/errorHandling';
import { useLocation as useRouterLocation } from 'react-router-dom';

// Create a FormComplaint type that extends Complaint with additional fields needed in the form
// but overrides some fields to match ComplaintDTO schema
interface FormComplaint extends Omit<Complaint, 'id' | 'province'> {
  id: number; // Override to match ComplaintDTO
  issue?: string;
  category?: string;
  reporter?: string;
  date?: string;
  coordinates?: { lat: number; lng: number };
  tumbon?: string[];
  amphure?: string[];
  province?: string[]; // Override to match ComplaintDTO
  location?: string;
}

// Update the ExtendedComplaintData interface to match the FormComplaint type
interface ExtendedComplaintData {
  id: string | number; // Allow both string and number to handle different sources
  content: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  type?: string;
  province?: string | string[]; // Allow both string and array to handle different sources
  postId?: string;
  link?: string;
  // Additional fields used in the form
  issue?: string;
  category?: string;
  reporter?: string;
  date?: string;
  coordinates?: { lat: number; lng: number };
  tumbon?: string[];
  amphure?: string[];
  location?: string;
}

// Add type guards to check data types
function isExtendedComplaintData(data: any): data is ExtendedComplaintData {
  return data && 
    (typeof data.id === 'string' || typeof data.id === 'number') && 
    typeof data.content === 'string' && 
    typeof data.createdAt === 'string' && 
    typeof data.updatedAt === 'string' && 
    typeof data.status === 'string';
}

function isComplaint(data: any): data is Complaint {
  return data && 
    typeof data.id === 'string' && 
    typeof data.content === 'string' && 
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string' &&
    typeof data.status === 'string';
}

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return data && typeof data === 'object' && 
    ('processed_post_id' in data && 'text' in data && 'category_name' in data && 'profile_name' in data);
};

// Simplified conversion logic with proper type handling
const convertToComplaintFormat = (data: any): FormComplaint => {
  // Handle ProcessedPost from API
  if ('processed_post_id' in data) {
    return {
      id: typeof data.processed_post_id === 'string' ? parseInt(data.processed_post_id, 10) : data.processed_post_id,
      issue: data.text || '',
      category: data.category_name || '',
      province: Array.isArray(data.province) ? data.province : (data.province ? [data.province] : []),
      amphure: Array.isArray(data.amphure) ? data.amphure : (data.amphure ? [data.amphure] : []),
      content: data.text || '',
      createdAt: data.post_date ? (typeof data.post_date === 'string' ? data.post_date : data.post_date.toISOString()) : '',
      updatedAt: data.created_at || '',
      status: data.status || 'new'
    };
  }
  
  // Handle Complaint type
  return {
    id: typeof data.id === 'string' ? parseInt(data.id, 10) : (data.id || 0),
    issue: data.content || '',
    category: data.type || '',
    province: Array.isArray(data.province) ? data.province : (data.province ? [data.province] : []),
    amphure: data.amphure || [],
    content: data.content || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    status: data.status || 'new'
  };
};

// Helper function to safely check if a string is empty
const isNonEmptyString = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  return value.trim() !== '';
};

const ComplaintForm = () => {
  const location = useRouterLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get('postId');
  const complaintDataFromLocation = location.state as ProcessedPost | undefined;
  const { isLoading, complaint } = useComplaint(postId ? Number(postId) : undefined);
  
  // Add isPending state for transitions
  const [isPending, startTransition] = useTransition();
  
  // Get complaint data from Jotai store
  const {
    title, 
    description, 
    updateTitle,
    updateDescription,
    updateLocation,
    updateCoordinates,
    updateProcessedPosts,
    togglePostSelection,
    processedPosts,
    selectedPostIds
  } = useComplaintData();
  
  // Get station data from Jotai
  const stationData = useStationData();
  
  // Get location data from Jotai
  const locationState = useJotaiLocation();
  const { amphure, province } = locationState;
  
  // Destructure the synchronization functions
  const { 
    syncMonitoringStations, 
    syncRainStations, 
    syncReservoirs,
    updateLocation: updateStationLocation,
    currentAmphure,
    currentProvince,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs
  } = stationData;
  
  // Reference to track if we've already initialized the data
  const initializedRef = useRef(false);
  
  // Initialize with default location data if none exists
  useEffect(() => {
    if (!initializedRef.current) {
      // Check if we need to set default location data
      if (!amphure || !province) {
        console.log('[ComplaintForm] Setting default location data for station fetching');
        // Default to Chiang Mai province
        locationState.updateLocationData('แม่แตง', 'เชียงใหม่');
        
        // Also update the location in the complaint data
        updateLocation('แม่แตง, เชียงใหม่');
        
        // Set coordinates for Chiang Mai
        updateCoordinates({
          lat: 18.7883,
          lng: 98.9853
        });
        
        // Also update coordinates in location state
        if (locationState.setCoordinates) {
          locationState.setCoordinates({
            lat: 18.7883,
            lng: 98.9853
          });
        }
      }
      
      initializedRef.current = true;
    }
  }, [amphure, province, updateLocation, updateCoordinates]);
  
  // State to track if we're returning from StationCardEdit
  const [returnedFromStationEdit, setReturnedFromStationEdit] = useState(false);
  
  // State for preserving data when returning from StationCardEdit
  const [preservedData, setPreservedData] = useState<any>(null);
  
  // Ref to track if initial state restoration has been done
  const initialStateRestored = useRef(false);
  // Ref to track if API call has been made
  const apiCallMade = useRef(false);
  
  // Initialize processed posts from Jotai store
  useEffect(() => {
    // Skip if we've already made the API call
    if (apiCallMade.current) {
      return;
    }
    
    // Check if we already have processed posts in the store
    if (processedPosts.length === 0) {
      // If no posts in store, fetch from API
      console.log('[ComplaintForm] No processed posts in store, fetching from API');
      
      // In a real implementation, this would be an API call
      // For now, we'll just set an empty array
      updateProcessedPosts([]);
      
      // Mark that we've made the API call
      apiCallMade.current = true;
    } else {
      console.log('[ComplaintForm] Using existing processed posts from store:', processedPosts.length);
    }
  }, [processedPosts.length]); // Only depend on the length, not the array itself
  
  // Extract location data from various sources
  useEffect(() => {
    // Skip if we've already restored state
    if (initialStateRestored.current) {
      console.log('[ComplaintForm] Initial state already restored, skipping');
      return;
    }
    
    // Extract location data from various sources
    let firstAmphure: string | undefined;
    let firstProvince: string | undefined;
    
    // Check if we have preserved data from returning from StationCardEdit
    if (preservedData) {
      console.log('[ComplaintForm] Using preserved data for location extraction');
      
      if ('amphure' in preservedData && Array.isArray(preservedData.amphure) && preservedData.amphure.length > 0) {
        firstAmphure = preservedData.amphure[0];
      } else if ('amphure' in preservedData && typeof preservedData.amphure === 'string') {
        firstAmphure = preservedData.amphure;
      }
      
      if ('province' in preservedData && Array.isArray(preservedData.province) && preservedData.province.length > 0) {
        firstProvince = preservedData.province[0];
      } else if ('province' in preservedData && typeof preservedData.province === 'string') {
        firstProvince = preservedData.province;
      }
    }
    // Check if we have complaint data from API
    else if (complaint) {
      console.log('[ComplaintForm] Using complaint data for location extraction');
      
      if ('amphure' in complaint && Array.isArray(complaint.amphure) && complaint.amphure.length > 0) {
        firstAmphure = complaint.amphure[0];
      } else if ('amphure' in complaint && typeof complaint.amphure === 'string') {
        firstAmphure = complaint.amphure;
      }
      
      if ('province' in complaint && Array.isArray(complaint.province) && complaint.province.length > 0) {
        firstProvince = complaint.province[0];
      } else if ('province' in complaint && typeof complaint.province === 'string') {
        firstProvince = complaint.province;
      }
    }
    // Check if we have location data from URL params
    else if (complaintDataFromLocation) {
      console.log('[ComplaintForm] Using location data from URL params');
      
      if ('amphure' in complaintDataFromLocation && Array.isArray(complaintDataFromLocation.amphure) && complaintDataFromLocation.amphure.length > 0) {
        firstAmphure = complaintDataFromLocation.amphure[0];
      } else if ('amphure' in complaintDataFromLocation && typeof complaintDataFromLocation.amphure === 'string') {
        firstAmphure = complaintDataFromLocation.amphure;
      }
      
      if ('province' in complaintDataFromLocation && Array.isArray(complaintDataFromLocation.province) && complaintDataFromLocation.province.length > 0) {
        firstProvince = complaintDataFromLocation.province[0];
      } else if ('province' in complaintDataFromLocation && typeof complaintDataFromLocation.province === 'string') {
        firstProvince = complaintDataFromLocation.province;
      }
    }
    
    console.log('[ComplaintForm] Extracted location from complaint data:', { 
      amphure: firstAmphure, 
      province: firstProvince
    });
    
    // Update the Jotai location state with the extracted location
    if (firstAmphure || firstProvince) {
      console.log('[ComplaintForm] Updating location state with extracted data:', {
        amphure: firstAmphure,
        province: firstProvince
      });
      
      locationState.updateLocationData(firstAmphure, firstProvince);
      
      // Also update the station location
      if (stationData.updateLocation) {
        stationData.updateLocation(firstAmphure, firstProvince);
      }
    }
    
    // Mark that we've restored the initial state
    initialStateRestored.current = true;
  }, [complaint, complaintDataFromLocation, stationData, locationState]);
  
  // Ref to track if station data has been synced
  const stationDataSyncedRef = useRef(false);
  
  // Ref to track the last processed edit session timestamp
  const lastProcessedEditSessionRef = useRef(0);
  
  // Get navigation state from Jotai
  const [navigationState, setNavigationState] = useAtom(navigationStateAtom);
  const navigateToStationCardEdit = useSetAtom(navigateToStationCardEditAtom);
  const resetNavigationState = useSetAtom(resetNavigationStateAtom);
  
  // Add a useEffect to handle returning from StationCardEdit
  useEffect(() => {
    console.log('[ComplaintForm] Checking navigation state:', navigationState);
    
    // Check if we're returning from StationCardEdit with saved changes
    if (navigationState.returnedFromStationEdit && !navigationState.discardedChanges) {
      console.log('[ComplaintForm] Returned from StationCardEdit with saved changes');
      
      // Synchronize station data
      syncMonitoringStations();
      syncRainStations();
      syncReservoirs();
      
      // Reset navigation state after handling
      resetNavigationState();
    }
    
    // Check if we're returning from StationCardEdit with discarded changes
    if (navigationState.discardedChanges) {
      console.log('[ComplaintForm] Returned from StationCardEdit with discarded changes');
      
      // No need to synchronize, just reset navigation state
      resetNavigationState();
    }
  }, [
    navigationState,
    syncMonitoringStations,
    syncRainStations,
    syncReservoirs,
    resetNavigationState
  ]);

  // Add a function to refresh station data
  const refreshStationData = useCallback(async () => {
    console.log('[ComplaintForm] Refreshing station data');
    
    // Track loading state
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    try {
      setIsRefreshing(true);
      
      // Log the current state
      console.log('[ComplaintForm] Current state before refresh:', {
        monitoringStations: stationData.monitoringStations.length,
        rainStations: stationData.rainStations.length,
        reservoirs: stationData.reservoirs.length,
        userSelectedMonitoringStations: stationData.userSelectedMonitoringStations.length,
        userSelectedRainStations: stationData.userSelectedRainStations.length,
        userSelectedReservoirs: stationData.userSelectedReservoirs.length,
        disabledMonitoringStations: Object.keys(stationData.disabledMonitoringStations).length,
        disabledRainStations: Object.keys(stationData.disabledRainStations).length,
        disabledReservoirs: Object.keys(stationData.disabledReservoirs).length
      });
      
      // Create a timeout promise to detect slow API responses
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Station data refresh timed out')), 15000);
      });
      
      // Race the sync operations against the timeout
      await Promise.race([
        Promise.all([
          syncMonitoringStations(),
          syncRainStations(),
          syncReservoirs()
        ]),
        timeoutPromise
      ]);
      
      // Log the updated state
      console.log('[ComplaintForm] Updated state after refresh:', {
        monitoringStations: stationData.monitoringStations.length,
        rainStations: stationData.rainStations.length,
        reservoirs: stationData.reservoirs.length,
        userSelectedMonitoringStations: stationData.userSelectedMonitoringStations.length,
        userSelectedRainStations: stationData.userSelectedRainStations.length,
        userSelectedReservoirs: stationData.userSelectedReservoirs.length,
        disabledMonitoringStations: Object.keys(stationData.disabledMonitoringStations).length,
        disabledRainStations: Object.keys(stationData.disabledRainStations).length,
        disabledReservoirs: Object.keys(stationData.disabledReservoirs).length
      });
      
      // Show a success toast
      toast.success('ข้อมูลสถานีถูกอัปเดตเรียบร้อยแล้ว');
    } catch (error) {
      // Use centralized error handling
      handleError({
        source: 'apiCall',
        operation: 'refreshStationData',
        originalError: parseError(error),
        component: 'ComplaintForm',
        details: {
          monitoringStations: stationData.monitoringStations.length,
          rainStations: stationData.rainStations.length,
          reservoirs: stationData.reservoirs.length
        }
      });
      
      // Attempt recovery - try to use cached data if available
      try {
        console.log('[ComplaintForm] Attempting recovery using cached data');
        // This would use cached data from localStorage or other storage
      } catch (recoveryError) {
        console.error('[ComplaintForm] Recovery attempt failed:', recoveryError);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    stationData.monitoringStations.length,
    stationData.rainStations.length,
    stationData.reservoirs.length,
    stationData.userSelectedMonitoringStations.length,
    stationData.userSelectedRainStations.length,
    stationData.userSelectedReservoirs.length,
    stationData.disabledMonitoringStations,
    stationData.disabledRainStations,
    stationData.disabledReservoirs,
    syncMonitoringStations,
    syncRainStations,
    syncReservoirs,
    toast
  ]);

  // Debug location data
  useEffect(() => {
    const currentData = preservedData || complaint || complaintDataFromLocation;
    console.log('[ComplaintForm] Current complaint data:', currentData);
    
    if (currentData) {
      const locationData = convertToComplaintFormat(currentData);
      console.log('[ComplaintForm] Location data extracted:', {
        amphure: locationData.amphure,
        province: locationData.province,
        tumbon: locationData.tumbon
      });
    }
  }, [preservedData, complaint, complaintDataFromLocation]);

  // Add a useEffect to ensure location data is always set
  useEffect(() => {
    // Check if location data is not set
    if ((!stationData.currentAmphure || !stationData.currentProvince) && stationData.updateLocation) {
      console.log('[ComplaintForm] Setting default location data: แม่แตง, เชียงใหม่', {
        currentAmphure: stationData.currentAmphure,
        currentProvince: stationData.currentProvince,
        timestamp: new Date().toISOString()
      });
      
      // Update the location in the Jotai store with default values
      stationData.updateLocation('แม่แตง', 'เชียงใหม่');
      
      // Clear the flag after a short delay
      setTimeout(() => {
        console.log('[ComplaintForm] Cleared intentional update flag, current location:', {
          currentAmphure: stationData.currentAmphure,
          currentProvince: stationData.currentProvince,
          timestamp: new Date().toISOString()
        });
      }, 100);
    }
  }, [stationData]);

  // Sync station data when returning from StationCardEdit
  useEffect(() => {
    // Check if we're returning from StationCardEdit and haven't synced yet
    // or if the edit session timestamp has changed
    const editSessionTimestamp = location.state?.editSessionTimestamp || 0;
    const shouldSync = 
      location.state?.returnedFromStationEdit && 
      (!stationDataSyncedRef.current || editSessionTimestamp > lastProcessedEditSessionRef.current);
    
    if (shouldSync) {
      console.log('[ComplaintForm] Syncing station data after returning from StationCardEdit');
      console.log('[ComplaintForm] Edit session timestamp:', editSessionTimestamp);
      console.log('[ComplaintForm] Last processed timestamp:', lastProcessedEditSessionRef.current);
      console.log('[ComplaintForm] User-selected stations:', {
        monitoringStations: userSelectedMonitoringStations.length,
        rainStations: userSelectedRainStations.length,
        reservoirs: userSelectedReservoirs.length,
        disabledMonitoringStations: Object.keys(disabledMonitoringStations).length,
        disabledRainStations: Object.keys(disabledRainStations).length,
        disabledReservoirs: Object.keys(disabledReservoirs).length
      });
      
      // Force a refresh of the station data
      if (stationData.updateLocation) {
        console.log('[ComplaintForm] Forcing refresh of station data');
        stationData.updateLocation(amphure, province);
      }
      
      // Mark as synced
      stationDataSyncedRef.current = true;
      lastProcessedEditSessionRef.current = editSessionTimestamp;
    }
  }, [
    location.state,
    amphure,
    province,
    stationData,
    userSelectedMonitoringStations.length,
    userSelectedRainStations.length,
    userSelectedReservoirs.length,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs
  ]);

  const validateComplaintData = () => {
    // Use preserved complaint data if returning from StationCardEdit
    const currentData = preservedData || complaint || complaintDataFromLocation;
    if (!currentData) return false;

    // Skip validation completely when returning from StationCardEdit
    // This prevents the hooks error by ensuring consistent code paths
    if (location.state?.returnedFromStationEdit) {
      console.log('[ComplaintForm] Returning from StationCardEdit, skipping validation');
      return true;
    }

    // Special handling for minimal data from sessionStorage
    if (returnedFromStationEdit && preservedData && !('issue' in preservedData)) {
      console.log('[ComplaintForm] Using minimal data from sessionStorage, skipping validation');
      return true;
    }

    const complaintFormat = convertToComplaintFormat(currentData);
    const result = ComplaintDTO.safeParse(complaintFormat);
    if (!result.success) {
      console.error('Complaint data validation failed:', result.error);
      toast.error('ข้อมูลข้อร้องเรียนไม่ถูกต้อง');
      return false;
    }
    return true;
  };

  // Simplified navigation function
  const navigateDirectly = (path: string, state: any) => {
    console.log(`[ComplaintForm] Navigating directly to ${path}`, state);
    navigate(path, { state });
  };

  // Handle continue button click
  const handleContinue = () => {
    try {
      console.log('[ComplaintForm] Navigating to StationCardEdit using Jotai state');
      
      // Validate required data before navigation
      if (!stationData.currentAmphure || !stationData.currentProvince) {
        console.warn('[ComplaintForm] Missing location data for navigation');
        toast.error('ข้อมูลไม่ครบถ้วน', {
          description: 'กรุณาระบุข้อมูลตำแหน่งที่ตั้ง (อำเภอและจังหวัด) ก่อนดำเนินการต่อ'
        });
        return;
      }
      
      // Update navigation state using Jotai atom
      navigateToStationCardEdit();
      
      // Log the current Jotai state for debugging
      console.log('[ComplaintForm] Current Jotai state for navigation:', {
        navigationState,
        title,
        description,
        location: {
          amphure: stationData.currentAmphure,
          province: stationData.currentProvince
        }
      });

      // Create a timeout to detect navigation issues
      const navigationTimeout = setTimeout(() => {
        console.error('[ComplaintForm] Navigation timeout - navigation may have failed');
        toast.error('การนำทางล้มเหลว', {
          description: 'ไม่สามารถนำทางไปยังหน้าแก้ไขสถานีได้ กรุณาลองใหม่อีกครั้ง'
        });
      }, 3000);

      // Simply navigate to StationCardEdit
      // StationCardEdit will get data from Jotai
      navigate('/station-card-edit');
      
      // Clear the timeout if navigation was successful
      clearTimeout(navigationTimeout);
    } catch (error) {
      // Use centralized error handling
      handleError({
        source: 'navigation',
        operation: 'navigateToStationCardEdit',
        originalError: parseError(error),
        component: 'ComplaintForm',
        details: {
          amphure: stationData.currentAmphure,
          province: stationData.currentProvince
        }
      });
      
      // Attempt recovery - reset navigation state
      try {
        console.log('[ComplaintForm] Attempting to reset navigation state after error');
        resetNavigationState();
      } catch (recoveryError) {
        console.error('[ComplaintForm] Failed to reset navigation state:', recoveryError);
      }
    }
  };

  // Handle prepare document button click
  const handlePrepareDocument = () => {
    try {
      console.log('[ComplaintForm] Navigating to document preparation using Jotai state');
      
      // Validate required data before navigation
      if (!title || !description) {
        console.warn('[ComplaintForm] Missing complaint data for document preparation');
        toast.error('ข้อมูลไม่ครบถ้วน', {
          description: 'กรุณากรอกข้อมูลเรื่องร้องเรียนให้ครบถ้วนก่อนเตรียมเอกสาร'
        });
        return;
      }
      
      // Log the current Jotai state for debugging
      console.log('[ComplaintForm] Current Jotai state for document preparation:', {
        title,
        description,
        location: {
          amphure: stationData.currentAmphure,
          province: stationData.currentProvince
        }
      });

      // Create a timeout to detect navigation issues
      const navigationTimeout = setTimeout(() => {
        console.error('[ComplaintForm] Navigation timeout - navigation may have failed');
        toast.error('การนำทางล้มเหลว', {
          description: 'ไม่สามารถนำทางไปยังหน้าเตรียมเอกสารได้ กรุณาลองใหม่อีกครั้ง'
        });
      }, 3000);

      // Simply navigate to DocumentPreparation
      // DocumentPreparation will get data from Jotai
      navigate('/document-preparation');
      
      // Clear the timeout if navigation was successful
      clearTimeout(navigationTimeout);
    } catch (error) {
      // Use centralized error handling
      handleError({
        source: 'navigation',
        operation: 'navigateToDocumentPreparation',
        originalError: parseError(error),
        component: 'ComplaintForm',
        details: {
          hasTitle: !!title,
          hasDescription: !!description
        }
      });
    }
  };

  // Add a function to handle returning to the dashboard
  const handleReturnToDashboard = () => {
    try {
      // Save the current state if needed
      if (complaint || complaintDataFromLocation) {
        // Update the title and description in the store
        const contentText = complaint?.content || (complaintDataFromLocation as any)?.issue || '';
        updateTitle(contentText);
        updateDescription(contentText);
      }
      
      // Navigate back to the dashboard
      navigate('/dashboard');
    } catch (error) {
      // Use centralized error handling
      handleError({
        source: 'navigation',
        operation: 'returnToDashboard',
        originalError: parseError(error),
        component: 'ComplaintForm'
      });
      
      // Fallback - try direct navigation
      window.location.href = '/dashboard';
    }
  };

  // Handler functions for WaterLevelInfoCard
  const handleAddStation = (type: string) => {
    console.log('[ComplaintForm] Add station:', type);
    
    // Update navigation state using Jotai atom
    navigateToStationCardEdit();
    
    // Navigate to StationCardEdit
    navigate('/station-card-edit');
  };

  const handleDeleteStation = (type: string) => {
    console.log('[ComplaintForm] Delete station:', type);
    // Implementation for deleting stations
  };

  const handleSaveStationData = () => {
    toast.success('บันทึกข้อมูลสถานีสำเร็จ');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Use preserved complaint data if returning from StationCardEdit
  const data = preservedData || complaint || complaintDataFromLocation;
  console.log('[ComplaintForm] Data sources:', {
    preservedData,
    complaint,
    complaintDataFromLocation,
    finalData: data
  });
  
  if (data && !validateComplaintData()) {
    return <div>Invalid complaint data</div>;
  }

  // Get the first amphure and province from the arrays
  const locationData = data ? convertToComplaintFormat(data) : undefined;
  
  // Ensure we have valid location data
  let firstAmphure = undefined;
  let firstProvince = undefined;
  
  // Debug the location data structure
  console.log('[ComplaintForm] Raw location data:', {
    amphure: locationData?.amphure,
    province: locationData?.province,
    tumbon: locationData?.tumbon,
    dataType: locationData ? typeof locationData : 'undefined',
    amphureType: locationData?.amphure ? typeof locationData.amphure : 'undefined',
    provinceType: locationData?.province ? typeof locationData.province : 'undefined'
  });
  
  // Handle amphure data - could be string, array, or undefined
  if (locationData?.amphure) {
    if (Array.isArray(locationData.amphure)) {
      // If it's an array, take the first non-empty value
      firstAmphure = locationData.amphure.find(a => isNonEmptyString(a)) || undefined;
      console.log('[ComplaintForm] Extracted amphure from array:', firstAmphure);
    } else if (isNonEmptyString(locationData.amphure)) {
      // If it's a string, use it directly
      firstAmphure = locationData.amphure;
      console.log('[ComplaintForm] Using amphure string directly:', firstAmphure);
    }
  }
  
  // Handle province data - could be string, array, or undefined
  if (locationData?.province) {
    if (Array.isArray(locationData.province)) {
      // If it's an array, take the first non-empty value
      firstProvince = locationData.province.find(p => isNonEmptyString(p)) || undefined;
      console.log('[ComplaintForm] Extracted province from array:', firstProvince);
    } else if (isNonEmptyString(locationData.province)) {
      // If it's a string, use it directly
      firstProvince = locationData.province;
      console.log('[ComplaintForm] Using province string directly:', firstProvince);
    }
  }
  
  // No more fallback to hardcoded values - if we don't have location data, we'll show appropriate UI
  if (!firstAmphure && !firstProvince) {
    console.warn('[ComplaintForm] No valid location data found in complaint data');
  }
  
  // Memoize location info for display
  const locationInfo = useMemo(() => {
    return {
      amphure: amphure || '',
      province: province || ''
    };
  }, [amphure, province]);
  
  console.log('[ComplaintForm] Final location data being passed to components:', locationInfo);

  // Debug output for location data
  console.log('[ComplaintForm] Location data summary:', {
    fromComplaint: firstAmphure && firstProvince ? `${firstAmphure}, ${firstProvince}` : 'N/A',
    isAmphureDefined: !!firstAmphure,
    isProvinceDefined: !!firstProvince,
    jotaiAmphure: stationData.currentAmphure,
    jotaiProvince: stationData.currentProvince
  });

  // Debug output for location data
  console.log('[ComplaintForm] Location data after initialization:', {
    fromComplaint: firstAmphure && firstProvince ? `${firstAmphure}, ${firstProvince}` : 'N/A',
    isAmphureDefined: !!firstAmphure,
    isProvinceDefined: !!firstProvince,
    jotaiAmphure: stationData.currentAmphure,
    jotaiProvince: stationData.currentProvince
  });

  // Update station management location once when location data changes
  useEffect(() => {
    if (stationData.updateLocation && locationInfo.amphure && locationInfo.province) {
      console.log('[ComplaintForm] Updating station management location (useEffect):', locationInfo);
      stationData.updateLocation(locationInfo.amphure, locationInfo.province);
    }
  }, [locationInfo, stationData.updateLocation]);

  // Helper function to convert ExtendedComplaintData to Complaint
  const convertToComplaintType = (data: Complaint | ExtendedComplaintData | ProcessedPost | null): Complaint | ProcessedPost | null => {
    console.log('[convertToComplaintType] Input data:', data);
    
    if (!data) {
      console.log('[convertToComplaintType] No data provided, returning null');
      return null;
    }
    
    // If it's a ProcessedPost, return it directly
    if (isProcessedPost(data)) {
      console.log('[convertToComplaintType] Data is a ProcessedPost, returning as is');
      return data as ProcessedPost;
    }
    
    if (isExtendedComplaintData(data)) {
      console.log('[convertToComplaintType] Converting ExtendedComplaintData to Complaint');
      // Convert ExtendedComplaintData to Complaint
      const result = {
        id: typeof data.id === 'number' ? String(data.id) : data.id as string,
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        status: data.status,
        type: data.type,
        province: typeof data.province === 'string' ? data.province : 
                 (Array.isArray(data.province) && data.province.length > 0 ? data.province[0] : ''),
        postId: data.postId,
        link: data.link
      };
      console.log('[convertToComplaintType] Converted result:', result);
      return result;
    }
    
    console.log('[convertToComplaintType] Data is already in the correct format, returning as is');
    return data;
  };

  // Render the WaterLevelInfoCard component
  const renderWaterLevelInfoCard = () => {
    // Use location data from Jotai state
    const locationInfo = {
      amphure: amphure || '',
      province: province || ''
    };
    
    console.log('[ComplaintForm] Rendering WaterLevelInfoCard with location:', locationInfo);
    
    // Pass the location data to the WaterLevelInfoCard component
    return (
      <WaterLevelInfoCard
        location={locationInfo}
      />
    );
  };

  // Wrap the JSX with Suspense
  return (
    <Suspense fallback={<div className="container mx-auto px-12 pt-6 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-[#17254D]">ระบบตอบประเด็นข้อร้องเรียน</h1>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>}>
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <ComplaintHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-semibold text-[#17254D]">ระบบตอบประเด็นข้อร้องเรียน</h1>
              <div className="flex gap-2">
                <Button 
                  onClick={handleReturnToDashboard}
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  กลับไปยังหน้าหลัก
                </Button>
                <Button 
                  onClick={handleContinue}
                  className="flex items-center gap-2"
                >
                  ดำเนินการต่อ
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Action Buttons - Moved up with reduced margin */}
            <div className="flex items-center mb-4">
            <Button 
              className="bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white px-2 py-2 rounded-xl w-[150px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handleContinue}
              type="button"
            >
              เพิ่มเติม/แก้ไขข้อมูล
            </Button>
            <div className="w-[10px]"></div>
            <Button 
              className="bg-white hover:bg-[#f0f9ff] text-[#4B9FE1] border-[1.5px] border-[#4B9FE1] px-2 py-2 rounded-xl w-[140px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handlePrepareDocument}
              type="button"
            >
              เตรียมร่างเอกสาร
            </Button>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-2">
          {/* Debug the complaint data */}
          {(() => {
            const complaintData = convertToComplaintType(data || null);
            console.log('[ComplaintForm] Data passed to ComplaintInfoCard:', complaintData);
            return null;
          })()}
          
          {/* Complaint Data Section - Moved up with reduced spacing */}
          <div className="mb-4">
            <ComplaintInfoCard 
              title="ข้อร้องเรียน"
              editable={false}
            />
          </div>
        
        {/* Supporting Data Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              {renderWaterLevelInfoCard()}
            </div>
            <WaterManagementPlanCard />
        </div>
      </main>
    </div>
    </Suspense>
  );
};

export default ComplaintForm;