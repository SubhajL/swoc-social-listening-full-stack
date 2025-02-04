import { CategoryName } from "@/types/processed-post";
import type { CirclePaint } from 'mapbox-gl';

// Category-specific colors that match the ontology semantics
export const categoryColors = {
  [CategoryName.REPORT_INCIDENT]: '#dc2626', // Strong red for incidents
  [CategoryName.REQUEST_SUPPORT]: '#059669', // Emerald for support
  [CategoryName.REQUEST_INFO]: '#2563eb', // Royal blue for info
  [CategoryName.SUGGESTION]: '#d97706' // Amber for suggestions
} as const;

// Status-based colors
export const statusColors = {
  unprocessed: '#ef4444', // Red
  processing: '#f59e0b', // Amber
  resolved: '#22c55e' // Green
} as const;

// Shape styles for different marker types
export const shapeStyles = {
  circle: { borderRadius: '50%' },
  triangle: { 
    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    borderRadius: '0'
  },
  square: { borderRadius: '0' },
  hexa: {
    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    borderRadius: '0'
  }
} as const;

// Category to shape mapping based on ontology semantics
export const categoryShapeMap: Record<CategoryName, keyof typeof shapeStyles> = {
  [CategoryName.REPORT_INCIDENT]: 'circle', // Circular for incidents (easy to spot)
  [CategoryName.REQUEST_SUPPORT]: 'triangle', // Triangle for support (action needed)
  [CategoryName.REQUEST_INFO]: 'square', // Square for information (structured)
  [CategoryName.SUGGESTION]: 'hexa' // Hexagon for suggestions (unique)
};

// Cluster configuration
export const clusterConfig = {
  maxZoom: 14, // Maximum zoom level for clustering
  radius: 50, // Cluster radius in pixels
  paint: {
    'circle-color': [
      'case',
      ['has', 'dominant_category'],
      ['get', 'dominant_color'],
      '#6b7280' // Default gray if no dominant category
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      30, // small size
      50,
      40, // medium size
      100,
      50 // large size
    ],
    'circle-opacity': [
      'case',
      ['has', 'dominant_source'],
      ['match',
        ['get', 'dominant_source'],
        'direct', 1,
        'cache_direct', 0.8,
        'cache_inherited', 0.6,
        1 // default opacity
      ],
      1 // default if no dominant source
    ]
  } satisfies CirclePaint
} as const;

// Map style configuration
export const mapStyle = {
  default: "mapbox://styles/mapbox/satellite-streets-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11"
} as const;

// Marker size configuration based on zoom level
export const getMarkerSize = (zoom: number) => {
  return Math.max(24, Math.min(48, zoom * 4));
}; 