import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MonitoringStation } from '@/types/monitoring-station';
import { RainStation } from '@/types/rain-station';
import { Reservoir } from '@/types/reservoir';
import { ProcessedPost, ComplaintWithOrganization, BaseComplaint, Location } from '../types';

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

// Define a simplified complaint type that includes all necessary fields
export interface ComplaintData {
  id: string;
  postId?: string;
  link?: string;
  type?: string;
  province?: string;
  content?: string;
  organizationId: string;
  organizationName: string;
}

// Interface for the complaint store
export interface ComplaintStore {
  // Complaint data
  complaintData: ProcessedPost | ComplaintWithOrganization | null;
  
  // Station data
  stationData: StationData | null;
  
  // Actions
  setComplaintData: (data: ProcessedPost | ComplaintWithOrganization | null) => void;
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

// Type guards
const isProcessedPost = (data: any): data is ProcessedPost => {
  return data && 
    ('processed_post_id' in data || 'text' in data) && 
    'type' in data;
};

const isComplaintWithOrganization = (data: any): data is ComplaintWithOrganization => {
  return data && 
    'organizationId' in data && 
    'organizationName' in data;
};

// Helper function to safely convert data
const convertData = (data: any): ProcessedPost | ComplaintWithOrganization | null => {
  if (!data) return null;
  
  // If it's already one of our types, return it as is
  if (isProcessedPost(data) || isComplaintWithOrganization(data)) {
    return data;
  }
  
  // If the data doesn't match either type, try to convert it
  try {
    if ('text' in data || 'processed_post_id' in data) {
      // Convert to ProcessedPost
      const baseData: BaseComplaint = {
        id: data.id || data.processed_post_id?.toString() || '0',
        type: data.type || data.category_name || '',
        status: data.status || 'pending',
        severity: data.severity || 0,
        text: data.text || '',
        created_at: data.created_at || new Date().toISOString(),
        organizationId: data.organizationId || '',
        organizationName: data.organizationName || '',
        platform: data.platform || '',
        author: data.author || '',
        processed: data.processed || false,
        postDate: data.postDate || data.post_date?.toISOString() || new Date().toISOString(),
        location: {
          amphure: data.location?.amphure || data.amphure?.[0] || '',
          province: data.location?.province || (Array.isArray(data.province) ? data.province[0] : data.province) || ''
        }
      };

      const processedPost: ProcessedPost = {
        ...baseData,
        processed_post_id: parseInt(data.id) || data.processed_post_id || 0,
        category_name: data.type || data.category_name || '',
        profile_name: data.profile_name || '',
        post_date: data.post_date ? new Date(data.post_date) : new Date(),
        post_url: data.post_url || data.link || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        tumbon: Array.isArray(data.tumbon) ? data.tumbon : [],
        coordinate_source: data.coordinate_source || 'direct'
      };
      return processedPost;
    } else {
      // Convert to ComplaintWithOrganization
      const baseData: BaseComplaint = {
        id: data.id || '',
        type: data.type || '',
        status: data.status || 'pending',
        severity: data.severity || 0,
        content: data.content || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        location: {
          amphure: data.location?.amphure || data.amphure || '',
          province: data.location?.province || data.province || ''
        }
      };

      const complaint: ComplaintWithOrganization = {
        ...baseData,
        organizationId: data.organizationId || '',
        organizationName: data.organizationName || '',
        location: baseData.location || { amphure: '', province: '' }
      };
      return complaint;
    }
  } catch (error) {
    console.error('[ComplaintStore] Error converting data:', error);
    return null;
  }
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
      setComplaintData: (data) => {
        const convertedData = convertData(data);
        set({ complaintData: convertedData });
      },
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
        
        return {
          amphure: complaintData.location?.amphure || undefined,
          province: complaintData.location?.province || undefined
        };
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
        
        // Log the current state before toggling
        console.log(`[ComplaintStore] Toggling ${stationType} station ${stationId}:`, {
          currentValue: stationType === 'monitoring' 
            ? stationData.disabledMonitoringStations[stationIdStr]
            : stationType === 'rain'
              ? stationData.disabledRainStations[stationIdStr]
              : stationData.disabledReservoirs[stationIdStr],
          newValue: stationType === 'monitoring' 
            ? !stationData.disabledMonitoringStations[stationIdStr]
            : stationType === 'rain'
              ? !stationData.disabledRainStations[stationIdStr]
              : !stationData.disabledReservoirs[stationIdStr]
        });
        
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
      name: 'complaint-storage',
      partialize: (state) => ({
        complaintData: state.complaintData,
        stationData: state.stationData
      }),
      skipHydration: true
    }
  )
); 