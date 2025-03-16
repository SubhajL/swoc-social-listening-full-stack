import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo, FC } from "react";
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
}

// Define the props interface for WaterLevelInfoContent
interface WaterLevelInfoContentProps {
  location: {
    amphure?: string;
    province?: string;
  };
}

const WaterLevelInfoContent: FC<WaterLevelInfoContentProps> = ({ location }) => {
  // Get location data from props or from Jotai state
  const { amphure: propAmphure, province: propProvince } = location || {};
  
  // Use the useLocation hook to access and manage location state
  const locationState = useLocation();
  
  // Clean location strings for display
  const cleanedPropAmphure = propAmphure?.replace(/อำเภอ/g, '').trim();
  const cleanedPropProvince = propProvince?.replace(/จังหวัด/g, '').trim();
  
  // Prioritize props over Jotai state, but use Jotai state as fallback
  const displayAmphure = propAmphure || cleanedPropAmphure || locationState.amphure;
  const displayProvince = propProvince || cleanedPropProvince || locationState.province;
  
  // Check if we have valid location data
  const hasValidLocationData = !!displayAmphure || !!displayProvince;
  
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
    if (displayAmphure || displayProvince) {
      console.log('[WaterLevelInfoCard] Setting location data:', {
        amphure: displayAmphure,
        province: displayProvince
      });
      
      // Update location and trigger data fetching
      updateLocation(displayAmphure, displayProvince);
      
      // Log the current state of user-selected stations
      console.log('[WaterLevelInfoCard] Current user-selected stations:', {
        monitoringStations: userSelectedMonitoring.length,
        rainStations: userSelectedRain.length,
        reservoirs: userSelectedReservoirs.length
      });
    }
  }, [displayAmphure, displayProvince, updateLocation, userSelectedMonitoring, userSelectedRain, userSelectedReservoirs]);
  
  // Memoize the loading state
  const isLoading = useMemo(() => 
    isLoadingMonitoring || isLoadingRain || isLoadingReservoirs,
    [isLoadingMonitoring, isLoadingRain, isLoadingReservoirs]
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
        status: stationAny.status || 'active',
        telemetry_data: stationAny.telemetry_data || {
          rainfall_24h: stationAny.rainfall_24h || 0,
          timestamp: stationAny.lastReading?.timestamp || new Date().toISOString()
        },
        rainfall_24h: stationAny.rainfall_24h || stationAny.telemetry_data?.rainfall_24h || 0,
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
    if (adaptedMonitoringStations.length === 0) return null;
    
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
            />
          ))}
        </div>
      </div>
    );
  }, [adaptedMonitoringStations]);
  
  // Memoize the rain stations section
  const rainStationsSection = useMemo(() => {
    if (adaptedRainStations.length === 0) return null;
    
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
            />
          ))}
        </div>
      </div>
    );
  }, [adaptedRainStations]);
  
  // Memoize the reservoirs section
  const reservoirsSection = useMemo(() => {
    if (adaptedReservoirs.length === 0) return null;
    
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
  }, [adaptedReservoirs]);
  
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
  
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-8 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#42A5F5]" />
        <p className="text-sm text-[#64748B]">
          กำลังค้นหาสถานีในพื้นที่ {displayAmphure || ''} {displayProvince || ''}
        </p>
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
            <button 
              className="text-sm underline"
              onClick={() => updateLocation(displayAmphure, displayProvince)}
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748B]">
        กำลังค้นหา: สถานีเฝ้าระวัง {adaptedMonitoringStations.length}, 
        สถานีวัดน้ำฝน {adaptedRainStations.length}, 
        เขื่อน/อ่างเก็บน้ำ {adaptedReservoirs.length}
      </p>
      
      {!hasStations && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ไม่พบข้อมูลสถานีในพื้นที่ {displayAmphure || 'ไม่ระบุอำเภอ'} {displayProvince || 'ไม่ระบุจังหวัด'}
          </AlertDescription>
        </Alert>
      )}
      
      {hasStations && (
        <div className="space-y-8">
          {monitoringStationsSection}
          {rainStationsSection}
          {reservoirsSection}
        </div>
      )}
    </div>
  );
};

export const WaterLevelInfoCard: FC<WaterLevelInfoCardProps> = ({ 
  className = "",
  title = "ข้อมูลระดับน้ำ",
  location
}) => {
  // Use the useLocation hook to access location state
  const locationState = useLocation();
  
  // Get location from props or from Jotai state
  const { amphure: propAmphure, province: propProvince } = location || {};
  const amphure = propAmphure || locationState.amphure;
  const province = propProvince || locationState.province;
  
  return (
    <Card className={cn("w-full min-h-[500px]", className)}>
      <CardHeader>
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
            </AlertDescription>
          </Alert>
        }>
          <WaterLevelInfoContent location={location || {
            amphure: locationState.amphure,
            province: locationState.province
          }} />
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
}; 