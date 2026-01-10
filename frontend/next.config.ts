import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/dashboard/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/dashboard/:path*`,
      },
      {
        source: '/api/mt5/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/mt5/:path*`,
      },
      {
        source: '/api/user/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/user/:path*`,
      },
      {
        source: '/api/payouts/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/payouts/:path*`,
      },
      {
        source: '/api/overview/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/overview/:path*`,
      },
      {
        source: '/api/objectives/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/objectives/:path*`,
      },
    ];
  },
};

export default nextConfig;
