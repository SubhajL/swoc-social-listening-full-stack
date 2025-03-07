import { useAtom, useAtomValue, useSetAtom, Getter } from 'jotai';
import { useCallback } from 'react';
import { atomWithStorage } from 'jotai/utils';

// Station data atoms
import {
  monitoringStationsAtom,
  rainStationsAtom,
  reservoirsAtom,
  userSelectedMonitoringStationsAtom,
  userSelectedRainStationsAtom,
  userSelectedReservoirsAtom,
  disabledMonitoringStationsAtom,
  disabledRainStationsAtom,
  disabledReservoirsAtom,
  navigatingAfterSaveAtom,
  stationDataUpdateIntentionalAtom,
  allStationDataAtom,
  stationCountsAtom,
  StationData,
  MonitoringStation,
  RainStation,
  Reservoir,
  currentAmphureAtom,
  currentProvinceAtom,
  monitoringStationsQueryAtom,
  rainStationsQueryAtom,
  reservoirsQueryAtom,
  isLoadingMonitoringStationsAtom,
  isLoadingRainStationsAtom,
  isLoadingReservoirsAtom,
  monitoringStationsErrorAtom,
  rainStationsErrorAtom,
  reservoirsErrorAtom
} from './stationData';

// Complaint data atoms
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
  currentStepAtom,
  allComplaintDataAtom,
  hasSelectedPostsAtom,
  isFormValidAtom,
  ComplaintData,
  ProcessedPost
} from './complaintData';

// Document data atoms
import {
  documentsAtom,
  selectedDocumentIdsAtom,
  isGeneratingAtom,
  generationErrorAtom,
  documentTitleAtom,
  documentContentAtom,
  documentCurrentStepAtom,
  allDocumentDataAtom,
  hasSelectedDocumentsAtom,
  isDocumentValidAtom,
  DocumentData,
  Document
} from './documentData';

// Import the documentAttachmentsAtom and Attachment interface from the correct location
import { documentAttachmentsAtom, Attachment } from './documentAttachments';

// ===== Station Data Hooks =====

