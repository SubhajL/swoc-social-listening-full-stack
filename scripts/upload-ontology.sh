#!/bin/bash

# Script to upload the latest ontology file to Fuseki
# Scheduled to run every Sunday at 6:00 PM

# Configuration
FUSEKI_ENDPOINT="http://localhost:3030/rid/data"
ONTOLOGY_DIR="config/fuseki"
LOG_FILE="logs/ontology-upload.log"

# Create logs directory if it doesn't exist
mkdir -p logs

# Get the latest ontology file
LATEST_ONTOLOGY=$(ls -t ${ONTOLOGY_DIR}/rid-ontology*.ttl.owl 2>/dev/null | head -n1)

# Log function
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if Fuseki is running
if ! curl -s -f "http://localhost:3030/$/ping" > /dev/null; then
    log_message "ERROR: Fuseki server is not running"
    exit 1
fi

# Check if ontology file exists
if [ -z "$LATEST_ONTOLOGY" ]; then
    log_message "ERROR: No ontology file found matching pattern rid-ontology*.ttl.owl"
    exit 1
fi

# Upload the ontology
log_message "Uploading ontology file: $LATEST_ONTOLOGY"

RESPONSE=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: text/turtle" \
    --data-binary "@$LATEST_ONTOLOGY" \
    "$FUSEKI_ENDPOINT")

HTTP_CODE=${RESPONSE: -3}
RESPONSE_BODY=${RESPONSE:0:${#RESPONSE}-3}

if [ "$HTTP_CODE" = "200" ]; then
    log_message "SUCCESS: Ontology uploaded successfully"
    log_message "Response: $RESPONSE_BODY"
else
    log_message "ERROR: Failed to upload ontology. HTTP Code: $HTTP_CODE"
    log_message "Response: $RESPONSE_BODY"
    exit 1
fi

# Verify the upload by counting triples
TRIPLE_COUNT=$(curl -s -X POST \
    -H "Content-Type: application/sparql-query" \
    --data "SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }" \
    "http://localhost:3030/rid/query" | grep -o '"value" : "[0-9]*"' | cut -d'"' -f4)

if [ -n "$TRIPLE_COUNT" ] && [ "$TRIPLE_COUNT" -gt 0 ]; then
    log_message "Verification successful: $TRIPLE_COUNT triples found"
else
    log_message "WARNING: Verification failed or no triples found"
fi 