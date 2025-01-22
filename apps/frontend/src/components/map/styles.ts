import { CategoryName } from "@/types/processed-post";

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
  colors: {
    small: '#22c55e', // 1-49 points
    medium: '#f59e0b', // 50-99 points
    large: '#ef4444' // 100+ points
  },
  sizes: {
    small: 30,
    medium: 40,
    large: 50
  }
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