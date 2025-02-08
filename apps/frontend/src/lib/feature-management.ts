import { z } from 'zod';

// Feature flag schema for type safety
const FeatureFlagSchema = z.object({
  enabled: z.boolean(),
  description: z.string(),
  owner: z.string(),
  lastUpdated: z.string(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

// Feature definitions with metadata
export const FEATURES = {
  MAPBOX: {
    CORE: 'mapbox.core' as const,
    TOKEN_VALIDATION: 'mapbox.tokenValidation' as const,
    LAYER_MANAGEMENT: 'mapbox.layerManagement' as const,
  },
  TELEMETRY: {
    REAL_TIME_DATA: 'telemetry.realTimeData' as const,
    MOCK_DATA: 'telemetry.mockData' as const,
    DATA_VALIDATION: 'telemetry.dataValidation' as const,
    LOCATION_FILTERING: 'telemetry.locationFiltering' as const,
  },
  DATABASE: {
    TRANSACTION_MANAGEMENT: 'database.transactionManagement' as const,
    ERROR_HANDLING: 'database.errorHandling' as const,
    CONNECTION_POOLING: 'database.connectionPooling' as const,
  },
  RAIN_STATION: {
    DATA_RETRIEVAL: 'rainStation.dataRetrieval' as const,
    LOCATION_FILTERING: 'rainStation.locationFiltering' as const,
    THAI_LANGUAGE: 'rainStation.thaiLanguage' as const,
    REAL_TIME_DATA: 'rainStation.realTimeData' as const,
  },
  SAFETY: {
    FEATURE_MANAGEMENT: 'safety.featureManagement' as const,
    ERROR_HANDLING: 'safety.errorHandling' as const,
    LOGGING: 'safety.logging' as const,
    API_VALIDATION: 'safety.apiValidation' as const,
  },
  MONITORING: {
    ENHANCED_ERROR_HANDLING: 'monitoring.enhancedErrorHandling' as const,
    COMPREHENSIVE_LOGGING: 'monitoring.comprehensiveLogging' as const,
  },
} as const;

// Type-safe feature state management
type FeatureKey = 
  | typeof FEATURES.MAPBOX[keyof typeof FEATURES.MAPBOX]
  | typeof FEATURES.TELEMETRY[keyof typeof FEATURES.TELEMETRY]
  | typeof FEATURES.DATABASE[keyof typeof FEATURES.DATABASE]
  | typeof FEATURES.RAIN_STATION[keyof typeof FEATURES.RAIN_STATION]
  | typeof FEATURES.SAFETY[keyof typeof FEATURES.SAFETY]
  | typeof FEATURES.MONITORING[keyof typeof FEATURES.MONITORING];

const featureState = new Map<FeatureKey, FeatureFlag>();

// Initialize default feature states
const initializeFeatureState = () => {
  // Mapbox Core features
  featureState.set(FEATURES.MAPBOX.CORE, {
    enabled: true,
    description: 'Core Mapbox functionality including initialization and base features',
    owner: 'mapbox-team',
    lastUpdated: new Date().toISOString(),
  });
  
  featureState.set(FEATURES.MAPBOX.TOKEN_VALIDATION, {
    enabled: true,
    description: 'Mapbox token validation and management',
    owner: 'mapbox-team',
    lastUpdated: new Date().toISOString(),
  });
  
  featureState.set(FEATURES.MAPBOX.LAYER_MANAGEMENT, {
    enabled: true,
    description: 'Mapbox layer management and configuration',
    owner: 'mapbox-team',
    lastUpdated: new Date().toISOString(),
  });

  // Telemetry features
  featureState.set(FEATURES.TELEMETRY.REAL_TIME_DATA, {
    enabled: false,
    description: 'Real-time telemetry data fetching (IN DEVELOPMENT)',
    owner: 'telemetry-team',
    lastUpdated: new Date().toISOString(),
  });
  
  featureState.set(FEATURES.TELEMETRY.MOCK_DATA, {
    enabled: true,
    description: 'Mock data for telemetry stations (TEMPORARY)',
    owner: 'telemetry-team',
    lastUpdated: new Date().toISOString(),
  });
  
  featureState.set(FEATURES.TELEMETRY.DATA_VALIDATION, {
    enabled: true,
    description: 'Telemetry data validation (IN DEVELOPMENT)',
    owner: 'telemetry-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.TELEMETRY.LOCATION_FILTERING, {
    enabled: true,
    description: 'Location-based filtering for telemetry stations (IN DEVELOPMENT)',
    owner: 'telemetry-team',
    lastUpdated: new Date().toISOString(),
  });

  // Database features
  featureState.set(FEATURES.DATABASE.TRANSACTION_MANAGEMENT, {
    enabled: true,
    description: 'Database transaction management and nested transactions',
    owner: 'database-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.DATABASE.ERROR_HANDLING, {
    enabled: true,
    description: 'Enhanced database error handling and reporting',
    owner: 'database-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.DATABASE.CONNECTION_POOLING, {
    enabled: true,
    description: 'Database connection pooling and management',
    owner: 'database-team',
    lastUpdated: new Date().toISOString(),
  });

  // Rain Station features
  featureState.set(FEATURES.RAIN_STATION.DATA_RETRIEVAL, {
    enabled: true,
    description: 'Basic rain station data retrieval (static data only)',
    owner: 'monitoring-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.RAIN_STATION.LOCATION_FILTERING, {
    enabled: true,
    description: 'Location-based filtering for rain stations (static data)',
    owner: 'monitoring-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.RAIN_STATION.THAI_LANGUAGE, {
    enabled: true,
    description: 'Thai language support for rain station display',
    owner: 'monitoring-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.RAIN_STATION.REAL_TIME_DATA, {
    enabled: false,
    description: 'Real-time rain station data updates (IN DEVELOPMENT)',
    owner: 'monitoring-team',
    lastUpdated: new Date().toISOString(),
  });

  // Safety features
  featureState.set(FEATURES.SAFETY.FEATURE_MANAGEMENT, {
    enabled: true,
    description: 'Feature flag management system',
    owner: 'platform-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.SAFETY.ERROR_HANDLING, {
    enabled: true,
    description: 'Enhanced error handling system',
    owner: 'platform-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.SAFETY.LOGGING, {
    enabled: true,
    description: 'Comprehensive logging system',
    owner: 'platform-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.SAFETY.API_VALIDATION, {
    enabled: true,
    description: 'API request/response validation',
    owner: 'platform-team',
    lastUpdated: new Date().toISOString(),
  });

  // Monitoring features
  featureState.set(FEATURES.MONITORING.ENHANCED_ERROR_HANDLING, {
    enabled: true,
    description: 'Enhanced error handling for monitoring stations',
    owner: 'monitoring-team',
    lastUpdated: new Date().toISOString(),
  });

  featureState.set(FEATURES.MONITORING.COMPREHENSIVE_LOGGING, {
    enabled: true,
    description: 'Comprehensive logging for monitoring operations',
    owner: 'monitoring-team',
    lastUpdated: new Date().toISOString(),
  });
};

// Initialize on module load
initializeFeatureState();

// Feature management API
export const FeatureManagement = {
  isEnabled: (feature: FeatureKey): boolean => {
    const featureFlag = featureState.get(feature);
    return featureFlag?.enabled ?? false;
  },

  getFeature: (feature: FeatureKey): FeatureFlag | undefined => {
    return featureState.get(feature);
  },

  setEnabled: (feature: FeatureKey, enabled: boolean): void => {
    const currentFlag = featureState.get(feature);
    if (currentFlag) {
      featureState.set(feature, {
        ...currentFlag,
        enabled,
        lastUpdated: new Date().toISOString(),
      });
    }
  },

  getAllFeatures: (): Map<FeatureKey, FeatureFlag> => {
    return new Map(featureState);
  },
}; 