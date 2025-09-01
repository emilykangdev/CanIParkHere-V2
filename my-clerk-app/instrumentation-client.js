import posthog from "posthog-js";
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

if(process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    ui_host: "https://us.posthog.com",
    defaults: '2025-05-24',
    capture_exceptions: {
      capture_unhandled_errors: true, // default
      capture_unhandled_rejections: true, // default
      capture_console_errors: false // default
    },
    debug: false, // process.env.NODE_ENV === "development",
    // Session replay configuration
    session_recording: {
      recordCrossOriginIframes: true,
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
        email: false,
      },
      recordCanvas: false, // Set to true if you need canvas recording
      sample_rate: 1.0, // Record 100% of sessions
    },
    // Autocapture configuration  
    autocapture: {
      dom_event_allowlist: ["click", "change", "submit"], // Capture clicks, form changes, and submissions
      capture_copied_text: true,
      capture_heatmaps: true,
    },
    // Performance and network monitoring
    capture_performance: true,
    capture_pageview: true,
    // Console logs capture
    advanced_disable_decide: false,
  });

  // Configure web vitals tracking
  function sendToPostHog(metric) {
    posthog.capture('web_vitals', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_id: metric.id,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
    });
  }

  // Track all web vitals
  onCLS(sendToPostHog);
  onINP(sendToPostHog);
  onFCP(sendToPostHog);
  onLCP(sendToPostHog);
  onTTFB(sendToPostHog);
}
