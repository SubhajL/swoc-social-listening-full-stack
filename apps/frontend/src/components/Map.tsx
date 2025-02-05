import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRealTime } from '@/contexts/RealTimeContext';
import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import MapError from "./map/MapError";
import { mapStyle, categoryColors, categoryShapeMap, clusterConfig } from './map/styles';
import { toast } from '@/components/ui/use-toast';
import { useMapContainer } from '@/hooks/useMapContainer';
import { hasValidCoordinates, createPostFeature } from '@/utils/coordinates';
import { 
  MAP_CORE_CONFIG, 
  LAYER_CONFIG,
  initializeMapCore, 
  updateMapData,
  filterPosts,
  loadMapPosts
} from '@/utils/map-core';
import { socketClient } from '@/lib/socket-client';
import { ConnectionManager } from '@/services/core';
import { useMap } from '@/hooks/useMap';
import { usePosts } from '@/hooks/usePosts';
import { MapLegend } from '@/components/MapLegend';

interface MapProps {
  selectedCategories?: CategoryName[];
  selectedProvince?: string;
  selectedAmphure?: string;
  selectedTumbon?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const connectionManager = ConnectionManager.getInstance();

interface MapState {
  isLoading: boolean;
  error: string | null;
  isMapInitialized: boolean;
}

function isValidCoordinates(post: ProcessedPost): boolean {
  console.log('Validating coordinates for post:', {
    id: post.processed_post_id,
    lat: post.latitude,
    lng: post.longitude,
    source: post.coordinate_source
  });

  // Check for direct coordinates
  if (typeof post.latitude === 'number' && 
      typeof post.longitude === 'number' && 
      !isNaN(post.latitude) && 
      !isNaN(post.longitude)) {
    console.log('Post has valid direct coordinates');
    return true;
  }

  // Check for cached coordinates
  if (post.coordinate_source && 
      ['direct', 'cache_direct', 'cache_inherited'].includes(post.coordinate_source)) {
    console.log('Post has valid cached coordinates');
    return true;
  }

  console.log('Post has invalid coordinates');
  return false;
}

const matchesAdministrativeArea = (
  post: ProcessedPost,
  selectedProvince: string | null,
  selectedAmphure: string | null,
  selectedTumbon: string | null
): boolean => {
  if (!selectedProvince && !selectedAmphure && !selectedTumbon) {
    return true;
  }

  if (selectedTumbon && post.tumbon) {
    return post.tumbon.includes(selectedTumbon);
  }

  if (selectedAmphure && post.amphure) {
    return post.amphure.includes(selectedAmphure);
  }

  if (selectedProvince && post.province) {
    return post.province.includes(selectedProvince);
  }

  return false;
};

// Add helper function at the top level
const getCategoryFromName = (categoryName: string): CategoryName => {
  console.log('Category mapping debug:', {
    input: categoryName,
    availableCategories: Object.values(CategoryName),
    exactMatch: Object.values(CategoryName).includes(categoryName as CategoryName),
    matchAttempts: Object.values(CategoryName).map(cat => ({
      category: cat,
      matches: cat === categoryName,
      inputLength: categoryName.length,
      categoryLength: cat.length
    }))
  });

  // Check if the category name exists in our enum
  const matchedCategory = Object.values(CategoryName).find(cat => cat === categoryName);
  if (matchedCategory) {
    return matchedCategory;
  }
  
  console.warn('Category mapping failed:', {
    input: categoryName,
    availableCategories: Object.values(CategoryName)
  });
  return CategoryName.UNKNOWN;
};

// Add helper function at the top level
const getMarkerKey = (category: CategoryName): string => {
  const shape = categoryShapeMap[category];
  const color = categoryColors[category];
  return `${shape}-${color.replace('#', '')}`;
};

// Update createMarkerImage function
const createMarkerImage = (shape: string, color: string, size: number = 32) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Set up shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  ctx.clearRect(0, 0, size, size);
  
  // Draw shape with padding
  ctx.beginPath();
  const padding = size * 0.1; // 10% padding
  const drawSize = size - (padding * 2);
  
  switch (shape) {
    case 'circle':
      ctx.arc(size/2, size/2, drawSize/2, 0, Math.PI * 2);
      break;
    case 'triangle':
      const h = drawSize * Math.sin(Math.PI * 2/3);
      ctx.moveTo(size/2, padding);
      ctx.lineTo(size - padding, size - padding);
      ctx.lineTo(padding, size - padding);
      break;
    case 'square':
      ctx.rect(padding, padding, drawSize, drawSize);
      break;
    case 'hexa':
      const a = (drawSize/2) * Math.cos(Math.PI/6);
      const b = (drawSize/2) * Math.sin(Math.PI/6);
      const cx = size/2;
      const cy = size/2;
      ctx.moveTo(cx + drawSize/2, cy);
      ctx.lineTo(cx + a, cy + b);
      ctx.lineTo(cx - a, cy + b);
      ctx.lineTo(cx - drawSize/2, cy);
      ctx.lineTo(cx - a, cy - b);
      ctx.lineTo(cx + a, cy - b);
      break;
  }
  ctx.closePath();

  // Fill with color
  ctx.fillStyle = color;
  ctx.fill();

  // Add white border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
};

export function Map({
  selectedCategories,
  selectedProvince,
  selectedAmphure,
  selectedTumbon
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { map, state: mapState, updatePosts } = useMap(containerRef, {
    onPointClick: (postId, location) => {
      navigate('/complaint-form', {
        state: {
          postId,
          location
        }
      });
    }
  });

  const {
    filteredPosts,
    isLoading: isLoadingPosts,
    error: postsError
  } = usePosts({
    selectedCategories,
    selectedProvince,
    selectedAmphure,
    selectedTumbon
  });

  // Update map when filtered posts change
  useEffect(() => {
    updatePosts(filteredPosts);
  }, [filteredPosts, updatePosts]);

  // Update map styles based on categories
  useEffect(() => {
    if (!map) return;

    // Update colors for unclustered points based on category
    const colors = selectedCategories?.length
      ? selectedCategories.map(cat => categoryColors[cat])
      : Object.values(categoryColors);

    const shapes = selectedCategories?.length
      ? selectedCategories.map(cat => categoryShapeMap[cat])
      : Object.values(categoryShapeMap);

    map.setPaintProperty('unclustered-point', 'circle-color', [
      'match',
      ['get', 'category_name'],
      ...colors.flatMap((color, i) => [shapes[i], color]),
      '#ccc' // default color
    ]);
  }, [map, selectedCategories]);

  if (mapState.error || postsError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-red-500 p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="mb-2">{mapState.error || postsError}</div>
          <button 
            onClick={() => window.location.reload()}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (mapState.isLoading && !map) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-gray-500">Initializing map...</div>
      </div>
    );
  }

  const availableCategories = selectedCategories || Object.values(CategoryName);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={containerRef} className="h-full w-full" />
      {(mapState.isLoading || isLoadingPosts) && map && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="text-gray-500">Loading posts...</div>
        </div>
      )}
      <div className="absolute bottom-4 right-4">
        <MapLegend 
          categories={availableCategories}
        />
      </div>
      <div className="absolute top-4 right-4 bg-white/90 px-3 py-2 rounded-lg shadow-lg">
        <div className="text-sm font-medium text-gray-700">
          {filteredPosts.length} posts
        </div>
      </div>
    </div>
  );
}

export default Map;
