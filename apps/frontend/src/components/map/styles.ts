import { CategoryName } from "@/types/processed-post";
import type { CirclePaint } from 'mapbox-gl';

// Category colors
export const categoryColors: Record<CategoryName, string> = {
  [CategoryName.REPORT_INCIDENT]: '#B91C1C', // Red for diamond
  [CategoryName.REQUEST_SUPPORT]: '#22C55E', // Green for square
  [CategoryName.REQUEST_INFO]: '#FFD25F',    // Yellow for circle
  [CategoryName.SUGGESTION]: '#FF8431',      // Orange for hexagon
  [CategoryName.UNKNOWN]: '#94A3B8'          // Gray for unknown
};

// Status-based colors
export const statusColors = {
  unprocessed: '#ef4444', // Red
  processing: '#f59e0b', // Amber
  resolved: '#22c55e' // Green
} as const;

// Shape styles for different marker types
export const shapeStyles = {
  diamond: {
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    borderRadius: '0'
  },
  square: { 
    borderRadius: '0' 
  },
  circle: { 
    borderRadius: '50%' 
  },
  hexa: {
    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    borderRadius: '0'
  }
} as const;

// Category shape mapping
export const categoryShapeMap: Record<CategoryName, keyof typeof shapeStyles> = {
  [CategoryName.REPORT_INCIDENT]: 'diamond',
  [CategoryName.REQUEST_SUPPORT]: 'square',
  [CategoryName.REQUEST_INFO]: 'circle',
  [CategoryName.SUGGESTION]: 'hexa',
  [CategoryName.UNKNOWN]: 'circle'
};

// Cluster configuration
export const clusterConfig = {
  maxZoom: 5, // Maximum zoom level for clustering
  zoomSteps: [4, 5], // Two-step zoom for clustering
  radius: 40,
  paint: {
    'circle-color': [
      'case',
      // Check if cluster has predominant category
      ['has', 'dominant_category'],
      [
        'match',
        ['get', 'dominant_category'],
        CategoryName.REPORT_INCIDENT, categoryColors[CategoryName.REPORT_INCIDENT],
        CategoryName.REQUEST_SUPPORT, categoryColors[CategoryName.REQUEST_SUPPORT],
        CategoryName.REQUEST_INFO, categoryColors[CategoryName.REQUEST_INFO],
        CategoryName.SUGGESTION, categoryColors[CategoryName.SUGGESTION],
        categoryColors[CategoryName.UNKNOWN] // default
      ],
      categoryColors[CategoryName.UNKNOWN] // If no dominant category
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20,    // Default radius
      5, 25,   // If point_count >= 5, radius = 25
      10, 30    // If point_count >= 10, radius = 30
    ],
    'circle-opacity': 0.9,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  } satisfies CirclePaint
} as const;

// Icon configuration
export const iconConfig = {
  layout: {
    'icon-image': [
      'match',
      ['get', 'category'],
      CategoryName.REPORT_INCIDENT, 'marker-diamond',
      CategoryName.REQUEST_SUPPORT, 'marker-square',
      CategoryName.REQUEST_INFO, 'marker-circle',
      CategoryName.SUGGESTION, 'marker-hexa',
      'marker-circle' // Default fallback
    ],
    'icon-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      4, 0.5,    // Small at initial zoom
      5, 1.0     // Full size at max zoom
    ],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true
  }
} as const;

// Map style configuration
export const mapStyle = {
  default: "mapbox://styles/mapbox/satellite-streets-v12",  // Restored to original satellite view
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11"
} as const;

// Marker size configuration based on zoom level
export const getMarkerSize = (zoom: number) => {
  return Math.max(24, Math.min(48, zoom * 4));
}; 