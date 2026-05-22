import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '../features/auth/login-form.jsx';
import { useAuth } from '../features/auth/auth-context.jsx';
import { LanguageSwitcher } from '../i18n/language-switcher.jsx';

export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold text-slate-700">{t('common:app_name')}</span>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">{t('auth:title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('auth:subtitle')}</p>
          <div className="mt-6">
            <LoginForm onSuccess={() => navigate('/', { replace: true })} />
          </div>
        </div>
      </main>
    </div>
  );
}
