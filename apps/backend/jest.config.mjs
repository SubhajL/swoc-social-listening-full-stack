/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        module: 'ESNext'
      },
    ],
  },
  globals: {
    'ts-jest': {
      useESM: true,
      module: 'ESNext'
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
}; 