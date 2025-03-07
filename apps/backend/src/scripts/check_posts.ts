import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { Pool } = pg;

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log('No .env file found, using process.env');
  dotenv.config();
}

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('Database connection details:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user
});

async function checkPosts() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Successfully connected to database');
    
    // Check if processed_posts table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'processed_posts'
      );
    `;
    
    const tableCheckResult = await client.query(tableCheckQuery);
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('processed_posts table does not exist');
      client.release();
      await pool.end();
      return;
    }
    
    console.log('processed_posts table exists');
    
    // Get count of posts
    const countQuery = 'SELECT COUNT(*) FROM processed_posts;';
    const countResult = await client.query(countQuery);
    const postCount = parseInt(countResult.rows[0].count);
    
    console.log(`Total posts in processed_posts table: ${postCount}`);
    
    // Get sample posts
    if (postCount > 0) {
      const sampleQuery = 'SELECT processed_post_id, text, content, created_at, amphure, province FROM processed_posts LIMIT 5;';
      const sampleResult = await client.query(sampleQuery);
      
      console.log('Sample posts:');
      sampleResult.rows.forEach((post, index) => {
        console.log(`Post ${index + 1}:`);
        console.log(`  ID: ${post.processed_post_id}`);
        console.log(`  Text: ${post.text}`);
        console.log(`  Content: ${post.content?.substring(0, 100)}${post.content?.length > 100 ? '...' : ''}`);
        console.log(`  Created At: ${post.created_at}`);
        console.log(`  Amphure: ${post.amphure}`);
        console.log(`  Province: ${post.province}`);
        console.log('---');
      });
      
      // Check posts with specific amphure and province
      const locationQuery = `
        SELECT COUNT(*) 
        FROM processed_posts 
        WHERE 
          amphure IS NOT NULL 
          AND province IS NOT NULL;
      `;
      
      const locationResult = await client.query(locationQuery);
      const postsWithLocation = parseInt(locationResult.rows[0].count);
      
      console.log(`Posts with location data: ${postsWithLocation} (${Math.round(postsWithLocation / postCount * 100)}% of total)`);
      
      // Get unique amphures and provinces
      const uniqueQuery = `
        SELECT 
          COUNT(DISTINCT amphure) as unique_amphures,
          COUNT(DISTINCT province) as unique_provinces
        FROM processed_posts
        WHERE 
          amphure IS NOT NULL 
          AND province IS NOT NULL;
      `;
      
      const uniqueResult = await client.query(uniqueQuery);
      console.log(`Unique amphures: ${uniqueResult.rows[0].unique_amphures}`);
      console.log(`Unique provinces: ${uniqueResult.rows[0].unique_provinces}`);
      
      // Get posts for a specific location
      if (uniqueResult.rows[0].unique_amphures > 0) {
        const specificLocationQuery = `
          SELECT amphure, province, COUNT(*) as post_count
          FROM processed_posts
          WHERE 
            amphure IS NOT NULL 
            AND province IS NOT NULL
          GROUP BY amphure, province
          ORDER BY post_count DESC
          LIMIT 5;
        `;
        
        const specificLocationResult = await client.query(specificLocationQuery);
        
        console.log('Top 5 locations by post count:');
        specificLocationResult.rows.forEach((location, index) => {
          console.log(`${index + 1}. ${location.amphure}, ${location.province}: ${location.post_count} posts`);
        });
      }
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Error checking posts:', error);
  } finally {
    // Remove the pool.end() call from here
  }
}

checkPosts().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 