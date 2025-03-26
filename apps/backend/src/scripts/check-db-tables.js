import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // List tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%thaiwater%' OR table_name LIKE '%rainfall%')
    `);
    
    console.log('Tables related to ThaiWater or rainfall:');
    tablesResult.rows.forEach(row => console.log(row.table_name));
  } catch (error) {
    console.error('Error listing tables:', error);
  } finally {
    await pool.end();
  }
}

checkTables().catch(err => console.error(err)); 