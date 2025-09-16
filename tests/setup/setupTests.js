const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

// Global test timeout
jest.setTimeout(30000);

// Mock Next.js router for component tests
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/test',
    query: {},
    asPath: '/test'
  })
}));

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  }
}));

// Console suppression for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
