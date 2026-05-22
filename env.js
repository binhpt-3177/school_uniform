/**
 * Static runtime environment fallback for GitHub Pages.
 *
 * In Docker (production/dev), this file is OVERWRITTEN at container start by
 * entrypoint.sh which injects real env values:
 *   window.env = { REACT_APP_API_URL: "https://real-api.example.com" };
 *
 * On GitHub Pages there is no entrypoint.sh, so this static file is served as-is.
 * Override values here or set them via the GH Actions environment/secrets
 * if a static API URL is needed for the Pages demo.
 */
window.env = window.env || {};
