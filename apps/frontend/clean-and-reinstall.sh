#!/bin/bash

echo "Cleaning node_modules..."
rm -rf node_modules

echo "Cleaning .vite cache..."
rm -rf .vite

echo "Cleaning dist directory..."
rm -rf dist

echo "Reinstalling dependencies..."
npm install

echo "Starting development server..."
npm run dev
