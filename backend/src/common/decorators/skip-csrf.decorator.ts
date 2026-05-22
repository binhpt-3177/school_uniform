import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/** Mark a route to skip CSRF validation — use for auth endpoints where no cookie exists yet. */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
