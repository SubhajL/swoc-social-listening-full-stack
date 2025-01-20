#!/bin/bash

# Create necessary directories
mkdir -p DB/rid

# Start Fuseki with our configuration
fuseki-server --config=config/fuseki/config.ttl 