export function useStationData() {
  const [monitoringStations, setMonitoringStations] = useAtom(monitoringStationsAtom);
  const [rainStations, setRainStations] = useAtom(rainStationsAtom);
  const [reservoirs, setReservoirs] = useAtom(reservoirsAtom);
  const [userSelectedMonitoringStations, setUserSelectedMonitoringStations] = useAtom(userSelectedMonitoringStationsAtom);
  const [userSelectedRainStations, setUserSelectedRainStations] = useAtom(userSelectedRainStationsAtom);
  const [userSelectedReservoirs, setUserSelectedReservoirs] = useAtom(userSelectedReservoirsAtom);
  const [disabledMonitoringStations, setDisabledMonitoringStations] = useAtom(disabledMonitoringStationsAtom);
  const [disabledRainStations, setDisabledRainStations] = useAtom(disabledRainStationsAtom);
  const [disabledReservoirs, setDisabledReservoirs] = useAtom(disabledReservoirsAtom);
  const [navigatingAfterSave, setNavigatingAfterSave] = useAtom(navigatingAfterSaveAtom);
  const [stationDataUpdateIntentional, setStationDataUpdateIntentional] = useAtom(stationDataUpdateIntentionalAtom);
  
  // New atoms for location
  const [currentAmphure, setCurrentAmphure] = useAtom(currentAmphureAtom);
  const [currentProvince, setCurrentProvince] = useAtom(currentProvinceAtom);
  
  // New atoms for API data
  const monitoringStationsQuery = useAtomValue(monitoringStationsQueryAtom);
  const rainStationsQuery = useAtomValue(rainStationsQueryAtom);
  const reservoirsQuery = useAtomValue(reservoirsQueryAtom);
  
  // New atoms for loading states
  const isLoadingMonitoringStations = useAtomValue(isLoadingMonitoringStationsAtom);
  const isLoadingRainStations = useAtomValue(isLoadingRainStationsAtom);
  const isLoadingReservoirs = useAtomValue(isLoadingReservoirsAtom);
  
  // New atoms for error states
  const [monitoringStationsError, setMonitoringStationsError] = useAtom(monitoringStationsErrorAtom);
  const [rainStationsError, setRainStationsError] = useAtom(rainStationsErrorAtom);
  const [reservoirsError, setReservoirsError] = useAtom(reservoirsErrorAtom);
  
  // Helper functions to update station data
  const updateMonitoringStations = useCallback((stations: MonitoringStation[]) => {
    setStationDataUpdateIntentional(true);
    setMonitoringStations(stations);
    setStationDataUpdateIntentional(false);
  }, [setMonitoringStations, setStationDataUpdateIntentional]);
  
  const updateRainStations = useCallback((stations: RainStation[]) => {
    setStationDataUpdateIntentional(true);
    setRainStations(stations);
    setStationDataUpdateIntentional(false);
  }, [setRainStations, setStationDataUpdateIntentional]);
  
  const updateReservoirs = useCallback((reservoirs: Reservoir[]) => {
    setStationDataUpdateIntentional(true);
    setReservoirs(reservoirs);
    setStationDataUpdateIntentional(false);
  }, [setReservoirs, setStationDataUpdateIntentional]);
  
  const addUserSelectedMonitoringStation = useCallback((station: MonitoringStation) => {
    setStationDataUpdateIntentional(true);
    setUserSelectedMonitoringStations((prev: MonitoringStation[]) => [...prev, station]);
    setStationDataUpdateIntentional(false);
  }, [setUserSelectedMonitoringStations, setStationDataUpdateIntentional]);
  
  const addUserSelectedRainStation = useCallback((station: RainStation) => {
    setStationDataUpdateIntentional(true);
    setUserSelectedRainStations((prev: RainStation[]) => [...prev, station]);
    setStationDataUpdateIntentional(false);
  }, [setUserSelectedRainStations, setStationDataUpdateIntentional]);
  
  const addUserSelectedReservoir = useCallback((reservoir: Reservoir) => {
    setStationDataUpdateIntentional(true);
    setUserSelectedReservoirs((prev: Reservoir[]) => [...prev, reservoir]);
    setStationDataUpdateIntentional(false);
  }, [setUserSelectedReservoirs, setStationDataUpdateIntentional]);
  
  const removeUserSelectedMonitoringStation = useCallback((stationId: string) => {
    setStationDataUpdateIntentional(true);
    setUserSelectedMonitoringStations((prev: MonitoringStation[]) => prev.filter(s => s.id !== stationId));
    setStationDataUpdateIntentional(false);
  }, [setUserSelectedMonitoringStations, setStationDataUpdateIntentional]);
  
  const removeUserSelectedRainStation = useCallback((stationId: string) => {
    setStationDataUpdateIntentional(true);
    setUserSelectedRainStations((prev: RainStation[]) => prev.filter(s => s.id !== stationId));
    setStationDataUpdateIntentional(false);
  }, [setUserSelectedRainStations, setStationDataUpdateIntentional]);
  
  const removeUserSelectedReservoir = useCallback((reservoirId: string) => {
    setStationDataUpdateIntentional(true);
    setUserSelectedReservoirs((prev: Reservoir[]) => prev.filter(r => r.id !== reservoirId));
    setStationDataUpdateIntentional(false);
  }, [setUserSelectedReservoirs, setStationDataUpdateIntentional]);
  
  const disableMonitoringStation = useCallback((stationId: string) => {
    setStationDataUpdateIntentional(true);
    setDisabledMonitoringStations((prev: Record<string, boolean>) => ({ ...prev, [stationId]: true }));
    setStationDataUpdateIntentional(false);
  }, [setDisabledMonitoringStations, setStationDataUpdateIntentional]);
  
  const disableRainStation = useCallback((stationId: string) => {
    setStationDataUpdateIntentional(true);
    setDisabledRainStations((prev: Record<string, boolean>) => ({ ...prev, [stationId]: true }));
    setStationDataUpdateIntentional(false);
  }, [setDisabledRainStations, setStationDataUpdateIntentional]);
  
  const disableReservoir = useCallback((reservoirId: string) => {
    setStationDataUpdateIntentional(true);
    setDisabledReservoirs((prev: Record<string, boolean>) => ({ ...prev, [reservoirId]: true }));
    setStationDataUpdateIntentional(false);
  }, [setDisabledReservoirs, setStationDataUpdateIntentional]);
  
  const enableMonitoringStation = useCallback((stationId: string) => {
    setStationDataUpdateIntentional(true);
    setDisabledMonitoringStations((prev: Record<string, boolean>) => {
      const newDisabled = { ...prev };
      delete newDisabled[stationId];
      return newDisabled;
    });
    setStationDataUpdateIntentional(false);
  }, [setDisabledMonitoringStations, setStationDataUpdateIntentional]);
  
  const enableRainStation = useCallback((stationId: string) => {
    setStationDataUpdateIntentional(true);
    setDisabledRainStations((prev: Record<string, boolean>) => {
      const newDisabled = { ...prev };
      delete newDisabled[stationId];
      return newDisabled;
    });
    setStationDataUpdateIntentional(false);
  }, [setDisabledRainStations, setStationDataUpdateIntentional]);
  
  const enableReservoir = useCallback((reservoirId: string) => {
    setStationDataUpdateIntentional(true);
    setDisabledReservoirs((prev: Record<string, boolean>) => {
      const newDisabled = { ...prev };
      delete newDisabled[reservoirId];
      return newDisabled;
    });
    setStationDataUpdateIntentional(false);
  }, [setDisabledReservoirs, setStationDataUpdateIntentional]);
  
  // Function to reset all station data
  const resetStationData = useCallback(() => {
    setStationDataUpdateIntentional(true);
    setMonitoringStations([]);
    setRainStations([]);
    setReservoirs([]);
    setUserSelectedMonitoringStations([]);
    setUserSelectedRainStations([]);
    setUserSelectedReservoirs([]);
    setDisabledMonitoringStations({});
    setDisabledRainStations({});
    setDisabledReservoirs({});
    setStationDataUpdateIntentional(false);
  }, [
    setMonitoringStations, 
    setRainStations, 
    setReservoirs, 
    setUserSelectedMonitoringStations, 
    setUserSelectedRainStations, 
    setUserSelectedReservoirs, 
    setDisabledMonitoringStations, 
    setDisabledRainStations, 
    setDisabledReservoirs,
    setStationDataUpdateIntentional
  ]);
  
  // Function to adapt a reservoir object for compatibility
  const adaptReservoir = useCallback((reservoir: unknown): any => {
    if (!reservoir || typeof reservoir !== 'object') {
      console.warn("[useStationData] adaptReservoir received invalid reservoir:", reservoir);
      return { id: 0, name: "Unknown Reservoir", reservoir_name: "Unknown Reservoir" };
    }
    
    // Simple adapter that preserves existing properties while adding any missing ones
    const apiStyle = reservoir as {id: string; name: string};
    const dbStyle = reservoir as {id: number; reservoir_name: string | null};
    
    // Create a new object with properties from both types
    return {
      // Use the original object as base if it's a valid object
      ...(typeof reservoir === 'object' && reservoir !== null ? reservoir as object : {}),
      // Ensure these properties exist for any code that expects them
      id: dbStyle.id || (apiStyle.id ? parseInt(apiStyle.id) : 0),
      name: apiStyle.name || dbStyle.reservoir_name || `Reservoir ${dbStyle.id || apiStyle.id}`,
      reservoir_name: dbStyle.reservoir_name || apiStyle.name || `Reservoir ${dbStyle.id || apiStyle.id}`
    };
  }, []);
  
  // Function to get all station data in one object (for compatibility with old code)
  const getStationData = useCallback(() => {
    return {
      monitoringStations,
      rainStations,
      reservoirs,
      userSelectedMonitoringStations,
      userSelectedRainStations,
      userSelectedReservoirs,
      disabledMonitoringStations,
      disabledRainStations,
      disabledReservoirs,
      // Add helper method
      adaptReservoir
    };
  }, [
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs,
    adaptReservoir
  ]);

  // Simplified saveStationDataForNavigation function
  const saveStationDataForNavigation = useCallback(async (saveSource: string = 'unknown') => {
    console.log(`[useStationData] saveStationDataForNavigation called from ${saveSource}`);
    
    // Simply return true - no need for complex state saving
    return true;
  }, []);

  // Add a stationData object to match older API
  const stationData = {
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs
  };

  // Simplified updateLocation function
  const updateLocation = useCallback((amphure?: string, province?: string) => {
    console.log('[useStationData] Updating location:', { 
      amphure, 
      province
    });
    
    // Directly update atoms without extra flags
    if (amphure) setCurrentAmphure(amphure);
    if (province) setCurrentProvince(province);
    
  }, [setCurrentAmphure, setCurrentProvince]);

  return {
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs,
    navigatingAfterSave,
    stationDataUpdateIntentional,
    monitoringStationsQuery,
    rainStationsQuery,
    reservoirsQuery,
    isLoadingMonitoringStations,
    isLoadingRainStations,
    isLoadingReservoirs,
    monitoringStationsError,
    rainStationsError,
    reservoirsError,
    currentAmphure,
    currentProvince,
    updateMonitoringStations,
    updateRainStations,
    updateReservoirs,
    addUserSelectedMonitoringStation,
    addUserSelectedRainStation,
    addUserSelectedReservoir,
    removeUserSelectedMonitoringStation,
    removeUserSelectedRainStation,
    removeUserSelectedReservoir,
    disableMonitoringStation,
    disableRainStation,
    disableReservoir,
    enableMonitoringStation,
    enableRainStation,
    enableReservoir,
    resetStationData,
    adaptReservoir,
    getStationData,
    saveStationDataForNavigation,
    setNavigatingAfterSave,
    setStationDataUpdateIntentional,
    updateLocation,
    setMonitoringStationsError,
    setRainStationsError,
    setReservoirsError
  };
}

