// Script to display stations that were updated with new location information
import fs from 'fs';

/**
 * Display updated stations from the results file
 */
function displayUpdatedStations() {
  console.log('Displaying stations that were updated with new location information...');
  
  // Read the results file
  const resultsFile = 'station_location_update_results.json';
  
  try {
    if (!fs.existsSync(resultsFile)) {
      console.error(`Results file ${resultsFile} not found. Please run the update script first.`);
      process.exit(1);
    }
    
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    
    console.log('\n=== Station Location Update Summary ===');
    console.log(`Total stations: ${results.total}`);
    console.log(`Processed: ${results.processed}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);
    
    // Display updated stations
    const updatedStations = results.stations.filter(station => station.status === 'updated');
    
    console.log(`\n=== Updated Stations (${updatedStations.length}) ===`);
    
    if (updatedStations.length === 0) {
      console.log('No stations were updated.');
      return;
    }
    
    // Group by data source
    const byDataSource = {};
    for (const station of updatedStations) {
      byDataSource[station.data_source] = byDataSource[station.data_source] || [];
      byDataSource[station.data_source].push(station);
    }
    
    // Display by data source
    for (const [dataSource, stations] of Object.entries(byDataSource)) {
      console.log(`\n== ${dataSource} Stations (${stations.length}) ==`);
      
      for (const station of stations) {
        console.log(`\nStation ID: ${station.id}`);
        console.log(`Name: ${station.name}`);
        console.log(`Coordinates: ${station.latitude}, ${station.longitude}`);
        console.log('Previous Location:');
        console.log(`  Province: ${station.province || 'N/A'}`);
        console.log(`  Amphure: ${station.amphure || 'N/A'}`);
        console.log(`  Tambon: ${station.tambon || 'N/A'}`);
        console.log('Updated Location:');
        console.log(`  Province: ${station.geocode_result.administrative_areas.province || 'N/A'}`);
        console.log(`  Amphure: ${station.geocode_result.administrative_areas.amphure || 'N/A'}`);
        console.log(`  Tambon: ${station.geocode_result.administrative_areas.tambon || 'N/A'}`);
        console.log(`  Formatted Address: ${station.geocode_result.formatted_address || 'N/A'}`);
      }
    }
    
    // Display stations with incorrect location data that were updated
    const incorrectLocationStations = updatedStations.filter(station => station.update_reason === 'incorrect_location');
    
    if (incorrectLocationStations.length > 0) {
      console.log(`\n=== Stations with Incorrect Location Data (${incorrectLocationStations.length}) ===`);
      
      for (const station of incorrectLocationStations) {
        console.log(`\nStation ID: ${station.id}`);
        console.log(`Name: ${station.name}`);
        console.log(`Coordinates: ${station.latitude}, ${station.longitude}`);
        console.log('Previous Location:');
        console.log(`  Province: ${station.province || 'N/A'}`);
        console.log(`  Amphure: ${station.amphure || 'N/A'}`);
        console.log(`  Tambon: ${station.tambon || 'N/A'}`);
        console.log('Updated Location:');
        console.log(`  Province: ${station.geocode_result.administrative_areas.province || 'N/A'}`);
        console.log(`  Amphure: ${station.geocode_result.administrative_areas.amphure || 'N/A'}`);
        console.log(`  Tambon: ${station.geocode_result.administrative_areas.tambon || 'N/A'}`);
        console.log(`  Formatted Address: ${station.geocode_result.formatted_address || 'N/A'}`);
        console.log(`  Expected Province: ${station.expected_province || 'N/A'}`);
      }
    }
    
  } catch (error) {
    console.error(`Error displaying updated stations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

// Run the function
displayUpdatedStations(); 