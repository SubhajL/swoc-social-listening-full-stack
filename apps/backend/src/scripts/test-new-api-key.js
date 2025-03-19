// Script to test the new Google Maps API key
import axios from 'axios';

async function testNewApiKey() {
  console.log('Testing new Google Maps API key...');
  
  // Use the new API key provided
  const apiKey = 'AIzaSyANIYu6U53gD7ASCMRVz16lCC7KVa0yjwg';
  console.log(`Using API key: ${apiKey.substring(0, 10)}...`);
  
  // Use a known location in Thailand (Bangkok)
  const testLat = 13.7563;
  const testLng = 100.5018;
  
  // Test with basic parameters
  const basicUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${apiKey}`;
  console.log(`\nBasic test request URL: ${basicUrl}`);
  
  try {
    const basicResponse = await axios.get(basicUrl);
    
    console.log(`Basic API Response status: ${basicResponse.data.status}`);
    
    if (basicResponse.data.status !== 'OK') {
      console.log('Basic API key test FAILED');
      if (basicResponse.data.error_message) {
        console.log(`Error message: ${basicResponse.data.error_message}`);
      }
    } else {
      console.log('Basic API key test PASSED');
      console.log('First result:', basicResponse.data.results[0].formatted_address);
    }
  } catch (error) {
    console.error(`Error testing API key with basic parameters: ${error.message}`);
  }
  
  // Test with TMD-style parameters
  const tmdUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${apiKey}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`;
  console.log(`\nTMD-style test request URL: ${tmdUrl}`);
  
  try {
    const tmdResponse = await axios.get(tmdUrl);
    
    console.log(`TMD-style API Response status: ${tmdResponse.data.status}`);
    
    if (tmdResponse.data.status !== 'OK') {
      console.log('TMD-style API key test FAILED');
      if (tmdResponse.data.error_message) {
        console.log(`Error message: ${tmdResponse.data.error_message}`);
      }
    } else {
      console.log('TMD-style API key test PASSED');
      console.log('First result:', tmdResponse.data.results[0].formatted_address);
      
      // Print out the administrative components for debugging
      console.log('\nAdministrative components:');
      for (const result of tmdResponse.data.results) {
        console.log(`Result: ${result.formatted_address}`);
        
        for (const component of result.address_components) {
          if (component.types.includes('administrative_area_level_1') || 
              component.types.includes('administrative_area_level_2') || 
              component.types.includes('administrative_area_level_3')) {
            console.log(`  ${component.types.join(', ')}: ${component.long_name} (${component.short_name})`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error testing API key with TMD parameters: ${error.message}`);
  }
}

// Run the test
testNewApiKey().catch(error => {
  console.error('Unhandled error:', error);
}); 