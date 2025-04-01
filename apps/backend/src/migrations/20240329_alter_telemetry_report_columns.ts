import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // First drop the default values
  await queryInterface.sequelize.query(`
    ALTER TABLE telemetry_data_stations 
    ALTER COLUMN show_daily_report DROP DEFAULT,
    ALTER COLUMN show_hourly_report DROP DEFAULT;
  `);

  // Then convert character varying(1) to numeric using USING clause
  await queryInterface.sequelize.query(`
    ALTER TABLE telemetry_data_stations 
    ALTER COLUMN show_daily_report TYPE numeric(1,0) USING CASE WHEN show_daily_report = '1' THEN 1 ELSE 0 END,
    ALTER COLUMN show_hourly_report TYPE numeric(1,0) USING CASE WHEN show_hourly_report = '1' THEN 1 ELSE 0 END;
  `);

  // Finally set NOT NULL and default values
  await queryInterface.sequelize.query(`
    ALTER TABLE telemetry_data_stations 
    ALTER COLUMN show_daily_report SET NOT NULL,
    ALTER COLUMN show_daily_report SET DEFAULT 0,
    ALTER COLUMN show_hourly_report SET NOT NULL,
    ALTER COLUMN show_hourly_report SET DEFAULT 0;
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // First drop the default values
  await queryInterface.sequelize.query(`
    ALTER TABLE telemetry_data_stations 
    ALTER COLUMN show_daily_report DROP DEFAULT,
    ALTER COLUMN show_hourly_report DROP DEFAULT;
  `);

  // Then convert numeric back to character varying(1) using USING clause
  await queryInterface.sequelize.query(`
    ALTER TABLE telemetry_data_stations 
    ALTER COLUMN show_daily_report TYPE character varying(1) USING CASE WHEN show_daily_report = 1 THEN '1' ELSE '0' END,
    ALTER COLUMN show_hourly_report TYPE character varying(1) USING CASE WHEN show_hourly_report = 1 THEN '1' ELSE '0' END;
  `);

  // Finally set NOT NULL and default values
  await queryInterface.sequelize.query(`
    ALTER TABLE telemetry_data_stations 
    ALTER COLUMN show_daily_report SET NOT NULL,
    ALTER COLUMN show_daily_report SET DEFAULT '0',
    ALTER COLUMN show_hourly_report SET NOT NULL,
    ALTER COLUMN show_hourly_report SET DEFAULT '0';
  `);
} 