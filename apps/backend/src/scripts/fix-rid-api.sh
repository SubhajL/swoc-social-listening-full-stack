#!/bin/bash

# Fix RID API script
# This script runs all the implementation scripts in sequence to fix the RID API integration

echo "Starting RID API fix script..."
echo "==============================="

# Run update-oauth-implementation.ts
echo "Step 1: Updating OAuth implementation..."
node --loader ts-node/esm src/scripts/update-oauth-implementation.ts
if [ $? -ne 0 ]; then
  echo "Error updating OAuth implementation. Exiting."
  exit 1
fi
echo "OAuth implementation updated successfully."
echo "==============================="

# Run improve-error-handling.ts
echo "Step 2: Improving error handling..."
node --loader ts-node/esm src/scripts/improve-error-handling.ts
if [ $? -ne 0 ]; then
  echo "Error improving error handling. Exiting."
  exit 1
fi
echo "Error handling improved successfully."
echo "==============================="

# Run implement-fallback-mechanism.ts
echo "Step 3: Implementing fallback mechanism..."
node --loader ts-node/esm src/scripts/implement-fallback-mechanism.ts
if [ $? -ne 0 ]; then
  echo "Error implementing fallback mechanism. Exiting."
  exit 1
fi
echo "Fallback mechanism implemented successfully."
echo "==============================="

echo "All implementation scripts completed successfully!"
echo "Next steps:"
echo "1. Review the changes made to the codebase"
echo "2. Run tests to verify the improvements"
echo "3. Commit the changes to the current branch: task/refactor-stationcardeditedit-auth"

# Make the script executable
chmod +x src/scripts/fix-rid-api.sh 