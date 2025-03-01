// Script to list all tables in the database
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

/**
 * Lists all tables in the database
 */
async function listAllTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('Listing all tables in the database...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Configured (hidden for security)' : 'Not configured');
    
    // Query to list all tables
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No tables found in the database.');
      return;
    }
    
    console.log(`Found ${result.rows.length} tables in the database:`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Print database connection info (without sensitive details)
    const dbConfig = new URL(process.env.DATABASE_URL);
    console.log('\nDatabase connection info:');
    console.log(`Host: ${dbConfig.hostname}`);
    console.log(`Port: ${dbConfig.port}`);
    console.log(`Database: ${dbConfig.pathname.substring(1)}`);
    console.log(`User: ${dbConfig.username}`);
    
  } catch (error) {
    console.error('Error listing tables:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
listAllTables()
  .then(() => {
    console.log('\nTable listing completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 