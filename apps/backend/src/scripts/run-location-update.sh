#!/bin/bash

# Run Location Update Script
# This script runs the entire location update process in sequence

# Parse command line arguments
SKIP_POSTGIS=false
SKIP_BOUNDARIES=false
NEW_ONLY=false
LIMIT=""

for arg in "$@"
do
  case $arg in
    --skip-postgis|-p)
      SKIP_POSTGIS=true
      shift
      ;;
    --skip-boundaries|-b)
      SKIP_BOUNDARIES=true
      shift
      ;;
    --new-only|-n)
      NEW_ONLY=true
      shift
      ;;
    --limit=*)
      LIMIT="${arg#*=}"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --skip-postgis, -p     Skip PostGIS setup"
      echo "  --skip-boundaries, -b  Skip Thailand boundaries import"
      echo "  --limit=N, -l N        Limit the number of stations to process"
      echo "  --new-only, -n         Only process stations without location data"
      echo "  --help, -h             Show this help message"
      exit 0
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Function to run a TypeScript script
run_script() {
  script_name=$1
  shift
  echo "[LocationUpdate] Running $script_name..."
  npx ts-node --esm --transpile-only src/scripts/$script_name.ts "$@"
  
  if [ $? -ne 0 ]; then
    echo "[LocationUpdate] $script_name failed with code $?"
    exit 1
  fi
  
  echo "[LocationUpdate] $script_name completed successfully"
}

echo "[LocationUpdate] Starting the location update process"

# Step 1: Set up PostGIS for ThaiWater stations
if [ "$SKIP_POSTGIS" = false ]; then
  echo "[LocationUpdate] Setting up PostGIS for ThaiWater stations"
  run_script "setup-postgis-for-thaiwater"
  echo "[LocationUpdate] PostGIS setup completed"
else
  echo "[LocationUpdate] Skipping PostGIS setup"
fi

# Step 2: Import Thailand administrative boundaries
if [ "$SKIP_BOUNDARIES" = false ]; then
  echo "[LocationUpdate] Importing Thailand administrative boundaries"
  run_script "import-thailand-boundaries"
  echo "[LocationUpdate] Thailand boundaries import completed"
else
  echo "[LocationUpdate] Skipping Thailand boundaries import"
fi

# Step 3: Populate ThaiWater stations with location data
echo "[LocationUpdate] Populating ThaiWater stations with location data"

POPULATE_ARGS=()
if [ -n "$LIMIT" ]; then
  POPULATE_ARGS+=("--limit=$LIMIT")
fi
if [ "$NEW_ONLY" = true ]; then
  POPULATE_ARGS+=("--new-only")
fi

run_script "populate-thaiwater-locations" "${POPULATE_ARGS[@]}"
echo "[LocationUpdate] ThaiWater stations location population completed"

echo "[LocationUpdate] Location update process completed successfully" 