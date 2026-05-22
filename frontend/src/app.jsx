import React from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from './features/auth/auth-context.jsx';

/**
 * Root layout. Wraps every route in AuthProvider so the auth status is
 * resolved once and shared across pages.
 */
export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
