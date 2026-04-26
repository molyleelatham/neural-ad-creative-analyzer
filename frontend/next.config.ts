import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the frontend to talk to the local FastAPI backend in development.
  // In production set NEXT_PUBLIC_BACKEND_URL to your deployed backend URL.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
