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

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
