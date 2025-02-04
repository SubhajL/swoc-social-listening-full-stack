import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useRealTime } from '@/contexts/RealTimeContext';
import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import { useNavigate } from "react-router-dom";
import MapError from "./map/MapError";
import { clusterConfig, mapStyle, categoryColors, categoryShapeMap } from './map/styles';
import { getClusterColor, getClusterSize } from './map/utils';
import { toast } from '@/components/ui/use-toast';
import { useMapContainer } from '@/hooks/useMapContainer';

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
  // Direct coordinates
  if (post.latitude && post.longitude) {
    return true;
  }

  // Check for cached coordinates based on coordinate_source
  if (post.coordinate_source === 'cache_direct' || post.coordinate_source === 'cache_inherited') {
    return true;
  }

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
        const posts = await withRetry(async () => {
          const result = await apiClient.getUnprocessedPosts();
          if (!result) throw new Error('No posts returned from API');
          console.log('Total posts from API:', result.length);
          return result;
        });

        if (posts && posts.length > 0) {
          // Filter out posts without valid coordinates
          const validPosts = posts.filter(post => isValidCoordinates(post));
          console.log('Posts with valid coordinates:', validPosts.length);
          setApiPosts(validPosts);

          if (validPosts.length === 0) {
            toast({
              title: "No posts with valid coordinates",
              description: "There are currently no unreplied posts with valid coordinates to display on the map.",
              variant: "default"
            });
          }
        } else {
          setApiPosts([]);
          toast({
            title: "No unreplied posts found",
            description: "There are currently no unreplied posts to display on the map.",
            variant: "default"
          });
        }
      } catch (error) {
        console.error('Failed to load posts:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
        center: [101.0, 15.0],
        zoom: 5.5,
        language: 'th',
        localIdeographFontFamily: "'Noto Sans Thai', 'Noto Sans', sans-serif"
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Wait for map style to load before adding sources and layers
      map.on('style.load', () => {
        // Create SVG markers for each category
        const createSVGMarker = (shape: string) => {
          const size = 24;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.clearRect(0, 0, size, size);
          
          // Draw shape based on type
          ctx.beginPath();
          switch (shape) {
            case 'circle':
              ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2);
              break;
            case 'triangle':
              ctx.moveTo(size/2, size/6);
              ctx.lineTo(size*5/6, size*5/6);
              ctx.lineTo(size/6, size*5/6);
              ctx.closePath();
              break;
            case 'square':
              ctx.rect(size/6, size/6, size*2/3, size*2/3);
              break;
            case 'hexa':
              const a = size/3;
              ctx.moveTo(size/2, size/6);
              ctx.lineTo(size*5/6, size/3);
              ctx.lineTo(size*5/6, size*2/3);
              ctx.lineTo(size/2, size*5/6);
              ctx.lineTo(size/6, size*2/3);
              ctx.lineTo(size/6, size/3);
              ctx.closePath();
              break;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();

          return ctx.getImageData(0, 0, size, size);
        };

        // Add marker images
        Object.values(categoryShapeMap).forEach(shape => {
          const imageData = createSVGMarker(shape);
          if (imageData) {
            map.addImage(shape, imageData);
          }
        });

        // Initialize the source with empty data
        if (!map.getSource('posts')) {
          map.addSource('posts', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
            clusterProperties: {
              // Count occurrences of each category
              'report_incident_count': ['+', ['case', ['==', ['get', 'category'], 'REPORT_INCIDENT'], 1, 0]],
              'request_support_count': ['+', ['case', ['==', ['get', 'category'], 'REQUEST_SUPPORT'], 1, 0]],
              'request_info_count': ['+', ['case', ['==', ['get', 'category'], 'REQUEST_INFO'], 1, 0]],
              'suggestion_count': ['+', ['case', ['==', ['get', 'category'], 'SUGGESTION'], 1, 0]],
              // Count occurrences of each coordinate source
              'direct_count': ['+', ['case', ['==', ['get', 'coordinate_source'], 'direct'], 1, 0]],
              'cache_direct_count': ['+', ['case', ['==', ['get', 'coordinate_source'], 'cache_direct'], 1, 0]],
              'cache_inherited_count': ['+', ['case', ['==', ['get', 'coordinate_source'], 'cache_inherited'], 1, 0]]
            }
          });

          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'posts',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'let',
                'max_category',
                ['max',
                  ['get', 'report_incident_count'],
                  ['get', 'request_support_count'],
                  ['get', 'request_info_count'],
                  ['get', 'suggestion_count']
                ],
                [
                  'case',
                  ['==', ['var', 'max_category'], ['get', 'report_incident_count']], categoryColors[CategoryName.REPORT_INCIDENT],
                  ['==', ['var', 'max_category'], ['get', 'request_support_count']], categoryColors[CategoryName.REQUEST_SUPPORT],
                  ['==', ['var', 'max_category'], ['get', 'request_info_count']], categoryColors[CategoryName.REQUEST_INFO],
                  ['==', ['var', 'max_category'], ['get', 'suggestion_count']], categoryColors[CategoryName.SUGGESTION],
                  '#6b7280' // Default gray if no dominant category
                ]
              ],
              'circle-radius': clusterConfig.paint['circle-radius'],
              'circle-opacity': [
                'let',
                'max_source',
                ['max',
                  ['get', 'direct_count'],
                  ['get', 'cache_direct_count'],
                  ['get', 'cache_inherited_count']
                ],
                [
                  'case',
                  ['==', ['var', 'max_source'], ['get', 'direct_count']], 1,
                  ['==', ['var', 'max_source'], ['get', 'cache_direct_count']], 0.8,
                  ['==', ['var', 'max_source'], ['get', 'cache_inherited_count']], 0.6,
                  1 // Default opacity if no dominant source
                ]
              ]
            }
          });

          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'posts',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12
            }
          });

          map.addLayer({
            id: 'unclustered-point',
            type: 'symbol',
            source: 'posts',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': ['get', 'shape'],
              'icon-size': [
                'match',
                ['get', 'coordinate_source'],
                'direct', 1,
                'cache_direct', 0.8,
                'cache_inherited', 0.6,
                1 // default size
              ],
              'icon-allow-overlap': true
            },
            paint: {
              'icon-color': ['get', 'color'],
              'icon-opacity': [
                'match',
                ['get', 'coordinate_source'],
                'direct', 1,
                'cache_direct', 0.8,
                'cache_inherited', 0.6,
                1 // default opacity
              ]
            }
          });
        }

        // Add click handler for posts
        map.on('click', 'unclustered-point', (e) => {
          const feature = e.features?.[0];
          if (!feature?.properties) return;
          
          const properties = feature.properties as { id: string };
          navigate(`/posts/${properties.id}`);
        });

        // Change cursor on hover
        map.on('mouseenter', 'unclustered-point', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'unclustered-point', () => {
          map.getCanvas().style.cursor = '';
        });
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Map initialization error:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Please try again.",
        variant: "destructive"
      });
    }
  }, [isReady, token, containerRef, navigate]);

  // Update map data
  useEffect(() => {
    if (!mapRef.current || !apiPosts.length) return;

    try {
      const source = mapRef.current.getSource('posts') as mapboxgl.GeoJSONSource;
      if (!source) {
        console.warn('Map source not initialized yet');
        return;
      }

      const filteredPosts = apiPosts.filter((post: ProcessedPost) => 
        isValidCoordinates(post) &&
        matchesAdministrativeArea(post, selectedProvince, selectedAmphure, selectedTumbon) &&
        (selectedCategories.length === 0 || selectedCategories.includes(post.category_name as CategoryName))
      );
      console.log('Posts after all filters:', filteredPosts.length);
      console.log('Selected filters:', {
        categories: selectedCategories,
        province: selectedProvince,
        amphure: selectedAmphure,
        tumbon: selectedTumbon
      });

      const features = filteredPosts.map(post => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [post.longitude, post.latitude]
        },
        properties: {
          id: post.processed_post_id,
          shape: categoryShapeMap[post.category_name as CategoryName],
          color: categoryColors[post.category_name as CategoryName],
          category: post.category_name,
          title: post.category_name,
          coordinate_source: post.coordinate_source,
          report_incident_count: post.category_name === CategoryName.REPORT_INCIDENT ? 1 : 0,
          request_support_count: post.category_name === CategoryName.REQUEST_SUPPORT ? 1 : 0,
          request_info_count: post.category_name === CategoryName.REQUEST_INFO ? 1 : 0,
          suggestion_count: post.category_name === CategoryName.SUGGESTION ? 1 : 0,
          direct_count: post.coordinate_source === 'direct' ? 1 : 0,
          cache_direct_count: post.coordinate_source === 'cache_direct' ? 1 : 0,
          cache_inherited_count: post.coordinate_source === 'cache_inherited' ? 1 : 0
        }
      }));

      source.setData({
        type: 'FeatureCollection',
        features
      });
    } catch (error) {
      console.error('Error updating map data:', error);
    }
  }, [apiPosts, selectedCategories, selectedProvince, selectedAmphure, selectedTumbon]);

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
