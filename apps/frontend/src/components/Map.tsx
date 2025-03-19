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
  loadMapPosts,
  pingServer
} from '@/utils/map-core';
import type { Feature, GeoJSON, Point } from 'geojson';
import { useComplaintData } from '@/atoms/hooks';

interface MapProps {
  token: string;
  selectedCategories: CategoryName[];
  selectedProvince: string | null;
  selectedAmphure: string | null;
  selectedTumbon: string | null;
  selectedOffice: string | null;
  dateRange: { start: string; end: string };
  allFilters?: {
    messageType: string;
    messageSubTypes: string[];
    communicationChannels: string[];
    provinces: string[];
    irrigationOffices: string[];
    provincialOffices: string[];
    dateRange: { start: string; end: string };
  };
  hasServerError?: boolean;
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

// Add a utility to limit logging frequency
const createThrottledLogger = (name: string, interval: number = 2000) => {
  let lastLogTime = 0;
  
  return (message: string, data?: any) => {
    const now = Date.now();
    if (now - lastLogTime > interval) {
      console.log(`${name}: ${message}`, data);
      lastLogTime = now;
    }
  };
};

export function Map({ 
  token, 
  selectedCategories, 
  selectedProvince, 
  selectedAmphure, 
  selectedTumbon, 
  selectedOffice,
  dateRange,
  allFilters,
  hasServerError = false
}: MapProps) {
  const navigate = useNavigate();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { containerRef, isReady } = useMapContainer();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { latestPost } = useRealTime();
  
  // New state for managing posts - ensure proper initialization
  const [allPosts, setAllPosts] = useState<ProcessedPost[]>([]);
  const [currentPosts, setCurrentPosts] = useState<ProcessedPost[]>([]);
  const [areMarkersReady, setAreMarkersReady] = useState(false);
  const [noPostsMessage, setNoPostsMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create throttled loggers
  const mapLogger = createThrottledLogger('🗺️ MAP');
  const filterLogger = createThrottledLogger('🔎 FILTER');

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

  // Add logging for the received props
  console.log('🗺️ MAP COMPONENT RECEIVED PROPS:', {
    selectedCategories,
    categoryNames: selectedCategories.map(cat => cat.toString()),
    categoryValues: selectedCategories.map(cat => cat),
    selectedProvince,
    selectedAmphure,
    selectedTumbon,
    selectedOffice,
    dateRange,
    allFilters
  });

  // Convert CategoryName enum values to strings for filtering
  const categoryStrings = selectedCategories.map(cat => cat.toString());

  // Get the complaint data functions at the component level
  const complaintData = useComplaintData();

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
          // Create a post object with the necessary properties
          const post = {
            processed_post_id: properties.id,
            text: properties.text || '',
            category_name: properties.category || 'Unknown',
            sub1_category_name: '',
            profile_name: '',
            post_date: new Date(),
            post_url: '',
            latitude: feature.geometry.coordinates[1] || 0,
            longitude: feature.geometry.coordinates[0] || 0,
            tumbon: [] as string[],
            amphure: [] as string[],
            province: [] as string[],
            created_at: new Date().toISOString(),
            status: 'new',
            type: 'complaint',
            severity: 1,
            id: properties.id.toString(),
            coordinate_source: 'direct' as const
          };
          
          // Update the Jotai store with the post data
          complaintData.updateProcessedPosts([post as ProcessedPost]);
          complaintData.togglePostSelection(properties.id.toString());
          
          // Navigate to the complaint form with the post ID
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
                    // Create a post object with the necessary properties
                    const post = {
                      processed_post_id: properties.id,
                      text: properties.text || '',
                      category_name: properties.category || 'Unknown',
                      sub1_category_name: '',
                      profile_name: '',
                      post_date: new Date(),
                      post_url: '',
                      latitude: feature.geometry.coordinates[1] || 0,
                      longitude: feature.geometry.coordinates[0] || 0,
                      tumbon: [] as string[],
                      amphure: [] as string[],
                      province: [] as string[],
                      created_at: new Date().toISOString(),
                      status: 'new',
                      type: 'complaint',
                      severity: 1,
                      id: properties.id.toString(),
                      coordinate_source: 'direct' as const
                    };
                    
                    // Update the Jotai store with the post data
                    complaintData.updateProcessedPosts([post as ProcessedPost]);
                    complaintData.togglePostSelection(properties.id.toString());
                    
                    // Navigate to the complaint form with the post ID
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
  }, [isReady, token, containerRef, navigate, complaintData]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!mapRef.current || !areMarkersReady) return;

