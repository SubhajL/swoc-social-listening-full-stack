import pkg from 'pg';
const { Pool } = pkg;

// Single read-only pool for all database operations
export const readPool = new Pool({
  user: 'swoc-uat-ssl-readonly-user',
  password: 'c8d20c8a022ac7af9131491704594941',
  host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: 15434,
  database: 'swoc-uat-ssl',
  ssl: false
});

// Export readPool as the default pool for backward compatibility
export const pool = readPool; 