export function useStationCounts() {
  return useAtomValue(stationCountsAtom);
}

// ===== Complaint Data Hooks =====

export function useComplaintData() {
  const [title, setTitle] = useAtom(titleAtom);
  const [description, setDescription] = useAtom(descriptionAtom);
  const [location, setLocation] = useAtom(locationAtom);
  const [coordinates, setCoordinates] = useAtom(coordinatesAtom);
  const [processedPosts, setProcessedPosts] = useAtom(processedPostsAtom);
  const [selectedPostIds, setSelectedPostIds] = useAtom(selectedPostIdsAtom);
  const [isSubmitting, setIsSubmitting] = useAtom(isSubmittingAtom);
  const [isSubmitted, setIsSubmitted] = useAtom(isSubmittedAtom);
  const [submissionError, setSubmissionError] = useAtom(submissionErrorAtom);
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  
  // Helper functions to update complaint data
  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, [setTitle]);
  
  const updateDescription = useCallback((newDescription: string) => {
    setDescription(newDescription);
  }, [setDescription]);
  
  const updateLocation = useCallback((newLocation: string) => {
    setLocation(newLocation);
  }, [setLocation]);
  
  const updateCoordinates = useCallback((newCoordinates: {lat: number | null, lng: number | null}) => {
    setCoordinates(newCoordinates);
  }, [setCoordinates]);
  
  const updateProcessedPosts = useCallback((newPosts: ProcessedPost[]) => {
    setProcessedPosts(newPosts);
  }, [setProcessedPosts]);
  
  const togglePostSelection = useCallback((postId: string) => {
    setSelectedPostIds(prev => {
      if (prev.includes(postId)) {
        return prev.filter(id => id !== postId);
      } else {
        return [...prev, postId];
      }
    });
  }, [setSelectedPostIds]);
  
  const startSubmission = useCallback(() => {
    setIsSubmitting(true);
    setSubmissionError(null);
  }, [setIsSubmitting, setSubmissionError]);
  
  const completeSubmission = useCallback((success: boolean, error?: string) => {
    setIsSubmitting(false);
    setIsSubmitted(success);
    if (!success && error) {
      setSubmissionError(error);
    }
  }, [setIsSubmitting, setIsSubmitted, setSubmissionError]);
  
  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, [setCurrentStep]);
  
  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, [setCurrentStep]);
  
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, [setCurrentStep]);
  
  const resetComplaintData = useCallback(() => {
    setTitle('');
    setDescription('');
    setLocation('');
    setCoordinates({lat: null, lng: null});
    setProcessedPosts([]);
    setSelectedPostIds([]);
    setIsSubmitting(false);
    setIsSubmitted(false);
    setSubmissionError(null);
    setCurrentStep(0);
  }, [
    setTitle,
    setDescription,
    setLocation,
    setCoordinates,
    setProcessedPosts,
    setSelectedPostIds,
    setIsSubmitting,
    setIsSubmitted,
    setSubmissionError,
    setCurrentStep
  ]);
  
  // Return all complaint data and functions
  return {
    // State
    title,
    description,
    location,
    coordinates,
    processedPosts,
    selectedPostIds,
    isSubmitting,
    isSubmitted,
    submissionError,
    currentStep,
    
    // Derived state
    hasSelectedPosts: useAtomValue(hasSelectedPostsAtom),
    isFormValid: useAtomValue(isFormValidAtom),
    
    // Update functions
    updateTitle,
    updateDescription,
    updateLocation,
    updateCoordinates,
    updateProcessedPosts,
    togglePostSelection,
    
    // Submission functions
    startSubmission,
    completeSubmission,
    
    // Navigation functions
    nextStep,
    prevStep,
    goToStep,
    
    // Reset function
    resetComplaintData
  };
}

