import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const AuthHarness = () => {
  const { user, loading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading-state">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>

      <button
        type="button"
        onClick={async () => {
          await login('playwright@example.com', 'SuperSecret123');
        }}
      >
        Trigger Login
      </button>

      <button type="button" onClick={logout}>
        Trigger Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores token and user after successful login', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'unit-test-token',
        user: {
          _id: 'u-1',
          name: 'Unit User',
          email: 'playwright@example.com',
        },
      },
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Trigger Login' }));

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('playwright@example.com');
      expect(localStorage.getItem('token')).toBe('unit-test-token');
      expect(localStorage.getItem('user')).toContain('playwright@example.com');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'playwright@example.com',
      password: 'SuperSecret123',
    });
  });

  it('clears persisted auth when token verification fails on startup', async () => {
    localStorage.setItem('token', 'stale-token');
    localStorage.setItem('user', JSON.stringify({ email: 'stale@example.com' }));

    api.get.mockRejectedValueOnce(new Error('unauthorized'));

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
    });

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});