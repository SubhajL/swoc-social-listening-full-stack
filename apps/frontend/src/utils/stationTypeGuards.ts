import { MonitoringStation, RainStation, Reservoir } from '@/atoms/stationData';

/**
 * Type guard for MonitoringStation
 * @param station The station to check
 * @returns True if the station is a MonitoringStation
 */
export const isMonitoringStation = (station: any): station is MonitoringStation => {
  return station && 
    typeof station === 'object' && 
    'id' in station && 
    (!('type' in station) || station.type === 'monitoring');
};

/**
 * Type guard for RainStation
 * @param station The station to check
 * @returns True if the station is a RainStation
 */
export const isRainStation = (station: any): station is RainStation => {
  return station && 
    typeof station === 'object' && 
    'id' in station && 
    (!('type' in station) || station.type === 'rain');
};

/**
 * Type guard for Reservoir
 * @param reservoir The reservoir to check
 * @returns True if the reservoir is a Reservoir
 */
export const isReservoir = (reservoir: any): reservoir is Reservoir => {
  return reservoir && 
    typeof reservoir === 'object' && 
    'id' in reservoir && 
    (!('type' in reservoir) || reservoir.type === 'reservoir');
};

/**
 * Helper function to ensure string IDs
 * @param id The ID to convert
 * @returns The ID as a string
 */
export const ensureStringId = (id: string | number): string => {
  return typeof id === 'number' ? String(id) : id;
}; 