import React, { useEffect, useState, useMemo } from 'react';
import { MonitoringStationCard } from './MonitoringStationCard';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { InfoIcon, Terminal, RefreshCw, Loader2 } from 'lucide-react';
import { MonitoringStation } from "@/types/monitoring-station";

interface MonitoringStationDebugWrapperProps {
  station: MonitoringStation;
  showButtons?: boolean;
  disabled?: boolean;
  isUserSelected?: boolean;
}

/**
 * Debug wrapper for monitoring station card that shows additional information
 * for debugging purposes
 */
export const MonitoringStationDebugWrapper: React.FC<MonitoringStationDebugWrapperProps> = ({
  station,
  showButtons = false,
  disabled = false,
  isUserSelected = false
}) => {
  const [isLoadingFreshData, setIsLoadingFreshData] = useState(false);
  const [directTelemetryData, setDirectTelemetryData] = useState<any>(null);
  const [directErrorMessage, setDirectErrorMessage] = useState<string | null>(null);
  
  // Convert the station to match ExtendedMonitoringStation interface
  const adaptedStation = useMemo(() => {
    // Ensure we have valid numeric values for water_level and flow_rate
    let water_level = 0;
    if (typeof station.water_level === 'number') {
      water_level = station.water_level;
    }
    
    let flow_rate = 0;
    if (typeof station.flow_rate === 'number') {
      flow_rate = station.flow_rate;
    }
    
    // Create a correctly formatted telemetry_data object
    const telemetry_data = station.telemetry_data ? {
      water_level: typeof station.telemetry_data.water_level === 'number' 
        ? station.telemetry_data.water_level 
        : water_level,
      flow_rate: typeof station.telemetry_data.flow_rate === 'number' 
        ? station.telemetry_data.flow_rate 
        : flow_rate,
      timestamp: station.telemetry_data.timestamp || new Date().toISOString(),
      notation: station.telemetry_data.notation || ""
    } : {
      water_level,
      flow_rate,
      timestamp: new Date().toISOString()
    };
    
    return {
      ...station,
      id: typeof station.id === 'number' ? String(station.id) : station.id,
      name: station.station_name || String(station.id),
      telemetry_data
    };
  }, [station]);
  
  // Fetch telemetry data directly from API
  const fetchDirectTelemetryData = async () => {
    if (!station.station_id) {
      setDirectErrorMessage('No station_id available');
      return;
    }
    
    setIsLoadingFreshData(true);
    setDirectErrorMessage(null);
    
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/telemetry/${station.station_id}`;
      
      console.log(`[MonitoringStationDebugWrapper] Fetching direct telemetry data from: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log(`[MonitoringStationDebugWrapper] Direct API response for station ${station.station_id}:`, data);
      
      setDirectTelemetryData(data);
    } catch (error) {
      console.error(`[MonitoringStationDebugWrapper] Error fetching direct telemetry for station ${station.station_id}:`, error);
      setDirectErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingFreshData(false);
    }
  };
  
  // Log information when component mounts
  useEffect(() => {
    console.log(`[MonitoringStationDebugWrapper] Initializing debug wrapper for station ${station.station_id}`);
    
    return () => {
      console.log(`[MonitoringStationDebugWrapper] Unmounting debug wrapper for station ${station.station_id}`);
    };
  }, [station.station_id]);
  
  return (
    <Card className="border-blue-300 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center">
            <Terminal className="h-4 w-4 mr-2 text-blue-600" />
            <span className="text-blue-800">Station Debugging</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={fetchDirectTelemetryData}
            disabled={isLoadingFreshData}
          >
            {isLoadingFreshData ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Fetch Direct Data
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {/* Regular card rendered normally */}
        <div className="mb-3">
          <MonitoringStationCard
            station={adaptedStation}
            showButtons={showButtons}
            disabled={disabled}
            isUserSelected={isUserSelected}
          />
        </div>
        
        {/* Debug information */}
        <Accordion type="single" collapsible className="bg-white rounded-md">
          <AccordionItem value="station-data">
            <AccordionTrigger className="text-xs py-2 px-3">
              <div className="flex items-center">
                <InfoIcon className="h-3 w-3 mr-1 text-blue-600" />
                Station Raw Data
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <div className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto max-h-60">
                <pre>{JSON.stringify(station, null, 2)}</pre>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="direct-api">
            <AccordionTrigger className="text-xs py-2 px-3">
              <div className="flex items-center">
                <InfoIcon className="h-3 w-3 mr-1 text-blue-600" />
                Direct API Response
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3">
              {directTelemetryData ? (
                <div className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto max-h-60">
                  <pre>{JSON.stringify(directTelemetryData, null, 2)}</pre>
                </div>
              ) : directErrorMessage ? (
                <div className="text-xs text-red-500 p-2 rounded-md bg-red-50">
                  {directErrorMessage}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Click "Fetch Direct Data" to see the direct API response.
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="telemetry-data">
            <AccordionTrigger className="text-xs py-2 px-3">
              <div className="flex items-center">
                <InfoIcon className="h-3 w-3 mr-1 text-blue-600" />
                Telemetry Data
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <div className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto max-h-60">
                <pre>{JSON.stringify(station.telemetry_data, null, 2)}</pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="pt-0 pb-3 justify-center">
        <div className="text-xs text-gray-500">
          Station ID: {station.station_id} · Type: Monitoring
        </div>
      </CardFooter>
    </Card>
  );
}; 