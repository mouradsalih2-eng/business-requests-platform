import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock the API module
vi.mock('../lib/api', () => ({
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  },
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
    localStorage.getItem.mockReturnValue(null);
  });

  it('shows loading state initially when token exists', async () => {
    localStorage.getItem.mockReturnValue('fake-token');
    authApi.me.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows not logged in when no token', async () => {
    localStorage.getItem.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });

  it('loads user from token on mount', async () => {
    localStorage.getItem.mockReturnValue('valid-token');
    authApi.me.mockResolvedValue({ id: 1, name: 'Test User', role: 'user' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Test User');
    });
    expect(screen.getByTestId('admin-status')).toHaveTextContent('Not admin');
  });

  it('identifies admin users', async () => {
    localStorage.getItem.mockReturnValue('admin-token');
    authApi.me.mockResolvedValue({ id: 1, name: 'Admin User', role: 'admin' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-status')).toHaveTextContent('Admin');
    });
  });

  it('handles login', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({
      user: { id: 1, name: 'New User', role: 'user' },
      token: 'new-token',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as New User');
    });
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
  });

  it('handles logout', async () => {
    const user = userEvent.setup();
    localStorage.getItem.mockReturnValue('valid-token');
    authApi.me.mockResolvedValue({ id: 1, name: 'Test User', role: 'user' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as Test User');
    });

    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('clears token on failed auth check', async () => {
    localStorage.getItem.mockReturnValue('invalid-token');
    authApi.me.mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
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
