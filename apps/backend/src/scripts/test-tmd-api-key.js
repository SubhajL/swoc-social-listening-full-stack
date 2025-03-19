// Simple script to test if the TMD API key is still working
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function testTmdApiKey() {
  console.log('Testing TMD API key...');
  
  // Get the API key from environment variables
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  console.log(`Using API key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'not set'}`);
  
  // Use a known location in Thailand (Bangkok)
  const testLat = 13.7563;
  const testLng = 100.5018;
  
  // Use the exact same URL format as the TMD script
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${apiKey}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`;
  console.log(`Request URL: ${url}`);
  
  try {
    const response = await axios.get(url);
    
    console.log(`API Response status: ${response.data.status}`);
    
    if (response.data.status !== 'OK') {
      console.log('API key test FAILED');
      if (response.data.error_message) {
        console.log(`Error message: ${response.data.error_message}`);
      }
    } else {
      console.log('API key test PASSED');
      console.log('First result:', response.data.results[0].formatted_address);
    }
  } catch (error) {
    console.error(`Error testing API key: ${error.message}`);
  }
}

// Run the test
testTmdApiKey().catch(error => {
  console.error('Unhandled error:', error);
}); 