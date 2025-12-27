/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Enable Edge Runtime for API routes
  // This allows for faster cold starts and lower latency

  env: {
    // Expose environment variables to the client (prefixed with NEXT_PUBLIC_)
    NEXT_PUBLIC_APP_NAME: 'Christopher Celaya Research Platform',
  },
}

module.exports = nextConfig
