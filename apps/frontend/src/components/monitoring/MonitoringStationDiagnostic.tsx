import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocationStore } from '@/stores/location';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Bug, AlertCircle, ChevronDown, RefreshCw, DatabaseIcon } from 'lucide-react';
import { cleanLocationString } from '@/lib/location-utils';

interface DiagnosticResponse {
  success: boolean;
  data?: any[];
  error?: string;
  message?: string;
  location?: {
    amphure?: string;
    province?: string;
  };
}

/**
 * A diagnostic component specifically for troubleshooting monitoring station data issues
 * Directly queries the telemetry API endpoints with detailed logging
 */
export function MonitoringStationDiagnostic() {
  const { amphure, province } = useLocationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<DiagnosticResponse | null>(null);
  const { toast } = useToast();

  // Clean location parameters
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);

  // Build the API URL
  const apiUrl = new URL(`${import.meta.env.VITE_API_URL}/api/telemetry/stations`);
  if (cleanedAmphure) apiUrl.searchParams.append('amphure', cleanedAmphure);
  if (cleanedProvince) apiUrl.searchParams.append('province', cleanedProvince);

  const fetchDiagnosticData = async () => {
    if (!cleanedAmphure && !cleanedProvince) {
      toast({
        title: "Missing location",
        description: "Both amphure and province are missing or empty",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[MonitoringStationDiagnostic] Making direct API request to: ${apiUrl.toString()}`);
      
      // Log character codes for better debugging
      console.log('[MonitoringStationDiagnostic] Parameter character codes:', {
        amphure: cleanedAmphure ? Array.from(cleanedAmphure).map(c => c.charCodeAt(0)) : [],
        province: cleanedProvince ? Array.from(cleanedProvince).map(c => c.charCodeAt(0)) : [],
      });
      
      const response = await fetch(apiUrl.toString());
      const data = await response.json();
      
      setResponse(data);
      
      console.log("[MonitoringStationDiagnostic] API direct response:", {
        success: data.success,
        messageOrError: data.message || data.error,
        stationCount: data.data?.length || 0,
        firstStation: data.data?.length > 0 ? data.data[0] : null
      });
    } catch (error) {
      console.error("[MonitoringStationDiagnostic] Error fetching data:", error);
      setResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <DatabaseIcon className="h-4 w-4 mr-2 text-blue-600" />
          Monitoring Stations Diagnostic Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <div className="text-xs space-y-1 text-blue-800">
          <p>Having trouble seeing monitoring stations? This tool directly checks the API.</p>
          <p className="flex flex-col space-y-1">
            <span>Current location parameters:</span>
            <code className="bg-blue-100 p-1 rounded">
              amphure: {cleanedAmphure || '(empty)'} ({amphure || 'undefined'})
            </code>
            <code className="bg-blue-100 p-1 rounded">
              province: {cleanedProvince || '(empty)'} ({province || 'undefined'})
            </code>
          </p>
        </div>
        
        {response && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center justify-between w-full text-xs">
                <span>View API Response ({response.data?.length || 0} stations)</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-blue-100 p-2 rounded text-xs whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                {JSON.stringify({
                  success: response.success,
                  stationCount: response.data?.length || 0,
                  message: response.message,
                  error: response.error,
                  location: response.location
                }, null, 2)}
              </div>
              {response.data && response.data.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="font-medium">First station sample:</div>
                  <div className="bg-blue-100 p-2 rounded font-mono max-h-60 overflow-y-auto">
                    {JSON.stringify(response.data[0], null, 2)}
                  </div>
                </div>
              )}
              {(response.data?.length === 0 || !response.data) && (
                <div className="mt-2 text-xs bg-yellow-100 p-2 rounded">
                  <AlertCircle className="h-4 w-4 inline-block mr-1 text-yellow-600" />
                  <span>No monitoring stations were found for this location in the database.</span>
                  <p className="mt-1">This suggests there might be no telemetry data for this area, or the database might not contain stations with the exact matching location name.</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs"
          onClick={fetchDiagnosticData}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 
              Testing API...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" /> 
              Test API Connection
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 