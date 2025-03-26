# PostgreSQL Table Backup Utility

This utility allows you to create backups of any PostgreSQL table in the database by copying its structure and data to a new table with the "_backup" suffix.

## How it Works

The script performs the following operations:
1. Creates a new table with the same structure as the source table (including constraints, indexes, etc.)
2. Copies all data from the source table to the backup table
3. Optionally verifies that the backup was created correctly

## Usage

### Using npm Scripts

The following npm scripts are available:

- Create a backup of a table:
  ```
  npm run table:backup -- --table=table_name
  ```

- Verify a backup of a table:
  ```
  npm run table:verify -- --table=table_name
  ```

### Using the Script Directly

You can also run the script directly:

```bash
# Create a backup
node src/scripts/table-backup.mjs --table=table_name

# Verify a backup
node src/scripts/table-backup.mjs --table=table_name --verify

# Show help
node src/scripts/table-backup.mjs --help
```

## Examples

### Backup the ThaiWater Telemetry Stations Table

```bash
npm run table:backup -- --table=thaiwater_tele_stations
```

### Verify the Backup of the Amphures Table

```bash
npm run table:verify -- --table=amphures
```

## Verification Process

When verifying a backup, the script performs the following checks:

1. Confirms both source and backup tables exist
2. Compares row counts to ensure all data was copied
3. Validates that column structures match (names, data types, constraints)
4. Performs data sampling to verify data integrity

## Logging

The script logs all operations to:
- Console output with user-friendly messages
- A log file at `logs/table-backup.log` for detailed troubleshooting

## Notes

- If a backup table already exists, it will be dropped and recreated
- The script uses PostgreSQL's `CREATE TABLE ... LIKE` syntax to ensure all constraints, indexes, and table properties are preserved
- Primary keys are used for verification when available, otherwise random rows are sampled 