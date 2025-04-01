#!/bin/bash

# Deployment script for backend services
# This script handles PM2 service cleanup and restart

echo "Starting deployment process..."

# Navigate to the backend directory
cd "$(dirname "$0")/.."

# Function to check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo "Error: PM2 is not installed. Please install it first:"
        echo "npm install -g pm2"
        exit 1
    fi
}

# Function to stop and delete PM2 process
cleanup_pm2() {
    local service_name="swoc-data-sync"
    echo "Checking for existing PM2 process: $service_name"
    
    # Check if process exists
    if pm2 list | grep -q "$service_name"; then
        echo "Stopping existing process..."
        pm2 stop "$service_name"
        
        echo "Deleting existing process..."
        pm2 delete "$service_name"
        
        echo "PM2 process cleanup completed"
    else
        echo "No existing PM2 process found"
    fi
}

# Function to start PM2 service
start_pm2() {
    echo "Starting PM2 service..."
    pm2 start ecosystem.config.js
    
    # Save PM2 process list
    echo "Saving PM2 process list..."
    pm2 save
    
    # Setup PM2 startup script
    echo "Setting up PM2 startup script..."
    pm2 startup
    
    echo "PM2 service started successfully"
}

# Main deployment process
main() {
    echo "=== Starting deployment process ==="
    
    # Check PM2 installation
    check_pm2
    
    # Cleanup existing PM2 process
    cleanup_pm2
    
    # Start PM2 service
    start_pm2
    
    # Show status
    echo "=== Current PM2 Status ==="
    pm2 status
    
    echo "=== Deployment completed ==="
}

# Run main function
main 