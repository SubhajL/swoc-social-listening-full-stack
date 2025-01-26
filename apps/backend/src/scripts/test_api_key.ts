import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGeocode() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  console.log('Using API Key:', apiKey);
  
  const client = new Client({});
  
  try {
    console.log('Sending request to Google Maps API...');
    const response = await client.geocode({
      params: {
        address: 'Bangkok',
        key: apiKey || '',
        language: 'th',
        region: 'TH'
      }
    });

    console.log('API Response:', {
      status: response.data.status,
      results: response.data.results,
      errorMessage: response.data.error_message
    });
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        params: error.config?.params,
        headers: error.config?.headers
      }
    });
  }
}

testGeocode(); 