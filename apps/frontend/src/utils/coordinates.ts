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
export function hasValidCoordinates(post: ProcessedPost): boolean {
  try {
    // First, try to parse coordinates
    const lat = parseFloat(String(post.latitude));
    const lng = parseFloat(String(post.longitude));
    
    // Log the post being checked for debugging
    const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    const hasAmphure = !!post.amphure?.length;
    const hasProvince = !!post.province?.length;
    const hasTumbon = !!post.tumbon?.length;
    
    console.log('🧭 VALIDATING COORDINATES for post:', {
      id: post.processed_post_id,
      hasCoords,
      lat,
      lng,
      hasAmphure,
      hasProvince,
      hasTumbon,
      source: post.coordinate_source
    });
    
    // STRICT CHECK: Ensure posts with only tumbon information are filtered out
    // Must have both amphure AND province, regardless of coordinates
    if (!hasAmphure || !hasProvince) {
      console.debug('🧭 FILTERING OUT POST with missing amphure or province:', {
        id: post.processed_post_id,
        tumbon: post.tumbon,
        amphure: post.amphure,
        province: post.province,
        hasCoords,
        source: post.coordinate_source,
        text: post.text?.substring(0, 50)
      });
      return false;
    }
    
    // If coordinates can't be parsed, return false
    if (!hasCoords) {
      console.debug('🧭 FILTERING OUT POST with invalid coordinates:', {
        id: post.processed_post_id,
        lat, 
        lng,
        source: post.coordinate_source
      });
      return false;
    }
    
    // Check coordinate source
    const validSource = post.coordinate_source === 'direct' || 
                        post.coordinate_source === 'cache_direct' || 
                        post.coordinate_source === 'cache_inherited' ||
                        post.coordinate_source === 'admin_location';
    
    if (validSource) {
      console.log('🧭 POST HAS VALID COORDINATES (valid source):', {
        id: post.processed_post_id,
        source: post.coordinate_source,
        lat,
        lng
      });
      return true;
    }
    
    // For any other source, require explicit coordinates
    const result = lat !== 0 && lng !== 0;
    console.log('🧭 POST COORDINATE VALIDATION RESULT:', {
      id: post.processed_post_id,
      result,
      reason: result ? 'has non-zero coordinates' : 'has zero coordinates',
      source: post.coordinate_source,
      lat,
      lng
    });
    
    return result;
  } catch (error) {
    console.error('❌ ERROR validating coordinates:', error);
    return false;
  }
}

const getMarkerKey = (category: CategoryName): string => {
  const iconMap: Record<CategoryName, string> = {
    [CategoryName.REPORT_INCIDENT]: 'marker-diamond',
    [CategoryName.REQUEST_SUPPORT]: 'marker-square',
    [CategoryName.REQUEST_INFO]: 'marker-circle',
    [CategoryName.SUGGESTION]: 'marker-hexa',
    [CategoryName.UNKNOWN]: 'marker-circle'
  };
  return iconMap[category] || 'marker-circle';
};

// Counter variables for limiting log messages
let unknownCategoryCount = 0;
let unrecognizedCategoryCount = 0;

/**
 * Creates a GeoJSON feature from a post
 */
export const createPostFeature = (post: ProcessedPost): GeoJSON.Feature | null => {
  const coords = parseCoordinates(post);
  if (!coords) {
    console.warn('Invalid coordinates for post:', post.processed_post_id);
    return null;
  }

  // Map the category name to CategoryName enum with variations
  let category: CategoryName;
  const categoryName = post.category_name?.trim() || '';
  
  // Only log for debugging if needed - limit to first few to avoid console spam
  if (categoryName === 'Unknown' && unknownCategoryCount < 5) {
    console.log('Received Unknown category:', {
      id: post.processed_post_id,
      count: ++unknownCategoryCount
    });
  }
  
  // Handle variations in category names - case insensitive matching
  const categoryNameLower = categoryName.toLowerCase();
  
  // Direct mapping based on the provided mapping information
  if (categoryName === 'Unknown') {
    category = CategoryName.UNKNOWN;
  } else if (categoryName === 'การรายงานและแจ้งเหตุ') {
    category = CategoryName.REPORT_INCIDENT;
  } else if (categoryName === 'การขอการสนับสนุน/ช่วยดำเนินการ') {
    category = CategoryName.REQUEST_SUPPORT;
  } else if (categoryName === 'ขอข้อมูล') {
    category = CategoryName.REQUEST_INFO;
  } else if (categoryName === 'ข้อเสนอแนะ') {
    category = CategoryName.SUGGESTION;
  } else if (categoryNameLower.includes('รายงาน') || 
      categoryNameLower.includes('แจ้งเหตุ') || 
      categoryNameLower.includes('report')) {
    category = CategoryName.REPORT_INCIDENT;
  } else if (categoryNameLower.includes('สนับสนุน') || 
             categoryNameLower.includes('ช่วยดำเนินการ') || 
             categoryNameLower.includes('support')) {
    category = CategoryName.REQUEST_SUPPORT;
  } else if (categoryNameLower.includes('ข้อมูล') || 
             categoryNameLower.includes('info')) {
    category = CategoryName.REQUEST_INFO;
  } else if (categoryNameLower.includes('เสนอแนะ') || 
             categoryNameLower.includes('suggestion')) {
    category = CategoryName.SUGGESTION;
  } else {
    // Only log unrecognized categories that aren't already handled
    if (unrecognizedCategoryCount < 5) {
      console.warn('Unrecognized category, using UNKNOWN:', {
        received: categoryName,
        count: ++unrecognizedCategoryCount
      });
    }
    category = CategoryName.UNKNOWN;
  }

  const marker = getMarkerKey(category);
  
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