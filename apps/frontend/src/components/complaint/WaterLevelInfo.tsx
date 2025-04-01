import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { useRainStations } from "@/hooks/useRainStations";
import { useReservoirs, Reservoir as APIReservoir } from "@/hooks/useReservoirs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, InfoIcon } from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useComplaintStore } from "@/stores/complaintStore";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";
import { ProcessedPost } from "@/types/processed-post";
// Import Jotai hooks
import { useStationData } from "@/atoms/hooks";
import { useNavigate } from "react-router-dom";
import { TelemetryStation } from "@/hooks/useTelemetryStations";
import { useTelemetryData } from "@/hooks/useTelemetryData";

// Import the save icon
import SaveIcon from "@/assets/icon/save.svg";

// Helper to get a display name for any reservoir-like object
const getReservoirDisplayName = (reservoir: unknown): string => {
  const apiReservoir = reservoir as APIReservoir;
  const dbReservoir = reservoir as Reservoir;
  return dbReservoir.reservoir_name || apiReservoir.name || `Reservoir ${dbReservoir.id || apiReservoir.id}`;
};

// Define the interface for the component props
interface WaterLevelInfoProps {
  amphure?: string;
  province?: string;
}

export function WaterLevelInfo({ amphure = "", province = "" }: WaterLevelInfoProps) {
  // Use the enhanced telemetry data hook for better background refresh
  const {
    stations: telemetryStations,
    isLoading: isLoadingTelemetry,
    isRefreshing: isRefreshingTelemetry,
    hasStations: hasTelemetryStations,
    error: telemetryError,
    refetch: refreshTelemetryData
  } = useTelemetryData(amphure, province);

  // Memoize the card rendering to prevent re-renders
  const stationCards = useMemo(() => (
    hasTelemetryStations && (
      <div className="space-y-4">
        {telemetryStations.map((station) => (
          <ErrorBoundary key={station.station_id} fallback={
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to render station</AlertDescription>
            </Alert>
          }>
            <StationCard station={station} />
          </ErrorBoundary>
        ))}
      </div>
    )
  ), [hasTelemetryStations, telemetryStations]);

  // Memoize loading state UI
  const loadingUI = useMemo(() => (
    isLoadingTelemetry && !hasTelemetryStations && (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  ), [isLoadingTelemetry, hasTelemetryStations]);

  // Memoize error state UI
  const errorUI = useMemo(() => (
    telemetryError && !hasTelemetryStations && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {telemetryError instanceof Error ? telemetryError.message : 'Failed to load stations'}
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshTelemetryData}
              disabled={isRefreshingTelemetry}
            >
              {isRefreshingTelemetry ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  ), [telemetryError, hasTelemetryStations, refreshTelemetryData, isRefreshingTelemetry]);

  // Memoize empty state UI
  const emptyUI = useMemo(() => (
    !isLoadingTelemetry && !telemetryError && !hasTelemetryStations && (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          {amphure && province 
            ? `ไม่พบสถานีตรวจวัดระดับน้ำในพื้นที่ ${amphure}, ${province}` 
            : 'กรุณาระบุตำแหน่งที่ต้องการดูข้อมูล'
          }
        </AlertDescription>
      </Alert>
    )
  ), [isLoadingTelemetry, telemetryError, hasTelemetryStations, amphure, province]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">ข้อมูลระดับน้ำ</h3>
        {(amphure || province) && (
          <div className="text-sm text-gray-500">
            {amphure && province ? `${amphure}, ${province}` : amphure || province}
          </div>
        )}
      </div>
      
      {/* Telemetry Stations Section */}
      <div>
        <h4 className="font-medium text-base mb-2">สถานีตรวจวัดระดับน้ำ</h4>
        
        {/* Show available telemetry stations data */}
        {stationCards}
        
        {/* Show loading state only when initially loading and we have no data */}
        {loadingUI}
        
        {/* Show error state */}
        {errorUI}
        
        {/* Show empty state */}
        {emptyUI}
      </div>
    </Card>
  );
}

// Memoize StationCard to prevent re-renders
const StationCard = React.memo(({ station }: { station: TelemetryStation }) => {
  return (
    <Card className="p-4">
      <h3 className="font-semibold">{station.station_name}</h3>
      <div className="mt-2 space-y-2">
        <div className="text-sm text-gray-500">
          <span className="font-medium">Hydro ID:</span> {station.hydro_id}
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium">Basin:</span> {station.basin_name}
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium">Location:</span> {station.latitude}, {station.longitude}
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium">Last Sync:</span> {new Date(station.last_sync).toLocaleString()}
        </div>
        {station.brae_level && (
          <div className="text-sm">
            <span className="font-medium">Brae Level:</span> {station.brae_level} m
          </div>
        )}
        {station.q_max && (
          <div className="text-sm">
            <span className="font-medium">Max Flow:</span> {station.q_max} m³/s
          </div>
        )}
      </div>
    </Card>
  );
});