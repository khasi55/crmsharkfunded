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
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com https://*.tradingview.com https://s3.tradingview.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tradingview.com;
      img-src 'self' blob: data: https://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com https://*.tradingview.com;
      font-src 'self' https://fonts.gstatic.com data:;
      connect-src 'self' https://*.supabase.co https://api.sharkfunded.co https://api.sharkfunded.com wss://api.sharkfunded.co wss://api.sharkfunded.com wss://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
      frame-src 'self' https://*.supabase.co https://sharkpay-o9zz.vercel.app https://sharkfundedpayment.vercel.app https://payments.sharkfunded.com https://*.paymentservice.me https://*.cregis.io https://*.tradingview.com;
      frame-ancestors 'self';
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
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.sharkfunded.co';
    const ADMIN_URL = (process.env.ADMIN_URL || 'https://admin.sharkfunded.com').replace(/\/$/, '');
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
        source: '/admin',
        destination: `${ADMIN_URL}/`, // Strip /admin
      },
      {
        source: '/admin/:path*',
        destination: `${ADMIN_URL}/:path*`, // Strip /admin
      },
    ];
  },
};

export default nextConfig;
