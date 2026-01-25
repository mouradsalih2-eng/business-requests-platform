export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/db/seed'],
  verbose: true,
};
