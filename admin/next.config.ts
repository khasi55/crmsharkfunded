import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/mt5/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/mt5/:path*`,
      },
      {
        source: '/api/dashboard/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/dashboard/:path*`,
      },
    ];
  },
};

export default nextConfig;
