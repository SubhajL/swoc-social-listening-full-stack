import { ProcessedPost } from '@/types/processed-post';
import { CategoryName } from '@/types/processed-post';
import { categoryShapeMap, categoryColors } from '@/components/map/styles';

/**
 * Validates and parses coordinates from a post, handling both number and string types
 */
export const parseCoordinates = (post: ProcessedPost): { latitude: number; longitude: number } | null => {
  try {
    // Parse latitude
    const latitude = typeof post.latitude === 'string' ? parseFloat(post.latitude) : post.latitude;
    
    // Parse longitude
    const longitude = typeof post.longitude === 'string' ? parseFloat(post.longitude) : post.longitude;

    // Validate parsed values
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    // Basic coordinate range validation
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return null;
    }

    return { latitude, longitude };
  } catch (error) {
    console.error('Error parsing coordinates:', error);
    return null;
  }
};

/**
 * Checks if a post has valid coordinates, considering both direct and admin-derived locations
 */
export const hasValidCoordinates = (post: ProcessedPost): boolean => {
  // First check if we can parse the coordinates
  const coords = parseCoordinates(post);
  if (!coords) {
    return false;
  }

  // If coordinates are from a valid source, they're good to use
  if (post.coordinate_source && 
      ['direct', 'cache_direct', 'cache_inherited', 'admin_location'].includes(post.coordinate_source)) {
    return true;
  }

  // For any other source, require explicit coordinates
  return true;
};

const getMarkerKey = (category: CategoryName): string => {
  const shape = categoryShapeMap[category];
  const color = categoryColors[category];
  return `${shape}-${color.replace('#', '')}`;
};

/**
 * Creates a GeoJSON feature from a post
 */
export const createPostFeature = (post: ProcessedPost): GeoJSON.Feature | null => {
  const coords = parseCoordinates(post);
  if (!coords) {
    console.warn('Invalid coordinates for post:', post.processed_post_id);
    return null;
  }

  // Get marker key based on category
  let category = Object.values(CategoryName).find(cat => cat === post.category_name);
  if (!category) {
    console.warn('Invalid category, using UNKNOWN:', post.category_name);
    category = CategoryName.UNKNOWN;
  }

  const marker = getMarkerKey(category);
  console.log('Created feature:', { 
    id: post.processed_post_id,
    category,
    marker,
    coords,
    source: post.coordinate_source
  });

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [coords.longitude, coords.latitude]
    },
    properties: {
      id: post.processed_post_id,
      text: post.text,
      category: category,
      source: post.coordinate_source,
      marker
    }
  };
}; 