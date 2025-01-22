import mapboxgl from "mapbox-gl";
import { getCategoryIcon, getShapeStyle } from "./utils";
import { CategoryName } from "@/types/processed-post";

interface MapMarkerProps {
  post: {
    id: number;
    category: CategoryName;
    province: string;
    latitude: number;
    longitude: number;
  };
  map: mapboxgl.Map;
  onClick: () => void;
}

// Shape styles for different marker types
const shapeStyles = {
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

type ShapeStyleKey = keyof typeof shapeStyles;

// Map category names to shapes
const categoryShapeMap: Record<CategoryName, keyof typeof shapeStyles> = {
  [CategoryName.REPORT_INCIDENT]: 'circle',
  [CategoryName.REQUEST_SUPPORT]: 'triangle',
  [CategoryName.REQUEST_INFO]: 'square',
  [CategoryName.SUGGESTION]: 'hexa'
};

const MapMarker = ({ post, map, onClick }: MapMarkerProps) => {
  // Create marker element
  const el = document.createElement('div');
  el.className = 'marker';
  
  // Get icon configuration based on category and current zoom
  const iconConfig = getCategoryIcon(post.category, map.getZoom());
  
  // Apply styles
  Object.assign(el.style, {
    width: `${iconConfig.width}px`,
    height: `${iconConfig.height}px`,
    backgroundColor: iconConfig.color,
    cursor: 'pointer',
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    ...getShapeStyle(iconConfig.shape)
  });

  // Add hover effect
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.1)';
    el.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  });

  // Add click handler
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });

  // Create and return the marker
  return new mapboxgl.Marker(el)
    .setLngLat([post.longitude, post.latitude])
    .addTo(map);
};

export default MapMarker;
