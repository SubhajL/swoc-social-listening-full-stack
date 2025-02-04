import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import mapboxgl from 'mapbox-gl';
import { clusterConfig } from '@/components/map/styles';

/**
 * @readonly Core map initialization configuration
 */
export const MAP_CORE_CONFIG = {
  DEFAULT_CENTER: [101.0, 15.0] as [number, number],
  DEFAULT_ZOOM: 5.5,
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
  // Add source for posts
  map.addSource(MAP_CORE_CONFIG.SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    },
    cluster: true,
    clusterMaxZoom: clusterConfig.maxZoom,
    clusterRadius: clusterConfig.radius
  });

  // Add cluster layer
  map.addLayer({
    id: LAYER_CONFIG.CLUSTERS,
    type: 'circle',
    source: MAP_CORE_CONFIG.SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#dc2626',  // Red for small clusters
        10, '#059669',  // Green for medium clusters
        100, '#2563eb'  // Blue for large clusters
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,   // radius when point count < 10
        10,   25,  // radius when point count < 100
        100,  30,  // radius when point count < 750
        750,  35   // radius when point count >= 750
      ],
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff'
    }
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
    type: 'symbol',
    source: MAP_CORE_CONFIG.SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['get', 'marker'],
      'icon-size': 1,
      'icon-allow-overlap': true
    }
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

  source.setData({
    type: 'FeatureCollection',
    features
  });
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