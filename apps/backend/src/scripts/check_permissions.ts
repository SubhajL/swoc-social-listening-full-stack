import pg from 'pg';
const { Pool } = pg;

async function checkDatabasePermissions() {
  const pool = new Pool({
    user: 'swoc-uat-ssl-user',
    password: 'c3dc7c8f659dd84f76b37057a37d75d2',
    host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
    port: 15434,
    database: 'swoc-uat-ssl',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Testing database connection and permissions...');
    
    // Test SELECT permission
    await pool.query('SELECT current_user, current_database()');
    console.log('✓ SELECT permission: OK');
    
    // Test CREATE TABLE permission
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permission_test (
        id SERIAL PRIMARY KEY,
        test_column VARCHAR(50)
      )`);
    console.log('✓ CREATE TABLE permission: OK');
    
    // Test INSERT permission
    await pool.query(`
      INSERT INTO permission_test (test_column) 
      VALUES ('test_value')`);
    console.log('✓ INSERT permission: OK');
    
    // Test UPDATE permission
    await pool.query(`
      UPDATE permission_test 
      SET test_column = 'updated_value' 
      WHERE test_column = 'test_value'`);
    console.log('✓ UPDATE permission: OK');
    
    // Test DELETE permission
    await pool.query('DELETE FROM permission_test');
    console.log('✓ DELETE permission: OK');
    
    // Test DROP TABLE permission
    await pool.query('DROP TABLE permission_test');
    console.log('✓ DROP TABLE permission: OK');

  } catch (error) {
    if (error instanceof Error) {
      console.error('Permission check failed:', error.message);
    }
    throw error;
  } finally {
    await pool.end();
  }
}

checkDatabasePermissions().catch(console.error); 