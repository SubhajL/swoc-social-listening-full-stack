import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { cn } from "@/lib/utils";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";
import { 
  monitoringStationsQueryAtom, 
  rainStationsQueryAtom, 
  reservoirsQueryAtom,
  userSelectedMonitoringStationsAtom,
  userSelectedRainStationsAtom,
  userSelectedReservoirsAtom,
  disabledMonitoringStationsAtom,
  disabledRainStationsAtom,
  disabledReservoirsAtom
} from '@/atoms/stationData';
import { useAtom } from 'jotai';

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
    type: reservoir.type,
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

// Helper function to get appropriate station label based on type
const getStationLabel = (type: string) => {
  switch (type) {
    case "monitoring":
      return "สถานีเฝ้าระวัง";
    case "rain":
      return "สถานีวัดน้ำฝน";
    case "reservoir":
      return "เขื่อน/อ่างเก็บน้ำ";
    default:
      return "Unknown station";
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

const WaterLevelInfoContent: React.FC<WaterLevelInfoContentProps> = ({ location }) => {
  const { amphure, province } = location || {};
  
  // Clean location strings for display
  const cleanedAmphure = amphure?.replace(/อำเภอ/g, '').trim();
  const cleanedProvince = province?.replace(/จังหวัด/g, '').trim();
  
  // Format locations for display
  const displayAmphure = amphure ? amphure : cleanedAmphure;
  const displayProvince = province ? province : cleanedProvince;
  
  // Get stations from query atoms
  const [monitoringStations] = useAtom(monitoringStationsQueryAtom);
  const [rainStations] = useAtom(rainStationsQueryAtom);
  const [reservoirs] = useAtom(reservoirsQueryAtom);
  
  // Get user-selected stations
  const [userSelectedMonitoringStations] = useAtom(userSelectedMonitoringStationsAtom);
  const [userSelectedRainStations] = useAtom(userSelectedRainStationsAtom);
  const [userSelectedReservoirs] = useAtom(userSelectedReservoirsAtom);
  
  // Get disabled stations
  const [disabledMonitoringStations] = useAtom(disabledMonitoringStationsAtom);
  const [disabledRainStations] = useAtom(disabledRainStationsAtom);
  const [disabledReservoirs] = useAtom(disabledReservoirsAtom);
  
  const [isLoading, setIsLoading] = useState(true);

  // Set loading to false after data is fetched
  useEffect(() => {
    if (monitoringStations !== undefined && rainStations !== undefined && reservoirs !== undefined) {
      setIsLoading(false);
    }
  }, [monitoringStations, rainStations, reservoirs]);

  /**
   * Extracts stations from the data and filters out disabled ones
   * @param stations The stations to extract
   * @param disabledStationsMap Map of disabled station IDs
   * @param stationType Type of station for logging
   * @returns Array of station IDs
   */
  const extractStations = (
    stations: any[],
    disabledStationsMap: Record<string, boolean>,
    stationType: string
  ): string[] => {
    console.log(`[WaterLevelInfoCard] Extracting ${stationType} stations:`, {
      totalStations: stations?.length || 0,
      disabledCount: Object.keys(disabledStationsMap || {}).length
    });
    
    if (!stations || !Array.isArray(stations)) {
      console.warn(`[WaterLevelInfoCard] No ${stationType} stations data available`);
      return [];
    }
    
    // Filter out disabled stations and extract IDs
    const filteredStations = stations
      .filter(station => {
        const stationId = String(station.id);
        const isDisabled = disabledStationsMap[stationId];
        
        if (isDisabled) {
          console.log(`[WaterLevelInfoCard] Filtering out disabled ${stationType} station:`, {
            id: stationId,
            name: station.station_name || station.name || station.reservoir_name
          });
        }
        
        return !isDisabled;
      })
      .map(station => String(station.id));
    
    console.log(`[WaterLevelInfoCard] Extracted ${stationType} stations:`, {
      originalCount: stations.length,
      filteredCount: filteredStations.length,
      filteredIds: filteredStations
    });
    
    return filteredStations;
  };
  
  // Log data for debugging
  /* 
  console.log('[WaterLevelInfoCard] Data:', {
    monitoringStations: monitoringStations,
    monitoringStationsType: typeof monitoringStations,
    monitoringStationsIsArray: Array.isArray(monitoringStations),
    monitoringStationsLength: Array.isArray(monitoringStations) ? monitoringStations.length : 'not an array',
    extractedMonitoringStations: extractStations(monitoringStations),
    extractedMonitoringStationsLength: extractStations(monitoringStations).length,
    
    rainStations: rainStations,
    rainStationsType: typeof rainStations,
    rainStationsIsArray: Array.isArray(rainStations),
    rainStationsLength: Array.isArray(rainStations) ? rainStations.length : 'not an array',
    extractedRainStations: extractStations(rainStations),
    extractedRainStationsLength: extractStations(rainStations).length,
    
    reservoirs: reservoirs,
    reservoirsType: typeof reservoirs,
    reservoirsIsArray: Array.isArray(reservoirs),
    reservoirsLength: Array.isArray(reservoirs) ? reservoirs.length : 'not an array',
    extractedReservoirs: extractStations(reservoirs),
    extractedReservoirsLength: extractStations(reservoirs).length,
    
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs
  });
  */
  
  // Extract stations from the data with proper filtering
  const extractedMonitoringStations = extractStations(monitoringStations, disabledMonitoringStations, 'monitoring');
  const extractedRainStations = extractStations(rainStations, disabledRainStations, 'rain');
  const extractedReservoirs = extractStations(reservoirs, disabledReservoirs, 'reservoir');
  
  // Convert to standardized format
  const standardizedMonitoringStations: StandardizedMonitoringStation[] = extractedMonitoringStations
    .map(station => {
      const isValid = isFetchedMonitoringStation(station);
      if (isValid) {
        return mapToStandardizedMonitoringStation(station);
      }
      return null;
    })
    .filter(Boolean) as StandardizedMonitoringStation[];
  
  const standardizedRainStations: StandardizedRainStation[] = extractedRainStations
    .map(station => {
      const isValid = isFetchedRainStation(station);
      if (isValid) {
        return mapToStandardizedRainStation(station);
      }
      return null;
    })
    .filter(Boolean) as StandardizedRainStation[];
  
  const standardizedReservoirs: StandardizedReservoir[] = extractedReservoirs
    .map(reservoir => {
      const isValid = isFetchedReservoir(reservoir);
      if (isValid) {
        return mapToStandardizedReservoir(reservoir);
      }
      return null;
    })
    .filter(Boolean) as StandardizedReservoir[];
  
  // Define proper interfaces for the component props
  interface ExtendedMonitoringStation {
    id: string;
    station_id: string;
    station_name: string;
    code: string;
    irrigation_office: string;
    river_basin: string;
    river_name: string;
    amphure: string;
    province: string;
    bank_level_meters: string;
    ground_level_meters: string;
    warning_level_meters: string;
    critical_level_meters: string;
    telemetry_data?: {
      timestamp: string;
      water_level: number | null;
      flow_rate: number | null;
      notation: string | null;
    };
  }

  interface ExtendedRainStation {
    id: string;
    sequence_number: string | null;
    station_id: string | null;
    station_name: string | null;
    code: string | null;
    irrigation_office: string | null;
    river_basin: string | null;
    river_name: string | null;
    amphure: string | null;
    province: string | null;
    rainfall_1h?: number;
    rainfall_24h?: number;
    rainfall_7d?: number;
  }

  interface ExtendedReservoir {
    id: string;
    sequence_number: string | null;
    irrigation_office: string | null;
    reservoir_name: string | null;
    river_basin: string | null;
    river_name: string | null;
    amphure: string | null;
    province: string | null;
    capacity: string | null;
    current_storage: string | null;
    percent_storage: string | null;
    station_id?: string | null;
  }

  // Convert to component props format with string IDs
  const validMonitoringStations: ExtendedMonitoringStation[] = standardizedMonitoringStations.map(station => {
    const adapted = adaptToMonitoringStationProps(station);
    // Ensure ID is a string
    return {
      ...adapted,
      id: String(adapted.id)
    };
  });
  
  const validRainStations: ExtendedRainStation[] = standardizedRainStations.map(station => {
    const adapted = adaptToRainStationProps(station);
    // Ensure ID is a string
    return {
      ...adapted,
      id: String(adapted.id)
    };
  });
  
  const validReservoirs: ExtendedReservoir[] = standardizedReservoirs.map(reservoir => {
    const adapted = adaptToReservoirProps(reservoir);
    // Ensure ID is a string
    return {
      ...adapted,
      id: String(adapted.id)
    };
  });
  
  // Get filtered user-selected stations (removing disabled ones)
  const filteredUserMonitoringStations = userSelectedMonitoringStations.filter(station => {
    // Filter out disabled stations
    const stationId = String(station.id);
    return !disabledMonitoringStations[stationId];
  });
  
  const filteredUserRainStations = userSelectedRainStations.filter(station => {
    // Filter out disabled stations
    const stationId = String(station.id);
    return !disabledRainStations[stationId];
  });
  
  const filteredUserReservoirs = userSelectedReservoirs.filter(reservoir => {
    // Filter out disabled reservoirs
    const reservoirId = String(reservoir.id);
    return !disabledReservoirs[reservoirId];
  });
  
  // Update the combined arrays with proper type casting
  const allMonitoringStations = [
    ...filteredUserMonitoringStations,
    ...validMonitoringStations.filter(station => 
      !filteredUserMonitoringStations.some(userStation => String(userStation.id) === String(station.id))
    )
  ] as unknown as ExtendedMonitoringStation[];

  const allRainStations = [
    ...filteredUserRainStations,
    ...validRainStations.filter(station => 
      !filteredUserRainStations.some(userStation => String(userStation.id) === String(station.id))
    )
  ] as unknown as ExtendedRainStation[];

  const allReservoirs = [
    ...filteredUserReservoirs,
    ...validReservoirs.filter(reservoir => 
      !filteredUserReservoirs.some(userReservoir => String(userReservoir.id) === String(reservoir.id))
    )
  ] as unknown as ExtendedReservoir[];
  
  // Update the station arrays with the correct types
  const monitoringStationArray: ExtendedMonitoringStation[] = allMonitoringStations;
  const rainStationArray: ExtendedRainStation[] = allRainStations;
  const reservoirArray: ExtendedReservoir[] = allReservoirs;
  
  // Check if we have any stations to display
  const hasStations = allMonitoringStations.length > 0 || allRainStations.length > 0 || allReservoirs.length > 0;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#42A5F5]" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748B]">
        กำลังค้นหา: สถานีเฝ้าระวัง {allMonitoringStations.length}, สถานีวัดน้ำฝน {allRainStations.length}, เขื่อน/อ่างเก็บน้ำ {allReservoirs.length}
      </p>
      
      {!hasStations ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ไม่พบข้อมูลสถานีในพื้นที่ {displayAmphure || 'ไม่ระบุอำเภอ'} {displayProvince || 'ไม่ระบุจังหวัด'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-8">
          {allMonitoringStations.length > 0 && (
            <div>
              <h3 className="text-base font-medium text-gray-700 mb-3">{getStationLabel('monitoring')} ({allMonitoringStations.length})</h3>
              <div className="space-y-8">
                {monitoringStationArray.map((station) => (
                  <MonitoringStationCard
                    key={station.id}
                    station={station as any}
                    showButtons={false}
                  />
                ))}
              </div>
            </div>
          )}
          
          {allRainStations.length > 0 && (
            <div>
              <h3 className="text-base font-medium text-gray-700 mb-3">{getStationLabel('rain')} ({allRainStations.length})</h3>
              <div className="space-y-8">
                {rainStationArray.map((station) => (
                  <RainStationCard
                    key={station.id}
                    station={station as any}
                    showButtons={false}
                  />
                ))}
              </div>
            </div>
          )}
          
          {allReservoirs.length > 0 && (
            <div>
              <h3 className="text-base font-medium text-gray-700 mb-3">{getStationLabel('reservoir')} ({allReservoirs.length})</h3>
              <div className="space-y-8">
                {reservoirArray.map((reservoir) => (
                  <ReservoirCard
                    key={reservoir.id}
                    reservoir={reservoir as any}
                    showButtons={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const WaterLevelInfoCard: React.FC<WaterLevelInfoCardProps> = ({ 
  className = "",
  title = "ข้อมูลระดับน้ำ",
  location
}) => {
  const { amphure, province } = location || {};
  
  return (
    <Card className={cn("w-full min-h-[500px]", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-[#17254D]">{title}</CardTitle>
        <CardDescription>
          {amphure && province 
            ? `${amphure} ${province}` 
            : 'ไม่ระบุตำแหน่ง'}
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
          <WaterLevelInfoContent location={location || {}} />
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
}; 