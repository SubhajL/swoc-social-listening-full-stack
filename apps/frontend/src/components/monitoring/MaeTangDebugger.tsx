import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Bug, Database, RefreshCw, ChevronDown } from 'lucide-react';

/**
 * Debug component specifically for troubleshooting Mae Tang monitoring station issues.
 * This performs direct API calls to the debug endpoints we set up.
 */
export function MaeTangDebugger() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const fetchMaeTangDebugData = async () => {
    setIsLoading(true);
    try {
      console.log('[MaeTangDebugger] Fetching Mae Tang debug data');

      // Call the special debug endpoint we created
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/telemetry/debug/mae-tang`);
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[MaeTangDebugger] Debug data received:', data);
      
      setDebugData(data);
      toast({
        title: "Debug data fetched",
        description: `Found ${countResults(data)} total results across all queries`,
      });
    } catch (error) {
      console.error('[MaeTangDebugger] Error fetching debug data:', error);
      toast({
        title: "Error fetching debug data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to count total results for the summary
  const countResults = (data: any): number => {
    if (!data || !data.results) return 0;
    
    let count = 0;
    // Add up all amphure and province counts from all variations
    Object.values(data.results).forEach((result: any) => {
      if (result.amphure && typeof result.amphure.count === 'number') {
        count += result.amphure.count;
      }
      if (result.province && typeof result.province.count === 'number') {
        count += result.province.count;
      }
      if (result.count && typeof result.count === 'number') {
        count += result.count;
      }
    });
    
    return count;
  };

  return (
    <Card className="mt-4 border-red-200 bg-red-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Bug className="h-4 w-4 mr-2 text-red-600" />
          แม่แตง Monitoring Stations Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <div className="text-xs space-y-1 text-red-800">
          <p>This tool helps identify why monitoring stations for แม่แตง may not be appearing by directly querying the database with various location string variations.</p>
        </div>
        
        {debugData && (
          <Accordion
            type="single"
            collapsible
            className="w-full mt-2"
            value={isExpanded ? "debug-data" : undefined}
            onValueChange={(value) => setIsExpanded(!!value)}
          >
            <AccordionItem value="debug-data">
              <AccordionTrigger className="text-xs py-2 px-3 bg-white rounded-t-md">
                <div className="flex items-center">
                  <Database className="h-3 w-3 mr-1 text-red-600" />
                  Debug Results
                  {debugData && (
                    <span className="ml-2 text-xs bg-red-100 px-1 rounded">
                      {countResults(debugData)} results
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-white rounded-b-md px-3 py-2">
                {debugData ? (
                  <>
                    <div className="font-medium text-xs mb-2">Variations Tested:</div>
                    
                    {debugData.results && Object.keys(debugData.results).map((variation) => {
                      const result = debugData.results[variation];
                      
                      // Skip if neither amphure nor province has results
                      if ((!result.amphure || result.amphure.count === 0) && 
                          (!result.province || result.province.count === 0) &&
                          (!result.count || result.count === 0)) {
                        return null;
                      }
                      
                      return (
                        <div key={variation} className="mb-3 pb-3 border-b border-red-100">
                          <div className="font-mono text-xs mb-1 bg-red-100 px-2 py-1 rounded">
                            "{variation}"
                          </div>
                          
                          {result.amphure && (
                            <div className="text-xs ml-2 mb-1">
                              <span className="font-medium">Amphure:</span> {result.amphure.count} stations
                              {result.amphure.count > 0 && (
                                <Accordion type="single" collapsible className="mt-1">
                                  <AccordionItem value="amphure-data">
                                    <AccordionTrigger className="text-xs py-1 px-2">
                                      Show Stations
                                    </AccordionTrigger>
                                    <AccordionContent className="px-2">
                                      <div className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto max-h-40">
                                        <pre>{JSON.stringify(result.amphure.stations, null, 2)}</pre>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </div>
                          )}
                          
                          {result.province && (
                            <div className="text-xs ml-2 mb-1">
                              <span className="font-medium">Province:</span> {result.province.count} stations
                              {result.province.count > 0 && (
                                <Accordion type="single" collapsible className="mt-1">
                                  <AccordionItem value="province-data">
                                    <AccordionTrigger className="text-xs py-1 px-2">
                                      Show Stations
                                    </AccordionTrigger>
                                    <AccordionContent className="px-2">
                                      <div className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto max-h-40">
                                        <pre>{JSON.stringify(result.province.stations, null, 2)}</pre>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </div>
                          )}
                          
                          {result.count && (
                            <div className="text-xs ml-2">
                              <span className="font-medium">Stations:</span> {result.count} stations
                              {result.count > 0 && (
                                <Accordion type="single" collapsible className="mt-1">
                                  <AccordionItem value="stations-data">
                                    <AccordionTrigger className="text-xs py-1 px-2">
                                      Show Stations
                                    </AccordionTrigger>
                                    <AccordionContent className="px-2">
                                      <div className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto max-h-40">
                                        <pre>{JSON.stringify(result.stations, null, 2)}</pre>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Telemetry data section */}
                    {debugData.results && debugData.results.telemetry_data && (
                      <div className="mt-3">
                        <div className="font-medium text-xs mb-2">Telemetry Data Availability:</div>
                        <div className="text-xs font-mono bg-gray-100 p-2 rounded-md overflow-auto max-h-60">
                          <pre>{JSON.stringify(debugData.results.telemetry_data, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Click "Run Debug Tests" to see results
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs"
          onClick={fetchMaeTangDebugData}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 
              Running Debug Tests...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" /> 
              Run Debug Tests
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 