/**
 * No-op stand-in for the `server-only` package.
 *
 * The real module throws on import outside a React Server Component, which is
 * exactly what we want in the app and exactly what blocks importing those
 * modules from a Node test. Aliased in vitest.config.ts.
 */
export {};
