type AnalyticsEventName =
  | 'tasks.filters.changed'
  | 'tasks.filters.applied'
  | 'tasks.filters.cleared';

interface AnalyticsPayload {
  [key: string]: unknown;
}

export function trackEvent(event: AnalyticsEventName, payload?: AnalyticsPayload) {
  if (typeof window === 'undefined') {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, payload ?? {});
  }
}

export type { AnalyticsEventName, AnalyticsPayload };
