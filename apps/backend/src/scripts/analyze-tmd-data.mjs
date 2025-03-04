// Script to analyze TMD station and rainfall data structure
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// API configuration for TMD
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// TMD station data
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

// TMD rainfall data
const TMD_RAINFALL_API_MID = '244';
const TMD_RAINFALL_API_EID = '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw';

// HII station data (for comparison)
const HII_STATION_API_MID = '105';
const HII_STATION_API_EID = 'CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg';

// HII rainfall data (for comparison)
const HII_RAINFALL_API_MID = '98';
const HII_RAINFALL_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

/**
 * Fetches data from ThaiWater API
 */
async function fetchData(mid, eid, description) {
  try {
    console.log(`Fetching ${description} data...`);
    const url = `${THAIWATER_API_ENDPOINT}?mid=${mid}&eid=${encodeURIComponent(eid)}`;
    
    const response = await axios.get(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }
    
    console.log(`Successfully fetched ${response.data.length} records for ${description}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${description} data:`, error.message);
    return null;
  }
}

/**
 * Analyzes the structure of the data
 */
function analyzeStructure(data, description) {
  if (!data || data.length === 0) {
    console.log(`No data available for ${description}`);
    return;
  }
  
  console.log(`\n=== ${description} Structure Analysis ===`);
  
  // Get a sample record
  const sample = data[0];
  
  // Analyze the structure
  console.log('Fields:');
  const fields = Object.keys(sample);
  fields.forEach(field => {
    const value = sample[field];
    const type = typeof value;
    const isNested = type === 'object' && value !== null;
    
    if (isNested) {
      console.log(`  ${field} (${type}):`);
      const nestedFields = Object.keys(value);
      nestedFields.forEach(nestedField => {
        const nestedValue = value[nestedField];
        const nestedType = typeof nestedValue;
        console.log(`    ${nestedField} (${nestedType}): ${JSON.stringify(nestedValue).substring(0, 50)}`);
      });
    } else {
      console.log(`  ${field} (${type}): ${JSON.stringify(value).substring(0, 50)}`);
    }
  });
  
  // Save sample data to file
  const fileName = `${description.toLowerCase().replace(/\s+/g, '-')}-sample.json`;
  const filePath = path.join(process.cwd(), fileName);
  fs.writeFileSync(filePath, JSON.stringify(data.slice(0, 5), null, 2));
  console.log(`Saved 5 sample records to ${filePath}`);
  
  return fields;
}

/**
 * Compare two data structures
 */
function compareStructures(fields1, fields2, description1, description2) {
  console.log(`\n=== Comparing ${description1} vs ${description2} ===`);
  
  // Fields in both
  const commonFields = fields1.filter(field => fields2.includes(field));
  console.log(`Fields in both: ${commonFields.length}`);
  commonFields.forEach(field => console.log(`  ${field}`));
  
  // Fields only in first
  const uniqueFields1 = fields1.filter(field => !fields2.includes(field));
  console.log(`\nFields only in ${description1}: ${uniqueFields1.length}`);
  uniqueFields1.forEach(field => console.log(`  ${field}`));
  
  // Fields only in second
  const uniqueFields2 = fields2.filter(field => !fields1.includes(field));
  console.log(`\nFields only in ${description2}: ${uniqueFields2.length}`);
  uniqueFields2.forEach(field => console.log(`  ${field}`));
  
  // Compatibility assessment
  const compatibilityScore = (commonFields.length / Math.max(fields1.length, fields2.length)) * 100;
  console.log(`\nCompatibility Score: ${compatibilityScore.toFixed(2)}%`);
  
  if (compatibilityScore >= 80) {
    console.log('Assessment: HIGHLY COMPATIBLE - Can use the same table structure');
  } else if (compatibilityScore >= 50) {
    console.log('Assessment: MODERATELY COMPATIBLE - May need some adjustments to merge');
  } else {
    console.log('Assessment: LOW COMPATIBILITY - Recommend separate tables');
  }
}

/**
 * Main function to analyze and compare data
 */
async function analyzeAndCompareData() {
  // Fetch TMD data
  const tmdStationData = await fetchData(TMD_STATION_API_MID, TMD_STATION_API_EID, 'TMD Station');
  const tmdRainfallData = await fetchData(TMD_RAINFALL_API_MID, TMD_RAINFALL_API_EID, 'TMD Rainfall');
  
  // Fetch HII data for comparison
  const hiiStationData = await fetchData(HII_STATION_API_MID, HII_STATION_API_EID, 'HII Station');
  const hiiRainfallData = await fetchData(HII_RAINFALL_API_MID, HII_RAINFALL_API_EID, 'HII Rainfall');
  
  // Analyze structures
  const tmdStationFields = analyzeStructure(tmdStationData, 'TMD Station');
  const hiiStationFields = analyzeStructure(hiiStationData, 'HII Station');
  const tmdRainfallFields = analyzeStructure(tmdRainfallData, 'TMD Rainfall');
  const hiiRainfallFields = analyzeStructure(hiiRainfallData, 'HII Rainfall');
  
  // Compare structures
  if (tmdStationFields && hiiStationFields) {
    compareStructures(tmdStationFields, hiiStationFields, 'TMD Station', 'HII Station');
  }
  
  if (tmdRainfallFields && hiiRainfallFields) {
    compareStructures(tmdRainfallFields, hiiRainfallFields, 'TMD Rainfall', 'HII Rainfall');
  }
  
  // Generate recommendation
  console.log('\n=== Database Schema Recommendation ===');
  console.log('Based on the analysis of the data structures, here is the recommendation:');
  
  // This will be filled in after we see the actual data
  console.log('1. Recommendation will be provided after analyzing the actual data');
}

// Run the analysis
analyzeAndCompareData()
  .then(() => {
    console.log('\nAnalysis completed.');
  })
  .catch(error => {
    console.error('Error during analysis:', error);
  }); 