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
import { monitoringStationsQueryAtom, rainStationsQueryAtom, reservoirsQueryAtom } from '@/atoms/stationData';
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
  console.log('[adaptToMonitoringStationProps] Standardized station ID input:', {
    numericId: station.id,
    stringId: station.stationId,
    stationName: station.name
  });
  
  const adapted = {
    id: station.id,
    station_id: station.stationId,
    station_name: station.name,
    code: '',
    irrigation_office: '',
    river_basin: '',
    river_name: '',
    province: '',
    amphure: '',
    bank_level_meters: '0',
    capacity_cms: '0',
    pole_center_msl: '0',
    water_level: station.waterLevel,
    flow_rate: station.flowRate,
    telemetry_data: station.telemetryData ? {
      timestamp: station.telemetryData.timestamp,
      water_level: station.telemetryData.waterLevel,
      flow_rate: station.telemetryData.flowRate,
      notation: station.telemetryData.notation
    } : undefined
  };
  
  console.log('[adaptToMonitoringStationProps] Adapted station ID for UI:', {
    id: adapted.id,
    idType: typeof adapted.id,
    station_id: adapted.station_id,
    station_idType: typeof adapted.station_id,
    station_name: adapted.station_name,
    originalStationId: station.stationId
  });
  
  return adapted;
}

