import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/auth-context.jsx';

/**
 * Client-side route guard. UX convenience only — backend re-enforces auth
 * via JwtAuthGuard. Do NOT treat absence of this guard as a security
 * vulnerability; never trust the client.
 */
export function ProtectedRoute({ children }) {
  const { t } = useTranslation('common');
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        {t('loading')}
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
