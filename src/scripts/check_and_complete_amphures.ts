import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

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

async function checkAndCompleteAmphures() {
  logger.info('Starting amphure data check and completion process...');

  const pool = new Pool({
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
    // Check database connection
    await pool.query('SELECT NOW()');
    logger.info('Successfully connected to database');

    // Check current state of amphures_new
    const currentAmphures = await pool.query<AmphureData>(`
      SELECT id, name_th, name_en, province_id 
      FROM amphures_new 
      ORDER BY id
    `);

    logger.info(`Found ${currentAmphures.rows.length} existing amphures in amphures_new table`);

    // Get source data from amphures table
    const sourceAmphures = await pool.query<AmphureData>(`
      SELECT id, name_th, name_en, province_id 
      FROM amphures 
      ORDER BY id
    `);

    logger.info(`Found ${sourceAmphures.rows.length} amphures in source table`);

    // Get provinces for validation
    const provinces = await pool.query<ProvinceData>(`
      SELECT id, name_th, name_en 
      FROM provinces_new
    `);

    const provinceMap = new Map(provinces.rows.map(p => [p.id, p]));

    // Create sets for comparison
    const existingIds = new Set(currentAmphures.rows.map(a => a.id));
    const sourceIds = new Set(sourceAmphures.rows.map(a => a.id));

    // Find missing amphures
    const missingIds = new Set([...sourceIds].filter(id => !existingIds.has(id)));
    logger.info(`Found ${missingIds.size} missing amphures to add`);

    if (missingIds.size > 0) {
      // Start a transaction for the updates
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const amphure of sourceAmphures.rows) {
          if (missingIds.has(amphure.id)) {
            const province = provinceMap.get(amphure.province_id);
            if (!province) {
              logger.warn(`Province not found for amphure ${amphure.id} (${amphure.name_en})`);
              continue;
            }

            // For Bangkok (10), use เขต, for others use อำเภอ
            const prefix = amphure.province_id === '10' ? 'เขต' : 'อำเภอ';
            
            // Clean the name
            const cleanName = amphure.name_th
              .replace(/^อ\./, '')
              .replace(/^อำเภอ/, '')
              .replace(/^เขต/, '')
              .trim();

            // Add proper prefix
            const newNameTh = `${prefix}${cleanName}`;

            logger.info(`Adding amphure: ${amphure.id} - ${newNameTh} (${amphure.name_en})`);

            await client.query(`
              INSERT INTO amphures_new (id, name_th, name_en, province_id)
              VALUES ($1, $2, $3, $4)
            `, [amphure.id, newNameTh, amphure.name_en, amphure.province_id]);
          }
        }

        await client.query('COMMIT');
        logger.info('Successfully committed all changes');

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    // Verify the results
    const finalCount = await pool.query<{ count: string }>('SELECT COUNT(*) FROM amphures_new');
    logger.info(`Final count in amphures_new: ${finalCount.rows[0].count}`);

    // Check distribution by province
    const distribution = await pool.query(`
      SELECT 
        p.name_en as province_name,
        COUNT(*) as amphur_count
      FROM amphures_new a
      JOIN provinces_new p ON a.province_id = p.id
      GROUP BY p.id, p.name_en
      ORDER BY p.name_en
    `);

    logger.info('\nAmphur distribution by province:');
    distribution.rows.forEach(row => {
      logger.info(`${row.province_name}: ${row.amphur_count} amphurs`);
    });

  } catch (error) {
    logger.error('Error during amphure data completion:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
checkAndCompleteAmphures().catch(error => {
  logger.error('Script failed:', error);
  process.exit(1);
}); 