export function useComplaintFormValidation() {
  const hasSelectedPosts = useAtomValue(hasSelectedPostsAtom);
  const isFormValid = useAtomValue(isFormValidAtom);
  
  return {
    hasSelectedPosts,
    isFormValid
  };
}

// ===== Document Data Hooks =====

export function useDocumentData() {
  const documentData = useAtomValue(allDocumentDataAtom);
  const setDocuments = useSetAtom(documentsAtom);
  const setSelectedDocumentIds = useSetAtom(selectedDocumentIdsAtom);
  const setIsGenerating = useSetAtom(isGeneratingAtom);
  const setGenerationError = useSetAtom(generationErrorAtom);
  const setDocumentTitle = useSetAtom(documentTitleAtom);
  const setDocumentContent = useSetAtom(documentContentAtom);
  const setCurrentStep = useSetAtom(documentCurrentStepAtom);
  
  // Helper functions
  const updateDocuments = useCallback((documents: Document[]) => {
    setDocuments(documents);
  }, [setDocuments]);
  
  const toggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocumentIds((prev: string[]) => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  }, [setSelectedDocumentIds]);
  
  const startGeneration = useCallback(() => {
    setIsGenerating(true);
    setGenerationError(null);
  }, [setIsGenerating, setGenerationError]);
  
  const completeGeneration = useCallback((success: boolean, error?: string) => {
    setIsGenerating(false);
    if (error) {
      setGenerationError(error);
    }
  }, [setIsGenerating, setGenerationError]);
  
  const updateDocumentTitle = useCallback((title: string) => {
    setDocumentTitle(title);
  }, [setDocumentTitle]);
  
  const updateDocumentContent = useCallback((content: string) => {
    setDocumentContent(content);
  }, [setDocumentContent]);
  
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, [setCurrentStep]);
  
  const resetDocumentData = useCallback(() => {
    setDocuments([]);
    setSelectedDocumentIds([]);
    setIsGenerating(false);
    setGenerationError(null);
    setDocumentTitle('');
    setDocumentContent('');
    setCurrentStep(0);
  }, [
    setDocuments,
    setSelectedDocumentIds,
    setIsGenerating,
    setGenerationError,
    setDocumentTitle,
    setDocumentContent,
    setCurrentStep
  ]);
  
  return {
    // State
    ...documentData,
    
    // Update functions
    updateDocuments,
    toggleDocumentSelection,
    
    // Generation functions
    startGeneration,
    completeGeneration,
    
    // Document content
    updateDocumentTitle,
    updateDocumentContent,
    
    // Navigation
    goToStep,
    
    // Reset
    resetDocumentData
  };
}

