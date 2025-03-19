import { renderHook, act } from '@testing-library/react';
import { Provider } from 'jotai';
import { useStationManagement } from './useStationManagement';
import * as stationData from '../atoms/stationData';

// Mock the stationData module
jest.mock('../atoms/stationData', () => {
  const originalModule = jest.requireActual('../atoms/stationData');
  
  return {
    __esModule: true,
    ...originalModule,
    // Mock the synchronization functions
    syncMonitoringStationsAtom: jest.fn(),
    syncRainStationsAtom: jest.fn(),
    syncReservoirsAtom: jest.fn(),
  };
});

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('useStationManagement', () => {
  // Setup and teardown
  beforeEach(() => {
    // Mock console methods to prevent noise in test output
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  // Helper function to render the hook with Jotai provider
  const renderStationManagementHook = () => {
    return renderHook(() => useStationManagement(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>
    });
  };
  
  // Test cases
  it('should initialize with empty state', () => {
    const { result } = renderStationManagementHook();
    
    // Check initial state
    expect(result.current.monitoringStations).toEqual([]);
    expect(result.current.rainStations).toEqual([]);
    expect(result.current.reservoirs).toEqual([]);
    expect(result.current.userSelectedMonitoring).toEqual([]);
    expect(result.current.userSelectedRain).toEqual([]);
    expect(result.current.userSelectedReservoirs).toEqual([]);
    expect(result.current.disabledMonitoring).toEqual({});
    expect(result.current.disabledRain).toEqual({});
    expect(result.current.disabledReservoirs).toEqual({});
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
  
  it('should add a monitoring station', () => {
    const { result } = renderStationManagementHook();
    
    // Create a mock station
    const mockStation: stationData.MonitoringStation = {
      id: 'test-station-1',
      name: 'Test Station 1',
      location: 'Test Location',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      status: 'active',
      source: 'system',
      type: 'monitoring'
    };
    
    // Add the station
    act(() => {
      result.current.addMonitoringStation(mockStation);
    });
    
    // Check if station was added
    expect(result.current.userSelectedMonitoring).toHaveLength(1);
    expect(result.current.userSelectedMonitoring[0]).toEqual(mockStation);
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.editSession.changedStationTypes).toContain('monitoring');
  });
  
  it('should not add duplicate monitoring station', () => {
    const { result } = renderStationManagementHook();
    
    // Create a mock station
    const mockStation: stationData.MonitoringStation = {
      id: 'test-station-1',
      name: 'Test Station 1',
      location: 'Test Location',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      status: 'active',
      source: 'system',
      type: 'monitoring'
    };
    
    // Add the station twice
    act(() => {
      result.current.addMonitoringStation(mockStation);
      result.current.addMonitoringStation(mockStation);
    });
    
    // Check if station was added only once
    expect(result.current.userSelectedMonitoring).toHaveLength(1);
  });
  
  it('should remove a user-selected monitoring station', () => {
    const { result } = renderStationManagementHook();
    
    // Create a mock station
    const mockStation: stationData.MonitoringStation = {
      id: 'test-station-1',
      name: 'Test Station 1',
      location: 'Test Location',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      status: 'active',
      source: 'user',
      type: 'monitoring'
    };
    
    // Add and then remove the station
    act(() => {
      result.current.addMonitoringStation(mockStation);
    });
    
    act(() => {
      result.current.removeMonitoringStation(mockStation.id);
    });
    
    // Check if station was removed
    expect(result.current.userSelectedMonitoring).toHaveLength(0);
  });
  
  it('should disable a system monitoring station', () => {
    const { result } = renderStationManagementHook();
    
    // Create a mock system station
    const mockStation: stationData.MonitoringStation = {
      id: 'system-station-1',
      name: 'System Station 1',
      location: 'System Location',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      status: 'active',
      source: 'system',
      type: 'monitoring'
    };
    
    // Set up initial state with the system station
    act(() => {
      // @ts-ignore - Directly setting the atom value for testing
      result.current.setMonitoringStations([mockStation]);
    });
    
    // Disable the station
    act(() => {
      result.current.removeMonitoringStation(mockStation.id);
    });
    
    // Check if station was disabled
    expect(result.current.disabledMonitoring[mockStation.id]).toBe(true);
    expect(result.current.availableMonitoringStations).toHaveLength(0);
  });
  
  it('should toggle monitoring station disabled state', () => {
    const { result } = renderStationManagementHook();
    
    // Create a mock station
    const mockStation: stationData.MonitoringStation = {
      id: 'test-station-1',
      name: 'Test Station 1',
      location: 'Test Location',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      status: 'active',
      source: 'system',
      type: 'monitoring'
    };
    
    // Set up initial state with the station
    act(() => {
      // @ts-ignore - Directly setting the atom value for testing
      result.current.setMonitoringStations([mockStation]);
    });
    
    // Disable the station
    act(() => {
      result.current.toggleMonitoringStationDisabled(mockStation.id);
    });
    
    // Check if station was disabled
    expect(result.current.disabledMonitoring[mockStation.id]).toBe(true);
    
    // Enable the station
    act(() => {
      result.current.toggleMonitoringStationDisabled(mockStation.id);
    });
    
    // Check if station was enabled
    expect(result.current.disabledMonitoring[mockStation.id]).toBeUndefined();
  });
  
  it('should reset all changes', () => {
    const { result } = renderStationManagementHook();
    
    // Create mock stations
    const mockMonitoringStation: stationData.MonitoringStation = {
      id: 'monitoring-1',
      name: 'Monitoring 1',
      location: 'Location 1',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      status: 'active',
      source: 'system',
      type: 'monitoring'
    };
    
    const mockRainStation: stationData.RainStation = {
      id: 'rain-1',
      name: 'Rain 1',
      location: 'Location 1',
      coordinates: { lat: 13.7563, lng: 100.5018 },
      status: 'active',
      source: 'system',
      type: 'rain'
    };
    
    // Add stations and make changes
    act(() => {
      result.current.addMonitoringStation(mockMonitoringStation);
      result.current.addRainStation(mockRainStation);
      result.current.toggleMonitoringStationDisabled('some-other-id');
    });
    
    // Verify changes were made
    expect(result.current.userSelectedMonitoring).toHaveLength(1);
    expect(result.current.userSelectedRain).toHaveLength(1);
    expect(result.current.hasUnsavedChanges).toBe(true);
    
    // Reset changes
    act(() => {
      result.current.resetChanges();
    });
    
    // Verify all changes were reset
    expect(result.current.userSelectedMonitoring).toHaveLength(0);
    expect(result.current.userSelectedRain).toHaveLength(0);
    expect(result.current.disabledMonitoring).toEqual({});
    expect(result.current.disabledRain).toEqual({});
    expect(result.current.disabledReservoirs).toEqual({});
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.editSession.changedStationTypes).toEqual([]);
    
    // Verify synchronization functions were called
    expect(stationData.syncMonitoringStationsAtom).toHaveBeenCalled();
    expect(stationData.syncRainStationsAtom).toHaveBeenCalled();
    expect(stationData.syncReservoirsAtom).toHaveBeenCalled();
  });
  
  it('should update location', () => {
    const { result } = renderStationManagementHook();
    
    // Update location
    act(() => {
      result.current.updateLocation('test-amphure', 'test-province');
    });
    
    // Check if location was updated
    expect(result.current.currentAmphure).toBe('test-amphure');
    expect(result.current.currentProvince).toBe('test-province');
  });
  
  it('should filter available stations correctly', () => {
    const { result } = renderStationManagementHook();
    
    // Create mock stations
    const mockStations: stationData.MonitoringStation[] = [
      {
        id: 'station-1',
        name: 'Station 1',
        location: 'Location 1',
        coordinates: { lat: 13.7563, lng: 100.5018 },
        status: 'active',
        source: 'system',
        type: 'monitoring'
      },
      {
        id: 'station-2',
        name: 'Station 2',
        location: 'Location 2',
        coordinates: { lat: 13.8563, lng: 100.6018 },
        status: 'active',
        source: 'system',
        type: 'monitoring'
      }
    ];
    
    // Set up initial state with stations
    act(() => {
      // @ts-ignore - Directly setting the atom value for testing
      result.current.setMonitoringStations(mockStations);
    });
    
    // Disable one station
    act(() => {
      result.current.toggleMonitoringStationDisabled('station-1');
    });
    
    // Check if available stations are filtered correctly
    expect(result.current.availableMonitoringStations).toHaveLength(1);
    expect(result.current.availableMonitoringStations[0].id).toBe('station-2');
  });
}); 