import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import { clusterConfig } from '@/components/map/styles';
import { hasValidCoordinates } from '@/utils/coordinates';
import { apiClient } from '@/lib/api-client';

/**
 * @readonly Core map initialization configuration
 */
export const MAP_CORE_CONFIG = {
  DEFAULT_CENTER: [101.0, 15.0] as [number, number],
  DEFAULT_ZOOM: 4,
  LANGUAGE: 'th',
  FONT_FAMILY: "'Noto Sans Thai', 'Noto Sans', sans-serif",
  SOURCE_ID: 'posts' as const,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
} as const;

/**
 * @readonly Core layer configuration
 */
export const LAYER_CONFIG = {
  CLUSTERS: 'clusters',
  CLUSTER_COUNT: 'cluster-count',
  UNCLUSTERED_POINT: 'unclustered-point'
} as const;

/**
 * Initializes the core map source and layers
 * @readonly This function should not be modified as it maintains core map functionality
 */
export function initializeMapCore(map: mapboxgl.Map): void {
  console.log('Initializing map core with config:', {
    sourceId: MAP_CORE_CONFIG.SOURCE_ID,
    clusterConfig: {
      maxZoom: 5,
      radius: clusterConfig.radius
    },
    layerIds: {
      clusters: LAYER_CONFIG.CLUSTERS,
      clusterCount: LAYER_CONFIG.CLUSTER_COUNT,
      unclustered: LAYER_CONFIG.UNCLUSTERED_POINT
    }
  });

  // Add source for posts
  const sourceData = {
    type: 'FeatureCollection' as const,
    features: []
  };

  map.addSource(MAP_CORE_CONFIG.SOURCE_ID, {
    type: 'geojson',
    data: sourceData,
    cluster: true,
    clusterMaxZoom: 5,
    clusterRadius: clusterConfig.radius
  });

  const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID);
  console.log('Source initialized:', {
    sourceId: MAP_CORE_CONFIG.SOURCE_ID,
    sourceExists: !!source,
    sourceType: source?.type,
    // @ts-ignore - Accessing internal properties for debugging
    hasClusterOptions: !!(source?._options?.cluster),
    // @ts-ignore
    maxZoom: source?._options?.clusterMaxZoom
  });

  // Add cluster layer
  map.addLayer({
    id: LAYER_CONFIG.CLUSTERS,
    type: 'circle',
    source: MAP_CORE_CONFIG.SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: clusterConfig.paint
  });

  // Add cluster count layer
  map.addLayer({
    id: LAYER_CONFIG.CLUSTER_COUNT,
    type: 'symbol',
    source: MAP_CORE_CONFIG.SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
    },
    paint: {
      'text-color': '#ffffff'
    }
  });

  // Add unclustered point layer
  map.addLayer({
    id: LAYER_CONFIG.UNCLUSTERED_POINT,
    type: 'circle',
    source: MAP_CORE_CONFIG.SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'category'],
        'การรายงานและแจ้งเหตุ', '#dc2626',
        'การขอการสนับสนุน/ช่วยดำเนินการ', '#059669',
        'ขอข้อมูล', '#2563eb',
        'ข้อเสนอแนะ', '#d97706',
        '#6b7280' // default color for unknown
      ],
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 4,     // Small at zoom level 5
        7, 6,     // Medium at zoom level 7
        9, 8,     // Larger at zoom level 9
        11, 10    // Largest at zoom level 11
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });

  // Verify layer visibility
  const style = map.getStyle();
  const mapLayers = style.layers || [];
  const ourLayers = mapLayers.filter(l => 
    [LAYER_CONFIG.CLUSTERS, LAYER_CONFIG.CLUSTER_COUNT, LAYER_CONFIG.UNCLUSTERED_POINT].includes(l.id)
  );

  console.log('Layer configuration:', {
    totalLayers: mapLayers.length,
    ourLayers: ourLayers.map(l => ({
      id: l.id,
      type: l.type,
      source: l.source,
      filter: l.filter,
      visible: map.getLayoutProperty(l.id, 'visibility') !== 'none'
    }))
  });
}

/**
 * Updates the map data with filtered posts
 * @readonly This function should not be modified as it maintains core data update functionality
 */
