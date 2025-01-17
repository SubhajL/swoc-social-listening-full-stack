import dotenv from 'dotenv';
import path from 'path';

export function setupTestEnv() {
  dotenv.config({ 
    path: path.resolve(process.cwd(), '.env.test')
  });
} 