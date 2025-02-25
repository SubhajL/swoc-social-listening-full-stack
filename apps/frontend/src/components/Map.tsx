import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRealTime } from '@/contexts/RealTimeContext';
import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import MapError from "./map/MapError";
import { mapStyle, categoryColors, categoryShapeMap, clusterConfig, shapeStyles } from './map/styles';
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
import type { Feature, GeoJSON, Point } from 'geojson';

interface MapProps {
  token: string;
  selectedCategories: CategoryName[];
  selectedProvince: string | null;
  selectedAmphure: string | null;
  selectedTumbon: string | null;
  selectedOffice: string | null;
  filteredMessages?: ProcessedPost[];
}

interface PostFeatureProperties {
  id: number;
  text: string;
  category: CategoryName;
  source: string;
  marker: string;
  cluster_id?: number;
  point_count?: number;
}

// Create marker image function
const createMarkerImage = (shape: keyof typeof shapeStyles, color: string, size: number = 32): ImageData | null => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return null;
    }

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
      case 'diamond':
        ctx.moveTo(size/2, padding);
        ctx.lineTo(size - padding, size/2);
        ctx.lineTo(size/2, size - padding);
        ctx.lineTo(padding, size/2);
        break;
      case 'square':
        ctx.rect(padding, padding, drawSize, drawSize);
        break;
      case 'circle':
        ctx.arc(size/2, size/2, drawSize/2, 0, Math.PI * 2);
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
  } catch (error) {
    console.error('Error creating marker image:', { shape, color, error });
    return null;
  }
};

