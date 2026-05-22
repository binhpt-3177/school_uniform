import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError } from '../../lib/http.js';
import * as authApi from './api.js';

/**
 * AuthContext owns the SPA's authentication state. The source of truth lives
 * in HttpOnly cookies on the backend — this context just caches the current
 * user object plus a status enum and exposes login/logout actions.
 *
 * Status transitions:
 *   loading            → on mount, while we call /auth/me
 *   authenticated      → /auth/me returned a user OR login() succeeded
 *   unauthenticated    → /auth/me returned 401 OR logout() succeeded
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setStatus('authenticated');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
          setStatus('unauthenticated');
          return;
        }
        // Network or unexpected error — treat as unauthenticated for safety;
        // the user can retry by logging in.
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    // Backend returns the user record directly on successful login (cookies set),
    // so we trust its response and skip a redundant /auth/me round-trip. This
    // also avoids a misleading "invalid credentials" error if /auth/me happens
    // to fail with a transient network blip immediately after login succeeds.
    const profile = await authApi.login(credentials);
    setUser(profile);
    setStatus('authenticated');
    return profile;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
