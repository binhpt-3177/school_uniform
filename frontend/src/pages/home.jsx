import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/index.js';
import { useAuth } from '../features/auth/auth-context.jsx';

export default function HomePage() {
  const { t } = useTranslation(['common', 'auth']);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-slate-900">{t('common:app_name')}</h1>
      <p className="mt-3 text-slate-700">
        {t('common:welcome', { email: user?.email ?? '' })}
      </p>

      <div className="mt-8">
        <Button variant="secondary" onClick={handleLogout}>
          {t('auth:logout')}
        </Button>
      </div>
    </main>
  );
}
