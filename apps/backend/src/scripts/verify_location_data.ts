import pg from 'pg';

const { Pool } = pg;

interface VerificationResult {
  table: string;
  count: number;
  nullCounts: Record<string, number>;
  invalidCoordinates: number;
  relationships: {
    orphaned: number;
    total: number;
  };
}

async function verifyLocationData() {
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

  let client = null;

  try {
    client = await pool.connect();
    const results: VerificationResult[] = [];

    // Verify provinces
    console.log('\nVerifying provinces...');
    const provinceResult = await verifyTable(client, 'provinces', null);
    results.push(provinceResult);

    // Verify amphures
    console.log('\nVerifying amphures...');
    const amphureResult = await verifyTable(client, 'amphures', 'province_id');
    results.push(amphureResult);

    // Verify tumbons
    console.log('\nVerifying tumbons...');
    const tumbonResult = await verifyTable(client, 'tumbons', 'amphure_id');
    results.push(tumbonResult);

    // Print summary
    console.log('\n=== Verification Summary ===');
    for (const result of results) {
      console.log(`\n${result.table.toUpperCase()}:`);
      console.log(`Total records: ${result.count}`);
      
      if (Object.keys(result.nullCounts).length > 0) {
        console.log('Null values found:');
        for (const [column, count] of Object.entries(result.nullCounts)) {
          console.log(`  - ${column}: ${count}`);
        }
      } else {
        console.log('No null values found');
      }

      console.log(`Invalid coordinates: ${result.invalidCoordinates}`);
      
      if (result.relationships.total > 0) {
        console.log(`Relationship check:
  - Total records with foreign keys: ${result.relationships.total}
  - Orphaned records: ${result.relationships.orphaned}
  - Valid relationships: ${result.relationships.total - result.relationships.orphaned}`);
      }
    }

    // Verify hierarchical relationships
    console.log('\nVerifying hierarchical relationships...');
    const hierarchyCheck = await client.query(`
      WITH RECURSIVE location_hierarchy AS (
        SELECT 
          p.id as province_id,
          p.name_th as province_name,
          a.id as amphure_id,
          a.name_th as amphure_name,
          t.id as tumbon_id,
          t.name_th as tumbon_name
        FROM provinces p
        LEFT JOIN amphures a ON a.province_id = p.id
        LEFT JOIN tumbons t ON t.amphure_id = a.id
      )
      SELECT 
        COUNT(DISTINCT province_id) as province_count,
        COUNT(DISTINCT amphure_id) as amphure_count,
        COUNT(DISTINCT tumbon_id) as tumbon_count,
        COUNT(*) as total_relationships
      FROM location_hierarchy;
    `);

    const hierarchy = hierarchyCheck.rows[0];
    console.log('\n=== Hierarchy Verification ===');
    console.log(`Provinces in relationships: ${hierarchy.province_count}`);
    console.log(`Amphures in relationships: ${hierarchy.amphure_count}`);
    console.log(`Tumbons in relationships: ${hierarchy.tumbon_count}`);
    console.log(`Total relationships: ${hierarchy.total_relationships}`);

  } catch (error) {
    console.error('Error during verification:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function verifyTable(
  client: pg.PoolClient,
  table: string,
  foreignKeyColumn: string | null
): Promise<VerificationResult> {
  // Get total count
  const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
  const count = parseInt(countResult.rows[0].count);

  // Check for null values in important columns
  const nullChecks = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE name_th IS NULL) as name_th_null,
      COUNT(*) FILTER (WHERE name_en IS NULL) as name_en_null,
      COUNT(*) FILTER (WHERE latitude IS NULL) as latitude_null,
      COUNT(*) FILTER (WHERE longitude IS NULL) as longitude_null
    FROM ${table}
  `);

  const nullCounts: Record<string, number> = {};
  for (const [column, value] of Object.entries(nullChecks.rows[0])) {
    if (parseInt(value as string) > 0) {
      nullCounts[column.replace('_null', '')] = parseInt(value as string);
    }
  }

  // Check for invalid coordinates
  const invalidCoords = await client.query(`
    SELECT COUNT(*)
    FROM ${table}
    WHERE latitude < 5.613038 OR latitude > 20.465143
    OR longitude < 97.343396 OR longitude > 105.636812
  `);
  const invalidCoordinates = parseInt(invalidCoords.rows[0].count);

  // Check relationships if foreign key exists
  let relationships = { orphaned: 0, total: 0 };
  if (foreignKeyColumn) {
    const relationshipCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ${foreignKeyColumn} IS NULL 
          OR NOT EXISTS (
            SELECT 1 FROM ${foreignKeyColumn.split('_')[0]}s p 
            WHERE p.id = ${table}.${foreignKeyColumn}
          )
        ) as orphaned
      FROM ${table}
    `);
    relationships = {
      total: parseInt(relationshipCheck.rows[0].total),
      orphaned: parseInt(relationshipCheck.rows[0].orphaned)
    };
  }

  return {
    table,
    count,
    nullCounts,
    invalidCoordinates,
    relationships
  };
}

// Run the verification
verifyLocationData().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}); 