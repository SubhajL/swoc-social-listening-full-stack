import pkg from 'pg';
import { randomUUID } from 'crypto';
const { Pool } = pkg;

// Create a unique test database name
const testDatabaseName = `test_db_${randomUUID().replace(/-/g, '_')}`;

// Connection pool for managing the test database
let pool: pkg.Pool;

export async function setupTestDatabase() {
  try {
    // Connect to default postgres database to create test database
    const adminPool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres'
    });

    // Create test database
    await adminPool.query(`CREATE DATABASE ${testDatabaseName}`);
    await adminPool.end();

    // Connect to the new test database
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: testDatabaseName
    });

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_posts (
        processed_post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text TEXT,
        category_name VARCHAR(255),
        sub1_category_name VARCHAR(255),
        profile_name TEXT,
        post_date TIMESTAMP WITH TIME ZONE,
        post_url TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        tumbon TEXT[],
        amphure TEXT[],
        province TEXT[]
      );
    `);

    // Set environment variable for tests
    process.env.TEST_DATABASE_URL = `postgres://postgres:postgres@localhost:5432/${testDatabaseName}`;

    return pool;
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

export async function teardownTestDatabase() {
  try {
    // Close connection to test database
    if (pool) {
      await pool.end();
    }

    // Connect to default postgres database to drop test database
    const adminPool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres'
    });

    // Drop test database
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
    await adminPool.end();
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
} 