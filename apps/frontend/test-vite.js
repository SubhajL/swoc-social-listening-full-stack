// Simple test script for vite
console.log('Testing vite installation...');

try {
  // Use require for CommonJS
  const vitePackagePath = require.resolve('vite/package.json');
  console.log('Found vite package at:', vitePackagePath);
  
  const vitePackage = require(vitePackagePath);
  console.log('Vite version:', vitePackage.version);
} catch (err) {
  console.error('Error loading vite:', err.message);
} 