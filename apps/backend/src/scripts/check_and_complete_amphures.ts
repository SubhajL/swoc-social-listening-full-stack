import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../.env') });

interface AmphureData {
  id: string;
  name_th: string;
  name_en: string;
  province_id: string;
}

interface ProvinceData {
  id: string;
  name_th: string;
  name_en: string;
}

async function verifyAmphuresDistribution() {
  logger.info('Starting amphures verification process...');

  const pool = new pg.Pool({
    user: process.env.DB_WRITE_USER,
    password: process.env.DB_WRITE_PASSWORD,
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_WRITE_PORT || '5432'),
    database: process.env.DB_WRITE_DATABASE,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. Check total counts in both tables
    const [sourceCount, newCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM amphures'),
      pool.query('SELECT COUNT(*) FROM amphures_new')
    ]);

    logger.info('\nTotal counts comparison:');
    logger.info(`Source table (amphures): ${sourceCount.rows[0].count}`);
    logger.info(`New table (amphures_new): ${newCount.rows[0].count}`);

    // 2. Distribution by province with comparison
    const distributionQuery = `
      WITH source_counts AS (
        SELECT 
          p.name_en as province_en,
          COUNT(*) as source_count
        FROM amphures a
        JOIN provinces p ON a.province_id = p.id
        GROUP BY p.name_en
      ),
      new_counts AS (
        SELECT 
          p.name_en as province_en,
          p.name_th as province_th,
          COUNT(*) as new_count
        FROM amphures_new a
        JOIN provinces_new p ON a.province_id = p.id
        GROUP BY p.name_en, p.name_th
      )
      SELECT 
        n.province_th,
        n.province_en,
        COALESCE(s.source_count, 0) as source_count,
        n.new_count,
        ABS(COALESCE(s.source_count, 0) - n.new_count) as difference
      FROM new_counts n
      LEFT JOIN source_counts s ON LOWER(TRIM(n.province_en)) = LOWER(TRIM(s.province_en))
      ORDER BY difference DESC, n.province_en;
    `;

    const distribution = await pool.query(distributionQuery);
    
    logger.info('\nAmphure distribution by province (comparing source vs new):');
    distribution.rows.forEach(row => {
      logger.info(`${row.province_th} (${row.province_en}): ${row.source_count} -> ${row.new_count} (diff: ${row.difference})`);
    });

    // 3. Check for potential data quality issues
    const qualityCheckQuery = `
      SELECT 
        a.id,
        a.name_th,
        a.name_en,
        p.name_th as province_th,
        p.name_en as province_en,
        octet_length(a.name_th) as name_bytes,
        char_length(a.name_th) as name_chars
      FROM amphures_new a
      JOIN provinces_new p ON a.province_id = p.id
      WHERE 
        a.name_th !~ '^[ก-๙]+' OR  -- Check for non-Thai characters in Thai name
        a.name_en !~ '^[A-Za-z ]+$' OR  -- Check for non-English characters in English name
        char_length(a.name_th) < 3 OR   -- Suspiciously short names
        octet_length(a.name_th)/char_length(a.name_th) != 3  -- Incorrect Thai character encoding
      ORDER BY a.id;
    `;

    const qualityCheck = await pool.query(qualityCheckQuery);
    
    if (qualityCheck.rows.length > 0) {
      logger.info('\nPotential data quality issues found:');
      qualityCheck.rows.forEach(row => {
        logger.info(`ID: ${row.id}`);
        logger.info(`Thai name: ${row.name_th} (${row.name_bytes}/${row.name_chars} bytes/chars)`);
        logger.info(`English name: ${row.name_en}`);
        logger.info(`Province: ${row.province_th} (${row.province_en})`);
        logger.info('---');
      });
    } else {
      logger.info('\nNo data quality issues found.');
    }

    // 4. Statistics about name lengths and patterns
    const statsQuery = `
      SELECT 
        MIN(char_length(name_th)) as min_th_length,
        MAX(char_length(name_th)) as max_th_length,
        AVG(char_length(name_th))::numeric(10,2) as avg_th_length,
        MIN(char_length(name_en)) as min_en_length,
        MAX(char_length(name_en)) as max_en_length,
        AVG(char_length(name_en))::numeric(10,2) as avg_en_length
      FROM amphures_new;
    `;

    const stats = await pool.query(statsQuery);
    
    logger.info('\nName length statistics:');
    logger.info(`Thai names - Min: ${stats.rows[0].min_th_length}, Max: ${stats.rows[0].max_th_length}, Avg: ${stats.rows[0].avg_th_length}`);
    logger.info(`English names - Min: ${stats.rows[0].min_en_length}, Max: ${stats.rows[0].max_en_length}, Avg: ${stats.rows[0].avg_en_length}`);

  } catch (error) {
    logger.error('Error during verification:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
verifyAmphuresDistribution().catch(error => {
  logger.error('Script failed:', error);
  process.exit(1);
}); 