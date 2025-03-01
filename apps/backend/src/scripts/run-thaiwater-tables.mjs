// This is a temporary file to run the TypeScript script
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register ts-node
require('ts-node/register');

// Import the TypeScript file
import('./create-thaiwater-tables.ts')
  .then(() => {
    console.log('Script executed successfully');
  })
  .catch((error) => {
    console.error('Error executing script:', error);
    process.exit(1);
  }); 