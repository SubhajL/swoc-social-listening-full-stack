// Mapbox token validation and management

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

console.log('Mapbox Token Debug:', {
  envToken: import.meta.env.VITE_MAPBOX_TOKEN,
  isDefined: !!import.meta.env.VITE_MAPBOX_TOKEN,
  tokenLength: import.meta.env.VITE_MAPBOX_TOKEN?.length
});

if (!MAPBOX_TOKEN) {
  console.error('Mapbox Token Error: Token is missing from environment');
  throw new Error('VITE_MAPBOX_TOKEN environment variable is required');
}

export const validateMapboxToken = (token: string): boolean => {
  // Basic validation of Mapbox token format
  // Format: pk.xxxx.xxxx where xxxx are base64url encoded strings
  const tokenPattern = /^pk\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  const isValid = tokenPattern.test(token);
  
  console.log('Mapbox Token Validation:', {
    token: token.substring(0, 10) + '...',
    isValid,
    matchesPattern: tokenPattern.test(token)
  });
  
  return isValid;
};

export const getMapboxToken = (): string => {
  console.log('Getting Mapbox Token:', {
    tokenExists: !!MAPBOX_TOKEN,
    tokenPrefix: MAPBOX_TOKEN?.substring(0, 10)
  });

  if (!validateMapboxToken(MAPBOX_TOKEN)) {
    console.error('Mapbox Token Error: Invalid token format', {
      token: MAPBOX_TOKEN.substring(0, 10) + '...'
    });
    throw new Error('Invalid Mapbox token format');
  }
  return MAPBOX_TOKEN;
}; 