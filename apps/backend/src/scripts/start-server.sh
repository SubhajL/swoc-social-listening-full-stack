#!/bin/bash

# Navigate to the backend directory
cd "$(dirname "$0")/../.."

# Clean up ports first
../../scripts/cleanup-ports.sh

# Start the backend server
echo "Starting backend server..."
npm run dev &

# Wait for the server to be ready (port 3000)
echo "Waiting for backend server to be ready..."
while ! nc -z localhost 3000; do
    sleep 1
done
echo "Backend server is ready!"

# Start the data sync scheduler
echo "Starting data sync scheduler..."
npm run scheduler:start

echo "Server startup sequence completed!"
echo "Backend server is running on port 3000"
echo "Data sync scheduler is running" 