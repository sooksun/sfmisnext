import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
// ดึงเฉพาะ origin (protocol + host + port) สำหรับ CSP
const apiOrigin = (() => {
  try { return new URL(apiUrl).origin } catch { return 'http://localhost:3000' }
})()

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,  // Next.js ต้องการ unsafe-inline/eval สำหรับ dev
      `style-src 'self' 'unsafe-inline'`,                  // TailwindCSS inject inline styles
      `img-src 'self' data: blob:`,                         // data: สำหรับ base64 avatar
      `font-src 'self'`,
      `connect-src 'self' ${apiOrigin}`,                    // อนุญาต API calls
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; '),
  },
  // HSTS — บังคับใช้เฉพาะ production (reverse-proxy เปิด HTTPS)
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
]

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  webpack(config) {
    // suppress @prisma/instrumentation dynamic-require warning from @sentry/nextjs
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@prisma\/instrumentation/ },
    ]
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

// Wrap with Sentry only when DSN is configured (no-op wrapper when not set)
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,           // Suppress Sentry CLI output during build
      disableLogger: true,
      widenClientFileUpload: true,
    })
  : nextConfig
