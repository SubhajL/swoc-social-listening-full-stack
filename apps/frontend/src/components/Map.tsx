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

  // Load initial posts
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        const posts = await loadMapPosts(
          undefined,
          (validPosts) => {
            setApiPosts(validPosts);
          },
          (error) => {
            console.error('Failed to load posts:', error);
            toast({
              title: "Error loading posts",
              description: "Failed to load unreplied posts. Please try again later.",
              variant: "destructive"
            });
          }
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

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

  // Add new function to handle cluster clicks
  const handleClusterClick = useCallback(async (
    map: mapboxgl.Map,
    clusterId: number,
    coordinates: [number, number],
    pointCount: number
  ) => {
    const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID);
    if (!source || !('getClusterLeaves' in source)) return;

    // For small clusters (less than 5 points), show popup with links
    if (pointCount < 5) {
      (source as mapboxgl.GeoJSONSource).getClusterLeaves(
        clusterId,
        pointCount,
        0,
        (error, features) => {
          if (error || !features) return;

          // Create popup content
          const popupContent = document.createElement('div');
          popupContent.className = 'p-2 space-y-2';
          
          // Add title
          const title = document.createElement('div');
          title.className = 'font-semibold text-sm mb-2';
          title.textContent = `${pointCount} ข้อร้องเรียน`;
          popupContent.appendChild(title);

          // Add links for each post
          features.forEach(feature => {
            const link = document.createElement('a');
            link.className = 'block text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-1';
            link.textContent = feature.properties?.text?.substring(0, 50) + '...';
            link.onclick = () => {
              if (feature.properties?.id) {
                navigate(`/posts/${feature.properties.id}`);
              }
            };
            popupContent.appendChild(link);
          });

          // Show popup
          new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '300px'
          })
            .setLngLat(coordinates)
            .setDOMContent(popupContent)
            .addTo(map);
        }
      );
    } else {
      // For larger clusters, zoom in smoothly
      (source as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (error, zoom) => {
          if (error || !zoom) return;

          map.easeTo({
            center: coordinates,
            zoom: zoom + 0.5, // Zoom a bit more than default
            duration: 500, // Smooth animation
            easing: t => t * (2 - t) // Ease out quadratic
          });
        }
      );
    }
  }, [navigate]);

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

      // Add zoom change handler to count individual posts
      map.on('zoomend', () => {
        const currentZoom = map.getZoom();
        console.log('Map zoom changed:', {
          zoom: currentZoom,
          isClusteringEnabled: currentZoom <= 5,
          layerIds: map.getStyle().layers?.map(l => l.id) || []
        });
        
        // Get visible features in the viewport
        const bounds = map.getBounds();
        if (!bounds) return;
        
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        
        // Log viewport bounds
        console.log('Querying features in viewport:', {
          bounds: {
            sw: [sw.lng, sw.lat],
            ne: [ne.lng, ne.lat]
          },
          visibleLayers: map.getStyle().layers
            ?.filter(l => map.getLayoutProperty(l.id, 'visibility') !== 'none')
            .map(l => l.id)
        });

        // Query features from each layer separately for debugging
        const clusterFeatures = map.queryRenderedFeatures(
          [[sw.lng, sw.lat], [ne.lng, ne.lat]],
          { layers: [LAYER_CONFIG.CLUSTERS] }
        );

        const unclusteredFeatures = map.queryRenderedFeatures(
          [[sw.lng, sw.lat], [ne.lng, ne.lat]],
          { layers: [LAYER_CONFIG.UNCLUSTERED_POINT] }
        );

        console.log('Layer query results:', {
          clusters: {
            count: clusterFeatures.length,
            sample: clusterFeatures.slice(0, 2).map(f => ({
              id: f.properties?.cluster_id,
              pointCount: f.properties?.point_count
            }))
          },
          unclustered: {
            count: unclusteredFeatures.length,
            sample: unclusteredFeatures.slice(0, 2).map(f => ({
              id: f.properties?.id,
              category: f.properties?.category
            }))
          }
        });

        // Count clustered points
        const clusteredPoints = clusterFeatures
          .reduce((sum, f) => sum + (f.properties?.point_count || 0), 0);

        // Count and categorize unclustered points
        const categoryCounts = unclusteredFeatures.reduce((acc, feature) => {
          const category = feature.properties?.category;
          if (category) {
            acc[category] = (acc[category] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Log final counts
        console.log('Points on map:', {
          zoom: currentZoom,
          totalClustered: clusteredPoints,
          totalUnclustered: unclusteredFeatures.length,
          byCategory: categoryCounts,
          viewport: {
            sw: [sw.lng, sw.lat],
            ne: [ne.lng, ne.lat]
          }
        });
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

      // Update cluster click handler
      map.on('click', LAYER_CONFIG.CLUSTERS, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [LAYER_CONFIG.CLUSTERS]
        });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const pointCount = features[0].properties?.point_count;
        if (!clusterId || !pointCount) return;

        const geometry = features[0].geometry as GeoJSON.Point;
        const coordinates = geometry.coordinates as [number, number];

        handleClusterClick(map, clusterId, coordinates, pointCount);
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
  }, [isReady, token, handleClusterClick]);

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
      // Debug log raw posts
      console.log('Raw posts before filtering:', {
        total: apiPosts.length,
        samplePosts: apiPosts.slice(0, 3).map(p => ({
          id: p.processed_post_id,
          category: p.category_name,
          coords: [p.longitude, p.latitude],
          source: p.coordinate_source
        }))
      });

      // Filter posts based on selected criteria
      const filteredPosts = filterPosts(
        apiPosts,
        selectedCategories,
        selectedProvince,
        selectedAmphure,
        selectedTumbon
      );

      console.log('Posts after filtering:', {
        total: apiPosts.length,
        filtered: filteredPosts.length,
        selectedFilters: {
          categories: selectedCategories,
          province: selectedProvince,
          amphure: selectedAmphure,
          tumbon: selectedTumbon
        },
        sampleFiltered: filteredPosts.slice(0, 3).map(p => ({
          id: p.processed_post_id,
          category: p.category_name,
          coords: [p.longitude, p.latitude]
        }))
      });

      // Create GeoJSON features
      const features = filteredPosts
        .map(post => {
          const feature = createPostFeature(post);
          if (!feature) {
            console.warn('Failed to create feature for post:', {
              id: post.processed_post_id,
              category: post.category_name,
              coords: [post.longitude, post.latitude]
            });
          }
          return feature;
        })
        .filter(Boolean) as GeoJSON.Feature[];

      console.log('Features created:', {
        total: features.length,
        sampleFeatures: features.slice(0, 3).map(f => ({
          geometry: f.geometry,
          properties: f.properties
        }))
      });

      // Update map data using core utility
      updateMapData(map, features);

      // Verify source data after update
      const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        // @ts-ignore - Accessing internal _data for debugging
        const currentData = source._data;
        console.log('Source data after update:', {
          hasData: !!currentData,
          featureCount: currentData?.features?.length || 0,
          bounds: map.getBounds().toArray()
        });
      }
    } catch (error) {
      console.error('Error updating map data:', error);
    }
  }, [apiPosts, selectedCategories, selectedProvince, selectedAmphure, selectedTumbon, imagesLoaded]);

  // Update marker image loading
  useEffect(() => {
    if (!mapRef.current || !imagesLoaded) return;

    try {
      // Load marker images for each category
      Object.values(CategoryName).forEach(category => {
        const shape = categoryShapeMap[category];
        const color = categoryColors[category];
        const imageId = getMarkerKey(category);
        
        // Skip if already loaded
        if (loadedImagesRef.current.has(imageId)) return;
        
        const imageData = createMarkerImage(shape, color);
        if (!imageData) {
          console.error('Failed to create marker image:', { category, shape, color });
          return;
        }

        mapRef.current?.addImage(imageId, imageData, { pixelRatio: 2 });
        loadedImagesRef.current.add(imageId);
      });

      setImagesLoaded(true);
      
      console.log('Marker images loaded:', {
        categories: Object.values(CategoryName),
        loadedImages: Array.from(loadedImagesRef.current)
      });
    } catch (error) {
      console.error('Error loading marker images:', error);
    }
  }, [mapRef.current]);

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
