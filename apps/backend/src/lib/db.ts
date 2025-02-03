import pkg from 'pg';
const { Pool } = pkg;

// Database pool with full access user
export const pool = new Pool({
  user: 'swoc-uat-ssl-user',
  password: 'c3dc7c8f659dd84f76b37057a37d75d2',
  host: 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: 15434,
  database: 'swoc-uat-ssl',
  ssl: {
    rejectUnauthorized: false
  }
}); 