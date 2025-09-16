/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  testMatch: [
    '<rootDir>/../../tests/**/*.test.js',
    '<rootDir>/../../tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    '<rootDir>/../../app/api/**/*.js',
    '<rootDir>/../../lib/**/*.js',
    '<rootDir>/../../models/**/*.js',
    '!**/*.config.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../$1'
  },
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
