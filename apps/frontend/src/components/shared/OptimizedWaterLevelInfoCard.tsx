import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Droplet, MapPin, AlertTriangle, Droplets } from "lucide-react";
import { useMemo, FC, useEffect, useRef, useCallback } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { cn } from "@/lib/utils";
import { useLocation } from '@/hooks/useLocation';
import React from "react";
import { Button } from "@/components/ui/button";
import { useStationDataFetcher } from "@/hooks/useStationDataFetcher";
import { ensureStringId } from '@/utils/stationTypeGuards';
import { useAtomValue, useSetAtom } from 'jotai';
import { 
  currentAmphureAtom, 
  currentProvinceAtom, 
  setCurrentAmphureAtom, 
  setCurrentProvinceAtom
} from "@/atoms/locationAtoms";

import {
  syncRainStationsAtom,
  syncMonitoringStationsAtom,
  syncReservoirsAtom
} from "@/atoms/stationData";

// Interface for component props
interface OptimizedWaterLevelInfoCardProps {
  className?: string;
  title?: string;
  location?: {
    amphure?: string;
    province?: string;
  };
  disableAutoRefetch?: boolean;
  showDiagnostics?: boolean;
}

// Define the content component to optimize rendering
interface OptimizedWaterLevelInfoContentProps {
  location: {
    amphure?: string;
    province?: string;
  };
  disableAutoRefetch?: boolean;
  showDiagnostics?: boolean;
}

