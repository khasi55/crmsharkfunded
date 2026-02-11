import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    optimizeCss: true,
  },

  async rewrites() {
    return [
      {
        source: '/api/mt5/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/mt5/:path*`,
      },
      {
        source: '/api/dashboard/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/dashboard/:path*`,
      },
      {
        source: '/api/kyc/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/kyc/:path*`,
      },
      {
        source: '/api/payouts/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/payouts/:path*`,
      },
      {
        source: '/api/affiliates/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/affiliates/:path*`,
      },
      {
        source: '/api/admins/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/admins/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/admin/:path*`,
      },
      {
        source: '/api/upload',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/upload`,
      },
      {
        source: '/api/event/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/event/:path*`,
      },
      {
        source: '/api/competitions/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3001'}/api/competitions/:path*`,
      },
    ];
  },
};

export default nextConfig;
