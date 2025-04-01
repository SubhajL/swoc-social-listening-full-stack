import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Droplet, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Debug component that directly fetches the telemetry data for the Mae Tang station (P.4A)
 * This helps identify if the issue is with the data display or the actual API data
 */
export function MaeTangStationValue() {
  const [isLoading, setIsLoading] = useState(false);
  const [stationData, setStationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const fetchStationData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // This is the Mae Tang station ID (P.4A) from the telemetry station list
      const stationId = 'P.4A';
      
      console.log(`[MaeTangStationValue] Fetching telemetry data for station ${stationId}`);
      
      // Directly call the telemetry endpoint for this specific station
      const url = `${import.meta.env.VITE_API_URL}/api/telemetry/${stationId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[MaeTangStationValue] Received data for station ${stationId}:`, data);
      
      setStationData(data);
      toast({
        title: "Station data fetched successfully",
        description: `Data points: ${data?.data?.length || 0}`
      });
    } catch (err) {
      console.error('[MaeTangStationValue] Error fetching station data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error fetching station data",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    fetchStationData();
  }, []);
  
  // Helper function to extract the latest water level from the station data
  const getLatestWaterLevel = (): { value: number | null, timestamp: string | null } => {
    if (!stationData || !stationData.success || !stationData.data) {
      return { value: null, timestamp: null };
    }
    
    // Get first data point (most recent) if data is an array
    const dataPoint = Array.isArray(stationData.data) ? stationData.data[0] : stationData.data;
    
    if (!dataPoint) {
      return { value: null, timestamp: null };
    }
    
    const waterLevel = dataPoint.water_level !== undefined ? 
      parseFloat(dataPoint.water_level) : null;
    
    const timestamp = dataPoint.reading_time || dataPoint.timestamp || null;
    
    return { value: waterLevel, timestamp };
  };
  
  const { value: waterLevel, timestamp } = getLatestWaterLevel();
  
  // Format the timestamp for display
  const formattedTimestamp = timestamp ? 
    new Date(timestamp).toLocaleString('th-TH') : 'ไม่พบข้อมูล';
  
  return (
    <Card className="border-blue-200 bg-blue-50 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Droplet className="h-4 w-4 mr-2 text-blue-600" />
          สถานีบ้านแม่แตง (P.4A) - ตรวจสอบข้อมูลโดยตรง
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2">กำลังโหลดข้อมูล...</span>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-800 p-3 rounded-md text-sm">
            <p className="font-medium">เกิดข้อผิดพลาด:</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">ระดับน้ำปัจจุบัน:</div>
              <div className="text-2xl font-bold text-blue-700">
                {waterLevel !== null ? `${waterLevel.toFixed(2)} ม.รทก.` : '-'}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div className="font-medium">เวลาที่วัด:</div>
              <div>{formattedTimestamp}</div>
            </div>
            
            <div className="bg-white p-3 rounded-md text-xs">
              <p className="font-medium mb-1 flex items-center">
                <Info className="h-3 w-3 mr-1 text-blue-500" />
                รายละเอียดข้อมูล:
              </p>
              <div className="font-mono overflow-auto max-h-40 text-gray-600">
                <pre>{JSON.stringify(stationData, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs"
          onClick={fetchStationData}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 
              กำลังดึงข้อมูล...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" /> 
              ดึงข้อมูลใหม่
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 