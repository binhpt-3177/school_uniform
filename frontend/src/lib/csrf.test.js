import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCsrfToken } from './csrf.js';

describe('getCsrfToken', () => {
  const originalCookie = Object.getOwnPropertyDescriptor(document, 'cookie');

  afterEach(() => {
    if (originalCookie) {
      Object.defineProperty(document, 'cookie', originalCookie);
    }
  });

  it('returns undefined when no cookie is set', () => {
    Object.defineProperty(document, 'cookie', {
      value: '',
      configurable: true,
      writable: true,
    });
    expect(getCsrfToken()).toBeUndefined();
  });

  it('returns the csrf_token cookie value when present', () => {
    Object.defineProperty(document, 'cookie', {
      value: 'csrf_token=abc123def456; other=value',
      configurable: true,
      writable: true,
    });
    expect(getCsrfToken()).toBe('abc123def456');
  });

  it('handles multiple cookies with csrf_token in the middle', () => {
    Object.defineProperty(document, 'cookie', {
      value: 'sessionid=xyz; csrf_token=token789; path=/',
      configurable: true,
      writable: true,
    });
    expect(getCsrfToken()).toBe('token789');
  });

  it('url-decodes the csrf_token value', () => {
    Object.defineProperty(document, 'cookie', {
      value: 'csrf_token=abc%20123%2Fdef; other=x',
      configurable: true,
      writable: true,
    });
    expect(getCsrfToken()).toBe('abc 123/def');
  });

  it('ignores whitespace around cookies', () => {
    Object.defineProperty(document, 'cookie', {
      value: ' csrf_token=test ; other = value ',
      configurable: true,
      writable: true,
    });
    expect(getCsrfToken()).toBe('test');
  });

  it('returns undefined when csrf_token is present but empty', () => {
    Object.defineProperty(document, 'cookie', {
      value: 'csrf_token=; other=value',
      configurable: true,
      writable: true,
    });
    // Empty cookie value should return empty string, not undefined
    expect(getCsrfToken()).toBe('');
  });

  it('handles cookie value with equals sign in the value', () => {
    Object.defineProperty(document, 'cookie', {
      value: 'csrf_token=key=value123; other=x',
      configurable: true,
      writable: true,
    });
    expect(getCsrfToken()).toBe('key=value123');
  });

  it('returns undefined when document is undefined (SSR edge case)', () => {
    const originalDoc = global.document;
    global.document = undefined;
    expect(getCsrfToken()).toBeUndefined();
    global.document = originalDoc;
  });
});
