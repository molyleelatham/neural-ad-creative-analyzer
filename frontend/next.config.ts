import type { NextConfig } from "next";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://arcanalytics-3np8.onrender.com"
    : "http://localhost:8000");

const nextConfig: NextConfig = {
  // Proxy all /api/* requests to the FastAPI backend.
  // This avoids CORS issues — the browser talks to the Next.js server,
  // which forwards to FastAPI server-side.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
