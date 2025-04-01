import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Droplet, MapPin, Plus, Settings, AlertTriangle, Droplets } from "lucide-react";
import { useEffect, useState, useMemo, FC, useRef } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { cn } from "@/lib/utils";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";
import { useStationManagement } from "@/hooks/useStationManagement";
import { 
  isMonitoringStation, 
  isRainStation, 
  isReservoir,
  ensureStringId
} from '@/utils/stationTypeGuards';
import { useLocation } from '@/hooks/useLocation';
import React from "react";
import { useReservoirLocations } from "@/hooks/useReservoirLocations";
import { useReservoirData } from "@/hooks/useReservoirData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FetchedMonitoringStation {
  id: string;
  station_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  telemetry_data?: {
    water_level: number;
    flow_rate: number;
    timestamp: string;
  };
}

interface FetchedRainStation {
  id: string;
  station_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  rainfall?: {
    daily?: number;
    hourly?: number;
    timestamp?: string;
  };
}

interface FetchedReservoir {
  id: string;
  station_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  current_volume?: number;
  percent_full?: number;
  updated_at?: string;
}

// Define standardized station interfaces with consistent property naming
interface StandardizedStation {
  id: number;          // Numeric ID for internal use
  stationId: string;   // String ID for display
  name: string;        // Station name
  type: string;        // Station type (monitoring, rain, reservoir)
  latitude: number;
  longitude: number;
}

interface StandardizedMonitoringStation extends StandardizedStation {
  waterLevel?: number;
  flowRate?: number;
  lastUpdated?: string;
  telemetryData?: {
    timestamp: string;
    waterLevel: number | null;
    flowRate: number | null;
    notation: string;
  };
}

interface StandardizedRainStation extends StandardizedStation {
  rainfall?: {
    daily?: number;
    hourly?: number;
    timestamp?: string;
  };
  rainfallDaily?: number;
  rainfallWeekly?: number;
}

interface StandardizedReservoir extends StandardizedStation {
  capacity?: number;
  currentVolume?: number;
  percentFull?: number;
  updatedAt?: string;
  normalStorageCapacity?: string;
  minimumStorageCapacity?: string;
}

// Type guard functions to ensure type safety - more lenient to accept various data formats
function isFetchedMonitoringStation(station: any): station is FetchedMonitoringStation {
  // Log the station object to debug
  console.log('[isFetchedMonitoringStation] Checking station:', {
    id: station?.id,
    station_id: station?.station_id, // Log the station_id
    name: station?.name
  });
  
  // More lenient check - only require id to exist
  return station && typeof station.id !== 'undefined';
}

function isFetchedRainStation(station: any): station is FetchedRainStation {
  // Log the station object to debug
  console.log('[isFetchedRainStation] Checking station:', {
    id: station?.id,
    station_id: station?.station_id, // Log the station_id
    name: station?.name
  });
  
  // More lenient check - only require id to exist
  return station && typeof station.id !== 'undefined';
}

function isFetchedReservoir(reservoir: any): reservoir is FetchedReservoir {
  // Log the reservoir object to debug
  console.log('[isFetchedReservoir] Checking reservoir:', {
    id: reservoir?.id,
    station_id: reservoir?.station_id, // Log the station_id
    name: reservoir?.name
  });
  
  // More lenient check - only require id to exist
  return reservoir && typeof reservoir.id !== 'undefined';
}

// Mapper functions with better error handling
function mapToStandardizedMonitoringStation(station: FetchedMonitoringStation): StandardizedMonitoringStation {
  console.log('[mapToStandardizedMonitoringStation] Original station ID data:', {
    originalId: station.id,
    originalType: typeof station.id,
    originalStationId: (station as any).station_id,
    stationName: station.name
  });
  
  // Use type assertion to access properties that might not exist in the type definition
  const stationAny = station as any;
  
  const standardized = {
    id: Number(station.id || 0),
    stationId: stationAny.station_id || String(station.id || ''), // Preserve original station_id if available
    name: station.name || stationAny.station_name || `สถานีเฝ้าระวัง ${station.id || ''}`,
    type: 'monitoring',
    latitude: station.latitude || 0,
    longitude: station.longitude || 0,
    telemetryData: station.telemetry_data ? {
      timestamp: station.telemetry_data.timestamp || new Date().toISOString(),
      waterLevel: station.telemetry_data.water_level || 0,
      flowRate: station.telemetry_data.flow_rate || 0,
      notation: ''
    } : undefined,
    waterLevel: station.telemetry_data?.water_level || stationAny.water_level || 0,
    flowRate: station.telemetry_data?.flow_rate || stationAny.flow_rate || 0,
    lastUpdated: station.telemetry_data?.timestamp || new Date().toISOString()
  };
  
  console.log('[mapToStandardizedMonitoringStation] Standardized station ID data:', {
    numericId: standardized.id,
    numericIdType: typeof standardized.id,
    stringId: standardized.stationId,
    stringIdType: typeof standardized.stationId,
    stationName: standardized.name
  });
  
  return standardized;
}

