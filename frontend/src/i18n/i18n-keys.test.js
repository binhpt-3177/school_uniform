import { describe, it, expect } from 'vitest';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';

/**
 * Smoke test to verify all required i18n keys exist in both languages.
 * This catches situations where the backend returns a key that frontend
 * cannot resolve, resulting in raw key strings being shown to users.
 */

describe('i18n keys coverage', () => {
  // Keys that must exist for the foundation and login feature to work
  const requiredCommonKeys = ['app_name', 'welcome', 'language', 'loading', 'unknown_error'];

  const requiredAuthKeys = [
    'title',
    'subtitle',
    'email_label',
    'email_placeholder',
    'password_label',
    'password_placeholder',
    'show_password',
    'hide_password',
    'submit',
    'submitting',
    'logout',
    'invalid_credentials',
    'too_many_attempts',
    'token_expired',
    'email_taken',
    'refresh_reused',
  ];

  const requiredAuthErrorKeys = [
    'errors.email_required',
    'errors.email_invalid',
    'errors.password_required',
    'errors.password_min',
  ];

  describe('English (en) locale', () => {
    it('contains all required common keys', () => {
      requiredCommonKeys.forEach((key) => {
        expect(enCommon).toHaveProperty(key, expect.any(String));
        expect(enCommon[key]).not.toBe('');
      });
    });

    it('contains all required auth keys', () => {
      requiredAuthKeys.forEach((key) => {
        expect(enAuth).toHaveProperty(key, expect.any(String));
        expect(enAuth[key]).not.toBe('');
      });
    });

    it('contains all required auth error keys (nested)', () => {
      requiredAuthErrorKeys.forEach((key) => {
        const [namespace, subkey] = key.split('.');
        expect(enAuth).toHaveProperty(namespace);
        expect(enAuth[namespace]).toHaveProperty(subkey, expect.any(String));
        expect(enAuth[namespace][subkey]).not.toBe('');
      });
    });
  });

  describe('Vietnamese (vi) locale', () => {
    it('contains all required common keys', () => {
      requiredCommonKeys.forEach((key) => {
        expect(viCommon).toHaveProperty(key, expect.any(String));
        expect(viCommon[key]).not.toBe('');
      });
    });

    it('contains all required auth keys', () => {
      requiredAuthKeys.forEach((key) => {
        expect(viAuth).toHaveProperty(key, expect.any(String));
        expect(viAuth[key]).not.toBe('');
      });
    });

    it('contains all required auth error keys (nested)', () => {
      requiredAuthErrorKeys.forEach((key) => {
        const [namespace, subkey] = key.split('.');
        expect(viAuth).toHaveProperty(namespace);
        expect(viAuth[namespace]).toHaveProperty(subkey, expect.any(String));
        expect(viAuth[namespace][subkey]).not.toBe('');
      });
    });
  });

  describe('language parity', () => {
    it('both languages have the same common keys', () => {
      const enKeys = Object.keys(enCommon).sort();
      const viKeys = Object.keys(viCommon).sort();
      expect(enKeys).toEqual(viKeys);
    });

    it('both languages have the same auth keys', () => {
      const enKeys = Object.keys(enAuth).sort();
      const viKeys = Object.keys(viAuth).sort();
      expect(enKeys).toEqual(viKeys);
    });

    it('both languages have same nested error keys structure', () => {
      const enErrors = Object.keys(enAuth.errors || {}).sort();
      const viErrors = Object.keys(viAuth.errors || {}).sort();
      expect(enErrors).toEqual(viErrors);
    });
  });

  describe('backend error key support', () => {
    // These are error keys that come back from the backend in the message field
    const backendErrorKeys = [
      'invalid_credentials',
      'email_taken',
      'token_expired',
      'refresh_reused',
    ];

    it('English locale has all backend error keys', () => {
      backendErrorKeys.forEach((key) => {
        expect(enAuth).toHaveProperty(key, expect.any(String));
      });
    });

    it('Vietnamese locale has all backend error keys', () => {
      backendErrorKeys.forEach((key) => {
        expect(viAuth).toHaveProperty(key, expect.any(String));
      });
    });
  });

  describe('form validation keys', () => {
    it('English locale has all zod schema error keys', () => {
      expect(enAuth.errors.email_required).toBeDefined();
      expect(enAuth.errors.email_invalid).toBeDefined();
      expect(enAuth.errors.password_required).toBeDefined();
      expect(enAuth.errors.password_min).toBeDefined();
    });

    it('Vietnamese locale has all zod schema error keys', () => {
      expect(viAuth.errors.email_required).toBeDefined();
      expect(viAuth.errors.email_invalid).toBeDefined();
      expect(viAuth.errors.password_required).toBeDefined();
      expect(viAuth.errors.password_min).toBeDefined();
    });
  });

  describe('interpolation keys', () => {
    it('common.welcome contains interpolation placeholder for email', () => {
      // The key should have {{email}} placeholder for interpolation
      expect(enCommon.welcome).toContain('{{email}}');
      expect(viCommon.welcome).toContain('{{email}}');
    });
  });

  describe('non-empty values', () => {
    it('all English strings are non-empty', () => {
      const checkNonEmpty = (obj, path = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullPath = path ? `${path}.${key}` : key;
          if (typeof value === 'string') {
            expect(value).not.toBe('', `${fullPath} is empty`);
          } else if (typeof value === 'object') {
            checkNonEmpty(value, fullPath);
          }
        });
      };
      checkNonEmpty(enCommon);
      checkNonEmpty(enAuth);
    });

    it('all Vietnamese strings are non-empty', () => {
      const checkNonEmpty = (obj, path = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullPath = path ? `${path}.${key}` : key;
          if (typeof value === 'string') {
            expect(value).not.toBe('', `${fullPath} is empty`);
          } else if (typeof value === 'object') {
            checkNonEmpty(value, fullPath);
          }
        });
      };
      checkNonEmpty(viCommon);
      checkNonEmpty(viAuth);
    });
  });

  describe('string format validation', () => {
    it('no keys contain raw backticks (should use curly braces for i18next)', () => {
      const checkForBackticks = (obj) => {
        Object.values(obj).forEach((value) => {
          if (typeof value === 'string') {
            expect(value).not.toMatch(/`/);
          } else if (typeof value === 'object') {
            checkForBackticks(value);
          }
        });
      };
      checkForBackticks(enCommon);
      checkForBackticks(enAuth);
      checkForBackticks(viCommon);
      checkForBackticks(viAuth);
    });
  });
});
