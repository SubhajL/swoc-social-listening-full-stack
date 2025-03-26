// Script to test TMD rainfall API with current time parameters
import axios from 'axios';

// API configuration for TMD
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// TMD rainfall data - Updated endpoint
const TMD_RAINFALL_API_MID = '244';
const TMD_RAINFALL_API_EID = '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw';

/**
 * Fetch TMD rainfall data directly from the API
 */
async function fetchTmdRainfallData() {
  try {
    console.log('Fetching TMD rainfall data...');
    
    // Get current time in Thailand
    const now = new Date();
    const thailandTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
    
    console.log(`Current time (UTC): ${now.toISOString()}`);
    console.log(`Current time (Thailand): ${thailandTime.toISOString()}`);
    
    // Format date for potential API request parameter (YYYY-MM-DD)
    const formattedDate = thailandTime.toISOString().split('T')[0];
    console.log(`Formatted date: ${formattedDate}`);
    
    // Build standard URL
    const standardUrl = `${THAIWATER_API_ENDPOINT}?mid=${TMD_RAINFALL_API_MID}&eid=${encodeURIComponent(TMD_RAINFALL_API_EID)}`;
    
    // Build URL with date parameter - test both versions
    const urlWithDate = `${standardUrl}&date=${formattedDate}`;
    
    // Try with standard URL
    console.log('\nTrying standard URL without date parameter...');
    console.log(`URL: ${standardUrl}`);
    
    const standardResponse = await axios.get(standardUrl, {
      headers: {
        'User-Agent': 'SWOC-TMD-Test/1.0'
      },
      timeout: 30000
    });
    
    // Check if the response has the expected structure
    if (!standardResponse.data || !Array.isArray(standardResponse.data)) {
      console.log('Unexpected API response format for standard URL');
    } else {
      const standardData = standardResponse.data;
      console.log(`Received ${standardData.length} records from standard URL`);
      
      // Analyze timestamps
      analyzeTimestamps(standardData, 'Standard URL');
    }
    
    // Try with date parameter
    console.log('\nTrying URL with date parameter...');
    console.log(`URL: ${urlWithDate}`);
    
    const dateResponse = await axios.get(urlWithDate, {
      headers: {
        'User-Agent': 'SWOC-TMD-Test/1.0'
      },
      timeout: 30000
    });
    
    // Check if the response has the expected structure
    if (!dateResponse.data || !Array.isArray(dateResponse.data)) {
      console.log('Unexpected API response format for URL with date');
    } else {
      const dateData = dateResponse.data;
      console.log(`Received ${dateData.length} records from URL with date parameter`);
      
      // Analyze timestamps
      analyzeTimestamps(dateData, 'URL with date');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to fetch TMD rainfall data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Analyze timestamps in the data
 */
function analyzeTimestamps(data, source) {
  // Get unique timestamps
  const timestamps = [...new Set(data.map(item => item.rainfall_datetime))];
  
  console.log(`\nTimestamp analysis for ${source}:`);
  console.log(`Number of unique timestamps: ${timestamps.length}`);
  
  // Display all unique timestamps
  console.log('All unique timestamps:');
  timestamps.forEach(timestamp => {
    console.log(`  - ${timestamp}`);
  });
  
  // Sample data
  if (data.length > 0) {
    console.log('\nSample data:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

// Run the function
fetchTmdRainfallData().then(() => {
  console.log('\nTest completed.');
}).catch(console.error); 