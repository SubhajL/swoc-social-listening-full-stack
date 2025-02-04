import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRealTime } from '@/contexts/RealTimeContext';
import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import MapError from "./map/MapError";
import { mapStyle, categoryColors, categoryShapeMap } from './map/styles';
import { toast } from '@/components/ui/use-toast';
import { useMapContainer } from '@/hooks/useMapContainer';
import { hasValidCoordinates, createPostFeature } from '@/utils/coordinates';
import { 
  MAP_CORE_CONFIG, 
  LAYER_CONFIG,
  initializeMapCore, 
  updateMapData,
  filterPosts
} from '@/utils/map-core';

interface MapProps {
  token: string;
  selectedCategories: CategoryName[];
  selectedProvince: string | null;
  selectedAmphure: string | null;
  selectedTumbon: string | null;
  selectedOffice: string | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

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
const getCategoryFromName = (categoryName: string): CategoryName | undefined => {
  console.log('Category mapping debug:', {
    input: categoryName,
    availableCategories: Object.values(CategoryName),
    exactMatch: Object.values(CategoryName).includes(categoryName),
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
  return undefined;
};

const getMarkerKey = (category: CategoryName | undefined): string => {
  if (!category) {
    console.warn('Invalid category in getMarkerKey:', category);
    return 'circle-666666'; // Default fallback
  }

  const shape = categoryShapeMap[category];
  const color = categoryColors[category];

  console.log('Marker key generation:', {
    category,
    shape,
    color,
    markerKey: `${shape}-${color?.replace('#', '')}`
  });

  if (!shape || !color) {
    console.warn('Missing shape or color for category:', {
      category,
      shape,
      color,
      shapeMap: categoryShapeMap,
      colorMap: categoryColors
    });
    return 'circle-666666'; // Default fallback
  }

  return `${shape}-${color.replace('#', '')}`;
};

// Add helper function at the top level
const createMarkerImage = (shape: string, color: string, size: number = 32) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Set up shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.clearRect(0, 0, size, size);
  
  // Draw shape
  ctx.beginPath();
  const margin = size * 0.15;
  switch (shape) {
    case 'circle':
      ctx.arc(size/2, size/2, (size - margin*2)/2, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(size/2, margin);
      ctx.lineTo(size - margin, size - margin);
      ctx.lineTo(margin, size - margin);
      break;
    case 'square':
      ctx.rect(margin, margin, size - margin*2, size - margin*2);
      break;
    case 'hexa':
      ctx.moveTo(size/2, margin);
      ctx.lineTo(size - margin, size/2);
      ctx.lineTo(size - margin, size/2);
      ctx.lineTo(size/2, size - margin);
      ctx.lineTo(margin, size/2);
      ctx.lineTo(margin, size/2);
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
  token, 
  selectedCategories, 
  selectedProvince, 
  selectedAmphure, 
  selectedTumbon, 
  selectedOffice 
}: MapProps) {
  const {
    containerRef,
    containerState,
    isReady,
    hasError,
    error
  } = useMapContainer();

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const { latestPost } = useRealTime();
  const [apiPosts, setApiPosts] = useState<ProcessedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const loadedImagesRef = useRef(new Set<string>());

  const withRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return withRetry(operation, retries - 1);
      }
      throw error;
    }
  }, []);

  // Load initial posts
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching posts from API...');
        const posts = await withRetry(async () => {
          const result = await apiClient.getUnprocessedPosts();
          console.log('API Response:', {
            totalPosts: result?.length || 0,
            firstPost: result?.[0],
            hasCoordinates: result?.some(p => p.latitude && p.longitude)
          });
          if (!result) throw new Error('No posts returned from API');
          return result;
        });

        if (posts && posts.length > 0) {
          console.log('Raw posts from API:', posts.slice(0, 5)); // Log first 5 posts for debugging
          
          // Filter out posts without valid coordinates
          const validPosts = posts.filter(post => hasValidCoordinates(post));

          console.log('Posts validation summary:', {
            total: posts.length,
            valid: validPosts.length,
            categories: [...new Set(validPosts.map(p => p.category_name))],
            sources: [...new Set(validPosts.map(p => p.coordinate_source))],
            firstThree: validPosts.slice(0, 3).map(p => ({
              id: p.processed_post_id,
              lat: p.latitude,
              lng: p.longitude,
              source: p.coordinate_source
            }))
          });
          
          setApiPosts(validPosts);
        } else {
          console.log('No posts returned from API');
          setApiPosts([]);
        }
      } catch (error) {
        console.error('Failed to load posts:', error);
        toast({
          title: "Error loading posts",
          description: "Failed to load unreplied posts. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [withRetry]);

  // Handle real-time updates
  useEffect(() => {
    if (latestPost) {
      setApiPosts((current: ProcessedPost[]) => {
        const updated = [...current];
        const index = updated.findIndex(p => p.processed_post_id === latestPost.processed_post_id);
        
        if (index >= 0) {
          updated[index] = latestPost;
        } else {
          updated.unshift(latestPost);
          if (updated.length > 20) {
            updated.pop();
          }
        }
        
        return updated;
      });
    }
  }, [latestPost]);

  // Initialize map
  useEffect(() => {
    if (!isReady || !token || mapRef.current) return;

    try {
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: mapStyle.default,
        center: MAP_CORE_CONFIG.DEFAULT_CENTER,
        zoom: MAP_CORE_CONFIG.DEFAULT_ZOOM,
        language: MAP_CORE_CONFIG.LANGUAGE,
        localIdeographFontFamily: MAP_CORE_CONFIG.FONT_FAMILY
      });

      // Initialize source immediately
      map.on('load', () => {
        console.log('Map load event fired');
        
        // Initialize core functionality
        initializeMapCore(map);
        
        // Load marker images
        Object.values(CategoryName).forEach(category => {
          const shape = categoryShapeMap[category];
          const color = categoryColors[category];
          const imageId = getMarkerKey(category);
          
          const imageData = createMarkerImage(shape, color);
          if (!imageData) {
            console.error('Failed to create marker image:', { category, shape, color });
            return;
          }

          map.addImage(imageId, imageData, { pixelRatio: 2 });
          loadedImagesRef.current.add(imageId);
        });

        setImagesLoaded(true);
      });

      // Handle click events
      map.on('click', LAYER_CONFIG.UNCLUSTERED_POINT, (e) => {
        if (!e.features?.[0]) return;
        const { properties } = e.features[0];
        if (properties?.id) {
          navigate(`/posts/${properties.id}`);
        }
      });

      // Change cursor on hover
      map.on('mouseenter', LAYER_CONFIG.UNCLUSTERED_POINT, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', LAYER_CONFIG.UNCLUSTERED_POINT, () => {
        map.getCanvas().style.cursor = '';
      });

      // Handle cluster clicks
      map.on('click', LAYER_CONFIG.CLUSTERS, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [LAYER_CONFIG.CLUSTERS]
        });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        if (!clusterId) return;

        const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID);
        if (!source || !('getClusterExpansionZoom' in source)) return;

        const geometry = features[0].geometry as GeoJSON.Point;
        const coordinates = geometry.coordinates as [number, number];

        (source as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (error, result) => {
            if (error || !result) return;

            map.easeTo({
              center: coordinates,
              zoom: result
            });
          }
        );
      });

      map.on('mouseenter', LAYER_CONFIG.CLUSTERS, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', LAYER_CONFIG.CLUSTERS, () => {
        map.getCanvas().style.cursor = '';
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      mapRef.current = map;
    } catch (error) {
      console.error('Map initialization error:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Please try again later.",
        variant: "destructive"
      });
    }
  }, [isReady, token, navigate]);

  // Update map data when posts change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(MAP_CORE_CONFIG.SOURCE_ID) || !imagesLoaded) {
      console.log('Map update skipped:', {
        hasMap: !!map,
        hasSource: map?.getSource(MAP_CORE_CONFIG.SOURCE_ID) !== undefined,
        imagesLoaded,
        postCount: apiPosts.length
      });
      return;
    }

    try {
      // Filter posts based on selected criteria
      const filteredPosts = filterPosts(
        apiPosts,
        selectedCategories,
        selectedProvince,
        selectedAmphure,
        selectedTumbon
      );

      console.log('Creating features from filtered posts:', {
        total: apiPosts.length,
        filtered: filteredPosts.length,
        firstPost: filteredPosts[0]
      });

      // Create GeoJSON features
      const features = filteredPosts
        .map(createPostFeature)
        .filter(Boolean) as GeoJSON.Feature[];

      // Update map data using core utility
      updateMapData(map, features);

      console.log('Map data updated:', {
        featureCount: features.length,
        categories: [...new Set(features.map(f => f.properties?.category))],
        sources: [...new Set(features.map(f => f.properties?.source))]
      });
    } catch (error) {
      console.error('Error updating map data:', error);
    }
  }, [apiPosts, selectedCategories, selectedProvince, selectedAmphure, selectedTumbon, imagesLoaded]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {hasError && (
        <MapError 
          error={error} 
          onRetry={() => window.location.reload()} 
        />
      )}
      <div 
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        data-testid="map-container"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
}

export default Map;
