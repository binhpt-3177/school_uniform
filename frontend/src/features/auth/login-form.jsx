import React, { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, FormError, Input, Label } from '../../components/ui/index.js';
import { ApiError } from '../../lib/http.js';
import { useAuth } from './auth-context.jsx';
import { buildLoginSchema } from './schema.js';

function resolveServerError(err, t, tCommon) {
  // Fallback for non-API errors (JS exceptions, unexpected shapes).
  if (!(err instanceof ApiError)) return tCommon('unknown_error');
  if (err.errorCode === 'NETWORK_ERROR' || err.status === 0) return tCommon('unknown_error');
  if (err.status === 429) return t('too_many_attempts');
  if (err.status === 401) return t('invalid_credentials');
  // Backend returns an i18n key in `message` (e.g. "auth.token_expired") —
  // resolve it inside the auth namespace, falling back to the generic
  // invalid-credentials line if the key is unknown to the frontend.
  if (err.message && err.message.startsWith('auth.')) {
    return t(err.message.slice('auth.'.length), { defaultValue: t('invalid_credentials') });
  }
  return t('invalid_credentials');
}

export function LoginForm({ onSuccess }) {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const emailId = useId();
  const passwordId = useId();
  const emailErrId = `${emailId}-err`;
  const passwordErrId = `${passwordId}-err`;
  const serverErrId = `${emailId}-server-err`;

  // Rebuild the schema when the language changes so zod error messages stay
  // in sync with the active locale. `t` is referentially stable per language
  // in react-i18next, so this only fires on actual language switches.
  const schema = useMemo(() => buildLoginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await login(values);
      onSuccess?.();
    } catch (err) {
      setServerError(resolveServerError(err, t, tCommon));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor={emailId}>{t('email_label')}</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('email_placeholder')}
          invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrId : undefined}
          {...register('email')}
        />
        <FormError id={emailErrId}>{errors.email?.message}</FormError>
      </div>

      <div>
        <Label htmlFor={passwordId}>{t('password_label')}</Label>
        <div className="relative">
          <Input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('password_placeholder')}
            invalid={!!errors.password}
            aria-describedby={errors.password ? passwordErrId : undefined}
            className="pr-20"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-600 hover:text-slate-900"
            aria-pressed={showPassword}
          >
            {showPassword ? t('hide_password') : t('show_password')}
          </button>
        </div>
        <FormError id={passwordErrId}>{errors.password?.message}</FormError>
      </div>

      {serverError && (
        <div
          id={serverErrId}
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
