import { render, screen } from '@testing-library/react';
import Home from '../app/page';
import ReactQueryProvider from '../lib/react-query';

// Mock the auth hook to return a non-loading state
jest.mock('../hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
  })),
}));

describe('Project Setup', () => {
  it('renders the home page without crashing', () => {
    render(
      <ReactQueryProvider>
        <Home />
      </ReactQueryProvider>
    );

    expect(screen.getByText('Welcome to Engaged')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Discover amazing local events in Macau, Hong Kong, and the Greater Bay Area. AI-powered matching for your perfect experience.'
      )
    ).toBeInTheDocument();
  });

  it('shows sign in options when user is not authenticated', () => {
    render(
      <ReactQueryProvider>
        <Home />
      </ReactQueryProvider>
    );

    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('displays feature cards', () => {
    render(
      <ReactQueryProvider>
        <Home />
      </ReactQueryProvider>
    );

    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Match')).toBeInTheDocument();
    expect(screen.getByText('Organize')).toBeInTheDocument();
  });
});
