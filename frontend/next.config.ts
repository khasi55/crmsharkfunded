import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true, // Enable Gzip compression
  poweredByHeader: false, // Remove X-Powered-By header

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
