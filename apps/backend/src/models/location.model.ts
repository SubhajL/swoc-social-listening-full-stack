import { Pool } from 'pg';
import { 
  AdministrativeLevel,
  LocationDataSource,
  Coordinates,
  Province,
  Amphure,
  Tumbon,
  LocationSearchParams,
  LocationUpdate
} from '../types/location.types.js';

export class LocationModel {
  constructor(private readonly pool: Pool) {}

  // Create tables if they don't exist
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS provinces (
        id VARCHAR(36) PRIMARY KEY,
        name_th VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        source VARCHAR(50) NOT NULL,
        verified BOOLEAN DEFAULT false,
        last_verified TIMESTAMP,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name_th),
        UNIQUE(name_en)
      );

      CREATE TABLE IF NOT EXISTS amphures (
        id VARCHAR(36) PRIMARY KEY,
        province_id VARCHAR(36) NOT NULL REFERENCES provinces(id),
        name_th VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        source VARCHAR(50) NOT NULL,
        verified BOOLEAN DEFAULT false,
        last_verified TIMESTAMP,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(province_id, name_th),
        UNIQUE(province_id, name_en)
      );

      CREATE TABLE IF NOT EXISTS tumbons (
        id VARCHAR(36) PRIMARY KEY,
        amphure_id VARCHAR(36) NOT NULL REFERENCES amphures(id),
        name_th VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        postal_code VARCHAR(5),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        source VARCHAR(50) NOT NULL,
        verified BOOLEAN DEFAULT false,
        last_verified TIMESTAMP,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(amphure_id, name_th),
        UNIQUE(amphure_id, name_en)
      );

      CREATE INDEX IF NOT EXISTS idx_provinces_coordinates 
      ON provinces(latitude, longitude);

      CREATE INDEX IF NOT EXISTS idx_amphures_coordinates 
      ON amphures(latitude, longitude);

      CREATE INDEX IF NOT EXISTS idx_tumbons_coordinates 
      ON tumbons(latitude, longitude);

      CREATE INDEX IF NOT EXISTS idx_provinces_verified 
      ON provinces(verified);

      CREATE INDEX IF NOT EXISTS idx_amphures_verified 
      ON amphures(verified);

      CREATE INDEX IF NOT EXISTS idx_tumbons_verified 
      ON tumbons(verified);
    `);
  }

  // Insert or update a province
  async upsertProvince(province: Province): Promise<void> {
    const query = `
      INSERT INTO provinces (
        id, name_th, name_en, latitude, longitude, 
        source, verified, last_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name_th = EXCLUDED.name_th,
        name_en = EXCLUDED.name_en,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        source = EXCLUDED.source,
        verified = EXCLUDED.verified,
        last_verified = EXCLUDED.last_verified,
        last_updated = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      province.id,
      province.nameTH,
      province.nameEN,
      province.coordinates.latitude,
      province.coordinates.longitude,
      province.source,
      province.verified,
      province.lastVerified
    ]);
  }

  // Insert or update an amphure
  async upsertAmphure(amphure: Amphure): Promise<void> {
    const query = `
      INSERT INTO amphures (
        id, province_id, name_th, name_en, 
        latitude, longitude, source, verified, last_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name_th = EXCLUDED.name_th,
        name_en = EXCLUDED.name_en,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        source = EXCLUDED.source,
        verified = EXCLUDED.verified,
        last_verified = EXCLUDED.last_verified,
        last_updated = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      amphure.id,
      amphure.provinceId,
      amphure.nameTH,
      amphure.nameEN,
      amphure.coordinates.latitude,
      amphure.coordinates.longitude,
      amphure.source,
      amphure.verified,
      amphure.lastVerified
    ]);
  }

  // Insert or update a tumbon
  async upsertTumbon(tumbon: Tumbon): Promise<void> {
    const query = `
      INSERT INTO tumbons (
        id, amphure_id, name_th, name_en, postal_code,
        latitude, longitude, source, verified, last_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name_th = EXCLUDED.name_th,
        name_en = EXCLUDED.name_en,
        postal_code = EXCLUDED.postal_code,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        source = EXCLUDED.source,
        verified = EXCLUDED.verified,
        last_verified = EXCLUDED.last_verified,
        last_updated = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      tumbon.id,
      tumbon.amphureId,
      tumbon.nameTH,
      tumbon.nameEN,
      tumbon.postalCode,
      tumbon.coordinates.latitude,
      tumbon.coordinates.longitude,
      tumbon.source,
      tumbon.verified,
      tumbon.lastVerified
    ]);
  }

  // Search locations based on parameters
  async searchLocations(params: LocationSearchParams): Promise<(Province | Amphure | Tumbon)[]> {
    let query = '';
    const values: any[] = [];
    let valueIndex = 1;

    if (params.level === AdministrativeLevel.PROVINCE) {
      query = `
        SELECT * FROM provinces 
        WHERE ($${valueIndex} IS NULL OR name_th = $${valueIndex})
        AND ($${valueIndex + 1} IS NULL OR name_en = $${valueIndex + 1})
        AND ($${valueIndex + 2} IS NULL OR verified = $${valueIndex + 2})
        AND ($${valueIndex + 3} IS NULL OR source = $${valueIndex + 3})
      `;
      values.push(params.nameTH, params.nameEN, params.verified, params.source);
    } else if (params.level === AdministrativeLevel.AMPHURE) {
      query = `
        SELECT * FROM amphures 
        WHERE ($${valueIndex} IS NULL OR province_id = $${valueIndex})
        AND ($${valueIndex + 1} IS NULL OR name_th = $${valueIndex + 1})
        AND ($${valueIndex + 2} IS NULL OR name_en = $${valueIndex + 2})
        AND ($${valueIndex + 3} IS NULL OR verified = $${valueIndex + 3})
        AND ($${valueIndex + 4} IS NULL OR source = $${valueIndex + 4})
      `;
      values.push(params.provinceId, params.nameTH, params.nameEN, params.verified, params.source);
    } else if (params.level === AdministrativeLevel.TUMBON) {
      query = `
        SELECT * FROM tumbons 
        WHERE ($${valueIndex} IS NULL OR amphure_id = $${valueIndex})
        AND ($${valueIndex + 1} IS NULL OR name_th = $${valueIndex + 1})
        AND ($${valueIndex + 2} IS NULL OR name_en = $${valueIndex + 2})
        AND ($${valueIndex + 3} IS NULL OR verified = $${valueIndex + 3})
        AND ($${valueIndex + 4} IS NULL OR source = $${valueIndex + 4})
      `;
      values.push(params.amphureId, params.nameTH, params.nameEN, params.verified, params.source);
    }

    const result = await this.pool.query(query, values);
    return result.rows.map(this.mapRowToLocation);
  }

  // Update location verification status
  async updateLocationVerification(
    id: string,
    level: AdministrativeLevel,
    update: LocationUpdate
  ): Promise<void> {
    const table = this.getTableName(level);
    const query = `
      UPDATE ${table} SET
        latitude = COALESCE($1, latitude),
        longitude = COALESCE($2, longitude),
        source = COALESCE($3, source),
        verified = COALESCE($4, verified),
        last_verified = COALESCE($5, last_verified),
        last_updated = CURRENT_TIMESTAMP
      WHERE id = $6
    `;

    await this.pool.query(query, [
      update.coordinates?.latitude,
      update.coordinates?.longitude,
      update.source,
      update.verified,
      update.lastVerified,
      id
    ]);
  }

  // Helper method to get table name
  private getTableName(level: AdministrativeLevel): string {
    switch (level) {
      case AdministrativeLevel.PROVINCE:
        return 'provinces';
      case AdministrativeLevel.AMPHURE:
        return 'amphures';
      case AdministrativeLevel.TUMBON:
        return 'tumbons';
      default:
        throw new Error(`Invalid administrative level: ${level}`);
    }
  }

  // Helper method to map database row to location object
  private mapRowToLocation(row: any): Province | Amphure | Tumbon {
    const base = {
      id: row.id,
      nameTH: row.name_th,
      nameEN: row.name_en,
      coordinates: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude)
      },
      source: row.source as LocationDataSource,
      verified: row.verified,
      lastVerified: row.last_verified,
      lastUpdated: row.last_updated,
      createdAt: row.created_at
    };

    if (row.postal_code) {
      return {
        ...base,
        level: AdministrativeLevel.TUMBON,
        amphureId: row.amphure_id,
        postalCode: row.postal_code
      } as Tumbon;
    } else if (row.province_id) {
      return {
        ...base,
        level: AdministrativeLevel.AMPHURE,
        provinceId: row.province_id
      } as Amphure;
    } else {
      return {
        ...base,
        level: AdministrativeLevel.PROVINCE
      } as Province;
    }
  }
} 