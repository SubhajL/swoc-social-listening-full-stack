#!/bin/bash

# Function to clear a port
clear_port() {
    local port=$1
    local service=$2
    echo "Clearing $service port $port..."
    
    # Find and kill process using the port
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        lsof -i :$port | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    else
        # Linux
        fuser -k $port/tcp 2>/dev/null || true
    fi
    
    echo "Port $port cleared"
}

# Clear both ports
clear_port 3000 "backend"
clear_port 8080 "frontend"

echo "All ports cleared" 