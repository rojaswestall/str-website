/*
 * Content Security Policy, delivered as Content-Security-Policy-Report-Only by
 * next.config.ts until step 14 switches it to enforce.
 *
 * Why each third party is here:
 * - cdn.hsptb.com: the Hospitable widget loader script.
 * - booking.hospitable.com / *.hospitable.com: the booking iframe and the
 *   loader's ping to api.hospitable.com.
 * - va.vercel-scripts.com / vitals.vercel-insights.com: Vercel Web Analytics.
 * - www.tiktok.com: embed.js and the player iframe. embed.js then loads its
 *   library script and stylesheet from lf16-tiktok-web.tiktokcdn-us.com.
 * - fonts.googleapis.com / fonts.gstatic.com: listed in the step 6 prompt.
 *   Fonts are self-hosted by next/font, so step 14 can drop them if no
 *   report ever needs them.
 * - 'unsafe-inline' in script-src: Next's static pages and next-themes'
 *   pre-paint script are inline; a nonce would force dynamic rendering.
 */
export const cspDirectives: Readonly<Record<string, readonly string[]>> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://cdn.hsptb.com",
    "https://va.vercel-scripts.com",
    "https://www.tiktok.com",
    "https://lf16-tiktok-web.tiktokcdn-us.com",
  ],
  "frame-src": [
    "https://booking.hospitable.com",
    "https://*.hospitable.com",
    "https://www.tiktok.com",
  ],
  "connect-src": [
    "'self'",
    "https://*.hospitable.com",
    "https://vitals.vercel-insights.com",
  ],
  "img-src": ["'self'", "data:", "https:"],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://lf16-tiktok-web.tiktokcdn-us.com",
  ],
  "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  "frame-ancestors": ["'none'"],
};

/** The policy as a single header value. */
export const contentSecurityPolicy = Object.entries(cspDirectives)
  .map(([directive, sources]) => [directive, ...sources].join(" "))
  .join("; ");

export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";
export const broken: number = "not a number";
