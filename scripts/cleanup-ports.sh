#!/bin/bash

# cleanup-ports.sh
# This script kills any processes running on ports 3000 and 8080
# Used before starting frontend and backend servers

echo "Cleaning up ports 3000 and 8080..."

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid
    else
        echo "No process running on port $port"
    fi
}

# Kill processes on ports 3000 and 8080
kill_port 3000
kill_port 8080

echo "Port cleanup completed." 