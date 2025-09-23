import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

export function register() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') console.log('[PostHog] Loaded successfully');
        },
        autocapture: {
          dom_event_allowlist: ["click", "change", "submit"],
          capture_copied_text: true,
          capture_heatmaps: true,
        },
        capture_performance: true,
        capture_pageview: true,
        advanced_disable_decide: false,
      });

      function sendToPostHog(metric) {
        posthog.capture('web_vitals', {
          metric_name: metric.name,
          metric_value: metric.value,
          metric_id: metric.id,
          metric_delta: metric.delta,
          metric_rating: metric.rating,
        });
      }

      onCLS(sendToPostHog);
      onINP(sendToPostHog);
      onFCP(sendToPostHog);
      onLCP(sendToPostHog);
      onTTFB(sendToPostHog);
    });
  }
}
