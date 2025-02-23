import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import { clusterConfig, categoryShapeMap, categoryColors } from '@/components/map/styles';
import { hasValidCoordinates } from '@/utils/coordinates';
import { apiClient } from '@/lib/api-client';
import type { GeoJSON } from 'geojson';
import type { AnyLayer } from 'mapbox-gl';

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
  CLUSTERS: 'clusters' as const,
  CLUSTER_COUNT: 'cluster-count' as const,
  UNCLUSTERED_POINT: 'unclustered-point' as const
} as const;

/**
 * Initializes the core map source and layers
 * @readonly This function should not be modified as it maintains core map functionality
 */
export function initializeMapCore(map: mapboxgl.Map): void {
  console.log('Initializing map core with config:', {
    sourceId: MAP_CORE_CONFIG.SOURCE_ID,
    clusterConfig: {
      maxZoom: clusterConfig.maxZoom,
      radius: clusterConfig.radius
    },
    layerIds: LAYER_CONFIG
  });

  const sourceData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection' as const,
    features: []
  };

  map.addSource(MAP_CORE_CONFIG.SOURCE_ID, {
    type: 'geojson',
    data: sourceData,
    cluster: true,
    clusterMaxZoom: clusterConfig.maxZoom,
    clusterRadius: clusterConfig.radius,
    clusterProperties: {
      // Simple count for each category
      'incident_count': ['+', ['case', ['==', ['get', 'category'], 'การรายงานและแจ้งเหตุ'], 1, 0]],
      'support_count': ['+', ['case', ['==', ['get', 'category'], 'การขอการสนับสนุน/ช่วยดำเนินการ'], 1, 0]],
      'info_count': ['+', ['case', ['==', ['get', 'category'], 'ขอข้อมูล'], 1, 0]],
      'suggestion_count': ['+', ['case', ['==', ['get', 'category'], 'ข้อเสนอแนะ'], 1, 0]]
    }
  });

  const source = map.getSource(MAP_CORE_CONFIG.SOURCE_ID);
  if (!source) return;

  const style = map.getStyle();
  if (!style) return;

  // Add cluster layer with category-based colors
  const clusterLayer: AnyLayer = {
    id: LAYER_CONFIG.CLUSTERS,
    type: 'circle',
    source: MAP_CORE_CONFIG.SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['==', ['get', 'point_count'], 1],
        ['match',
          ['get', 'category'],
          'การรายงานและแจ้งเหตุ', categoryColors[CategoryName.REPORT_INCIDENT],
          'การขอการสนับสนุน/ช่วยดำเนินการ', categoryColors[CategoryName.REQUEST_SUPPORT],
          'ขอข้อมูล', categoryColors[CategoryName.REQUEST_INFO],
          'ข้อเสนอแนะ', categoryColors[CategoryName.SUGGESTION],
          categoryColors[CategoryName.UNKNOWN]
        ],
        [
          'case',
          ['>', ['get', 'incident_count'], ['max', ['get', 'support_count'], ['get', 'info_count'], ['get', 'suggestion_count']]],
          categoryColors[CategoryName.REPORT_INCIDENT],
          ['>', ['get', 'support_count'], ['max', ['get', 'info_count'], ['get', 'suggestion_count']]],
          categoryColors[CategoryName.REQUEST_SUPPORT],
          ['>', ['get', 'info_count'], ['get', 'suggestion_count']],
          categoryColors[CategoryName.REQUEST_INFO],
          ['>', ['get', 'suggestion_count'], 0],
          categoryColors[CategoryName.SUGGESTION],
          categoryColors[CategoryName.UNKNOWN]
        ]
      ],
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
    }
  };
  map.addLayer(clusterLayer);

  // Add cluster count layer
  const clusterCountLayer: AnyLayer = {
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
  };
  map.addLayer(clusterCountLayer);

  // Add unclustered point layer with category-based icons
  const unclusteredLayer: AnyLayer = {
    id: LAYER_CONFIG.UNCLUSTERED_POINT,
    type: 'symbol',
    source: MAP_CORE_CONFIG.SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': [
        'case',
        ['has', 'icon'], ['get', 'icon'],
        [
          'match',
          ['get', 'category'],
          CategoryName.REPORT_INCIDENT, 'marker-diamond',
          CategoryName.REQUEST_SUPPORT, 'marker-square',
          CategoryName.REQUEST_INFO, 'marker-circle',
          CategoryName.SUGGESTION, 'marker-hexa',
          'marker-circle' // Default fallback
        ]
      ],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4, 0.5,    // Small at initial zoom
        5, 1.0     // Full size at max zoom
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  };

  console.log('Adding unclustered point layer:', {
    id: unclusteredLayer.id,
    filter: unclusteredLayer.filter,
    iconImage: unclusteredLayer.layout?.['icon-image'],
    iconSize: unclusteredLayer.layout?.['icon-size']
  });

  map.addLayer(unclusteredLayer);
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

  console.log('Updating map data with raw features:', {
    total: features.length,
    sample: features.slice(0, 2).map(f => ({
      geometry: f.geometry,
      properties: f.properties,
      category: f.properties?.category
    }))
  });

  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: features.map(feature => {
      // Ensure category is properly set
      const category = (feature.properties?.category || CategoryName.UNKNOWN) as CategoryName;
      const markerKey = getMarkerKey(category);
      
      // Log the feature transformation
      console.log('Transforming feature:', {
        originalCategory: category,
        markerKey,
        properties: feature.properties
      });

      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          ...feature.properties,
          category, // Ensure category is set
          icon: markerKey,
          shape: categoryShapeMap[category],
          color: categoryColors[category]
        }
      };
    })
  };

  console.log('Setting map data with transformed features:', {
    total: data.features.length,
    sampleFeatures: data.features.slice(0, 2).map(f => ({
      category: f.properties?.category,
      icon: f.properties?.icon,
      shape: f.properties?.shape,
      color: f.properties?.color
    }))
  });

  source.setData(data);
}

// Helper function to get marker key
function getMarkerKey(category: CategoryName): string {
  const iconMap: Record<CategoryName, string> = {
    [CategoryName.REPORT_INCIDENT]: 'marker-diamond',
    [CategoryName.REQUEST_SUPPORT]: 'marker-square',
    [CategoryName.REQUEST_INFO]: 'marker-circle',
    [CategoryName.SUGGESTION]: 'marker-hexa',
    [CategoryName.UNKNOWN]: 'marker-circle'
  };
  return iconMap[category] || 'marker-circle';
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