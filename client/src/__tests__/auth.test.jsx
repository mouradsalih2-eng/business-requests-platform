import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Wrapper component that provides Router context
function TestWrapper({ children }) {
  return (
    <MemoryRouter>
      {children}
    </MemoryRouter>
  );
}

// Mock the API module
vi.mock('../lib/api', () => ({
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
  updateCachedToken: vi.fn(),
  clearCachedToken: vi.fn(),
}));

import { auth as authApi } from '../lib/api';

// Test component that uses the auth context
function TestComponent() {
  const { user, loading, login, logout, isAdmin } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.name}` : 'Not logged in'}
      </div>
      <div data-testid="admin-status">{isAdmin ? 'Admin' : 'Not admin'}</div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no active session
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    supabase.auth.signOut.mockResolvedValue({});
  });

  it('shows loading state initially when session exists', async () => {
    supabase.auth.getSession.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <TestWrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows not logged in when no session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(
      <TestWrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });

  it('loads user from Supabase session on mount', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    });
    authApi.me.mockResolvedValue({ id: 1, name: 'Test User', role: 'user' });

    render(
      <TestWrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Test User');
    });
    expect(screen.getByTestId('admin-status')).toHaveTextContent('Not admin');
  });

  it('identifies admin users', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'admin-token' } },
    });
    authApi.me.mockResolvedValue({ id: 1, name: 'Admin User', role: 'admin' });

    render(
      <TestWrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-status')).toHaveTextContent('Admin');
    });
  });

  it('handles login', async () => {
    const user = userEvent.setup();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    authApi.login.mockResolvedValue({
      user: { id: 1, name: 'New User', role: 'user' },
    });

    render(
      <TestWrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as New User');
    });
  });

  it('handles logout', async () => {
    const user = userEvent.setup();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    });
    authApi.me.mockResolvedValue({ id: 1, name: 'Test User', role: 'user' });

    render(
      <TestWrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Test User');
    });

    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('signs out on failed auth check', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'invalid-token' } },
    });
    authApi.me.mockRejectedValue(new Error('Unauthorized'));

    render(
      <TestWrapper>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe('useAuth hook', () => {
  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