// Memoize the content component to prevent unnecessary rerenders
const OptimizedWaterLevelInfoContent: FC<OptimizedWaterLevelInfoContentProps> = ({ 
  location, 
  disableAutoRefetch,
  showDiagnostics = false
}) => {
  // For debugging re-renders
  const renderCount = useRef(0);
  renderCount.current++;
  
  // Current location state from atoms
  const currentAmphure = useAtomValue(currentAmphureAtom);
  const currentProvince = useAtomValue(currentProvinceAtom);
  
  // Set location state to atoms
  const setAmphure = useSetAtom(setCurrentAmphureAtom);
  const setProvince = useSetAtom(setCurrentProvinceAtom);
  
  // Memoize the location object used for reference - IMPORTANT!
  // This ensures we don't create a new object identity on each render
  const memoizedLocationProp = useMemo(() => ({
    amphure: location?.amphure,
    province: location?.province
  }), [location?.amphure, location?.province]);
  
  // Memoize the effective location to use for data fetching
  // This prevents creating a new object reference on each render
  const locationToUse = useMemo(() => ({
    amphure: currentAmphure,
    province: currentProvince
  }), [currentAmphure, currentProvince]);
  
  // Console log render - helpful for debugging
  useEffect(() => {
    console.log(`[OptimizedWaterLevelInfoContent] RENDERED #${renderCount.current}`, {
      locationProp: memoizedLocationProp,
      atomState: { amphure: currentAmphure, province: currentProvince },
      locationToUse
    });
  });
  
  // Only sync location atoms when prop changes AND values are different
  // This effect should run as infrequently as possible
  useEffect(() => {
    // Skip if both values are empty/undefined
    if (!memoizedLocationProp.amphure && !memoizedLocationProp.province && !currentAmphure && !currentProvince) {
      return;
    }
    
    // Check if there are actual changes to avoid unnecessary updates
    const amphureChanged = memoizedLocationProp.amphure !== currentAmphure;
    const provinceChanged = memoizedLocationProp.province !== currentProvince;
    
    if (!amphureChanged && !provinceChanged) {
      return; // No changes needed
    }
    
    console.log('[OptimizedWaterLevelInfoContent] Location sync needed:', {
      fromProp: memoizedLocationProp,
      currentState: { amphure: currentAmphure, province: currentProvince },
      amphureChanged,
      provinceChanged
    });
    
    // Only update what changed to minimize atom updates
    if (amphureChanged) {
      setAmphure(memoizedLocationProp.amphure || undefined);
    }
    
    if (provinceChanged) {
      setProvince(memoizedLocationProp.province || undefined);
    }
  }, [memoizedLocationProp, currentAmphure, currentProvince, setAmphure, setProvince]);
  
  // Use our optimized data fetcher with the stable locationToUse object
  const {
    monitoringStations,
    rainStations,
    reservoirs,
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    isLoading,
    isRefreshing,
    monitoringError,
    rainError,
    reservoirsError,
    refreshAll
  } = useStationDataFetcher(locationToUse);
  
  // Debug changes in the data fetcher
  useEffect(() => {
    console.log('[OptimizedWaterLevelInfoContent] Station data updated:', {
      monitoringStationsCount: monitoringStations.length,
      rainStationsCount: rainStations.length,
      reservoirsCount: reservoirs.length,
      isLoading,
      isRefreshing
    });
  }, [monitoringStations.length, rainStations.length, reservoirs.length, isLoading, isRefreshing]);
  
  // Memoize the monitoring stations adapter to prevent recreation on every render
  const adaptedMonitoringStations = useMemo(() => {
    console.log('[OptimizedWaterLevelInfoContent] Adapting monitoring stations:', monitoringStations.length);
    return monitoringStations.map(station => {
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
        amphure: stationAny.amphure || locationToUse.amphure || '',
        province: stationAny.province || locationToUse.province || '',
        coordinates: stationAny.coordinates || { lat: 0, lng: 0 }
      };
    });
  }, [monitoringStations]); // Only depend on the stations themselves
  
  // Memoize the rain stations adapter to prevent recreation on every render
  const adaptedRainStations = useMemo(() => {
    console.log('[OptimizedWaterLevelInfoContent] Adapting rain stations:', rainStations.length);
    return rainStations.map(station => {
      // Use type assertion to access properties that might not exist in the type definition
      const stationAny = station as any;
      
      // Ensure the station has the required properties for the RainStationCard
      return {
        id: ensureStringId(station.id),
        station_id: stationAny.station_id || String(station.id),
        station_name: stationAny.name_th || stationAny.name || stationAny.station_name || `สถานีวัดน้ำฝน ${station.id}`,
        name: stationAny.name_th || stationAny.name || stationAny.station_name || `สถานีวัดน้ำฝน ${station.id}`,
        name_th: stationAny.name_th || null,
        status: stationAny.status || 'active',
        telemetry_data: stationAny.telemetry_data || {
          rainfall_1h: stationAny.rainfall_1h || 0,
          rainfall_24h: stationAny.rainfall_24h || 0,
          timestamp: stationAny.lastReading?.timestamp || new Date().toISOString()
        },
        rainfall_1h: stationAny.rainfall_1h || stationAny.telemetry_data?.rainfall_1h || 0,
        rainfall_24h: stationAny.rainfall_24h || stationAny.telemetry_data?.rainfall_24h || 0,
        amphure: stationAny.amphure || locationToUse.amphure || '',
        province: stationAny.province || locationToUse.province || '',
        coordinates: stationAny.coordinates || { lat: 0, lng: 0 },
        // Add data source if available
        data_source: stationAny.data_source || '',
        // Add additional rainfall properties
        rainfall10m: stationAny.rainfall10m || null,
        rainfall1h: stationAny.rainfall1h || null,
        rainfall3h: stationAny.rainfall3h || null,
        rainfall24h: stationAny.rainfall24h || null,
        rainfall_today: stationAny.rainfall_today || null,
        rainfall_date_calc: stationAny.rainfall_date_calc || null,
        rainfall_datetime: stationAny.rainfall_datetime || null
      };
    });
  }, [rainStations]); // Only depend on the stations themselves
  
  // Memoize the reservoirs adapter to prevent recreation on every render
  const adaptedReservoirs = useMemo(() => {
    console.log('[OptimizedWaterLevelInfoContent] Adapting reservoirs:', reservoirs.length);
    return reservoirs.map(reservoir => {
      // Use type assertion to access properties that might not exist in the type definition
      const reservoirAny = reservoir as any;
      
      // Debug the location data
      console.log(`[OptimizedWaterLevelInfoCard] Reservoir ${reservoir.id} location:`, {
        originalAmphure: reservoirAny.amphure,
        originalProvince: reservoirAny.province,
        cardAmphure: locationToUse.amphure,
        cardProvince: locationToUse.province
      });
      
      // Do not override the reservoir's original location data with the card's location
      // This ensures reservoirs display their true location
      const reservoirAmphure = reservoirAny.amphure || '';
      const reservoirProvince = reservoirAny.province || '';
      
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
        // Use the reservoir's own location data, not the card's location
        amphure: reservoirAmphure,
        province: reservoirProvince,
        coordinates: reservoirAny.coordinates || { lat: 0, lng: 0 },
        // Add debugging information to verify location
        _debug_info: {
          originalAmphure: reservoirAny.amphure,
          originalProvince: reservoirAny.province,
          cardAmphure: locationToUse.amphure,
          cardProvince: locationToUse.province
        }
      };
    });
  }, [reservoirs]); // Only depend on the reservoirs themselves
  
  // Helper function to check if we're in แม่แตง
  const isInMaeTang = useCallback((loc: { amphure?: string, province?: string }): boolean => {
    if (!loc?.amphure) return false;
    
    // Match various forms of แม่แตง
    const maeTangVariations = ['แม่แตง', 'แม่ แตง', 'เเม่แตง', 'maetang', 'mae tang', 'maetaeng', 'mae taeng'];
    const normalizedAmphure = loc.amphure.toLowerCase().trim();
    
    return maeTangVariations.some(variation => 
      normalizedAmphure === variation.toLowerCase() || 
      normalizedAmphure.includes(variation.toLowerCase())
    );
  }, []);
  
  // Get helper functions for displaying station labels - memoize to prevent recreation
  const getStationLabel = useCallback((type: 'monitoring' | 'rain' | 'reservoir') => {
    switch (type) {
      case 'monitoring':
        return 'สถานีเฝ้าระวัง';
      case 'rain':
        return 'สถานีวัดน้ำฝน';
      case 'reservoir':
        return 'เขื่อน/อ่างเก็บน้ำ';
    }
  }, []);
  
  // Memoize the monitoring stations section
  const monitoringStationsSection = useMemo(() => {
    const isMaeTang = isInMaeTang(locationToUse);
    
    // Add empty state for no monitoring stations
    if (adaptedMonitoringStations.length === 0) {
      if (isLoadingMonitoring) {
        return (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">กำลังโหลดข้อมูลสถานีเฝ้าระวัง...</span>
          </div>
        );
      }
      
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
          {isRefreshing && (
            <Loader2 className="inline-block h-4 w-4 animate-spin ml-2 text-gray-400" />
          )}
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
  }, [adaptedMonitoringStations, isLoadingMonitoring, isRefreshing, getStationLabel, isInMaeTang]);
  
  // Memoize the rain stations section
  const rainStationsSection = useMemo(() => {
    // Add empty state for no rain stations
    if (adaptedRainStations.length === 0) {
      if (isLoadingRain) {
        return (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">กำลังโหลดข้อมูลสถานีวัดน้ำฝน...</span>
          </div>
        );
      }
      
      return (
        <div className="text-muted-foreground flex flex-col items-center justify-center p-4 border rounded-md bg-muted/10 my-4">
          <AlertCircle className="h-6 w-6 mb-2 text-yellow-500" />
          <p>ไม่พบข้อมูลสถานีวัดน้ำฝนสำหรับพื้นที่นี้</p>
          <p className="text-sm mt-1">โปรดลองเลือกพื้นที่อื่น หรือเพิ่มสถานีด้วยตนเอง</p>
        </div>
      );
    }
    
    return (
      <div>
        <h3 className="text-base font-medium text-gray-700 mb-3">
          {getStationLabel('rain')} ({adaptedRainStations.length})
          {isRefreshing && (
            <Loader2 className="inline-block h-4 w-4 animate-spin ml-2 text-gray-400" />
          )}
        </h3>
        <div className="space-y-8">
          {adaptedRainStations.map((station) => (
            <RainStationCard
              key={station.id}
              station={station}
              showButtons={false}
              hideUnitLabels={false}
              disableAutoRefetch={disableAutoRefetch}
            />
          ))}
        </div>
      </div>
    );
  }, [adaptedRainStations, isLoadingRain, isRefreshing, disableAutoRefetch]);
  
  // Memoize the reservoirs section
  const reservoirsSection = useMemo(() => {
    // Add empty state for no reservoirs
    if (adaptedReservoirs.length === 0) {
      if (isLoadingReservoirs) {
        return (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">กำลังโหลดข้อมูลอ่างเก็บน้ำ...</span>
          </div>
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
          {isRefreshing && (
            <Loader2 className="inline-block h-4 w-4 animate-spin ml-2 text-gray-400" />
          )}
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
  }, [adaptedReservoirs, isLoadingReservoirs, isRefreshing]);
  
  // Memoize for empty state when no data is available
  const emptyState = useMemo(() => {
    // If we're loading data, show a loading state immediately
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
          <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      );
    }
      
    // Check for empty data only after loading is complete
    if (adaptedMonitoringStations.length === 0 && 
        adaptedRainStations.length === 0 && 
        adaptedReservoirs.length === 0) {
      return (
        <div className="text-muted-foreground flex flex-col items-center justify-center p-8 border rounded-md bg-muted/10 my-4">
          <AlertCircle className="h-8 w-8 mb-3 text-yellow-500" />
          <p className="text-lg">ไม่พบข้อมูลสำหรับพื้นที่นี้</p>
          <p className="text-sm mt-2">โปรดลองเลือกพื้นที่อื่น</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={refreshAll}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'กำลังโหลดข้อมูล...' : 'โหลดข้อมูลใหม่'}
          </Button>
        </div>
      );
    }
    
    return null;
  }, [
    adaptedMonitoringStations.length, 
    adaptedRainStations.length, 
    adaptedReservoirs.length, 
    isLoading,
    isRefreshing,
    refreshAll
  ]);
  
  // Only show refresh button when we have an error and data is not loading
  const errorAlert = useMemo(() => {
    if (monitoringError || rainError || reservoirsError) {
      return (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            เกิดข้อผิดพลาดในการโหลดข้อมูลบางส่วน
            <Button
              onClick={refreshAll}
              disabled={isRefreshing}
              variant="link"
              className="px-2 py-0 h-auto text-primary underline"
            >
              {isRefreshing ? 'กำลังโหลดข้อมูลใหม่...' : 'โหลดข้อมูลใหม่'}
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }, [monitoringError, rainError, reservoirsError, isRefreshing, refreshAll]);
  
  // If we have an empty state, show it
  if (emptyState) {
    return emptyState;
  }
  
  // Otherwise render the stations we have
  return (
    <div className="space-y-6">
      {errorAlert}
      
      <p className="text-sm text-[#64748B]">
        แสดงข้อมูล: สถานีเฝ้าระวัง {adaptedMonitoringStations.length}, 
        สถานีวัดน้ำฝน {adaptedRainStations.length}, 
        เขื่อน/อ่างเก็บน้ำ {adaptedReservoirs.length}
      </p>
      
      <div className="space-y-8">
        {/* Only show sections if there's data or we're loading */}
        {(adaptedMonitoringStations.length > 0 || isLoadingMonitoring) && monitoringStationsSection}
        {(adaptedRainStations.length > 0 || isLoadingRain) && rainStationsSection}
        {(adaptedReservoirs.length > 0 || isLoadingReservoirs) && reservoirsSection}
      </div>
    </div>
  );
};

// Memoize the main card component
const OptimizedWaterLevelInfoCard: FC<OptimizedWaterLevelInfoCardProps> = React.memo(({ 
  className, 
  title = "ข้อมูลระดับน้ำ",
  location,
  disableAutoRefetch,
  showDiagnostics = false
}) => {
  const locationState = useLocation();
  const renderCount = useRef(0);
  renderCount.current++;
  
  // Log renders of the container
  useEffect(() => {
    console.log(`[OptimizedWaterLevelInfoCard] RENDERED #${renderCount.current}`, {
      location,
      locationState
    });
  });
  
  // Memoize the effective location
  const effectiveLocation = useMemo(() => {
    const result = location || { 
      amphure: locationState.amphure, 
      province: locationState.province 
    };
    
    console.log('[OptimizedWaterLevelInfoCard] Effective location computed:', result);
    return result;
  }, [location?.amphure, location?.province, locationState.amphure, locationState.province]);
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-medium">
          <div className="flex items-center">
            <Droplet className="mr-2 h-5 w-5" />
            {title}
            <MapPin className="text-gray-500 ml-2 mr-1 h-4 w-4" />
            <span className="text-base font-normal text-gray-500">
              {effectiveLocation.amphure && effectiveLocation.province 
                ? `${effectiveLocation.amphure}, ${effectiveLocation.province}`
                : effectiveLocation.amphure || effectiveLocation.province || "ไม่ระบุพื้นที่"
              }
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ErrorBoundary
          fallback={
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                เกิดข้อผิดพลาดในการแสดงข้อมูลสถานีตรวจวัด
              </AlertDescription>
            </Alert>
          }
        >
          <OptimizedWaterLevelInfoContent 
            location={effectiveLocation}
            disableAutoRefetch={disableAutoRefetch}
            showDiagnostics={showDiagnostics}
          />
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
});

// Export the memoized component
export { OptimizedWaterLevelInfoCard }; 