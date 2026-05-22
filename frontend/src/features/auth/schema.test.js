import { describe, it, expect } from 'vitest';
import { buildLoginSchema } from './schema.js';

describe('buildLoginSchema', () => {
  it('returns a zod schema', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);
    expect(schema).toBeDefined();
    expect(schema.parse).toBeDefined();
  });

  it('accepts valid email and password', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(result.data.email).toBe('user@example.com');
    expect(result.data.password).toBe('password123');
  });

  it('rejects empty email with errors.email_required key', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: '',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('errors.email_required');
  });

  it('rejects invalid email format with errors.email_invalid key', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('errors.email_invalid');
  });

  it('rejects password shorter than 8 characters with errors.password_min key', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
    // Should fail on min(8) check, not min(1) check
    expect(result.error.issues.some((issue) => issue.message === 'errors.password_min')).toBe(true);
  });

  it('rejects empty password with errors.password_required key', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('errors.password_required');
  });

  it('uses localized messages from t function', () => {
    const t = (key) => {
      const messages = {
        'errors.email_required': 'Vui lòng nhập email.',
        'errors.email_invalid': 'Vui lòng nhập email hợp lệ.',
        'errors.password_required': 'Vui lòng nhập mật khẩu.',
        'errors.password_min': 'Mật khẩu phải có ít nhất 8 ký tự.',
      };
      return messages[key] || key;
    };

    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: '',
      password: '',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.some((issue) => issue.message === 'Vui lòng nhập email.')).toBe(true);
  });

  it('rejects email with spaces', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user @example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('errors.email_invalid');
  });

  it('accepts password exactly 8 characters', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user@example.com',
      password: '12345678',
    });

    expect(result.success).toBe(true);
  });

  it('accepts password longer than 8 characters', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user@example.com',
      password: 'verylongpassword123456',
    });

    expect(result.success).toBe(true);
  });

  it('preserves email with special characters in valid format', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user+tag@example.co.uk',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(result.data.email).toBe('user+tag@example.co.uk');
  });

  it('rejects missing email field entirely', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.some((issue) => issue.path.includes('email'))).toBe(true);
  });

  it('rejects missing password field entirely', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.some((issue) => issue.path.includes('password'))).toBe(true);
  });

  it('throws on non-string email', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 123,
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('throws on non-string password', () => {
    const t = (key) => key;
    const schema = buildLoginSchema(t);

    const result = schema.safeParse({
      email: 'user@example.com',
      password: { test: 'value' },
    });

    expect(result.success).toBe(false);
  });
});
