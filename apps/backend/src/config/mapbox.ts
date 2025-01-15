import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding.js';
const { GeocodeService } = mbxGeocoding;

if (!process.env.MAPBOX_TOKEN) {
  throw new Error('MAPBOX_TOKEN environment variable is required');
}

export const geocodingClient = new GeocodeService({ accessToken: process.env.MAPBOX_TOKEN }); 