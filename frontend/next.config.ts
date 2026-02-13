import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com;
      font-src 'self' https://fonts.gstatic.com data:;
      connect-src 'self' https://*.supabase.co https://*.ngrok-free.app https://api.sharkfunded.co https://api.sharkfunded.com wss://*.supabase.co ws://localhost:3001 http://localhost:3001 ws://127.0.0.1:3001 http://127.0.0.1:3001 https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
      frame-src 'self' https://*.supabase.co;
      base-uri 'self';
      form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

const nextConfig: NextConfig = {
  compress: true, // Enable Gzip compression
  poweredByHeader: false, // Remove X-Powered-By header

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  images: {
    formats: ['image/webp', 'image/avif'], // Serve modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    optimizeCss: true, // Optimize CSS delivery
  },

  async rewrites() {
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/dashboard/:path*',
        destination: `${BACKEND_URL}/api/dashboard/:path*`,
      },
      {
        source: '/api/mt5/:path*',
        destination: `${BACKEND_URL}/api/mt5/:path*`,
      },
      {
        source: '/api/user/:path*',
        destination: `${BACKEND_URL}/api/user/:path*`,
      },
      {
        source: '/api/payouts/:path*',
        destination: `${BACKEND_URL}/api/payouts/:path*`,
      },
      {
        source: '/api/overview/:path*',
        destination: `${BACKEND_URL}/api/overview/:path*`,
      },
      {
        source: '/api/objectives/:path*',
        destination: `${BACKEND_URL}/api/objectives/:path*`,
      },
      {
        source: '/api/webhooks/:path*',
        destination: `${BACKEND_URL}/api/webhooks/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${BACKEND_URL}/api/admin/:path*`,
      },
      {
        source: '/api/admins/:path*',
        destination: `${BACKEND_URL}/api/admins/:path*`,
      },
      {
        source: '/api/kyc/:path*',
        destination: `${BACKEND_URL}/api/kyc/:path*`,
      },
      {
        source: '/api/affiliates/:path*',
        destination: `${BACKEND_URL}/api/affiliates/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${BACKEND_URL}/api/auth/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: 'http://localhost:3002/admin/:path*',
      },
    ];
  },
};

export default nextConfig;
