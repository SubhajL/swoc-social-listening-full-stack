import { CategoryName } from "@/types/processed-post";
import type { CirclePaint } from 'mapbox-gl';

// Category colors
export const categoryColors: Record<CategoryName, string> = {
  [CategoryName.REPORT_INCIDENT]: '#B91C1C', // Red from diamond.svg
  [CategoryName.REQUEST_SUPPORT]: '#22C55E', // Green from square.svg
  [CategoryName.REQUEST_INFO]: '#FFD25F',    // Yellow from circle.svg
  [CategoryName.SUGGESTION]: '#FF8431',      // Orange from hexagon.svg
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