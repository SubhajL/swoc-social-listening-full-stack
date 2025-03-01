import { useAtom, useAtomValue, useSetAtom, Getter } from 'jotai';
import { useCallback } from 'react';

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
  Reservoir
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

// ===== Station Data Hooks =====

export function useStationData() {
  const stationData = useAtomValue(allStationDataAtom);
  const setMonitoringStations = useSetAtom(monitoringStationsAtom);
  const setRainStations = useSetAtom(rainStationsAtom);
  const setReservoirs = useSetAtom(reservoirsAtom);
  const setUserSelectedMonitoringStations = useSetAtom(userSelectedMonitoringStationsAtom);
  const setUserSelectedRainStations = useSetAtom(userSelectedRainStationsAtom);
  const setUserSelectedReservoirs = useSetAtom(userSelectedReservoirsAtom);
  const setDisabledMonitoringStations = useSetAtom(disabledMonitoringStationsAtom);
  const setDisabledRainStations = useSetAtom(disabledRainStationsAtom);
  const setDisabledReservoirs = useSetAtom(disabledReservoirsAtom);
  const [navigatingAfterSave, setNavigatingAfterSave] = useAtom(navigatingAfterSaveAtom);
  const [stationDataUpdateIntentional, setStationDataUpdateIntentional] = useAtom(stationDataUpdateIntentionalAtom);
  
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
  
  return {
    // State
    ...stationData,
    navigatingAfterSave,
    stationDataUpdateIntentional,
    
    // Setters
    setNavigatingAfterSave,
    setStationDataUpdateIntentional,
    setMonitoringStations,
    setRainStations,
    setReservoirs,
    setUserSelectedMonitoringStations,
    setUserSelectedRainStations,
    setUserSelectedReservoirs,
    setDisabledMonitoringStations,
    setDisabledRainStations,
    setDisabledReservoirs,
    
    // Update functions
    updateMonitoringStations,
    updateRainStations,
    updateReservoirs,
    
    // User selected stations
    addUserSelectedMonitoringStation,
    addUserSelectedRainStation,
    addUserSelectedReservoir,
    removeUserSelectedMonitoringStation,
    removeUserSelectedRainStation,
    removeUserSelectedReservoir,
    
    // Disabled stations
    disableMonitoringStation,
    disableRainStation,
    disableReservoir,
    enableMonitoringStation,
    enableRainStation,
    enableReservoir,
    
    // Reset
    resetStationData
  };
}

export function useStationCounts() {
  return useAtomValue(stationCountsAtom);
}

// ===== Complaint Data Hooks =====

export function useComplaintData() {
  const complaintData = useAtomValue(allComplaintDataAtom);
  const setTitle = useSetAtom(titleAtom);
  const setDescription = useSetAtom(descriptionAtom);
  const setLocation = useSetAtom(locationAtom);
  const setCoordinates = useSetAtom(coordinatesAtom);
  const setProcessedPosts = useSetAtom(processedPostsAtom);
  const setSelectedPostIds = useSetAtom(selectedPostIdsAtom);
  const setIsSubmitting = useSetAtom(isSubmittingAtom);
  const setIsSubmitted = useSetAtom(isSubmittedAtom);
  const setSubmissionError = useSetAtom(submissionErrorAtom);
  const setCurrentStep = useSetAtom(currentStepAtom);
  
  // Helper functions
  const updateTitle = useCallback((title: string) => {
    setTitle(title);
  }, [setTitle]);
  
  const updateDescription = useCallback((description: string) => {
    setDescription(description);
  }, [setDescription]);
  
  const updateLocation = useCallback((location: string) => {
    setLocation(location);
  }, [setLocation]);
  
  const updateCoordinates = useCallback((lat: number | null, lng: number | null) => {
    setCoordinates({ lat, lng });
  }, [setCoordinates]);
  
  const updateProcessedPosts = useCallback((posts: ProcessedPost[]) => {
    setProcessedPosts(posts);
  }, [setProcessedPosts]);
  
  const togglePostSelection = useCallback((postId: string) => {
    setSelectedPostIds((prev: string[]) => {
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
    if (error) {
      setSubmissionError(error);
    }
  }, [setIsSubmitting, setIsSubmitted, setSubmissionError]);
  
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, [setCurrentStep]);
  
  const resetComplaintData = useCallback(() => {
    setTitle('');
    setDescription('');
    setLocation('');
    setCoordinates({ lat: null, lng: null });
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
  
  return {
    // State
    ...complaintData,
    
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
    
    // Navigation
    goToStep,
    
    // Reset
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