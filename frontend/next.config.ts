import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/dashboard/:path*',
        destination: `http://localhost:3001/api/dashboard/:path*`,
      },
      {
        source: '/api/mt5/:path*',
        destination: `http://localhost:3001/api/mt5/:path*`,
      },
      {
        source: '/api/user/:path*',
        destination: `http://localhost:3001/api/user/:path*`,
      },
      {
        source: '/api/payouts/:path*',
        destination: `http://localhost:3001/api/payouts/:path*`,
      },
      {
        source: '/api/overview/:path*',
        destination: `http://localhost:3001/api/overview/:path*`,
      },
      {
        source: '/api/objectives/:path*',
        destination: `http://localhost:3001/api/objectives/:path*`,
      },
      {
        source: '/api/webhooks/:path*',
        destination: `http://localhost:3001/api/webhooks/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `http://localhost:3001/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
