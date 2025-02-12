export function normalizeThaiLocationName(name?: string): string | undefined {
  try {
    if (!name) return undefined;
    
    // Convert to lowercase and trim
    let normalized = name.toLowerCase().trim();
    
    // Replace multiple spaces with single space
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Keep Thai characters, numbers, spaces, and some special characters
    normalized = normalized.replace(/[^\u0E00-\u0E7F0-9\s\.\-]/g, '');
    
    // Return undefined if the result is empty
    return normalized.length > 0 ? normalized : undefined;
  } catch (error) {
    console.error('Error normalizing Thai location name:', {
      name,
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }
}

export function normalizeThaiLocationNames(names?: string[]): string[] {
  try {
    if (!names?.length) return [];
    return names
      .map(name => {
        try {
          return normalizeThaiLocationName(name) || '';
        } catch (error) {
          console.error('Error normalizing location name in batch:', {
            name,
            error: error instanceof Error ? error.message : String(error)
          });
          return '';
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error normalizing Thai location names batch:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
} 