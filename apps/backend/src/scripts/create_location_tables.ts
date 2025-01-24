import pg from 'pg';
const { Pool } = pg;

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

async function createTables() {
    const client = await pool.connect();
    
    try {
        // Start transaction
        await client.query('BEGIN');

        // Drop existing tables if they exist
        await client.query(`
            DROP TABLE IF EXISTS tumbons;
            DROP TABLE IF EXISTS amphures;
            DROP TABLE IF EXISTS provinces;
        `);

        // Create provinces table
        await client.query(`
            CREATE TABLE provinces (
                id VARCHAR(2) PRIMARY KEY,
                name_th VARCHAR(100) NOT NULL,
                name_en VARCHAR(100),
                latitude DECIMAL(10, 7),
                longitude DECIMAL(10, 7),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_provinces_name_th ON provinces(name_th);
            CREATE INDEX idx_provinces_name_en ON provinces(name_en);
        `);

        // Create amphures table
        await client.query(`
            CREATE TABLE amphures (
                id VARCHAR(4) PRIMARY KEY,
                province_id VARCHAR(2) REFERENCES provinces(id),
                name_th VARCHAR(100) NOT NULL,
                name_en VARCHAR(100),
                latitude DECIMAL(10, 7),
                longitude DECIMAL(10, 7),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_amphures_province_id ON amphures(province_id);
            CREATE INDEX idx_amphures_name_th ON amphures(name_th);
            CREATE INDEX idx_amphures_name_en ON amphures(name_en);
        `);

        // Create tumbons table
        await client.query(`
            CREATE TABLE tumbons (
                id VARCHAR(6) PRIMARY KEY,
                amphure_id VARCHAR(4) REFERENCES amphures(id),
                name_th VARCHAR(100) NOT NULL,
                name_en VARCHAR(100),
                latitude DECIMAL(10, 7),
                longitude DECIMAL(10, 7),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_tumbons_amphure_id ON tumbons(amphure_id);
            CREATE INDEX idx_tumbons_name_th ON tumbons(name_th);
            CREATE INDEX idx_tumbons_name_en ON tumbons(name_en);
        `);

        // Commit transaction
        await client.query('COMMIT');
        console.log('Tables created successfully');

    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('Error creating tables:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Execute the creation
createTables().catch(console.error); 