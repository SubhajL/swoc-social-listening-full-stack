#!/usr/bin/env python3

import pandas as pd
import os
import psycopg2
from dotenv import load_dotenv
import sys

# Load environment variables from the .env file
load_dotenv()

# Database connection details from environment variables
db_params = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
}

# SSL settings
if os.getenv("DB_SSL", "false").lower() == "true":
    db_params["sslmode"] = "require"

# Check if the Excel file exists
excel_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "telemetry-station.xlsx")
if not os.path.exists(excel_file):
    print(f"Error: Excel file not found at {excel_file}")
    sys.exit(1)

# Read the Excel file
try:
    print(f"Reading Excel file from {excel_file}...")
    df = pd.read_excel(excel_file)
    print(f"Successfully read Excel file with {len(df)} rows")
except Exception as e:
    print(f"Error reading Excel file: {str(e)}")
    sys.exit(1)

# Connect to the database
try:
    print("Connecting to the database...")
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()
    print("Successfully connected to the database")
except Exception as e:
    print(f"Error connecting to the database: {str(e)}")
    sys.exit(1)

try:
    # Begin transaction
    conn.autocommit = False
    
    # Get all station codes from the database
    cursor.execute("SELECT station_code, station_name FROM telemetry_data_stations")
    db_stations = {row[0]: row[1] for row in cursor.fetchall()}
    print(f"Retrieved {len(db_stations)} stations from the database")
    
    # Filter and clean data from Excel
    station_updates = []
    for _, row in df.iterrows():
        station_code = str(row['สถานี']).strip() if 'สถานี' in row and pd.notna(row['สถานี']) else None
        station_name = str(row['ชื่อสถานี']).strip() if 'ชื่อสถานี' in row and pd.notna(row['ชื่อสถานี']) else None
        
        if not station_code or not station_name:
            continue
            
        if station_code in db_stations:
            if db_stations[station_code] != station_name:
                station_updates.append((station_name, station_code))
    
    print(f"Found {len(station_updates)} stations that need updating")
    
    # Update stations
    if station_updates:
        # Prepare update query
        update_query = "UPDATE telemetry_data_stations SET station_name = %s WHERE station_code = %s"
        cursor.executemany(update_query, station_updates)
        
        # Commit the changes
        conn.commit()
        print(f"Successfully updated {cursor.rowcount} station names")
    else:
        print("No stations need updating")
    
except Exception as e:
    conn.rollback()
    print(f"Error updating station names: {str(e)}")
    sys.exit(1)
finally:
    cursor.close()
    conn.close()
    print("Database connection closed")