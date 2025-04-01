#!/bin/bash

# Kill process on port 3000 if exists
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill process on port 8080 if exists
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

echo "Ports 3000 and 8080 cleaned up" 