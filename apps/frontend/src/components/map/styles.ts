import { CategoryName } from "@/types/processed-post";
import type { CirclePaint } from 'mapbox-gl';

// Category-specific colors that match the ontology semantics
export const categoryColors = {
  [CategoryName.REPORT_INCIDENT]: '#dc2626', // Strong red for incidents
  [CategoryName.REQUEST_SUPPORT]: '#059669', // Emerald for support
  [CategoryName.REQUEST_INFO]: '#2563eb', // Royal blue for info
  [CategoryName.SUGGESTION]: '#d97706', // Amber for suggestions
  [CategoryName.UNKNOWN]: '#6b7280' // Gray for unknown
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
  },
  diamond: {
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    borderRadius: '0'
  }
} as const;

// Category to shape mapping based on ontology semantics
export const categoryShapeMap: Record<CategoryName, keyof typeof shapeStyles> = {
  [CategoryName.REPORT_INCIDENT]: 'triangle', // Triangle for incidents (urgent)
  [CategoryName.REQUEST_SUPPORT]: 'square',   // Square for support (structured)
  [CategoryName.REQUEST_INFO]: 'circle',      // Circle for info (simple)
  [CategoryName.SUGGESTION]: 'hexa',          // Hexagon for suggestions (unique)
  [CategoryName.UNKNOWN]: 'diamond'           // Diamond for unknown (distinct)
};

// Cluster configuration
export const clusterConfig = {
  maxZoom: 5, // Separate into individual points at zoom level 5
  radius: 40,
  paint: {
    'circle-color': '#ef4444',
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