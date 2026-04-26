/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://arcanalytics-3np8.onrender.com"
    : "http://localhost:8000");

const nextConfig = {
  // Empty Turbopack config to silence the warning
  turbopack: {},
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

module.exports = nextConfig;