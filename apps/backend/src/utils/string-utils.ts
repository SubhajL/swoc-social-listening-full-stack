export function normalizeThaiLocationName(name?: string): string | undefined {
  if (!name) return undefined;
  
  // Convert to lowercase
  let normalized = name.toLowerCase();
  
  // Remove leading/trailing whitespace
  normalized = normalized.trim();
  
  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Remove special characters except Thai characters and spaces
  normalized = normalized.replace(/[^\u0E00-\u0E7F\s]/g, '');
  
  return normalized;
}

export function normalizeThaiLocationNames(names?: string[]): string[] {
  if (!names?.length) return [];
  return names.map(name => normalizeThaiLocationName(name) || '').filter(Boolean);
} 