import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

function decodeTripleEncodedUTF8(str: string): string {
  // First pass: UTF-8 → Buffer
  const firstPass = Buffer.from(str, 'utf8');
  // Second pass: Interpret as Latin1 and decode as UTF-8
  const secondPass = Buffer.from(firstPass.toString('latin1'), 'utf8');
  // Third pass: Interpret as Latin1 and decode as UTF-8 again
  return Buffer.from(secondPass.toString('latin1'), 'utf8').toString('utf8');
}

async function testDatabaseEncoding() {
  console.log('Starting database encoding test...\n');

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
    // Test 1: Check database encodings
    console.log('=== Database Encodings ===');
    const encodingResult = await pool.query(`
      SELECT 
        pg_client_encoding() as client_encoding,
        current_setting('server_encoding') as server_encoding
    `);
    console.log('Client encoding:', encodingResult.rows[0].client_encoding);
    console.log('Server encoding:', encodingResult.rows[0].server_encoding);
    console.log();

    // Test 2: Count provinces
    console.log('=== Province Count ===');
    const countResult = await pool.query('SELECT COUNT(*) FROM provinces');
    console.log('Total provinces:', countResult.rows[0].count);
    console.log();

    // Test 3: Test province name encoding
    console.log('=== Province Name Test ===');
    const provinceResult = await pool.query(`
      SELECT id::text, name_th, name_en 
      FROM provinces 
      LIMIT 1
    `);
    
    if (provinceResult.rows.length > 0) {
      const province = provinceResult.rows[0];
      console.log('Province ID:', province.id);
      console.log('Thai name (raw):', province.name_th);
      console.log('Thai name (decoded):', decodeTripleEncodedUTF8(province.name_th));
      console.log('English name:', province.name_en);
      console.log('Thai name (hex):', Buffer.from(province.name_th).toString('hex'));
      console.log();

      // Test different encoding combinations
      console.log('=== Encoding Combinations Test ===');
      const raw = Buffer.from(province.name_th);
      console.log('1. Raw hex:', raw.toString('hex'));
      console.log('2. First decode (UTF8 → Latin1):', raw.toString('latin1'));
      const secondPass = Buffer.from(raw.toString('latin1'), 'utf8');
      console.log('3. Second decode (UTF8 → Latin1):', secondPass.toString('latin1'));
      const thirdPass = Buffer.from(secondPass.toString('latin1'), 'utf8');
      console.log('4. Third decode (Final UTF8):', thirdPass.toString('utf8'));
      console.log();

      // Test with a known Thai string
      console.log('=== Known String Test ===');
      const knownThai = 'จ. สตูล';
      console.log('Original:', knownThai);
      const encoded1 = Buffer.from(knownThai, 'utf8');
      console.log('First encode (hex):', encoded1.toString('hex'));
      const encoded2 = Buffer.from(encoded1.toString('utf8'), 'utf8');
      console.log('Second encode (hex):', encoded2.toString('hex'));
      const encoded3 = Buffer.from(encoded2.toString('utf8'), 'utf8');
      console.log('Third encode (hex):', encoded3.toString('hex'));
      console.log('Matches database? ', encoded3.toString('hex') === raw.toString('hex'));
      console.log();
    } else {
      console.log('No provinces found');
    }

    // Test 4: Raw buffer test
    console.log('=== Raw Buffer Test ===');
    const rawResult = await pool.query(`
      SELECT id::text, name_th::bytea as raw_bytes 
      FROM provinces 
      LIMIT 1
    `);
    
    if (rawResult.rows.length > 0) {
      const raw = rawResult.rows[0];
      console.log('Raw query result:');
      console.log('ID:', raw.id);
      const bytes = raw.raw_bytes;
      console.log('Raw bytes (hex):', bytes.toString('hex'));
      console.log('First decode:', Buffer.from(bytes.toString('latin1'), 'utf8').toString('utf8'));
      console.log('Second decode:', Buffer.from(Buffer.from(bytes.toString('latin1'), 'utf8').toString('latin1'), 'utf8').toString('utf8'));
      console.log('Third decode:', Buffer.from(Buffer.from(Buffer.from(bytes.toString('latin1'), 'utf8').toString('latin1'), 'utf8').toString('latin1'), 'utf8').toString('utf8'));
    } else {
      console.log('No provinces found');
    }

    // Test 5: Table structure
    console.log('\n=== Table Structure ===');
    const tableResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'provinces'
      ORDER BY ordinal_position;
    `);
    console.log('Table structure:');
    console.table(tableResult.rows);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testDatabaseEncoding().catch(console.error); 