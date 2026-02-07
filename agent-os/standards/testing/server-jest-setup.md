# Server Jest Setup

Jest with ES modules support for Node.js testing:

**jest.config.js:**
```js
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
};
```

**package.json script:**
```json
"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
```

**Why experimental-vm-modules:** Enables ES module mocking with `jest.unstable_mockModule()`.

**Test file location:** `server/__tests__/*.test.js`

**Rules:**
- No transform needed (native ES modules)
- Use `--experimental-vm-modules` flag
- Import modules AFTER setting up mocks
- Tests in `__tests__` folder, named `*.test.js`

