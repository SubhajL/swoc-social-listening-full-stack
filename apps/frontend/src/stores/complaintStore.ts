import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MonitoringStation } from '@/types/monitoring-station';
import { RainStation } from '@/types/rain-station';
import { Reservoir } from '@/types/reservoir';
import { ProcessedPost } from '@/types/processed-post';
import { Complaint } from '@/types/complaint';

// Interface for station data
export interface StationData {
  // Auto-fetched stations based on location
  monitoringStations: MonitoringStation[];
  rainStations: RainStation[];
  reservoirs: Reservoir[];
  
  // User-selected stations (added manually)
  userSelectedMonitoringStations: MonitoringStation[];
  userSelectedRainStations: RainStation[];
  userSelectedReservoirs: Reservoir[];
  
  // Disabled stations (deleted by user)
  disabledMonitoringStations: Record<string, boolean>;
  disabledRainStations: Record<string, boolean>;
  disabledReservoirs: Record<string, boolean>;
}

// Interface for the complaint store
export interface ComplaintStore {
  // Complaint data
  complaintData: ProcessedPost | Complaint | null;
  
  // Station data
  stationData: StationData | null;
  
  // Actions
  setComplaintData: (data: ProcessedPost | Complaint | null) => void;
  setStationData: (data: StationData | null) => void;
  clearComplaintData: () => void;
  clearStationData: () => void;
  
  // Helper methods
  getLocationData: () => { amphure?: string; province?: string } | null;
  
  // Station management
  addUserSelectedStation: (stationType: 'monitoring' | 'rain' | 'reservoir', station: MonitoringStation | RainStation | Reservoir) => void;
  removeUserSelectedStation: (stationType: 'monitoring' | 'rain' | 'reservoir', stationId: number) => void;
  toggleStationDisabled: (stationType: 'monitoring' | 'rain' | 'reservoir', stationId: number) => void;
}

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return data && 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

// Helper function to safely check if a string is empty
const isNonEmptyString = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  return value.trim() !== '';
};

// Create the complaint store
export const useComplaintStore = create<ComplaintStore>()(
  persist(
    (set, get) => ({
      // Initial state
      complaintData: null,
      stationData: {
        monitoringStations: [],
        rainStations: [],
        reservoirs: [],
        userSelectedMonitoringStations: [],
        userSelectedRainStations: [],
        userSelectedReservoirs: [],
        disabledMonitoringStations: {},
        disabledRainStations: {},
        disabledReservoirs: {}
      },
      
      // Actions
      setComplaintData: (data) => set({ complaintData: data }),
      setStationData: (data) => set({ stationData: data }),
      clearComplaintData: () => set({ complaintData: null }),
      clearStationData: () => set({
        stationData: {
          monitoringStations: [],
          rainStations: [],
          reservoirs: [],
          userSelectedMonitoringStations: [],
          userSelectedRainStations: [],
          userSelectedReservoirs: [],
          disabledMonitoringStations: {},
          disabledRainStations: {},
          disabledReservoirs: {}
        }
      }),
      
      // Helper methods
      getLocationData: () => {
        const { complaintData } = get();
        if (!complaintData) return null;
        
        let amphure: string | undefined;
        let province: string | undefined;
        
        if (isProcessedPost(complaintData)) {
          // Handle ProcessedPost data structure
          if (Array.isArray(complaintData.amphure)) {
            // Find first non-empty string in array
            const foundAmphure = complaintData.amphure.find(a => 
              a && typeof a === 'string' && isNonEmptyString(a)
            );
            amphure = foundAmphure ? String(foundAmphure) : undefined;
          } else if (isNonEmptyString(complaintData.amphure)) {
            amphure = String(complaintData.amphure);
          }
          
          if (Array.isArray(complaintData.province)) {
            // Find first non-empty string in array
            const foundProvince = complaintData.province.find(p => 
              p && typeof p === 'string' && isNonEmptyString(p)
            );
            province = foundProvince ? String(foundProvince) : undefined;
          } else if (isNonEmptyString(complaintData.province)) {
            province = String(complaintData.province);
          }
        } else {
          // Handle Complaint data structure - ensure we get string values
          amphure = isNonEmptyString(complaintData.amphure) ? String(complaintData.amphure) : undefined;
          province = isNonEmptyString(complaintData.province) ? String(complaintData.province) : undefined;
        }
        
        return { amphure, province };
      },
      
      // Station management
      addUserSelectedStation: (stationType, station) => {
        const { stationData } = get();
        if (!stationData) return;
        
        set({
          stationData: {
            ...stationData,
            ...(stationType === 'monitoring' && {
              userSelectedMonitoringStations: [
                ...stationData.userSelectedMonitoringStations,
                station as MonitoringStation
              ]
            }),
            ...(stationType === 'rain' && {
              userSelectedRainStations: [
                ...stationData.userSelectedRainStations,
                station as RainStation
              ]
            }),
            ...(stationType === 'reservoir' && {
              userSelectedReservoirs: [
                ...stationData.userSelectedReservoirs,
                station as Reservoir
              ]
            })
          }
        });
      },
      
      removeUserSelectedStation: (stationType, stationId) => {
        const { stationData } = get();
        if (!stationData) return;
        
        set({
          stationData: {
            ...stationData,
            ...(stationType === 'monitoring' && {
              userSelectedMonitoringStations: stationData.userSelectedMonitoringStations.filter(
                station => station.id !== stationId
              )
            }),
            ...(stationType === 'rain' && {
              userSelectedRainStations: stationData.userSelectedRainStations.filter(
                station => station.id !== stationId
              )
            }),
            ...(stationType === 'reservoir' && {
              userSelectedReservoirs: stationData.userSelectedReservoirs.filter(
                reservoir => reservoir.id !== stationId
              )
            })
          }
        });
      },
      
      toggleStationDisabled: (stationType, stationId) => {
        const { stationData } = get();
        if (!stationData) return;
        
        const stationIdStr = stationId.toString();
        
        set({
          stationData: {
            ...stationData,
            ...(stationType === 'monitoring' && {
              disabledMonitoringStations: {
                ...stationData.disabledMonitoringStations,
                [stationIdStr]: !stationData.disabledMonitoringStations[stationIdStr]
              }
            }),
            ...(stationType === 'rain' && {
              disabledRainStations: {
                ...stationData.disabledRainStations,
                [stationIdStr]: !stationData.disabledRainStations[stationIdStr]
              }
            }),
            ...(stationType === 'reservoir' && {
              disabledReservoirs: {
                ...stationData.disabledReservoirs,
                [stationIdStr]: !stationData.disabledReservoirs[stationIdStr]
              }
            })
          }
        });
      }
    }),
    {
      name: 'complaint-storage', // name of the item in localStorage
      partialize: (state) => ({
        complaintData: state.complaintData,
        stationData: state.stationData
      }),
      skipHydration: true // Skip automatic hydration to prevent errors
    }
  )
); 