function adaptToRainStationProps(station: StandardizedRainStation): RainStation {
  console.log('[adaptToRainStationProps] Standardized station ID input:', {
    numericId: station.id,
    stringId: station.stationId,
    stationName: station.name
  });
  
  const adapted = {
    id: station.id,
    sequence_number: '0',
    station_id: station.stationId,
    station_name: station.name,
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
  
  console.log('[adaptToRainStationProps] Adapted station ID for UI:', {
    id: adapted.id,
    idType: typeof adapted.id,
    station_id: adapted.station_id,
    station_idType: typeof adapted.station_id,
    station_name: adapted.station_name,
    originalStationId: station.stationId
  });
  
  return adapted;
}

function adaptToReservoirProps(reservoir: StandardizedReservoir): Reservoir {
  console.log('[adaptToReservoirProps] Standardized reservoir ID input:', {
    numericId: reservoir.id,
    stringId: reservoir.stationId,
    reservoirName: reservoir.name
  });
  
  const adapted = {
    id: reservoir.id,
    sequence_number: '0',
    irrigation_office: '',
    reservoir_name: reservoir.name,
    river_basin: '',
    river_name: '',
    amphure: '',
    province: '',
    normal_storage_capacity: reservoir.normalStorageCapacity || '0',
    minimum_storage_capacity: reservoir.minimumStorageCapacity || '0',
    type: reservoir.type,
    station_id: reservoir.stationId
  };
  
  console.log('[adaptToReservoirProps] Adapted reservoir ID for UI:', {
    id: adapted.id,
    idType: typeof adapted.id,
    station_id: adapted.station_id,
    station_idType: typeof adapted.station_id,
    reservoir_name: adapted.reservoir_name,
    originalStationId: reservoir.stationId
  });
  
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
  
  const [monitoringStations] = useAtom(monitoringStationsQueryAtom);
  const [rainStations] = useAtom(rainStationsQueryAtom);
  const [reservoirs] = useAtom(reservoirsQueryAtom);
  const [isLoading, setIsLoading] = useState(true);

  // Set loading to false after data is fetched
  useEffect(() => {
    if (monitoringStations !== undefined && rainStations !== undefined && reservoirs !== undefined) {
      setIsLoading(false);
    }
  }, [monitoringStations, rainStations, reservoirs]);

  // Helper function to extract stations from potentially nested data structures
  const extractStations = (data: any): any[] => {
    if (!data) return [];
    
    // If it's an array, return it
    if (Array.isArray(data)) return data;
    
    // If it has a 'stations' property that's an array, return that
    if (data.stations && Array.isArray(data.stations)) return data.stations;
    
    // If it has a 'data' property that's an array, return that
    if (data.data && Array.isArray(data.data)) return data.data;
    
    // If it has a 'data' property with a 'stations' property that's an array, return that
    if (data.data?.stations && Array.isArray(data.data.stations)) return data.data.stations;
    
    // If it has a 'reservoirs' property that's an array, return that
    if (data.reservoirs && Array.isArray(data.reservoirs)) return data.reservoirs;
    
    // If it's an object with keys that might be stations, convert to array
    if (typeof data === 'object' && data !== null) {
      const possibleStations = Object.values(data);
      if (possibleStations.length > 0 && possibleStations.every(item => item && typeof item === 'object')) {
        return possibleStations;
      }
    }
    
    // Return empty array if we couldn't find stations
    console.warn('[extractStations] Could not extract stations from data:', data);
    return [];
  };

  // Extract stations from potentially nested data structures
  const extractedMonitoringStations = extractStations(monitoringStations);
  const extractedRainStations = extractStations(rainStations);
  const extractedReservoirs = extractStations(reservoirs);

  console.log('[WaterLevelInfoContent] Raw data:', {
    monitoringStations: monitoringStations,
    monitoringStationsType: typeof monitoringStations,
    monitoringStationsIsArray: Array.isArray(monitoringStations),
    monitoringStationsLength: Array.isArray(monitoringStations) ? monitoringStations.length : 'not an array',
    extractedMonitoringStations,
    extractedMonitoringStationsLength: extractedMonitoringStations.length,
    rainStations: rainStations,
    rainStationsType: typeof rainStations,
    rainStationsIsArray: Array.isArray(rainStations),
    rainStationsLength: Array.isArray(rainStations) ? rainStations.length : 'not an array',
    extractedRainStations,
    extractedRainStationsLength: extractedRainStations.length,
    reservoirs: reservoirs,
    reservoirsType: typeof reservoirs,
    reservoirsIsArray: Array.isArray(reservoirs),
    reservoirsLength: Array.isArray(reservoirs) ? reservoirs.length : 'not an array',
    extractedReservoirs,
    extractedReservoirsLength: extractedReservoirs.length,
    isLoading
  });

  // Process monitoring stations with type safety
  const standardizedMonitoringStations: StandardizedMonitoringStation[] = extractedMonitoringStations
    .filter(station => {
      const isValid = isFetchedMonitoringStation(station);
      if (!isValid) {
        console.warn('[WaterLevelInfoContent] Invalid monitoring station:', station);
      }
      return isValid;
    })
    .map(mapToStandardizedMonitoringStation);

  // Process rain stations with type safety
  const standardizedRainStations: StandardizedRainStation[] = extractedRainStations
    .filter(station => {
      const isValid = isFetchedRainStation(station);
      if (!isValid) {
        console.warn('[WaterLevelInfoContent] Invalid rain station:', station);
      }
      return isValid;
    })
    .map(mapToStandardizedRainStation);

  // Process reservoirs with type safety
  const standardizedReservoirs: StandardizedReservoir[] = extractedReservoirs
    .filter(reservoir => {
      const isValid = isFetchedReservoir(reservoir);
      if (!isValid) {
        console.warn('[WaterLevelInfoContent] Invalid reservoir:', reservoir);
      }
      return isValid;
    })
    .map(mapToStandardizedReservoir);

  // Adapt to component-expected types
  const validMonitoringStations: MonitoringStation[] = standardizedMonitoringStations.map(adaptToMonitoringStationProps);
  const validRainStations: RainStation[] = standardizedRainStations.map(adaptToRainStationProps);
  const validReservoirs: Reservoir[] = standardizedReservoirs.map(adaptToReservoirProps);

  console.log('[WaterLevelInfoContent] Station IDs ready for UI rendering:', {
    monitoringStations: validMonitoringStations.map(station => ({
      id: station.id,
      idType: typeof station.id,
      station_id: station.station_id,
      station_idType: typeof station.station_id,
      station_name: station.station_name
    })),
    rainStations: validRainStations.map(station => ({
      id: station.id,
      idType: typeof station.id,
      station_id: station.station_id,
      station_idType: typeof station.station_id,
      station_name: station.station_name
    })),
    reservoirs: validReservoirs.map(reservoir => ({
      id: reservoir.id,
      idType: typeof reservoir.id,
      station_id: reservoir.station_id,
      station_idType: typeof reservoir.station_id,
      reservoir_name: reservoir.reservoir_name
    }))
  });

  console.log('[WaterLevelInfoContent] Standardized data:', {
    standardizedMonitoringStations,
    standardizedRainStations,
    standardizedReservoirs
  });

  console.log('[WaterLevelInfoContent] Adapted data:', {
    validMonitoringStations,
    validRainStations,
    validReservoirs
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">กำลังโหลดข้อมูลสถานี...</span>
      </div>
    );
  }

  // Check if we have any stations to display
  const hasStations = validMonitoringStations.length > 0 || validRainStations.length > 0 || validReservoirs.length > 0;

  return (
    <>
      {!hasStations ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ไม่พบข้อมูลสถานีในพื้นที่ {displayAmphure || cleanedAmphure || 'ไม่ระบุอำเภอ'} {displayProvince || cleanedProvince || 'ไม่ระบุจังหวัด'}
            <div className="text-xs text-gray-500 mt-1">
              กำลังค้นหา: สถานีเฝ้าระวัง {validMonitoringStations.length}, สถานีวัดน้ำฝน {validRainStations.length}, เขื่อน/อ่างเก็บน้ำ {validReservoirs.length}
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {validMonitoringStations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-700 mb-3">{getStationLabel('monitoring')} ({validMonitoringStations.length})</h3>
              <div className="space-y-4">
                {validMonitoringStations.map(station => (
                  <MonitoringStationCard key={station.id} station={station} />
                ))}
              </div>
            </div>
          )}
          
          {validRainStations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-700 mb-3">{getStationLabel('rain')} ({validRainStations.length})</h3>
              <div className="space-y-4">
                {validRainStations.map(station => (
                  <RainStationCard key={station.id} station={station} />
                ))}
              </div>
            </div>
          )}
          
          {validReservoirs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-700 mb-3">{getStationLabel('reservoir')} ({validReservoirs.length})</h3>
              <div className="space-y-4">
                {validReservoirs.map(reservoir => (
                  <ReservoirCard key={reservoir.id} reservoir={reservoir} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
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