function mapToStandardizedRainStation(station: FetchedRainStation): StandardizedRainStation {
  console.log('[mapToStandardizedRainStation] Original station ID data:', {
    originalId: station.id,
    originalType: typeof station.id,
    originalStationId: (station as any).station_id,
    stationName: station.name
  });
  
  // Use type assertion to access properties that might not exist in the type definition
  const stationAny = station as any;
  
  const standardized = {
    id: Number(station.id || 0),
    stationId: stationAny.station_id || String(station.id || ''), // Preserve original station_id if available
    name: station.name || stationAny.station_name || `สถานีวัดน้ำฝน ${station.id || ''}`,
    type: 'rain',
    latitude: station.latitude || 0,
    longitude: station.longitude || 0,
    rainfall: station.rainfall || {
      daily: stationAny.rainfall_3d || 0,
      hourly: stationAny.rainfall_7d || 0,
      timestamp: new Date().toISOString()
    },
    rainfallDaily: station.rainfall?.daily || stationAny.rainfall_3d || 0,
    rainfallWeekly: station.rainfall?.hourly || stationAny.rainfall_7d || 0
  };
  
  console.log('[mapToStandardizedRainStation] Standardized station ID data:', {
    numericId: standardized.id,
    numericIdType: typeof standardized.id,
    stringId: standardized.stationId,
    stringIdType: typeof standardized.stationId,
    stationName: standardized.name
  });
  
  return standardized;
}

function mapToStandardizedReservoir(reservoir: FetchedReservoir): StandardizedReservoir {
  console.log('[mapToStandardizedReservoir] Original reservoir ID data:', {
    originalId: reservoir.id,
    originalType: typeof reservoir.id,
    originalStationId: (reservoir as any).station_id,
    reservoirName: reservoir.name
  });
  
  // Use type assertion to access properties that might not exist in the type definition
  const reservoirAny = reservoir as any;
  
  const standardized = {
    id: Number(reservoir.id || 0),
    stationId: reservoirAny.station_id || String(reservoir.id || ''), // Preserve original station_id if available
    name: reservoir.name || reservoirAny.reservoir_name || `เขื่อน/อ่างเก็บน้ำ ${reservoir.id || ''}`,
    type: 'reservoir',
    latitude: reservoir.latitude || 0,
    longitude: reservoir.longitude || 0,
    capacity: reservoir.capacity || 0,
    currentVolume: reservoir.current_volume || 0,
    percentFull: reservoir.percent_full || 0,
    updatedAt: reservoir.updated_at || new Date().toISOString(),
    normalStorageCapacity: '0',
    minimumStorageCapacity: '0'
  };
  
  console.log('[mapToStandardizedReservoir] Standardized reservoir ID data:', {
    numericId: standardized.id,
    numericIdType: typeof standardized.id,
    stringId: standardized.stationId,
    stringIdType: typeof standardized.stationId,
    reservoirName: standardized.name
  });
  
  return standardized;
}

// Adapter functions to convert from standardized format to component-expected types
function adaptToMonitoringStationProps(station: StandardizedMonitoringStation): MonitoringStation {
  // Debug logging - commented out to reduce console noise
  /*
  console.log('[adaptToMonitoringStationProps] Standardized station ID input:', {
    numericId: station.id,
    stringId: station.stationId,
    stationName: station.name
  });
  */
  
  // Ensure we have a valid ID (prefer numeric ID if available)
  const id = station.id !== undefined && station.id !== null ? station.id : 
             (station.stationId ? parseInt(station.stationId, 10) : 0);
  
  const adapted = {
    id: id,
    sequence_number: '0',
    station_id: station.stationId || '',
    station_name: station.name || '',
    code: '',
    irrigation_office: '',
    river_basin: '',
    river_name: '',
    province: '',
    amphure: '',
    water_level: station.waterLevel,
    flow_rate: station.flowRate,
    bank_level_meters: '0',
    capacity_cms: '0',
    pole_center_msl: '0',
    telemetry_data: station.telemetryData ? {
      timestamp: station.telemetryData.timestamp,
      water_level: station.telemetryData.waterLevel,
      flow_rate: station.telemetryData.flowRate,
      notation: station.telemetryData.notation
    } : undefined
  };
  
  // Debug logging - commented out to reduce console noise
  /*
  console.log('[adaptToMonitoringStationProps] Adapted station ID for UI:', {
    id: adapted.id,
    idType: typeof adapted.id,
    station_id: adapted.station_id,
    station_idType: typeof adapted.station_id,
    station_name: adapted.station_name,
    originalStationId: station.stationId
  });
  */
  
  return adapted;
}

