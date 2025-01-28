import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts', 'src/scripts/test_*.ts'],
    environment: 'node'
  }
}); 