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
      default-src 'self' https://*.supabase.co https://main.sharkfunded.co;
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://main.sharkfunded.co https://*.tradingview.com https://s3.tradingview.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tradingview.com;
      img-src 'self' blob: data: https://*.supabase.co https://main.sharkfunded.co https://*.tradingview.com;
      font-src 'self' https://fonts.gstatic.com data:;
      connect-src 'self' https://*.supabase.co https://main.sharkfunded.co https://*.ngrok-free.app https://api.sharkfunded.co https://api.sharkfunded.com wss://*.supabase.co wss://main.sharkfunded.co wss://api.sharkfunded.co wss://api.sharkfunded.com ws://localhost:3001 http://localhost:3001 ws://127.0.0.1:3001 http://127.0.0.1:3001;
      frame-src 'self' https://*.supabase.co https://main.sharkfunded.co https://sharkpay-o9zz.vercel.app https://sharkfundedpayment.vercel.app https://payments.sharkfunded.com https://*.tradingview.com;
      base-uri 'self';
      form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

const nextConfig: NextConfig = {
  // basePath: '/admin', // Removed to prevent double pathing
  compress: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    optimizeCss: true,
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard', // Redirect root to dashboard (login middleware will intercept if needed)
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/mt5/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/mt5/:path*`,
        basePath: false,
      },
      {
        source: '/api/dashboard/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/dashboard/:path*`,
        basePath: false,
      },
      {
        source: '/api/kyc/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/kyc/:path*`,
        basePath: false,
      },
      {
        source: '/api/payouts/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/payouts/:path*`,
        basePath: false,
      },
      {
        source: '/api/affiliates/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/affiliates/:path*`,
        basePath: false,
      },
      {
        source: '/api/admins/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/admins/:path*`,
        basePath: false,
      },
      {
        source: '/api/admin/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/admin/:path*`,
        basePath: false,
      },
      {
        source: '/api/upload',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/upload`,
        basePath: false,
      },
      {
        source: '/api/event/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/event/:path*`,
        basePath: false,
      },
      {
        source: '/api/competitions/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/competitions/:path*`,
        basePath: false,
      },
      {
        source: '/api/auth/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/auth/:path*`,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