function adaptToRainStationProps(station: StandardizedRainStation): RainStation {
  // Debug logging - commented out to reduce console noise
  /*
  console.log('[adaptToRainStationProps] Standardized station ID input:', {
    numericId: station.id,
    stringId: station.stationId,
    stationName: station.name
  });
  */
  
  // Ensure we have a valid ID (prefer numeric ID if available)
  const id = station.id !== undefined && station.id !== null ? station.id : 
             (station.stationId ? parseInt(station.stationId, 10) : 0);
  
  const adapted = {
    id: id,
    sequence_number: '0',
    station_id: station.stationId || '',
    station_name: station.name || '',
    code: '',
    irrigation_office: '',
    river_basin: '',
    river_name: '',
    province: '',
    amphure: '',
    water_level: undefined,
    flow_rate: undefined,
    rainfall_3d: station.rainfallDaily || 0,
    rainfall_7d: station.rainfallWeekly || 0
  };
  
  // Debug logging - commented out to reduce console noise
  /*
  console.log('[adaptToRainStationProps] Adapted station ID for UI:', {
    id: adapted.id,
    idType: typeof adapted.id,
    station_id: adapted.station_id,
    station_idType: typeof adapted.station_id,
    station_name: adapted.station_name,
    originalStationId: station.stationId
  });
  */
  
  return adapted;
}

function adaptToReservoirProps(reservoir: StandardizedReservoir): Reservoir {
  // Debug logging - commented out to reduce console noise
  /*
  console.log('[adaptToReservoirProps] Standardized reservoir ID input:', {
    numericId: reservoir.id,
    stringId: reservoir.stationId,
    reservoirName: reservoir.name
  });
  */
  
  // Ensure we have a valid ID (prefer numeric ID if available)
  const id = reservoir.id !== undefined && reservoir.id !== null ? reservoir.id : 
             (reservoir.stationId ? parseInt(reservoir.stationId, 10) : 0);
  
  const adapted = {
    id: id,
    sequence_number: '0',
    irrigation_office: '',
    reservoir_name: reservoir.name || '',
    river_basin: '',
    river_name: '',
    amphure: '',
    province: '',
    normal_storage_capacity: reservoir.normalStorageCapacity || '0',
    minimum_storage_capacity: reservoir.minimumStorageCapacity || '0',
    type: 'reservoir' as const,
    station_id: reservoir.stationId || ''
  };
  
  // Debug logging - commented out to reduce console noise
  /*
  console.log('[adaptToReservoirProps] Adapted reservoir ID for UI:', {
    id: adapted.id,
    idType: typeof adapted.id,
    station_id: adapted.station_id,
    station_idType: typeof adapted.station_id,
    reservoir_name: adapted.reservoir_name,
    originalStationId: reservoir.stationId
  });
  */
  
  return adapted;
}

// Helper function to get station type labels
const getStationLabel = (type: 'monitoring' | 'rain' | 'reservoir') => {
  switch (type) {
    case 'monitoring':
      return 'สถานีเฝ้าระวัง';
    case 'rain':
      return 'สถานีวัดน้ำฝน';
    case 'reservoir':
      return 'เขื่อน/อ่างเก็บน้ำ';
    default:
      return 'สถานี';
  }
};

interface WaterLevelInfoCardProps {
  className?: string;
  title?: string;
  location?: {
    amphure?: string;
    province?: string;
  };
  disableAutoRefetch?: boolean;
}

// Define the props interface for WaterLevelInfoContent
interface WaterLevelInfoContentProps {
  location: {
    amphure?: string;
    province?: string;
  };
  disableAutoRefetch?: boolean;
}

