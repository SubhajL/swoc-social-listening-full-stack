# PostgreSQL Table Updates Manager

This utility allows you to disable or enable updates to any table in the PostgreSQL database using a PostgreSQL RULE.

## How it Works

The script creates a PostgreSQL RULE that intercepts UPDATE operations and does NOTHING instead, effectively blocking all updates to the specified table. This is a safer alternative to changing permissions, as it can be easily toggled on and off as needed.

## Usage

### Using npm Scripts

The following npm scripts are available:

- Disable updates for a table:
  ```
  npm run table:disable -- --table=table_name
  ```

- Enable updates for a table:
  ```
  npm run table:enable -- --table=table_name
  ```

- Check update status for a table:
  ```
  npm run table:status -- --table=table_name
  ```

### Using the Script Directly

You can also run the script directly:

```bash
# Disable updates
node src/scripts/table-updates.mjs --disable --table=table_name

# Enable updates
node src/scripts/table-updates.mjs --enable --table=table_name

# Check status
node src/scripts/table-updates.mjs --status --table=table_name
```

## Examples

### Disable Updates for ThaiWater Telemetry Stations

```bash
npm run table:disable -- --table=thaiwater_tele_stations
```

### Check Status of Updates for Amphures Table

```bash
npm run table:status -- --table=amphures
```

### Re-enable Updates for ThaiWater Telemetry Stations

```bash
npm run table:enable -- --table=thaiwater_tele_stations
```

## How to Verify It's Working

After disabling updates for a table, you can verify it's working by trying to update a row in the table. The update will be blocked and an error will be returned.

```sql
-- This will fail if updates are disabled
UPDATE thaiwater_tele_stations SET updated_at = NOW() WHERE tele_station_id = 1;
```

## Logging

The script logs all operations to:
- Console output
- A log file at `logs/table-updates.log`

## Notes

- This implementation uses PostgreSQL RULES, which intercept the UPDATE operations at the database level
- It does not affect SELECT operations, which will continue to work normally
- The rule has a unique name per table, in the format `no_update_rule_[table_name]`
- The script automatically checks if the table exists and if the rule already exists before applying changes 