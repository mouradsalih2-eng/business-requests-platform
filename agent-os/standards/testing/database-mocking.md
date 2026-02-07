# Database Mocking

Mock the database module completely to isolate route tests:

```js
import { jest } from '@jest/globals';

const mockDb = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

// Must mock BEFORE importing routes
jest.unstable_mockModule('../src/db/database.js', () => ({
  default: mockDb,
  initializeDatabase: jest.fn(),
}));

// Import routes AFTER mock setup
const { default: requestsRoutes } = await import('../src/routes/requests.js');
```

**Configuring mock returns:**
```js
// Single return
mockDb.get.mockReturnValue({ id: 1, title: 'Test' });

// Sequential returns
mockDb.get
  .mockReturnValueOnce({ count: 5 })
  .mockReturnValueOnce({ count: 3 });

// Conditional returns
mockDb.all.mockImplementation((query) => {
  if (query.includes('votes')) return [];
  return mockRequests;
});
```

**Why mock database:** Tests run fast, no file I/O, predictable data.

**Rules:**
- Create `mockDb` object with `get`, `all`, `run` methods
- Use `jest.unstable_mockModule()` for ES modules
- Import modules AFTER mock setup (dynamic import)
- Reset mocks in `beforeEach` with `jest.clearAllMocks()`

