import * as Sentry from "@sentry/nextjs";

// No session replay: checkout runs through Razorpay's own iframe and the
// admin panel shows customer PII, and replay is opt-in-by-default recording
// of exactly that. Skip it rather than ship it silently on.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
