declare module '@mapbox/mapbox-sdk/services/geocoding.js' {
  interface GeocodeServiceOptions {
    accessToken: string;
  }

  interface GeocodingQuery {
    query: [number, number] | string;
    countries?: string[];
    types?: string[];
    limit?: number;
  }

  interface GeocodeFeature {
    id: string;
    text: string;
    center?: [number, number];
    context?: Array<{
      id: string;
      text: string;
    }>;
  }

  interface GeocodeResponse {
    body: {
      features: GeocodeFeature[];
    };
  }

  interface GeocodeService {
    forwardGeocode(options: { query: string; countries?: string[]; limit?: number }): {
      send(): Promise<GeocodeResponse>;
    };
    reverseGeocode(options: GeocodingQuery): {
      send(): Promise<GeocodeResponse>;
    };
  }

  const geocoding: {
    GeocodeService: new (options: GeocodeServiceOptions) => GeocodeService;
  };

  export default geocoding;
} 