export function useDocumentValidation() {
  const hasSelectedDocuments = useAtomValue(hasSelectedDocumentsAtom);
  const isDocumentValid = useAtomValue(isDocumentValidAtom);
  
  return {
    hasSelectedDocuments,
    isDocumentValid
  };
}

// ===== Document Attachments Hooks =====

export function useDocumentAttachments() {
  const [attachments, setAttachments] = useAtom(documentAttachmentsAtom);
  
  const addAttachment = useCallback((file: File) => {
    const newAttachment: Attachment = {
      id: `attachment-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file
    };
    
    setAttachments((prev: Attachment[]) => [...prev, newAttachment]);
    return newAttachment.id;
  }, [setAttachments]);
  
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev: Attachment[]) => prev.filter((attachment: Attachment) => attachment.id !== id));
  }, [setAttachments]);
  
  const getAttachment = useCallback((id: string) => {
    return attachments.find((attachment: Attachment) => attachment.id === id);
  }, [attachments]);
  
  const downloadAttachment = useCallback((fileName: string) => {
    const attachment = attachments.find((a: Attachment) => a.name === fileName);
    if (attachment && attachment.url) {
      window.open(attachment.url, '_blank');
    }
  }, [attachments]);
  
  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, [setAttachments]);
  
  return {
    attachments,
    addAttachment,
    removeAttachment,
    getAttachment,
    downloadAttachment,
    clearAttachments
  };
} 