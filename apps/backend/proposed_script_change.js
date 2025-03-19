/**
 * Simplified version of processReservoirData that directly uses API's reservoir_id
 */
async function processReservoirData(client, reservoirData) {
  try {
    const date = reservoirData.date;
    const formattedDate = date.split('T')[0]; // Extract YYYY-MM-DD
    
    logger.info(`[ReservoirSync] Processing reservoir data for date: ${formattedDate}`);
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each region
    for (const region of reservoirData.data) {
      const regionName = region.region;
      
      // Process each reservoir in the region
      for (const reservoir of region.reservoir) {
        try {
          const apiStationId = reservoir.id; // This is the API's reservoir_id (e.g., "rsv123")
          const stationName = reservoir.name;
          
          logger.info(`[ReservoirSync] Processing reservoir: ${stationName} (ID: ${apiStationId})`);
          
          // Check if data for this reservoir and date already exists
          // We use the actual API reservoir_id directly - no fuzzy matching needed!
          const dataCheck = await client.query(
            'SELECT id FROM reservoir_data WHERE reservoir_id = $1 AND date = $2',
            [apiStationId, formattedDate]
          );
          
          if (dataCheck.rows.length === 0) {
            // Insert new data
            logger.info(`[ReservoirSync] Inserting new data for reservoir ${stationName} (ID=${apiStationId})`);
            logger.info(`[ReservoirSync] Data values: storage=${reservoir.storage}, dead_storage=${reservoir.dead_storage}, volume=${reservoir.volume}, inflow=${reservoir.inflow}, outflow=${reservoir.outflow}`);
            
            await client.query(`
              INSERT INTO reservoir_data (
                reservoir_id,
                reservoir_name,
                storage,
                dead_storage,
                volume,
                inflow,
                outflow,
                date,
                type,
                created_at,
                updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            `, [
              apiStationId, // Use the string ID directly from the API
              stationName,
              reservoir.storage,
              reservoir.dead_storage,
              reservoir.volume,
              reservoir.inflow,
              reservoir.outflow,
              formattedDate,
              'reservoir'
            ]);
            
            insertedCount++;
          } else {
            // Update existing data
            await client.query(`
              UPDATE reservoir_data SET
                storage = $2,
                dead_storage = $3,
                volume = $4,
                inflow = $5,
                outflow = $6,
                updated_at = NOW()
              WHERE reservoir_id = $1 AND date = $7
            `, [
              apiStationId, // Use the string ID directly from the API
              reservoir.storage,
              reservoir.dead_storage,
              reservoir.volume,
              reservoir.inflow,
              reservoir.outflow,
              formattedDate
            ]);
            
            updatedCount++;
          }
        } catch (reservoirError) {
          errorCount++;
          logger.error('[ReservoirSync] Error processing reservoir', {
            reservoir: reservoir.name,
            error: reservoirError instanceof Error ? reservoirError.message : String(reservoirError)
          });
        }
      }
    }
    
    logger.info('[ReservoirSync] Reservoir data processing completed', {
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount
    });
    
    return { insertedCount, updatedCount, errorCount };
  } catch (error) {
    logger.error('[ReservoirSync] Error processing reservoir data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
} 