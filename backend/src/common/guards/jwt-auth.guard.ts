/**
 * Re-export the real JwtAuthGuard from auth module.
 * The stub in this file was replaced in phase-04.
 * app.module.ts imports JwtAuthGuard from here for global registration.
 */
export { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