export function updateMapData(
  map: mapboxgl.Map,
  features: GeoJSON.Feature[]
): void {
  const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (!source) {
    console.error('Map source not found');
    return;
  }

  // Debug log features
  console.log('Updating map with features:', {
    total: features.length,
    categories: [...new Set(features.map(f => f.properties?.category))],
    coordinates: features.slice(0, 3).map(f => (f.geometry as GeoJSON.Point).coordinates),
    properties: features.slice(0, 3).map(f => ({
      category: f.properties?.category,
      marker: f.properties?.marker,
      id: f.properties?.id
    }))
  });

  // Log the complete GeoJSON being set
  const data = {
    type: 'FeatureCollection',
    features
  };
  
  console.log('Setting source data:', {
    featureCount: data.features.length,
    firstFeature: data.features[0],
    hasCluster: data.features.some(f => f.properties?.cluster),
    uniqueCategories: [...new Set(data.features.map(f => f.properties?.category))]
  });

  source.setData(data);
}

/**
 * Validates administrative area matches
 * @readonly This function should not be modified as it maintains core filtering logic
 */
export function matchesAdministrativeArea(
  post: ProcessedPost,
  selectedProvince: string | null,
  selectedAmphure: string | null,
  selectedTumbon: string | null
): boolean {
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
}

/**
 * Filters posts based on selected criteria
 * @readonly This function should not be modified as it maintains core filtering logic
 */
export function filterPosts(
  posts: ProcessedPost[],
  selectedCategories: CategoryName[],
  selectedProvince: string | null,
  selectedAmphure: string | null,
  selectedTumbon: string | null
): ProcessedPost[] {
  return posts.filter(post => {
    const categoryMatch = selectedCategories.length === 0 || 
      selectedCategories.includes(post.category_name as CategoryName);
    const areaMatch = matchesAdministrativeArea(
      post, 
      selectedProvince, 
      selectedAmphure, 
      selectedTumbon
    );
    return categoryMatch && areaMatch;
  });
}

/**
 * Loads posts with retry mechanism and error handling
 * @readonly This function should not be modified as it maintains core data loading functionality
 */
export async function loadMapPosts(
  client = apiClient,
  onSuccess?: (posts: ProcessedPost[]) => void,
  onError?: (error: Error) => void,
  retries: number = MAP_CORE_CONFIG.MAX_RETRIES
): Promise<ProcessedPost[]> {
  try {
    console.log('Fetching posts from API...');
    const posts = await withRetry(async () => {
      const result = await client.getUnprocessedPosts();
      console.log('API Response:', {
        totalPosts: result?.length || 0,
        firstPost: result?.[0],
        hasCoordinates: result?.some((p: ProcessedPost) => p.latitude && p.longitude)
      });
      if (!result) throw new Error('No posts returned from API');
      return result;
    }, retries);

    if (posts && posts.length > 0) {
      console.log('Raw posts from API:', posts.slice(0, 5));
      
      // Filter out posts without valid coordinates
      const validPosts = posts.filter((post: ProcessedPost) => hasValidCoordinates(post));

      console.log('Posts validation summary:', {
        total: posts.length,
        valid: validPosts.length,
        categories: [...new Set(validPosts.map((p: ProcessedPost) => p.category_name))],
        sources: [...new Set(validPosts.map((p: ProcessedPost) => p.coordinate_source))],
        firstThree: validPosts.slice(0, 3).map((p: ProcessedPost) => ({
          id: p.processed_post_id,
          lat: p.latitude,
          lng: p.longitude,
          source: p.coordinate_source
        }))
      });

      onSuccess?.(validPosts);
      return validPosts;
    } else {
      console.log('No posts returned from API');
      onSuccess?.([]);
      return [];
    }
  } catch (error) {
    console.error('Failed to load posts:', error);
    onError?.(error as Error);
    return [];
  }
}

/**
 * Helper function to retry operations
 * @readonly This function should not be modified as it maintains core retry functionality
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = MAP_CORE_CONFIG.MAX_RETRIES
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, MAP_CORE_CONFIG.RETRY_DELAY));
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
} 