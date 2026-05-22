import { z } from 'zod';

/**
 * Build a zod login schema with localized error messages.
 * Takes the i18next `t` function (scoped to the `auth` namespace) so error
 * strings come from the same source as the rest of the form UI.
 *
 * Mirrors backend constraints in `backend/src/auth/dto/login.dto.ts`:
 *   email   — must be a valid email
 *   password — non-empty (backend enforces non-empty; we also require ≥ 8
 *              for stronger client-side UX, matching common policy).
 */
export function buildLoginSchema(t) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t('errors.email_required') })
      .email({ message: t('errors.email_invalid') }),
    password: z
      .string()
      .min(1, { message: t('errors.password_required') })
      .min(8, { message: t('errors.password_min') }),
  });
}
