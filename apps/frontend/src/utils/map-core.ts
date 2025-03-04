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

// Define category mappings for consistent filtering
const CATEGORY_MAPPINGS: Record<string, string> = {
  'การรายงานและแจ้งเหตุ': 'report_incident',
  'รายงาน': 'report_incident',
  'แจ้งเหตุ': 'report_incident',
  'การขอการสนับสนุน/ช่วยดำเนินการ': 'request_support',
  'ขอการสนับสนุน': 'request_support',
  'ช่วยดำเนินการ': 'request_support',
  'ขอข้อมูล': 'request_info',
  'การขอข้อมูล': 'request_info',
  'ข้อเสนอแนะ': 'suggestion',
  'เสนอแนะ': 'suggestion'
};

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
      'incident_count': ['+', ['case', ['==', ['get', 'category'], CategoryName.REPORT_INCIDENT], 1, 0]],
      'support_count': ['+', ['case', ['==', ['get', 'category'], CategoryName.REQUEST_SUPPORT], 1, 0]],
      'info_count': ['+', ['case', ['==', ['get', 'category'], CategoryName.REQUEST_INFO], 1, 0]],
      'suggestion_count': ['+', ['case', ['==', ['get', 'category'], CategoryName.SUGGESTION], 1, 0]]
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
          CategoryName.REPORT_INCIDENT, categoryColors[CategoryName.REPORT_INCIDENT],
          CategoryName.REQUEST_SUPPORT, categoryColors[CategoryName.REQUEST_SUPPORT],
          CategoryName.REQUEST_INFO, categoryColors[CategoryName.REQUEST_INFO],
          CategoryName.SUGGESTION, categoryColors[CategoryName.SUGGESTION],
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
  selectedCategories: string[],
  selectedProvince?: string,
  selectedAmphure?: string,
  selectedTumbon?: string,
  dateRange?: { start: string; end: string } | null,
  skipFiltering: boolean = false
): ProcessedPost[] {
  // Start with detailed logging
  console.log('🔍 FILTER POSTS CALLED with criteria:', {
    postsCount: posts.length,
    selectedCategories: selectedCategories?.length > 0 ? selectedCategories : 'none',
    categoryValues: selectedCategories,
    selectedProvince: selectedProvince || 'none',
    selectedAmphure: selectedAmphure || 'none',
    selectedTumbon: selectedTumbon || 'none',
    dateRange: dateRange ? `${dateRange.start} to ${dateRange.end}` : 'none',
    skipFiltering: skipFiltering
  });

  // If no posts, return empty array
  if (!posts || posts.length === 0) {
    console.log('🔍 No posts to filter, returning empty array');
    return [];
  }

  // If skipFiltering is true, return all posts without filtering
  if (skipFiltering) {
    console.log('🔍 Skipping filtering, returning all posts:', posts.length);
    return posts;
  }

  // Parse date range if provided
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let dateRangeValid = false;

  if (dateRange && dateRange.start && dateRange.end) {
    try {
      startDate = new Date(dateRange.start);
      endDate = new Date(dateRange.end);
      
      // Set time to beginning and end of day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        dateRangeValid = true;
        console.log('🔍 Valid date range parsed:', {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });
      } else {
        console.error('🔍 Invalid date range:', {
          start: dateRange.start,
          end: dateRange.end,
          startValid: !isNaN(startDate.getTime()),
          endValid: !isNaN(endDate.getTime())
        });
      }
    } catch (error) {
      console.error('🔍 Error parsing date range:', error);
    }
  } else {
    console.log('🔍 No date range provided for filtering');
  }

  // Create a reverse mapping from Thai category names to English identifiers
  const REVERSE_CATEGORY_MAPPING: Record<string, string> = {};
  Object.entries(CATEGORY_MAPPINGS).forEach(([thai, english]) => {
    REVERSE_CATEGORY_MAPPING[english] = thai;
  });

  // Convert selectedCategories to a set of both Thai and English identifiers for faster lookup
  const selectedCategorySet = new Set<string>();
  selectedCategories.forEach(category => {
    // Add the original category
    selectedCategorySet.add(category);
    
    // If it's a Thai category name, add its English mapping
    if (CATEGORY_MAPPINGS[category]) {
      selectedCategorySet.add(CATEGORY_MAPPINGS[category]);
    }
    
    // If it's an English identifier, add its Thai mapping
    if (REVERSE_CATEGORY_MAPPING[category]) {
      selectedCategorySet.add(REVERSE_CATEGORY_MAPPING[category]);
    }
  });
  
  console.log('🔍 Expanded category set for matching:', Array.from(selectedCategorySet));

  // Filter posts
  const filteredPosts = posts.filter((post: ProcessedPost) => {
    // Skip posts with invalid data
    if (!post) {
      console.log('🔍 Skipping undefined post');
      return false;
    }

    // Date range filtering
    if (dateRangeValid && startDate && endDate) {
      // Parse post date
      let postDate: Date | null = null;
      try {
        if (post.post_date) {
          postDate = new Date(post.post_date);
          
          // Check if post date is valid
          if (isNaN(postDate.getTime())) {
            console.log(`🔍 Post ${post.processed_post_id} has invalid date: ${post.post_date}`);
            return false;
          }
          
          // Check if post date is within range
          const isInRange = postDate >= startDate && postDate <= endDate;
          if (!isInRange) {
            console.log(`🔍 Post ${post.processed_post_id} filtered out - date ${postDate.toISOString()} outside range ${startDate.toISOString()} to ${endDate.toISOString()}`);
            return false;
          }
        } else {
          console.log(`🔍 Post ${post.processed_post_id} has no date, skipping date range filter`);
        }
      } catch (error) {
        console.error(`🔍 Error parsing date for post ${post.processed_post_id}:`, error);
        return false;
      }
    }

    // Category filtering
    if (selectedCategories && selectedCategories.length > 0) {
      // Map post category to predefined category names
      const postCategory = post.category_name?.toLowerCase() || '';
      
      // Log unknown categories for debugging
      if (postCategory && !CATEGORY_MAPPINGS[postCategory]) {
        console.log(`🔍 Unknown category detected: "${postCategory}" for post ${post.processed_post_id}`);
      }
      
      // Check if post category matches selected categories
      const mappedCategory = CATEGORY_MAPPINGS[postCategory] || 'unknown';
      
      // Add more detailed logging for category matching
      console.log(`🔍 Checking category for post ${post.processed_post_id}:`, {
        postCategory,
        mappedCategory,
        selectedCategories,
        selectedCategorySet: Array.from(selectedCategorySet),
        categoryMatchesOriginal: selectedCategories.includes(mappedCategory),
        categoryMatchesExpanded: selectedCategorySet.has(mappedCategory) || selectedCategorySet.has(postCategory)
      });
      
      // Use the expanded category set for matching
      const categoryMatches = selectedCategorySet.has(mappedCategory) || selectedCategorySet.has(postCategory);
      
      if (!categoryMatches) {
        console.log(`🔍 Post ${post.processed_post_id} filtered out - category "${postCategory}" (mapped to "${mappedCategory}") not in selected categories`);
        return false;
      }
    }

    // Administrative area filtering
    if (selectedProvince) {
      // Check if any province in the array matches the selected province
      const provinceMatches = post.province && post.province.some(
        (p: string) => p.toLowerCase() === selectedProvince.toLowerCase()
      );
      
      if (!provinceMatches) {
        console.log(`🔍 Post ${post.processed_post_id} filtered out - province "${post.province}" doesn't match "${selectedProvince}"`);
        return false;
      }

      if (selectedAmphure) {
        // Check if any amphure in the array matches the selected amphure
        const amphureMatches = post.amphure && post.amphure.some(
          (a: string) => a.toLowerCase() === selectedAmphure.toLowerCase()
        );
        
        if (!amphureMatches) {
          console.log(`🔍 Post ${post.processed_post_id} filtered out - amphure "${post.amphure}" doesn't match "${selectedAmphure}"`);
          return false;
        }

        if (selectedTumbon) {
          // Check if any tumbon in the array matches the selected tumbon
          const tumbonMatches = post.tumbon && post.tumbon.some(
            (t: string) => t.toLowerCase() === selectedTumbon.toLowerCase()
          );
          
          if (!tumbonMatches) {
            console.log(`🔍 Post ${post.processed_post_id} filtered out - tumbon "${post.tumbon}" doesn't match "${selectedTumbon}"`);
            return false;
          }
        }
      }
    }

    // If we got here, the post matches all filters
    return true;
  });

  // Log filtering results
  const filteredOutCount = posts.length - filteredPosts.length;
  console.log('🔍 FILTER RESULTS:', {
    beforeCount: posts.length,
    afterCount: filteredPosts.length,
    filteredOut: filteredOutCount,
    percentageFiltered: posts.length > 0 ? Math.round((filteredOutCount / posts.length) * 100) : 0
  });

  // Count posts by category
  const categoryCounts = filteredPosts.reduce((acc: Record<string, number>, post: ProcessedPost) => {
    const postCategory = post.category_name?.toLowerCase() || '';
    const mappedCategory = CATEGORY_MAPPINGS[postCategory] || 'Unknown';
    acc[mappedCategory] = (acc[mappedCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('🔍 Posts by category after filtering:', categoryCounts);

  // Log sample of filtered posts for debugging
  if (filteredPosts.length > 0) {
    const sampleSize = Math.min(3, filteredPosts.length);
    console.log(`🔍 Sample of ${sampleSize} filtered posts:`, 
      filteredPosts.slice(0, sampleSize).map((post: ProcessedPost) => ({
        id: post.processed_post_id,
        category: post.category_name,
        province: post.province,
        amphure: post.amphure,
        tumbon: post.tumbon,
        postDate: post.post_date
      }))
    );
  } else {
    console.log('🔍 No posts remain after filtering');
  }

  return filteredPosts;
}

/**
 * Simple function to check if the API server is reachable
 * @returns Promise<boolean> True if server is reachable, false otherwise
 */
export async function pingServer(client = apiClient): Promise<boolean> {
  try {
    console.log('Pinging API server...');
    // Try to make a simple request to check connectivity
    const response = await client.ping();
    console.log('API server ping response:', response);
    return true;
  } catch (error) {
    console.error('API server ping failed:', error);
    return false;
  }
}

/**
 * Loads posts with retry mechanism and error handling
 * @readonly This function should not be modified as it maintains core data loading functionality
 */
export async function loadMapPosts(
  client = apiClient,
  onSuccess?: (posts: ProcessedPost[]) => void,
  onError?: (error: Error) => void,
  retries: number = MAP_CORE_CONFIG.MAX_RETRIES,
  params?: { dateRange?: { start: string; end: string } }
): Promise<ProcessedPost[]> {
  try {
    console.log('Fetching posts from API...', params);
    
    // Check if API is available first
    const isServerReachable = await pingServer(client);
    if (!isServerReachable) {
      console.error('API server is not reachable');
      const error = new Error('Cannot connect to API server. Please check if the server is running and accessible.');
      onError?.(error);
      return [];
    }
    
    const posts = await withRetry(async () => {
      // Prepare API parameters
      const apiParams: Record<string, any> = {};
      
      // Add date range parameters if provided
      if (params?.dateRange?.start && params?.dateRange?.end) {
        apiParams.startDate = params.dateRange.start;
        apiParams.endDate = params.dateRange.end;
        console.log('Including date range in API call:', {
          start: params.dateRange.start,
          end: params.dateRange.end
        });
      }
      
      // Call the API with parameters
      const result = await client.getUnprocessedPosts(apiParams);
      console.log('API Response:', {
        totalPosts: result?.length || 0,
        firstPost: result?.[0],
        hasCoordinates: result?.some((p: ProcessedPost) => p.latitude && p.longitude),
        params: apiParams
      });
      if (!result) throw new Error('No posts returned from API');
      return result;
    }, retries);

    if (posts && posts.length > 0) {
      // Log unique categories for debugging
      const uniqueCategories = [...new Set(posts.map((p: ProcessedPost) => p.category_name))];
      console.log('Unique categories from API:', uniqueCategories);
      
      // Count posts by location data availability
      const postsWithCoords = posts.filter((p: ProcessedPost) => p.latitude && p.longitude).length;
      const postsWithAmphureAndProvince = posts.filter((p: ProcessedPost) => 
        p.amphure?.length && p.province?.length && (!p.latitude || !p.longitude)
      ).length;
      const postsWithOnlyTumbon = posts.filter((p: ProcessedPost) => 
        p.tumbon?.length && (!p.amphure?.length || !p.province?.length) && (!p.latitude || !p.longitude)
      ).length;
      const postsWithNoLocation = posts.filter((p: ProcessedPost) => 
        (!p.tumbon?.length && !p.amphure?.length && !p.province?.length) && (!p.latitude || !p.longitude)
      ).length;
      
      // Find posts with only tumbon info but have coordinates (these might be coming from the backend cache)
      const postsWithOnlyTumbonButCoords = posts.filter((p: ProcessedPost) => 
        p.tumbon?.length && (!p.amphure?.length || !p.province?.length) && p.latitude && p.longitude
      );
      
      // Find posts with coordinates but missing amphure or province
      const postsWithCoordsButMissingLocation = posts.filter((p: ProcessedPost) => 
        p.latitude && p.longitude && (!p.amphure?.length || !p.province?.length)
      );
      
      console.log('Posts location data breakdown:', {
        total: posts.length,
        withDirectCoordinates: postsWithCoords,
        withAmphureAndProvince: postsWithAmphureAndProvince,
        withOnlyTumbon: postsWithOnlyTumbon,
        withNoLocation: postsWithNoLocation,
        withOnlyTumbonButCoords: postsWithOnlyTumbonButCoords.length,
        withCoordsButMissingLocation: postsWithCoordsButMissingLocation.length
      });
      
      // Log some examples of posts with only tumbon but have coordinates
      if (postsWithOnlyTumbonButCoords.length > 0) {
        console.log('Examples of posts with only tumbon but have coordinates:', 
          postsWithOnlyTumbonButCoords.slice(0, 3).map((p: ProcessedPost) => ({
            id: p.processed_post_id,
            tumbon: p.tumbon,
            lat: p.latitude,
            lng: p.longitude,
            source: p.coordinate_source
          }))
        );
      }
      
      // Log some examples of posts with coordinates but missing location info
      if (postsWithCoordsButMissingLocation.length > 0) {
        console.log('Examples of posts with coordinates but missing location info:', 
          postsWithCoordsButMissingLocation.slice(0, 3).map((p: ProcessedPost) => ({
            id: p.processed_post_id,
            tumbon: p.tumbon,
            amphure: p.amphure,
            province: p.province,
            lat: p.latitude,
            lng: p.longitude,
            source: p.coordinate_source
          }))
        );
      }
      
      // IMPORTANT: Force filter out posts with only tumbon information, regardless of coordinates
      const preFilteredPosts = posts.filter((post: ProcessedPost) => {
        if (post.tumbon?.length && (!post.amphure?.length || !post.province?.length)) {
          console.log('Pre-filtering post with only tumbon info:', {
            id: post.processed_post_id,
            tumbon: post.tumbon,
            hasCoords: !!(post.latitude && post.longitude),
            source: post.coordinate_source
          });
          return false;
        }
        return true;
      });
      
      console.log('After pre-filtering posts with only tumbon info:', {
        before: posts.length,
        after: preFilteredPosts.length,
        filtered: posts.length - preFilteredPosts.length
      });
      
      // Then apply the standard validation
      const validPosts = preFilteredPosts.filter((post: ProcessedPost) => hasValidCoordinates(post));

      // Count posts by category
      const categoryCounts = validPosts.reduce((counts: Record<string, number>, post: ProcessedPost) => {
        const category = post.category_name || 'Unknown';
        counts[category] = (counts[category] || 0) + 1;
        return counts;
      }, {});
      
      // Final check: Ensure no posts with only tumbon info made it through
      const finalPostsWithOnlyTumbon = validPosts.filter((p: ProcessedPost) => 
        p.tumbon?.length && (!p.amphure?.length || !p.province?.length)
      );
      
      if (finalPostsWithOnlyTumbon.length > 0) {
        console.error('WARNING: Some posts with only tumbon info made it through filtering!', {
          count: finalPostsWithOnlyTumbon.length,
          examples: finalPostsWithOnlyTumbon.slice(0, 3).map((p: ProcessedPost) => ({
            id: p.processed_post_id,
            tumbon: p.tumbon,
            amphure: p.amphure,
            province: p.province,
            lat: p.latitude,
            lng: p.longitude,
            source: p.coordinate_source
          }))
        });
      }
      
      console.log('Posts validation summary:', {
        total: posts.length,
        afterPreFilter: preFilteredPosts.length,
        valid: validPosts.length,
        filtered: posts.length - validPosts.length,
        categoryCounts,
        sources: [...new Set(validPosts.map((p: ProcessedPost) => p.coordinate_source))],
        firstThree: validPosts.slice(0, 3).map((p: ProcessedPost) => ({
          id: p.processed_post_id,
          category: p.category_name,
          lat: p.latitude,
          lng: p.longitude,
          source: p.coordinate_source,
          hasAmphure: !!p.amphure?.length,
          hasProvince: !!p.province?.length,
          hasTumbon: !!p.tumbon?.length
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