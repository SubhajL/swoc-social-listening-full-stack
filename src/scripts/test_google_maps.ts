import { config } from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

interface PlaceAutocompleteResponse {
  predictions: Array<{
    place_id: string;
    description: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }>;
  status: string;
  error_message?: string;
}

interface GoogleMapsResponse {
  status: string;
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address?: string;
    place_id?: string;
  }>;
  error_message?: string;
}

async function testGoogleMapsAPI() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is not set');
  }

  // Test cases
  const testCases = [
    {
      description: 'Province: Satun City Hall',
      query: 'ศาลากลางจังหวัดสตูล',
      components: 'country:TH'
    },
    {
      description: 'Bangkok City Hall',
      query: 'ศาลาว่าการกรุงเทพมหานคร',
      components: 'country:TH'
    },
    {
      description: 'District Office: Mueang Satun',
      query: 'ที่ว่าการอำเภอเมืองสตูล',
      components: 'country:TH'
    }
  ];

  for (const test of testCases) {
    console.log(`\n=== Testing: ${test.description} ===`);
    
    try {
      // First try Place Autocomplete
      console.log('\n1. Place Autocomplete API:');
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(test.query)}&key=${apiKey}&language=th&components=${test.components}&types=geocode`;
      
      const autocompleteResponse = await axios.get<PlaceAutocompleteResponse>(autocompleteUrl, {
        headers: {
          'Accept-Charset': 'utf-8',
          'Accept-Language': 'th,en;q=0.9'
        }
      });

      console.log('Status:', autocompleteResponse.data.status);
      if (autocompleteResponse.data.predictions.length > 0) {
        const prediction = autocompleteResponse.data.predictions[0];
        console.log('Place ID:', prediction.place_id);
        console.log('Description:', prediction.description);

        // Then try Geocoding with place_id
        console.log('\n2. Geocoding API with place_id:');
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${prediction.place_id}&key=${apiKey}&language=th`;
        
        const geocodeResponse = await axios.get<GoogleMapsResponse>(geocodeUrl);
        console.log('Status:', geocodeResponse.data.status);
        
        if (geocodeResponse.data.results.length > 0) {
          const result = geocodeResponse.data.results[0];
          console.log('Coordinates:', result.geometry.location);
          console.log('Formatted Address:', result.formatted_address);
        }
      } else {
        // Fallback to direct geocoding
        console.log('\n2. Fallback to direct Geocoding API:');
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(test.query)}&key=${apiKey}&language=th&components=${test.components}`;
        
        const geocodeResponse = await axios.get<GoogleMapsResponse>(geocodeUrl);
        console.log('Status:', geocodeResponse.data.status);
        
        if (geocodeResponse.data.results.length > 0) {
          const result = geocodeResponse.data.results[0];
          console.log('Coordinates:', result.geometry.location);
          console.log('Formatted Address:', result.formatted_address);
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }
  }
}

console.log('Starting Google Maps API test...');
testGoogleMapsAPI().catch(console.error); 