import { apiClient } from '@/lib/api';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AuthUser = {
  id: string | number;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (payload: { email: string; password: string; rememberMe?: boolean }) => Promise<void>;
  signup: (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (payload: { email?: string; token: string; password: string; confirmPassword: string }) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    // One-time cleanup: remove old session flags written by the previous code
    // (these were not tied to real token-based auth and could cause phantom logins)
    sessionStorage.removeItem('innkeeper-session');
    sessionStorage.removeItem('innkeeper-user-info');

    // Check for a real auth token (localStorage = remember me, sessionStorage = session only)
    const token =
      localStorage.getItem('innkeeper_token') ||
      sessionStorage.getItem('innkeeper_session_token');

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.auth.me();
      if (response.data?.user || response.data) {
        const u = response.data?.user ?? response.data;
        setUser(u);
        setLoading(false);
        return;
      }
    } catch {
      // Token invalid or expired — clear everything
      localStorage.removeItem('innkeeper_token');
      sessionStorage.removeItem('innkeeper_session_token');
    }

    setUser(null);
    setLoading(false);
  };


  useEffect(() => {
    void refresh();
  }, []);

  const login = async (payload: { email: string; password: string; rememberMe?: boolean }) => {
    setLoading(true);
    try {
      const response = await apiClient.auth.login(payload);
      const token = response.data?.token;
      if (token) {
        if (payload.rememberMe) {
          // Persist across browser restarts
          localStorage.setItem('innkeeper_token', token);
        } else {
          // Only valid for this browser session (tab/window)
          sessionStorage.setItem('innkeeper_session_token', token);
        }
      }
      const authUser: AuthUser = response.data?.user ?? {
        id: '1',
        name: 'User',
        email: payload.email,
        role: 'receptionist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(authUser);
      setError(null);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Invalid email address or password.';
      setUser(null);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload: { name: string; email: string; phone?: string; password: string; confirmPassword: string; role?: string }) => {
    setLoading(true);
    try {
      await apiClient.auth.signup(payload);
      setError(null);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Unable to create your account.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Clear all auth tokens and session flags
    localStorage.removeItem('innkeeper_token');
    sessionStorage.removeItem('innkeeper_session_token');
    sessionStorage.removeItem('innkeeper-session');
    sessionStorage.removeItem('innkeeper-user-info');
    setUser(null);
    setError(null);
    try {
      await apiClient.auth.logout();
    } catch {
      // Ignore logout failures
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      const response = await apiClient.auth.forgotPassword(email);
      setError(null);
      return response.data as { message: string; resetToken?: string };
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Unable to process your request.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (payload: { email?: string; token: string; password: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      const response = await apiClient.auth.resetPassword(payload);
      setError(null);
      return response.data;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Unable to reset password.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    error,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    refresh,
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
