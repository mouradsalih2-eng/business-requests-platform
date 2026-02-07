# Client Vitest Setup

Vitest with jsdom for React component and API testing:

**vite.config.js:**
```js
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true
  }
});
```

**setupTests.js:**
```js
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

// Reset before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
```

**Why Vitest:** Fast, Vite-native, compatible with Jest API.

**Test file location:** `client/src/__tests__/*.test.js`

**Rules:**
- Use `globals: true` for `describe`, `it`, `expect` without imports
- Mock localStorage and fetch in setupTests.js
- Reset all mocks in `beforeEach`
- Use `@testing-library/jest-dom` for DOM assertions

