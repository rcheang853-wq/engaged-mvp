// Mock Supabase environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock window object for browser APIs
if (typeof window !== 'undefined') {
  // Mock location properly to avoid JSDOM errors
  const locationMock = {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    search: '',
    pathname: '/',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  };

  // Only define if not already defined or redefine if needed
  try {
    delete (window as any).location;
    (window as any).location = locationMock;
  } catch {
    // If delete fails, try to override specific properties
    Object.assign(window.location, locationMock);
  }

  // Mock localStorage for Zustand persist
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });
  }

  // Mock sessionStorage
  if (!window.sessionStorage) {
    Object.defineProperty(window, 'sessionStorage', {
      value: localStorageMock,
    });
  }
}

// Add a simple test to prevent "no tests" error
describe('Auth Test Setup', () => {
  it('should configure test environment correctly', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key');
  });
});

export {};