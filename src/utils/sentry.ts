import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/browser';

interface EnvConfig {
  SENTRY_DSN?: string;
  RELEASE_VERSION?: string;
  NODE_ENV?: string;
}

export function initSentry(config: EnvConfig) {
  if (config.NODE_ENV === 'production' && config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      release: config.RELEASE_VERSION,
      integrations: [browserTracingIntegration()],
      tracesSampleRate: 0.2,
      environment: config.NODE_ENV || 'production',
    });
  }
}

export function captureError(
  error: Error,
  context?: Record<string, unknown>,
  isProduction?: boolean,
  requestId?: string
) {
  if (isProduction) {
    const enhancedContext = {
      ...context,
      requestId
    };
    Sentry.captureException(error, { contexts: { app: enhancedContext } });
  }
}