import React, { useState } from 'react';
import { Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, Divider, Grid, IconButton, List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText, Tab, Tabs, Typography } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Save as SaveIcon, Undo as UndoIcon } from '@mui/icons-material';
import { useStationManagement } from '../../hooks/useStationManagement';
import { MonitoringStation, RainStation, Reservoir, selectedRainDataSourceAtom, filteredRainStationsAtom } from '../../atoms/stationData';
import { useTranslation } from 'react-i18next';
import RainDataSourceSelector from '../monitoring/RainDataSourceSelector';
import { useAtom } from 'jotai';

interface StationManagementPanelProps {
  onSave?: () => void;
}

/**
 * Component for managing stations (monitoring stations, rain stations, and reservoirs)
 */
export const StationManagementPanel: React.FC<StationManagementPanelProps> = ({ onSave }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'monitoring' | 'rain' | 'reservoir'>('monitoring');
  
  // Get station data and functions from the hook
  const {
    // Station data
    allAvailableMonitoringStations,
    allAvailableRainStations,
    allAvailableReservoirs,
    
    // Loading states
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    
    // Error states
    monitoringError,
    rainError,
    reservoirsError,
    
    // Edit session state
    hasUnsavedChanges,
    
    // Functions
    removeMonitoringStation,
    removeRainStation,
    removeReservoir,
    resetChanges,
    syncMonitoring,
    syncRain,
    syncReservoirs
  } = useStationManagement();
  
  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: 'monitoring' | 'rain' | 'reservoir') => {
    setActiveTab(newValue);
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    console.log('[StationManagementPanel] Refreshing stations');
    
    if (activeTab === 'monitoring') {
      syncMonitoring();
    } else if (activeTab === 'rain') {
      syncRain();
    } else if (activeTab === 'reservoir') {
      syncReservoirs();
    }
  };
  
  // Handle save button click
  const handleSave = () => {
    console.log('[StationManagementPanel] Saving changes');
    
    // Call the onSave callback if provided
    if (onSave) {
      onSave();
    }
  };
  
  // Handle discard button click
  const handleDiscard = () => {
    console.log('[StationManagementPanel] Discarding changes');
    
    // Reset all changes
    resetChanges();
  };
  
  // Render monitoring stations list
  const renderMonitoringStations = () => {
    if (isLoadingMonitoring) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (monitoringError) {
      return (
        <Box p={2}>
          <Typography color="error">
            {t('Error loading monitoring stations')}
          </Typography>
        </Box>
      );
    }
    
    if (allAvailableMonitoringStations.length === 0) {
      return (
        <Box p={2}>
          <Typography color="textSecondary">
            {t('No monitoring stations available')}
          </Typography>
        </Box>
      );
    }
    
    return (
      <List>
        {allAvailableMonitoringStations.map((station) => (
          <ListItem key={station.id}>
            <ListItemIcon>
              <Chip 
                label={station.type.charAt(0).toUpperCase()} 
                color="primary" 
                size="small" 
              />
            </ListItemIcon>
            <ListItemText 
              primary={station.name} 
              secondary={`${station.location} (${station.coordinates.lat.toFixed(4)}, ${station.coordinates.lng.toFixed(4)})`} 
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                aria-label="delete" 
                onClick={() => removeMonitoringStation(station.id)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    );
  };
  
  // Render rain stations list
  const renderRainStations = () => {
    const [dataSource] = useAtom(selectedRainDataSourceAtom);
    const [filteredStations] = useAtom(filteredRainStationsAtom);
    
    if (isLoadingRain) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (rainError) {
      return (
        <Box p={2}>
          <Typography color="error">
            {t('Error loading rain stations')}
          </Typography>
        </Box>
      );
    }
    
    // Use filtered stations instead of all available stations
    const stationsToDisplay = filteredStations.length > 0 ? filteredStations : allAvailableRainStations;
    
    if (stationsToDisplay.length === 0) {
      return (
        <Box p={2}>
          <Typography color="textSecondary">
            {t('No rain stations available')}
          </Typography>
        </Box>
      );
    }
    
    return (
      <>
        <Box p={2}>
          <RainDataSourceSelector className="mb-4" />
          <Typography variant="subtitle2" color="textSecondary" className="mt-2">
            {t('Showing')} {stationsToDisplay.length} {t('stations')} 
            {dataSource !== 'ALL' ? ` ${t('from')} ${dataSource}` : ''}
          </Typography>
        </Box>
        <List>
          {stationsToDisplay.map((station) => (
            <ListItem key={station.id}>
              <ListItemIcon>
                <Chip 
                  label={station.data_source || 'R'} 
                  color="info" 
                  size="small" 
                />
              </ListItemIcon>
              <ListItemText 
                primary={station.name} 
                secondary={`${station.province || ''}, ${station.amphure || ''} (${station.latitude?.toFixed(4) || '0'}, ${station.longitude?.toFixed(4) || '0'})`} 
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="delete" 
                  onClick={() => removeRainStation(station.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </>
    );
  };
  
  // Render reservoirs list
  const renderReservoirs = () => {
    if (isLoadingReservoirs) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (reservoirsError) {
      return (
        <Box p={2}>
          <Typography color="error">
            {t('Error loading reservoirs')}
          </Typography>
        </Box>
      );
    }
    
    if (allAvailableReservoirs.length === 0) {
      return (
        <Box p={2}>
          <Typography color="textSecondary">
            {t('No reservoirs available')}
          </Typography>
        </Box>
      );
    }
    
    return (
      <List>
        {allAvailableReservoirs.map((reservoir) => (
          <ListItem key={reservoir.id}>
            <ListItemIcon>
              <Chip 
                label={reservoir.type.charAt(0).toUpperCase()} 
                color="success" 
                size="small" 
              />
            </ListItemIcon>
            <ListItemText 
              primary={reservoir.name} 
              secondary={`${reservoir.location} (${reservoir.coordinates.lat.toFixed(4)}, ${reservoir.coordinates.lng.toFixed(4)})`} 
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                aria-label="delete" 
                onClick={() => removeReservoir(reservoir.id)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    );
  };
  
  return (
    <Card>
      <CardHeader 
        title={t('Station Management')}
        action={
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        }
      />
      <Divider />
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        <Tab 
          label={t('Monitoring Stations')} 
          value="monitoring" 
        />
        <Tab 
          label={t('Rain Stations')} 
          value="rain" 
        />
        <Tab 
          label={t('Reservoirs')} 
          value="reservoir" 
        />
      </Tabs>
      <Divider />
      <CardContent>
        {activeTab === 'monitoring' && renderMonitoringStations()}
        {activeTab === 'rain' && renderRainStations()}
        {activeTab === 'reservoir' && renderReservoirs()}
      </CardContent>
      <Divider />
      <Box p={2} display="flex" justifyContent="flex-end">
        <Button
          startIcon={<UndoIcon />}
          onClick={handleDiscard}
          disabled={!hasUnsavedChanges}
          sx={{ mr: 1 }}
        >
          {t('Discard')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
        >
          {t('Save')}
        </Button>
      </Box>
    </Card>
  );
}; 