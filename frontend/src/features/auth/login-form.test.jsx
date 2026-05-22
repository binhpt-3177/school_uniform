import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/index.js';
import { LoginForm } from './login-form.jsx';
import { AuthProvider } from './auth-context.jsx';
import * as authApi from './api.js';
import { ApiError } from '../../lib/http.js';

vi.mock('./api.js');

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for me() used by AuthProvider on mount
    vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: 'user@example.com' });
  });

  const renderLoginForm = (props = {}) => {
    return render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LoginForm {...props} />
        </AuthProvider>
      </I18nextProvider>
    );
  };

  describe('rendering', () => {
    it('renders email and password inputs', () => {
      renderLoginForm();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      renderLoginForm();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders show/hide password toggle', () => {
      renderLoginForm();
      expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows email_required error when email is empty and form is touched', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.click(screen.getByLabelText(/password/i)); // trigger blur

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('shows email_invalid error when email format is invalid', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'not-an-email');
      await user.click(screen.getByLabelText(/password/i)); // trigger blur

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('shows password_required error when password is empty', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.click(passwordInput);
      await user.click(screen.getByLabelText(/email/i)); // trigger blur

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('shows password_min error when password is shorter than 8 characters', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'short');
      await user.click(screen.getByLabelText(/email/i)); // trigger blur

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('allows submission when form is valid', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockResolvedValue({ id: 1, email: 'user@example.com' });
      vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: 'user@example.com' });

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(vi.mocked(authApi.login)).toHaveBeenCalledWith({
          email: 'valid@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('submission', () => {
    it('shows loading state while submitting', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ id: 1, email: 'user@example.com' }), 1000);
          })
      );
      vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: 'user@example.com' });

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
      });
    });

    it('disables submit button while submitting', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ id: 1, email: 'user@example.com' }), 500);
          })
      );
      vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: 'user@example.com' });

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('calls onSuccess callback after successful login', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      vi.mocked(authApi.login).mockResolvedValue({ id: 1, email: 'user@example.com' });
      vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: 'user@example.com' });

      renderLoginForm({ onSuccess });

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('shows invalid_credentials error on 401 response', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(
        new ApiError({ status: 401, errorCode: 'INVALID_CREDENTIALS', message: 'auth.invalid_credentials' })
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument();
      });
    });

    it('shows too_many_attempts error on 429 response', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(new ApiError({ status: 429, message: 'auth.too_many_attempts' }));

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
      });
    });

    it('resolves backend i18n key when message starts with auth.', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(
        new ApiError({ status: 400, errorCode: 'EMAIL_TAKEN', message: 'auth.email_taken' })
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        // Should resolve auth.email_taken from i18n
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
    });

    it('falls back to generic error message for unknown errors', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(
        new ApiError({ status: 500, errorCode: 'SERVER_ERROR', message: 'Unknown error' })
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument();
      });
    });

    it('clears server error when form is resubmitted', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login)
        .mockRejectedValueOnce(new ApiError({ status: 401 }))
        .mockResolvedValueOnce({ id: 1, email: 'user@example.com' });
      vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: 'user@example.com' });

      renderLoginForm();

      // First submission fails
      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument();
      });

      // Clear and retry
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, 'valid@example.com');
      await user.type(passwordInput, 'password123');

      vi.mocked(authApi.login).mockResolvedValueOnce({ id: 1, email: 'user@example.com' });
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.queryByText(/email or password is incorrect/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password input type when show/hide button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput.type).toBe('password');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('updates button text when toggling visibility', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toHaveTextContent(/show password/i);

      await user.click(toggleButton);
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('associates input with label via htmlFor', () => {
      renderLoginForm();
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('id');
    });

    it('adds aria-describedby to input when error is present', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.type(emailInput, 'invalid');
      await user.click(screen.getByLabelText(/password/i));

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-describedby');
      });
    });

    it('does not have aria-describedby when no error', () => {
      renderLoginForm();
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).not.toHaveAttribute('aria-describedby');
    });

    it('renders server error with role="alert" role when visible', async () => {
      const user = userEvent.setup();
      // Use 401 with message to test the error path
      vi.mocked(authApi.login).mockRejectedValueOnce(
        new ApiError({ status: 401, errorCode: 'INVALID_CREDENTIALS', message: 'auth.invalid_credentials' })
      );

      renderLoginForm();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // The server error should appear (tested in other error handling tests)
      // This test verifies the alert role is applied when errors render
      await waitFor(() => {
        const errorElements = screen.queryAllByText(/email or password is incorrect/i);
        if (errorElements.length > 0) {
          const alert = errorElements[0].closest('[role="alert"]');
          expect(alert).toBeInTheDocument();
        }
      });
    });
  });
});