export function Map({ 
  token, 
  selectedCategories, 
  selectedProvince, 
  selectedAmphure, 
  selectedTumbon, 
  selectedOffice,
  filteredMessages
}: MapProps) {
  const navigate = useNavigate();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { containerRef, isReady } = useMapContainer();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { latestPost } = useRealTime();
  
  // New state for managing posts
  const [allPosts, setAllPosts] = useState<ProcessedPost[]>([]);
  const [currentPosts, setCurrentPosts] = useState<ProcessedPost[]>([]);
  const [areMarkersReady, setAreMarkersReady] = useState(false);

  // Helper function to check if a feature is a point feature
  const isPointFeature = (feature: any): feature is Feature<Point> => {
    return feature?.geometry?.type === 'Point';
  };

  // Helper function to check if properties are post properties
  const isPostFeatureProperties = (props: any): props is PostFeatureProperties => {
    return props?.id !== undefined && props?.category !== undefined;
  };

  // Helper function to get marker image ID
  const getMarkerImageId = (category: CategoryName): string => {
    return `marker-${categoryShapeMap[category]}`;
  };

  // Initialize map and load marker images
  useEffect(() => {
    if (!isReady || !token || mapRef.current) return;

    try {
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: mapStyle.default,
        center: MAP_CORE_CONFIG.DEFAULT_CENTER,
        zoom: MAP_CORE_CONFIG.DEFAULT_ZOOM,
      });
      mapRef.current = map;

      // Initialize core functionality when map loads
      map.on('load', async () => {
        console.log('Map load event fired');
        
        // Initialize core functionality
        initializeMapCore(map);
        
        // Load marker images first
        try {
          Object.values(CategoryName).forEach(category => {
            const shape = categoryShapeMap[category];
            const color = categoryColors[category];
            const imageId = getMarkerImageId(category);
            
            console.log('Creating marker image:', { category, shape, color, imageId });
            
            const imageData = createMarkerImage(shape, color);
            if (!imageData) {
              console.error('Failed to create marker image:', { category, shape, color });
              return;
            }

            if (!map.hasImage(imageId)) {
              map.addImage(imageId, imageData, { pixelRatio: 2 });
              console.log('Successfully added marker image:', imageId);
            }
          });
          
          setAreMarkersReady(true);
        } catch (error) {
          console.error('Error loading marker images:', error);
          setHasError(true);
          setError(error as Error);
        }
      });

      // Handle click events
      map.on('click', LAYER_CONFIG.UNCLUSTERED_POINT, (e) => {
        if (!e.features?.length) return;
        
        const feature = e.features[0] as unknown as Feature<Point, PostFeatureProperties>;
        if (!isPointFeature(feature) || !isPostFeatureProperties(feature.properties)) return;

        const properties = feature.properties;
        
        if (properties?.id) {
          navigate(`/complaint/create?postId=${properties.id}`);
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

        const feature = features[0] as unknown as Feature<Point, PostFeatureProperties>;
        if (!isPointFeature(feature) || !isPostFeatureProperties(feature.properties)) return;

        const clusterId = feature.properties.cluster_id;
        const pointCount = feature.properties.point_count;
        
        if (typeof clusterId === 'undefined' || typeof pointCount === 'undefined') return;

        const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID);
        if (!source || !('getClusterLeaves' in source)) return;

        // For small clusters (less than 5 points), show popup with links
        if (pointCount < 5) {
          source.getClusterLeaves(
            clusterId,
            pointCount,
            0,
            (error, features) => {
              if (error || !features) return;

              const popupContent = document.createElement('div');
              popupContent.className = 'p-2 space-y-2';
              
              const title = document.createElement('div');
              title.className = 'font-semibold text-sm mb-2';
              title.textContent = `${pointCount} ข้อร้องเรียน`;
              popupContent.appendChild(title);

              features.forEach(feature => {
                if (!isPointFeature(feature)) return;
                const properties = feature.properties as PostFeatureProperties;
                
                const link = document.createElement('a');
                link.className = 'block text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-1';
                link.textContent = properties?.text?.substring(0, 50) + '...';
                link.onclick = () => {
                  if (properties?.id) {
                    navigate(`/complaint/create?postId=${properties.id}`);
                  }
                };
                popupContent.appendChild(link);
              });

              new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                maxWidth: '300px'
              })
                .setLngLat(feature.geometry.coordinates as [number, number])
                .setDOMContent(popupContent)
                .addTo(map);
            }
          );
        } else {
          // For larger clusters, zoom in
          const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID);
          if (!source || !('getClusterExpansionZoom' in source)) return;

          source.getClusterExpansionZoom(clusterId, (error, zoom) => {
            if (error || zoom === null || typeof zoom === 'undefined') return;

            map.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom: zoom
            });
          });
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setHasError(true);
      setError(error as Error);
    }
  }, [isReady, token, containerRef, navigate]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!mapRef.current || !areMarkersReady) return;

      try {
        setIsLoading(true);
        const posts = await loadMapPosts();
        console.log('Initial posts loaded:', posts.length);
        setAllPosts(posts);
        
        // If no filtered messages, use all posts
        if (!filteredMessages) {
          setCurrentPosts(posts);
          updateMapWithPosts(posts);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: "Error",
          description: "Failed to load initial data. Please try again later.",
          variant: "destructive"
        });
        setHasError(true);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [areMarkersReady]);

  // Handle filtered messages
  useEffect(() => {
    if (!mapRef.current || !areMarkersReady) return;

    const posts = filteredMessages || allPosts;
    setCurrentPosts(posts);
    updateMapWithPosts(posts);
  }, [filteredMessages, allPosts, areMarkersReady]);

  // Update map with posts
  const updateMapWithPosts = useCallback((posts: ProcessedPost[]) => {
    const map = mapRef.current;
    if (!map) return;

    try {
      console.log('Received posts for update:', {
        count: posts.length,
        sample: posts.slice(0, 2).map(p => ({
          id: p.processed_post_id,
          category: p.category_name,
          coords: [p.latitude, p.longitude],
          source: p.coordinate_source
        }))
      });

      const features = posts
        .map(post => {
          const feature = createPostFeature(post);
          if (!feature) {
            console.warn('Failed to create feature for post:', {
              id: post.processed_post_id,
              category: post.category_name,
              coords: [post.latitude, post.longitude],
              source: post.coordinate_source
            });
          }
          return feature;
        })
        .filter(Boolean) as GeoJSON.Feature[];

      console.log('Created features:', {
        totalPosts: posts.length,
        validFeatures: features.length,
        sample: features.slice(0, 2).map(f => ({
          id: f.properties?.id,
          category: f.properties?.category,
          marker: f.properties?.marker,
          coords: (f.geometry as Point).coordinates
        }))
      });

      const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID);
      if (!source || !('setData' in source)) {
        console.error('Invalid map source:', {
          hasSource: !!source,
          sourceType: source ? typeof source : 'undefined',
          hasSetData: source ? 'setData' in source : false
        });
        return;
      }

      source.setData({
        type: 'FeatureCollection',
        features
      });
    } catch (error) {
      console.error('Error updating map with posts:', error);
    }
  }, []);

  // Handle real-time updates
  useEffect(() => {
    if (!mapRef.current || !latestPost || !areMarkersReady) return;

    try {
      // Add to all posts
      setAllPosts(prev => {
        const newPosts = [...prev];
        const index = newPosts.findIndex(p => p.processed_post_id === latestPost.processed_post_id);
        if (index >= 0) {
          newPosts[index] = latestPost;
        } else {
          newPosts.unshift(latestPost);
        }
        return newPosts;
      });

      // Update current posts if no filtering is active
      if (!filteredMessages) {
        setCurrentPosts(prev => {
          const newPosts = [...prev];
          const index = newPosts.findIndex(p => p.processed_post_id === latestPost.processed_post_id);
          if (index >= 0) {
            newPosts[index] = latestPost;
          } else {
            newPosts.unshift(latestPost);
          }
          return newPosts;
        });
      }
    } catch (error) {
      console.error('Error handling real-time update:', error);
    }
  }, [latestPost, areMarkersReady, filteredMessages]);

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
