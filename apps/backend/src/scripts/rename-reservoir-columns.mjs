import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup database connection
const { Pool } = pkg;
const pool = new Pool({
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  ssl: {
    rejectUnauthorized: false
  }
});

async function renameReservoirColumns() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting column rename operation...');
    
    // First, check if the columns exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservoir_locations' 
      AND column_name IN ('reservoir_id', 'formatted_id');
    `;
    
    const columnsResult = await client.query(checkColumnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    
    if (!existingColumns.includes('reservoir_id') || !existingColumns.includes('formatted_id')) {
      console.error('Required columns not found. Columns found:', existingColumns);
      throw new Error('Required columns not found in reservoir_locations table');
    }
    
    console.log('Required columns found:', existingColumns);
    
    // Check for foreign key constraints on reservoir_id
    const checkFKQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'reservoir_locations'
        AND ccu.column_name = 'reservoir_id';
    `;
    
    const fkResult = await client.query(checkFKQuery);
    
    // If there are foreign key constraints, we need to drop them first
    if (fkResult.rows.length > 0) {
      console.log('Found foreign key constraints that need to be dropped:', fkResult.rows);
      
      for (const constraint of fkResult.rows) {
        const dropFKQuery = `
          ALTER TABLE ${constraint.table_name}
          DROP CONSTRAINT ${constraint.constraint_name};
        `;
        
        console.log(`Dropping constraint ${constraint.constraint_name} from ${constraint.table_name}...`);
        await client.query(dropFKQuery);
      }
    }
    
    // Check for primary key constraint on reservoir_id
    const checkPKQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = 'reservoir_locations'
        AND kcu.column_name = 'reservoir_id';
    `;
    
    const pkResult = await client.query(checkPKQuery);
    
    // If there's a primary key constraint, we need to drop it
    if (pkResult.rows.length > 0) {
      const pkConstraint = pkResult.rows[0].constraint_name;
      console.log(`Dropping primary key constraint ${pkConstraint}...`);
      
      const dropPKQuery = `
        ALTER TABLE reservoir_locations
        DROP CONSTRAINT ${pkConstraint};
      `;
      
      await client.query(dropPKQuery);
    }
    
    // Now we can rename the columns
    console.log('Renaming columns...');
    
    // First, rename reservoir_id to temp_id to avoid conflict
    const renameReservoirIdQuery = `
      ALTER TABLE reservoir_locations
      RENAME COLUMN reservoir_id TO temp_id;
    `;
    
    await client.query(renameReservoirIdQuery);
    console.log('Renamed reservoir_id to temp_id');
    
    // Then rename formatted_id to reservoir_id
    const renameFormattedIdQuery = `
      ALTER TABLE reservoir_locations
      RENAME COLUMN formatted_id TO reservoir_id;
    `;
    
    await client.query(renameFormattedIdQuery);
    console.log('Renamed formatted_id to reservoir_id');
    
    // Finally, rename temp_id to id
    const renameTempIdQuery = `
      ALTER TABLE reservoir_locations
      RENAME COLUMN temp_id TO id;
    `;
    
    await client.query(renameTempIdQuery);
    console.log('Renamed temp_id to id');
    
    // Add primary key constraint back on the id column
    const addPKQuery = `
      ALTER TABLE reservoir_locations
      ADD PRIMARY KEY (id);
    `;
    
    await client.query(addPKQuery);
    console.log('Added primary key constraint on id column');
    
    // Re-add foreign key constraints if they existed
    if (fkResult.rows.length > 0) {
      for (const constraint of fkResult.rows) {
        // Update the constraint to point to the new column name
        const addFKQuery = `
          ALTER TABLE ${constraint.table_name}
          ADD CONSTRAINT ${constraint.constraint_name}_new
          FOREIGN KEY (${constraint.column_name})
          REFERENCES reservoir_locations(id);
        `;
        
        console.log(`Adding new foreign key constraint to ${constraint.table_name}...`);
        await client.query(addFKQuery);
      }
    }
    
    // Verify the changes
    const verifyQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservoir_locations' 
      AND column_name IN ('id', 'reservoir_id');
    `;
    
    const verifyResult = await client.query(verifyQuery);
    const newColumns = verifyResult.rows.map(row => row.column_name);
    
    console.log('Verification - New columns:', newColumns);
    
    // Check a few records to make sure the data is still intact
    const checkDataQuery = `
      SELECT id, reservoir_id, reservoir_name, reservoir_lat, reservoir_long
      FROM reservoir_locations
      LIMIT 5;
    `;
    
    const dataResult = await client.query(checkDataQuery);
    console.log('Sample data after column rename:');
    console.table(dataResult.rows);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Column rename operation completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
renameReservoirColumns().then(() => {
  console.log('Column rename completed');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 