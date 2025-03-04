/**
 * Utility functions for handling location data
 */

/**
 * Cleans a location string by removing common Thai prefixes
 * such as 'อ.', 'จ.', 'อำเภอ', 'จังหวัด'
 * 
 * @param location The location string or object to clean
 * @returns The cleaned location string
 */
export const cleanLocationString = (location?: string | any): string | undefined => {
  if (!location) return undefined;
  
  // Convert to string if it's not already
  const locationStr = String(location).trim();
  if (!locationStr) return undefined;
  
  return locationStr
    .replace(/^อ\.\s*/i, '')
    .replace(/^จ\.\s*/i, '')
    .replace(/^อำเภอ\s*/i, '')
    .replace(/^จังหวัด\s*/i, '');
};

/**
 * Formats a location string for display, ensuring it has the appropriate prefix
 * 
 * @param location The location string to format
 * @param type The type of location ('amphure' or 'province')
 * @returns The formatted location string
 */
export const formatLocationForDisplay = (
  location?: string,
  type: 'amphure' | 'province' = 'amphure'
): string | undefined => {
  if (!location) return undefined;
  
  // Clean the location first to avoid double prefixes
  const cleanedLocation = cleanLocationString(location);
  
  if (type === 'amphure') {
    return `อำเภอ${cleanedLocation}`;
  } else {
    return `จังหวัด${cleanedLocation}`;
  }
};

/**
 * Checks if a location string is empty or undefined after cleaning
 * 
 * @param location The location string to check
 * @returns True if the location is empty or undefined after cleaning
 */
export const isEmptyLocation = (location?: string): boolean => {
  if (!location) return true;
  
  const cleaned = cleanLocationString(location);
  return !cleaned || cleaned.trim() === '';
}; 