import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

async function testEncodingInsert() {
  console.log('Starting encoding insert test...\n');

  const pool = new Pool({
    user: process.env.DB_WRITE_USER,
    password: process.env.DB_WRITE_PASSWORD,
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_WRITE_PORT || '5432'),
    database: process.env.DB_WRITE_DATABASE,
    ssl: process.env.DB_WRITE_SSL === 'true' ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    // Create a test table
    await pool.query(`
      DROP TABLE IF EXISTS encoding_test;
      CREATE TABLE encoding_test (
        id SERIAL PRIMARY KEY,
        name_th VARCHAR(100),
        name_raw BYTEA
      );
    `);

    // Test data
    const thaiText = 'จ. สตูล';
    console.log('Original Thai text:', thaiText);
    console.log('Original hex:', Buffer.from(thaiText, 'utf8').toString('hex'));
    console.log();

    // Test 1: Direct insert
    console.log('=== Test 1: Direct Insert ===');
    await pool.query(`
      INSERT INTO encoding_test (name_th) 
      VALUES ($1)
    `, [thaiText]);

    // Test 2: Insert as bytea
    console.log('=== Test 2: Insert as BYTEA ===');
    const rawBytes = Buffer.from(thaiText, 'utf8');
    await pool.query(`
      INSERT INTO encoding_test (name_th, name_raw) 
      VALUES ($1, $2)
    `, [thaiText, rawBytes]);

    // Test 3: Insert with explicit encoding
    console.log('=== Test 3: Insert with Explicit Encoding ===');
    await pool.query(`
      INSERT INTO encoding_test (name_th) 
      VALUES (convert_from(decode($1, 'hex'), 'UTF8'))
    `, [Buffer.from(thaiText, 'utf8').toString('hex')]);

    // Verify results
    console.log('=== Results ===');
    const results = await pool.query(`
      SELECT 
        id,
        name_th,
        encode(name_th::bytea, 'hex') as name_th_hex,
        encode(name_raw, 'hex') as name_raw_hex
      FROM encoding_test 
      ORDER BY id
    `);

    console.log('\nResults from database:');
    results.rows.forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`);
      console.log('Thai text:', row.name_th);
      console.log('Text hex:', row.name_th_hex);
      if (row.name_raw_hex) {
        console.log('Raw hex:', row.name_raw_hex);
      }
    });

    // Cleanup
    await pool.query('DROP TABLE encoding_test');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testEncodingInsert().catch(console.error); 