      try {
        setIsLoading(true);
        setNoPostsMessage(null);
        
        // Check server connectivity first
        const isServerReachable = await pingServer();
        if (!isServerReachable && !hasServerError) {
          throw new Error('Cannot connect to API server. Please check if the server is running and accessible.');
        }
        
        const posts = await loadMapPosts();
        console.log('Initial posts loaded:', posts.length);
        
        if (posts.length === 0) {
          setNoPostsMessage('ไม่พบข้อมูลโพสต์ในระบบ กรุณาตรวจสอบการเชื่อมต่อกับ API หรือติดต่อผู้ดูแลระบบ');
        }
        
        setAllPosts(posts);
        setCurrentPosts(posts);
        updateMapWithPosts(posts);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: "Error",
          description: "Failed to load initial data. Please try again later.",
          variant: "destructive"
        });
        setHasError(true);
        setError(error as Error);
        setNoPostsMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [areMarkersReady, hasServerError]);

  // Add effect to reload data when date range changes
  useEffect(() => {
    // Skip if map or markers aren't ready
    if (!mapRef.current || !areMarkersReady) return;
    
    // Skip if date range is not valid
    if (!dateRange.start || !dateRange.end) {
      console.log('Skipping data reload: Invalid date range', dateRange);
      return;
    }
    
    const reloadDataWithDateRange = async () => {
      try {
        setIsLoading(true);
        setNoPostsMessage(null);
        
        console.log('Reloading posts with date range:', dateRange);
        
        const posts = await loadMapPosts(
          apiClient,
          undefined,
          undefined,
          MAP_CORE_CONFIG.MAX_RETRIES,
          { dateRange }
        );
        
        console.log('Posts loaded with date range:', {
          dateRange,
          count: posts.length
        });
        
        if (posts.length === 0) {
          setNoPostsMessage('ไม่พบข้อมูลที่ตรงกับช่วงวันที่ที่เลือก กรุณาลองเลือกช่วงวันที่อื่น');
        }
        
        setAllPosts(posts);
        setCurrentPosts(posts);
        updateMapWithPosts(posts);
      } catch (error) {
        console.error('Error loading data with date range:', error);
        toast({
          title: "Error",
          description: "Failed to load data with the selected date range.",
          variant: "destructive"
        });
        setNoPostsMessage('เกิดข้อผิดพลาดในการโหลดข้อมูลตามช่วงวันที่ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setIsLoading(false);
      }
    };
    
    reloadDataWithDateRange();
  }, [dateRange, areMarkersReady]);

  // Handle filtered messages
  useEffect(() => {
    if (!mapRef.current || !areMarkersReady || !isInitialized) return;

    mapLogger('MAP FILTERED MESSAGES EFFECT TRIGGERED', {
      allPostsCount: allPosts?.length || 0,
      hasComprehensiveFilters: !!allFilters,
      selectedCategories,
      selectedProvince,
      selectedAmphure,
      selectedTumbon,
      selectedOffice,
      dateRange
    });

    // If there are no posts at all, show a message and return
    if (!allPosts || allPosts.length === 0) {
      mapLogger('NO POSTS AVAILABLE AT ALL');
      setNoPostsMessage('ไม่พบข้อมูลโพสต์ในระบบ กรุณาตรวจสอบการเชื่อมต่อกับ API หรือติดต่อผู้ดูแลระบบ');
      updateMapWithPosts([]);
      return;
    }

    // Filter the allPosts based on the selected filters
    let postsToDisplay;
    
    // Validate date range before filtering
    let validDateRange: { start: string; end: string } | null | undefined = null;
    
    if (dateRange && dateRange.start && dateRange.end) {
      try {
        // Parse dates to ensure they're valid
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        
        // Check if dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate <= endDate) {
          validDateRange = dateRange;
          mapLogger('VALID DATE RANGE:', {
            start: dateRange.start,
            end: dateRange.end,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });
        } else {
          console.error('🗺️ INVALID DATE RANGE:', {
            start: dateRange.start,
            end: dateRange.end,
            startDate: startDate.toString(),
            endDate: endDate.toString(),
            isStartValid: !isNaN(startDate.getTime()),
            isEndValid: !isNaN(endDate.getTime()),
            isStartBeforeEnd: startDate <= endDate
          });
          setNoPostsMessage('ช่วงวันที่ไม่ถูกต้อง กรุณาตรวจสอบวันที่เริ่มต้นและวันที่สิ้นสุด');
          updateMapWithPosts([]);
          return;
        }
      } catch (error) {
        console.error('🗺️ ERROR PARSING DATE RANGE:', {
          dateRange,
          error: error instanceof Error ? error.message : String(error)
        });
        setNoPostsMessage('รูปแบบวันที่ไม่ถูกต้อง กรุณาตรวจสอบวันที่เริ่มต้นและวันที่สิ้นสุด');
        updateMapWithPosts([]);
        return;
      }
    } else {
      mapLogger('INCOMPLETE DATE RANGE, skipping date filtering:', dateRange);
    }
    
    // Apply filtering directly to the allPosts state
    const filtered = filterPosts(
      allPosts,
      categoryStrings,
      selectedProvince || undefined,
      selectedAmphure || undefined,
      selectedTumbon || undefined,
      validDateRange
    );
    mapLogger('APPLIED LEGACY FILTERS:', {
      beforeCount: allPosts.length,
      afterCount: filtered.length,
      dateRangeApplied: !!validDateRange
    });

    // Initialize postsToDisplay with filtered posts
    postsToDisplay = filtered;
    
    // Apply additional filters from allFilters if available
    if (allFilters) {
      const beforeComprehensiveCount = postsToDisplay.length;
      
      // Apply additional filters from allFilters
      postsToDisplay = postsToDisplay.filter(post => {
        // Filter by communication channels
        if (allFilters.communicationChannels.length > 0) {
          // Check if the post's source matches any of the selected channels
          const sourceMatches = allFilters.communicationChannels.some(channel => {
            if (channel === 'facebook' && post.profile_name?.toLowerCase().includes('facebook')) {
              return true;
            }
            if (channel === 'x' && (post.profile_name?.toLowerCase().includes('twitter') || post.profile_name?.toLowerCase().includes('x'))) {
              return true;
            }
            return false;
          });

          if (!sourceMatches) {
            return false;
          }
        }

        // TODO: Add filtering for irrigation offices
        // if (allFilters.irrigationOffices.length > 0) {
        //   // Implementation needed
        // }

        // TODO: Add filtering for provincial offices
        // if (allFilters.provincialOffices.length > 0) {
        //   // Implementation needed
        // }

        return true;
      });

      console.log('🗺️ APPLIED COMPREHENSIVE FILTERS:', {
        beforeCount: beforeComprehensiveCount,
        afterCount: postsToDisplay.length
      });
    }

    // Check if we have any posts after filtering
    if (postsToDisplay.length === 0) {
      setNoPostsMessage('ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา กรุณาปรับเปลี่ยนตัวกรอง');
    } else {
      setNoPostsMessage(null);
    }

    setCurrentPosts(postsToDisplay);
    mapLogger('UPDATING MAP WITH FILTERED POSTS', {
      count: postsToDisplay.length
    });
    updateMapWithPosts(postsToDisplay);
  }, [
    allPosts,
    selectedCategories,
    selectedProvince,
    selectedAmphure,
    selectedTumbon,
    selectedOffice,
    dateRange,
    allFilters,
    areMarkersReady,
    isInitialized
  ]);

  // Update map with posts
  const updateMapWithPosts = (posts: ProcessedPost[]) => {
    if (!mapRef.current) return;
    
    mapLogger('UPDATING MAP WITH POSTS', {
      count: posts.length
    });
    
    try {
      // Skip update if no posts to display
      if (posts.length === 0) {
        mapLogger('NO POSTS TO DISPLAY ON MAP');
        
        // Clear the source data
        const source = mapRef.current.getSource(MAP_CORE_CONFIG.SOURCE_ID);
        if (source && 'setData' in source) {
          source.setData({
            type: 'FeatureCollection',
            features: []
          });
        }
        return;
      }
      
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

      const source = mapRef.current.getSource(MAP_CORE_CONFIG.SOURCE_ID);
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
  };

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
      if (!currentPosts.includes(latestPost)) {
        setCurrentPosts(prev => [...prev, latestPost]);
      }
    } catch (error) {
      console.error('Error handling real-time update:', error);
    }
  }, [latestPost, areMarkersReady, currentPosts]);

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
      {noPostsMessage && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90">
          <div className="text-center p-6 max-w-md">
            <svg 
              className="w-12 h-12 mx-auto text-gray-400 mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูล</h3>
            <p className="text-gray-600">{noPostsMessage}</p>
            <div className="mt-4 text-sm text-gray-500">
              <p className="mb-2">คำแนะนำ:</p>
              <ul className="list-disc text-left pl-5 space-y-1">
                <li>ลองขยายช่วงวันที่ให้กว้างขึ้น</li>
                <li>ตรวจสอบว่าเลือกประเภทข้อความที่ถูกต้อง</li>
                <li>ลองยกเลิกตัวกรองบางอย่าง เช่น จังหวัด หรือช่องทางการสื่อสาร</li>
                <li>หากยังไม่พบข้อมูล อาจเป็นไปได้ว่าไม่มีข้อมูลในระบบที่ตรงกับเงื่อนไขที่เลือก</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Map;
