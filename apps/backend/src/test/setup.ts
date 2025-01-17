import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ 
  path: path.resolve(process.cwd(), '.env.test')
});

// Add global test setup
beforeAll(() => {
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
}); 