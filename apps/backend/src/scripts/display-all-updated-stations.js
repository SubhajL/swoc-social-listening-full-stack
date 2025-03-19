// Script to display stations that were updated with new location information from the complete update
import fs from 'fs';

/**
 * Display updated stations from the complete update results file
 */
function displayAllUpdatedStations() {
  console.log('Displaying stations that were updated with new location information from the complete update...');
  
  // Read the results file
  const resultsFile = 'all_stations_location_update_results.json';
  
  try {
    if (!fs.existsSync(resultsFile)) {
      console.error(`Results file ${resultsFile} not found. Please run the update script first.`);
      process.exit(1);
    }
    
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    
    console.log('\n=== Complete Station Location Update Summary ===');
    console.log(`Total stations: ${results.total}`);
    console.log(`Processed: ${results.processed}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);
    
    // Group by data source
    const byDataSource = {};
    for (const station of results.stations) {
      byDataSource[station.data_source] = byDataSource[station.data_source] || { total: 0, updated: 0, skipped: 0, errors: 0 };
      byDataSource[station.data_source].total++;
      
      if (station.status === 'updated') {
        byDataSource[station.data_source].updated++;
      } else if (station.status === 'skipped') {
        byDataSource[station.data_source].skipped++;
      } else if (station.status === 'error') {
        byDataSource[station.data_source].errors++;
      }
    }
    
    console.log('\nBy Data Source:');
    for (const [dataSource, counts] of Object.entries(byDataSource)) {
      console.log(`${dataSource}: ${counts.total} total, ${counts.updated} updated, ${counts.skipped} skipped, ${counts.errors} errors`);
    }
    
    // Group by reason
    const byReason = {};
    for (const station of results.stations) {
      byReason[station.reason] = byReason[station.reason] || 0;
      byReason[station.reason]++;
    }
    
    console.log('\nBy Reason:');
    for (const [reason, count] of Object.entries(byReason)) {
      console.log(`${reason}: ${count}`);
    }
    
    // Display updated stations
    const updatedStations = results.stations.filter(station => station.status === 'updated');
    
    console.log(`\n=== Updated Stations (${updatedStations.length}) ===`);
    
    if (updatedStations.length === 0) {
      console.log('No stations were updated.');
      return;
    }
    
    // Group by data source
    const updatedByDataSource = {};
    for (const station of updatedStations) {
      updatedByDataSource[station.data_source] = updatedByDataSource[station.data_source] || [];
      updatedByDataSource[station.data_source].push(station);
    }
    
    // Display by data source
    for (const [dataSource, stations] of Object.entries(updatedByDataSource)) {
      console.log(`\n== ${dataSource} Stations (${stations.length}) ==`);
      
      for (const station of stations) {
        console.log(`\nStation ID: ${station.id}`);
        console.log(`Name: ${station.name}`);
        console.log(`Coordinates: ${station.latitude}, ${station.longitude}`);
        
        // Display changes
        if (station.changes) {
          console.log('Changes:');
          
          if (station.changes.province.changed) {
            console.log(`  Province: ${station.changes.province.old || 'N/A'} -> ${station.changes.province.new}`);
          }
          
          if (station.changes.amphure.changed) {
            console.log(`  Amphure: ${station.changes.amphure.old || 'N/A'} -> ${station.changes.amphure.new}`);
          }
          
          if (station.changes.tambon.changed) {
            console.log(`  Tambon: ${station.changes.tambon.old || 'N/A'} -> ${station.changes.tambon.new}`);
          }
        } else {
          console.log('Previous Location:');
          console.log(`  Province: ${station.province || 'N/A'}`);
          console.log(`  Amphure: ${station.amphure || 'N/A'}`);
          console.log(`  Tambon: ${station.tambon || 'N/A'}`);
          console.log('Updated Location:');
          console.log(`  Province: ${station.geocode_result.administrative_areas.province || 'N/A'}`);
          console.log(`  Amphure: ${station.geocode_result.administrative_areas.amphure || 'N/A'}`);
          console.log(`  Tambon: ${station.geocode_result.administrative_areas.tambon || 'N/A'}`);
        }
        
        console.log(`  Formatted Address: ${station.geocode_result?.formatted_address || 'N/A'}`);
      }
    }
    
    // Create a summary of the most common changes
    console.log('\n=== Most Common Province Changes ===');
    const provinceChanges = {};
    
    for (const station of updatedStations) {
      if (station.changes && station.changes.province.changed) {
        const key = `${station.changes.province.old || 'N/A'} -> ${station.changes.province.new}`;
        provinceChanges[key] = provinceChanges[key] || { count: 0, stations: [] };
        provinceChanges[key].count++;
        provinceChanges[key].stations.push({
          id: station.id,
          name: station.name,
          data_source: station.data_source
        });
      }
    }
    
    // Sort by count
    const sortedProvinceChanges = Object.entries(provinceChanges)
      .sort((a, b) => b[1].count - a[1].count);
    
    for (const [change, data] of sortedProvinceChanges) {
      console.log(`${change}: ${data.count} stations`);
      
      // List the first 5 stations
      const stationsToShow = data.stations.slice(0, 5);
      for (const station of stationsToShow) {
        console.log(`  - ${station.id} (${station.name}) [${station.data_source}]`);
      }
      
      if (data.stations.length > 5) {
        console.log(`  - ... and ${data.stations.length - 5} more`);
      }
    }
    
    // Export a CSV file with all changes
    const csvRows = [
      ['Station ID', 'Name', 'Data Source', 'Latitude', 'Longitude', 
       'Old Province', 'New Province', 'Old Amphure', 'New Amphure', 
       'Old Tambon', 'New Tambon', 'Formatted Address']
    ];
    
    for (const station of updatedStations) {
      const oldProvince = station.changes ? station.changes.province.old : station.province;
      const newProvince = station.changes ? station.changes.province.new : station.geocode_result?.administrative_areas.province;
      const oldAmphure = station.changes ? station.changes.amphure.old : station.amphure;
      const newAmphure = station.changes ? station.changes.amphure.new : station.geocode_result?.administrative_areas.amphure;
      const oldTambon = station.changes ? station.changes.tambon.old : station.tambon;
      const newTambon = station.changes ? station.changes.tambon.new : station.geocode_result?.administrative_areas.tambon;
      
      csvRows.push([
        station.id,
        station.name,
        station.data_source,
        station.latitude,
        station.longitude,
        oldProvince || '',
        newProvince || '',
        oldAmphure || '',
        newAmphure || '',
        oldTambon || '',
        newTambon || '',
        station.geocode_result?.formatted_address || ''
      ]);
    }
    
    // Convert to CSV
    const csvContent = csvRows.map(row => row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(cell).replace(/"/g, '""');
      return cell.toString().includes(',') ? `"${escaped}"` : escaped;
    }).join(',')).join('\n');
    
    // Write to file
    fs.writeFileSync('updated_stations.csv', csvContent);
    console.log('\nExported all changes to updated_stations.csv');
    
  } catch (error) {
    console.error(`Error displaying updated stations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

// Run the function
displayAllUpdatedStations(); 