const WaterLevelInfoContent: FC<WaterLevelInfoContentProps> = ({ 
  location,
  disableAutoRefetch
}) => {
  // Get the current location
  const { amphure, province } = location;
  
  // Fetch reservoir locations based on the current location
  const { data: reservoirLocationsData, isLoading: isLoadingReservoirLocations, error: reservoirLocationsError } = 
    useReservoirLocations(amphure, province);
  
  // Convert reservoir locations to ExtendedReservoir format for ReservoirCard
  const reservoirStations = useMemo(() => {
    if (!reservoirLocationsData?.locations) return [];
    
    console.log('[WaterLevelInfoCard] Processing reservoir locations for', { amphure, province }, 'got', reservoirLocationsData.locations.length, 'locations');
    
    // Log each reservoir to debug the data
    reservoirLocationsData.locations.forEach(location => {
      console.log(`[WaterLevelInfoCard] Reservoir location: id=${location.id}, reservoir_id=${location.reservoir_id}, name=${location.reservoir_name}, data_source=${location.data_source}`);
    });
    
    return reservoirLocationsData.locations.map(location => {
      // Create a type-safe representation of the reservoir data
      const source = 'system' as const; // Using 'as const' to narrow the type
      const type = 'reservoir' as const; // Using 'as const' to narrow the type
      
      return {
        id: String(location.id),
        reservoir_id: location.reservoir_id,
        reservoir_name: location.reservoir_name,
        name: location.reservoir_name,
        coordinates: {
          lat: parseFloat(location.reservoir_lat || '0'),
          lng: parseFloat(location.reservoir_long || '0')
        },
        source, // Using the const type
        type, // Using the const type
        data_source: location.data_source || 'dam', // Default to 'dam' if data_source is not provided
        province: location.province,
        amphure: location.amphure
      };
    });
  }, [reservoirLocationsData, amphure, province]);

  // Get location data from props or from Jotai state
  const { amphure: propAmphure, province: propProvince } = location || {};
  
  // Use the useLocation hook to access and manage location state
  // Destructure primitive values directly for stability
  const { amphure: locationHookAmphure, province: locationHookProvince } = useLocation();
  
  // Clean location strings for display
  const cleanedPropAmphure = propAmphure?.replace(/อำเภอ/g, '').trim();
  const cleanedPropProvince = propProvince?.replace(/จังหวัด/g, '').trim();
  
  // Prioritize props over Jotai state, but use Jotai state as fallback
  // Use the directly destructured stable primitive values from useLocation
  const displayAmphure = propAmphure || cleanedPropAmphure || locationHookAmphure;
  const displayProvince = propProvince || cleanedPropProvince || locationHookProvince;
  
  // Check if we have valid location data
  const hasValidLocationData = !!displayAmphure || !!displayProvince;
  
  // Reference to track location changes
  const prevLocationRef = useRef<{ amphure: string; province: string }>({ 
    amphure: '', 
    province: '' 
  });
  
  // Add isUpdating ref at the component level
  const isUpdatingRef = useRef(false);
  
  // Memoize the display location from props or state
  const displayLocation = useMemo(() => {
    return {
      amphure: displayAmphure || '',
      province: displayProvince || ''
    };
  }, [displayAmphure, displayProvince]);
  
  // Use the useStationManagement hook to get all station data and filtering logic
  const {
    // Available stations (already filtered to exclude disabled ones)
    allAvailableMonitoringStations,
    allAvailableRainStations,
    allAvailableReservoirs,
    
    // Loading states
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    
    // Error states
    monitoringError,
    rainError,
    reservoirsError,
    
    // Station status checks
    areAllMonitoringStationsDisabled,
    areAllRainStationsDisabled,
    areAllReservoirsDisabled,
    
    // Location update function
    updateLocation,
    
    // Current location from station management
    currentAmphure,
    currentProvince,
    
    // User-selected stations
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs
  } = useStationManagement();
  
  // Update location data in useStationManagement when component mounts or location changes
  useEffect(() => {
    // Create a stable, unique ID for this update to prevent multiple updates
    const updateId = `update-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    // Remove the useRef call here and use the component level ref
    
    // Only proceed if we're not already updating
    if (isUpdatingRef.current) {
      console.log('[WaterLevelInfoCard] Update already in progress, skipping');
      return;
    }
    
    if (displayLocation.amphure || displayLocation.province) {
      // Deep comparison to check if location has actually changed
      const hasLocationChanged = 
        displayLocation.amphure !== prevLocationRef.current.amphure || 
        displayLocation.province !== prevLocationRef.current.province;
      
      if (hasLocationChanged) {
        console.log(`[WaterLevelInfoCard] Location changed (${updateId}):`, {
          from: prevLocationRef.current,
          to: displayLocation
        });
        
        // Set updating flag
        isUpdatingRef.current = true;
        
        // Update our ref with the new values
        prevLocationRef.current = { 
          amphure: displayLocation.amphure, 
          province: displayLocation.province 
        };
        
        try {
          // Update location and trigger data fetching
          updateLocation(displayLocation.amphure, displayLocation.province);
          
          // Log the current state of user-selected stations
          console.log('[WaterLevelInfoCard] Current user-selected stations:', {
            monitoringStations: userSelectedMonitoring.length,
            rainStations: userSelectedRain.length,
            reservoirs: userSelectedReservoirs.length
          });
        } catch (error) {
          console.error('[WaterLevelInfoCard] Error updating location:', error);
        }
        
        // Reset updating flag after a delay
        setTimeout(() => {
          isUpdatingRef.current = false;
          console.log(`[WaterLevelInfoCard] Update complete (${updateId})`);
        }, 1000);
      } else {
        console.log('[WaterLevelInfoCard] Location unchanged, skipping update');
      }
    }
  }, [displayLocation.amphure, displayLocation.province, updateLocation]);
  
  // Memoize the loading state
  const isLoading = useMemo(() => 
    isLoadingMonitoring || isLoadingRain || isLoadingReservoirs,
    [isLoadingMonitoring, isLoadingRain, isLoadingReservoirs]
  );

  // Separate component state from API loading state
  const [isLoadingTimedOut, setIsLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Reset timeout when loading starts
      setIsLoadingTimedOut(false);
      
      // Set a timeout to mark loading as timed out after 10 seconds
      const timer = setTimeout(() => {
        setIsLoadingTimedOut(true);
        console.log('[WaterLevelInfoCard] Loading timeout triggered');
      }, 10000);
      
      return () => clearTimeout(timer);
    }
    
    // Reset timeout state when loading completes
    setIsLoadingTimedOut(false);
    
    return undefined;
  }, [isLoading]);

  // Adjust the isLoading calculation to include the timeout
  const effectiveIsLoading = useMemo(() => 
    // Always show loading when any data is being loaded, regardless of hasViewedInThisSession
    isLoadingMonitoring || isLoadingRain || isLoadingReservoirs || 
    isLoadingReservoirLocations,
    [
      isLoadingMonitoring, 
      isLoadingRain, 
      isLoadingReservoirs, 
      isLoadingReservoirLocations
    ]
  );
  
  // Memoize the error state
  const hasError = useMemo(() => 
    !!monitoringError || !!rainError || !!reservoirsError,
    [monitoringError, rainError, reservoirsError]
  );
  
  // Get the most relevant error message
  const errorMessage = useMemo(() => {
    if (monitoringError) return monitoringError.message;
    if (rainError) return rainError.message;
    if (reservoirsError) return reservoirsError.message;
    return 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
  }, [monitoringError, rainError, reservoirsError]);
  
  // Memoize the adapted monitoring stations for rendering
  const adaptedMonitoringStations = useMemo(() => {
    // Log all available monitoring stations including user-selected ones
    console.log('[WaterLevelInfoCard] All available monitoring stations:', {
      systemStations: allAvailableMonitoringStations.filter(s => (s as any).source === 'system').length,
      userSelectedStations: allAvailableMonitoringStations.filter(s => (s as any).source === 'user').length,
      totalStations: allAvailableMonitoringStations.length,
      stationIds: allAvailableMonitoringStations.map(s => s.id)
    });
    
    return allAvailableMonitoringStations.map(station => {
      // Use type assertion to access properties that might not exist in the type definition
      const stationAny = station as any;
      
      // Ensure the station has the required properties for the MonitoringStationCard
      return {
        id: ensureStringId(station.id),
        station_id: stationAny.station_id || String(station.id),
        station_name: stationAny.name || stationAny.station_name || `สถานีเฝ้าระวัง ${station.id}`,
        name: stationAny.name || stationAny.station_name || `สถานีเฝ้าระวัง ${station.id}`,
        status: stationAny.status || 'active',
        telemetry_data: stationAny.telemetry_data || {
          water_level: stationAny.water_level || 0,
          flow_rate: stationAny.flow_rate || 0,
          timestamp: stationAny.lastReading?.timestamp || new Date().toISOString(),
          notation: stationAny.lastReading?.notation || ''
        },
        water_level: stationAny.water_level || stationAny.telemetry_data?.water_level || 0,
        flow_rate: stationAny.flow_rate || stationAny.telemetry_data?.flow_rate || 0,
        amphure: stationAny.amphure || displayAmphure || '',
        province: stationAny.province || displayProvince || '',
        coordinates: stationAny.coordinates || { lat: 0, lng: 0 }
      };
    });
  }, [allAvailableMonitoringStations, displayAmphure, displayProvince]);
  
  // Memoize the adapted rain stations for rendering
  const adaptedRainStations = useMemo(() => {
    // Log all available rain stations
    console.log('[WaterLevelInfoCard] All available rain stations:', {
      count: allAvailableRainStations.length,
      stationIds: allAvailableRainStations.map(s => s.id),
      dataSources: allAvailableRainStations.map(s => (s as any).data_source)
    });
    
    return allAvailableRainStations.map(station => {
      // Use type assertion to access properties that might not exist in the type definition
      const stationAny = station as any;
      
      // Ensure the station has the required properties for the RainStationCard
      return {
        id: ensureStringId(station.id),
        station_id: stationAny.station_id || String(station.id),
        station_name: stationAny.name || stationAny.station_name || `สถานีวัดน้ำฝน ${station.id}`,
        name: stationAny.name || stationAny.station_name || `สถานีวัดน้ำฝน ${station.id}`,
        name_th: stationAny.name_th || null,
        status: stationAny.status || 'active',
        telemetry_data: stationAny.telemetry_data || {
          rainfall_24h: stationAny.rainfall24h || 0,
          timestamp: stationAny.lastReading?.timestamp || new Date().toISOString()
        },
        rainfall_24h: stationAny.rainfall24h || stationAny.telemetry_data?.rainfall24h || 0,
        amphure: stationAny.amphure || displayAmphure || '',
        province: stationAny.province || displayProvince || '',
        coordinates: stationAny.coordinates || { lat: 0, lng: 0 },
        // Add new fields for TMD and HII stations
        data_source: stationAny.data_source || '',
        rainfall10m: stationAny.rainfall10m || null,
        rainfall1h: stationAny.rainfall1h || null,
        rainfall3h: stationAny.rainfall3h || null,
        rainfall24h: stationAny.rainfall24h || null,
        rainfall_today: stationAny.rainfall_today || null,
        rainfall_date_calc: stationAny.rainfall_date_calc || null,
        rainfall_datetime: stationAny.rainfall_datetime || null
      };
    });
  }, [allAvailableRainStations, displayAmphure, displayProvince]);
  
  // Memoize the adapted reservoirs for rendering
  const adaptedReservoirs = useMemo(() => {
    // Log all available reservoirs
    console.log('[WaterLevelInfoCard] All available reservoirs:', {
      systemReservoirs: allAvailableReservoirs.filter(r => (r as any).source === 'system').length,
      userSelectedReservoirs: allAvailableReservoirs.filter(r => (r as any).source === 'user').length,
      totalReservoirs: allAvailableReservoirs.length,
      reservoirIds: allAvailableReservoirs.map(r => r.id)
    });
    
    return allAvailableReservoirs.map(reservoir => {
      // Use type assertion to access properties that might not exist in the type definition
      const reservoirAny = reservoir as any;
      
      // Ensure the reservoir has the required properties for the ReservoirCard
      return {
        id: ensureStringId(reservoir.id),
        reservoir_id: reservoirAny.reservoir_id || String(reservoir.id),
        reservoir_name: reservoirAny.name || reservoirAny.reservoir_name || `เขื่อน/อ่างเก็บน้ำ ${reservoir.id}`,
        name: reservoirAny.name || reservoirAny.reservoir_name || `เขื่อน/อ่างเก็บน้ำ ${reservoir.id}`,
        status: reservoirAny.status || 'active',
        telemetry_data: reservoirAny.telemetry_data || {
          storage_percent: reservoirAny.storage_percent || 0,
          storage_volume: reservoirAny.storage_volume || 0,
          timestamp: reservoirAny.lastReading?.timestamp || new Date().toISOString()
        },
        storage_percent: reservoirAny.storage_percent || reservoirAny.telemetry_data?.storage_percent || 0,
        storage_volume: reservoirAny.storage_volume || reservoirAny.telemetry_data?.storage_volume || 0,
        amphure: reservoirAny.amphure || displayAmphure || '',
        province: reservoirAny.province || displayProvince || '',
        coordinates: reservoirAny.coordinates || { lat: 0, lng: 0 }
      };
    });
  }, [allAvailableReservoirs, displayAmphure, displayProvince]);
  
  // Check if we have any stations to display
  const hasStations = useMemo(() => 
    adaptedMonitoringStations.length > 0 || 
    adaptedRainStations.length > 0 || 
    adaptedReservoirs.length > 0,
    [adaptedMonitoringStations.length, adaptedRainStations.length, adaptedReservoirs.length]
  );
  
  // Memoize the monitoring stations section
  const monitoringStationsSection = useMemo(() => {
    // Check for loading state (only if there's no error)
    if (adaptedMonitoringStations.length === 0) {
      if (isLoadingMonitoring && !monitoringError) {
        return (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">กำลังโหลดข้อมูลสถานีเฝ้าระวัง...</span>
          </div>
        );
      }
      
      // Show error state if we have an error
      if (monitoringError) {
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลสถานีเฝ้าระวัง: {monitoringError.message}
            </AlertDescription>
          </Alert>
        );
      }
      
      // Show empty state if we have no stations
      return (
        <div className="text-muted-foreground flex flex-col items-center justify-center p-4 border rounded-md bg-muted/10 my-4">
          <AlertCircle className="h-6 w-6 mb-2 text-yellow-500" />
          <p>ไม่พบข้อมูลสถานีตรวจวัดน้ำสำหรับพื้นที่นี้</p>
          <p className="text-sm mt-1">โปรดลองเลือกพื้นที่อื่น หรือเพิ่มสถานีด้วยตนเอง</p>
        </div>
      );
    }
    
    return (
      <div>
        <h3 className="text-base font-medium text-gray-700 mb-3">
          {getStationLabel('monitoring')} ({adaptedMonitoringStations.length})
        </h3>
        <div className="space-y-8">
          {adaptedMonitoringStations.map((station) => (
            <MonitoringStationCard
              key={station.id}
              station={station}
              showButtons={false}
              hideUnitLabels={false}
              isLoading={!!(isLoadingMonitoring && !monitoringError)}
              error={monitoringError}
            />
          ))}
        </div>
      </div>
    );
  }, [adaptedMonitoringStations, isLoadingMonitoring, monitoringError]);
  
  // Memoize the rain stations section
  const rainStationsSection = useMemo(() => {
    // Add empty state for no rain stations
    if (adaptedRainStations.length === 0) {
      if (isLoadingRain && !rainError) {
        return (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">กำลังโหลดข้อมูลสถานีวัดน้ำฝน...</span>
          </div>
        );
      }
      
      // Show error state if we have an error
      if (rainError) {
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลสถานีวัดน้ำฝน: {rainError.message}
            </AlertDescription>
          </Alert>
        );
      }
      
      return (
        <div className="text-muted-foreground flex flex-col items-center justify-center p-4 border rounded-md bg-muted/10 my-4">
          <AlertCircle className="h-6 w-6 mb-2 text-yellow-500" />
          <p>ไม่พบข้อมูลสถานีตรวจวัดฝนสำหรับพื้นที่นี้</p>
          <p className="text-sm mt-1">โปรดลองเลือกพื้นที่อื่น หรือเพิ่มสถานีด้วยตนเอง</p>
        </div>
      );
    }
    
    return (
      <div>
        <h3 className="text-base font-medium text-gray-700 mb-3">
          {getStationLabel('rain')} ({adaptedRainStations.length})
        </h3>
        <div className="space-y-8">
          {adaptedRainStations.map((station) => (
            <RainStationCard
              key={station.id}
              station={station}
              showButtons={false}
              hideUnitLabels={true}
              disableAutoRefetch={disableAutoRefetch}
            />
          ))}
        </div>
      </div>
    );
  }, [adaptedRainStations, isLoadingRain, rainError, disableAutoRefetch]);
  
  // Memoize the reservoirs section
  const reservoirsSection = useMemo(() => {
    // Add empty state for no reservoirs
    if (adaptedReservoirs.length === 0) {
      if (isLoadingReservoirs && !reservoirsError) {
        return (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">กำลังโหลดข้อมูลอ่างเก็บน้ำ...</span>
          </div>
        );
      }
      
      // Show error state if we have an error
      if (reservoirsError) {
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลอ่างเก็บน้ำ: {reservoirsError.message}
            </AlertDescription>
          </Alert>
        );
      }
      
      return (
        <div className="text-muted-foreground flex flex-col items-center justify-center p-4 border rounded-md bg-muted/10 my-4">
          <AlertCircle className="h-6 w-6 mb-2 text-yellow-500" />
          <p>ไม่พบข้อมูลอ่างเก็บน้ำสำหรับพื้นที่นี้</p>
          <p className="text-sm mt-1">โปรดลองเลือกพื้นที่อื่น หรือเพิ่มอ่างเก็บน้ำด้วยตนเอง</p>
        </div>
      );
    }
    
    return (
      <div>
        <h3 className="text-base font-medium text-gray-700 mb-3">
          {getStationLabel('reservoir')} ({adaptedReservoirs.length})
        </h3>
        <div className="space-y-8">
          {adaptedReservoirs.map((reservoir) => (
            <ReservoirCard
              key={reservoir.id}
              reservoir={reservoir}
              showButtons={false}
              hideUnitLabels={true}
            />
          ))}
        </div>
      </div>
    );
  }, [adaptedReservoirs, isLoadingReservoirs, reservoirsError]);
  
  // Render repository section with location-based data
  const renderReservoirSection = () => {
    if (isLoadingReservoirLocations && !reservoirLocationsError) {
      return (
        <div className="flex justify-center items-center p-4">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>กำลังโหลดข้อมูลเขื่อน/อ่างเก็บน้ำ...</span>
        </div>
      );
    }

    if (reservoirLocationsError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ไม่สามารถโหลดข้อมูลเขื่อน/อ่างเก็บน้ำได้
          </AlertDescription>
        </Alert>
      );
    }

    if (reservoirStations.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ไม่พบข้อมูลเขื่อน/อ่างเก็บน้ำในพื้นที่{amphure ? ` ${amphure}` : ''}{province ? ` ${province}` : ''}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {reservoirStations.map((reservoir) => (
          <ErrorBoundary key={reservoir.id} fallback={<div>Error loading reservoir data</div>}>
            <ReservoirCard reservoir={reservoir} />
          </ErrorBoundary>
        ))}
      </div>
    );
  };
  
  // Add a helper function to display empty states when all stations are missing
  const renderEmptyState = () => {
    return (
      <div className="space-y-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-700">ข้อมูลระดับน้ำ</h3>
        </div>
        
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
          <div className="flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
            <h4 className="text-base font-medium text-gray-700">ไม่พบข้อมูลสถานีในพื้นที่</h4>
            <p className="text-sm text-gray-500 mt-2">
              ไม่พบข้อมูลสถานีตรวจวัดน้ำ, สถานีวัดน้ำฝน, หรือเขื่อน/อ่างเก็บน้ำในพื้นที่ {displayLocation.amphure || ''} {displayLocation.province || ''}
            </p>
            
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => updateLocation(displayLocation.amphure, displayLocation.province)}
            >
              ลองค้นหาอีกครั้ง
            </Button>
          </div>
        </div>
        
        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">ข้อแนะนำ:</span>{' '}
            <span className="text-gray-600">
              ลองเลือกพื้นที่อื่น หรือเพิ่มสถานีเฝ้าระวังด้วยตนเอง
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  };
  
  if (!hasValidLocationData) {
    return (
      <Alert className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          กรุณาระบุตำแหน่งที่ต้องการค้นหาข้อมูลสถานี (อำเภอหรือจังหวัด)
        </AlertDescription>
      </Alert>
    );
  }
  
  if (effectiveIsLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-8 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#42A5F5]" />
        <p className="text-sm text-[#64748B]">
          กำลังค้นหาสถานีในพื้นที่ {displayAmphure || ''} {displayProvince || ''}
        </p>
        
        <LoadingTimeout 
          show={isLoadingTimedOut}
          locationInfo={displayLocation}
          onRetry={() => {
            setIsLoadingTimedOut(false);
            updateLocation(displayLocation.amphure, displayLocation.province);
          }}
        />
      </div>
    );
  }
  
  if (hasError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          เกิดข้อผิดพลาดในการโหลดข้อมูล: {errorMessage}
          <div className="mt-2">
            <Button 
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => updateLocation(displayAmphure, displayProvince)}
            >
              ลองใหม่อีกครั้ง
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  // If we have no stations at all, show the empty state
  if (!hasStations) {
    return renderEmptyState();
  }
  
  // Otherwise render the stations we have
  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748B]">
        แสดงข้อมูล: สถานีเฝ้าระวัง {adaptedMonitoringStations.length}, 
        สถานีวัดน้ำฝน {adaptedRainStations.length}, 
        เขื่อน/อ่างเก็บน้ำ {adaptedReservoirs.length}
      </p>
      
      <div className="space-y-8">
        {adaptedMonitoringStations.length > 0 && monitoringStationsSection}
        {adaptedRainStations.length > 0 && rainStationsSection}
        {adaptedReservoirs.length > 0 && reservoirsSection}
        
        {reservoirStations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">เขื่อน/อ่างเก็บน้ำ {reservoirStations.length > 0 && `(${reservoirStations.length})`}</h3>
            {renderReservoirSection()}
          </div>
        )}
      </div>
    </div>
  );
};

// New component for loading timeout message
interface LoadingTimeoutProps {
  show: boolean;
  locationInfo: {
    amphure?: string;
    province?: string;
  };
  onRetry: () => void;
}

const LoadingTimeout: React.FC<LoadingTimeoutProps> = ({ 
  show, 
  locationInfo,
  onRetry 
}) => {
  if (!show) return null;
  
  return (
    <div className="text-amber-600 border border-amber-200 rounded-md p-4 mt-4 bg-amber-50 max-w-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">
            การโหลดข้อมูลใช้เวลานานกว่าปกติ
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>อาจเกิดจากไม่พบข้อมูลสถานีตรวจวัดในพื้นที่ {locationInfo.amphure}, {locationInfo.province} หรือมีปัญหาการเชื่อมต่อกับเซิร์ฟเวอร์</p>
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center rounded-md border border-transparent bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WaterLevelInfoCard: FC<WaterLevelInfoCardProps> = ({ 
  className = "",
  title = "ข้อมูลระดับน้ำ",
  location,
  disableAutoRefetch
}) => {
  // Use the useLocation hook to access location state
  const locationState = useLocation();
  
  // Get location from props or from Jotai state
  const { amphure: propAmphure, province: propProvince } = location || {};
  const amphure = propAmphure || locationState.amphure;
  const province = propProvince || locationState.province;
  
  // Track component mounting to avoid multiple data fetches
  const [hasMounted, setHasMounted] = useState(false);
  
  // Add a state for data load attempts to avoid infinite loading
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // When component mounts, mark it as mounted
  useEffect(() => {
    setHasMounted(true);
    return () => {
      // Reset when unmounted
      setHasMounted(false);
      setLoadAttempts(0);
    };
  }, []);
  
  // If load attempts exceed threshold, force display content even if still loading
  const maxLoadAttempts = 2;
  const shouldForceDisplay = loadAttempts > maxLoadAttempts;
  
  // Increment load attempts when loading state persists
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasMounted) {
      // After 5 seconds of loading, increment attempt counter
      timer = setTimeout(() => {
        setLoadAttempts(prev => prev + 1);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [hasMounted]);
  
  return (
    <Card className={cn("w-full h-full bg-white", className)}>
      <CardHeader className="bg-transparent border-b border-gray-100">
        <CardTitle className="text-xl font-semibold text-[#17254D]">{title}</CardTitle>
        <CardDescription>
          {amphure && province 
            ? `${amphure} ${province}` 
            : locationState.getFormattedLocation()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBoundary fallback={
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              เกิดข้อผิดพลาดในการโหลดข้อมูล 
              <Button
                onClick={() => window.location.reload()}
                variant="link"
                className="px-2 py-0 h-auto text-primary underline"
              >
                โหลดหน้าใหม่
              </Button>
            </AlertDescription>
          </Alert>
        }>
          <WaterLevelInfoContent 
            location={location || {
              amphure: locationState.amphure,
              province: locationState.province
            }} 
            disableAutoRefetch={disableAutoRefetch}
          />
        </ErrorBoundary>
        
        {/* Add a fallback show if data persistently fails to load */}
        {shouldForceDisplay && (
          <div className="mt-4 p-4 border-t border-amber-100">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-1 mr-2" />
              <div>
                <p className="text-sm text-amber-800 font-semibold">
                  การแสดงข้อมูลอาจไม่สมบูรณ์
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  ระบบพยายามโหลดข้อมูลหลายครั้งแล้ว หากยังไม่พบข้อมูลที่ต้องการ
                  โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือลองเลือกพื้นที่อื่น
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 