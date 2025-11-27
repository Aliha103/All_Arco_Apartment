/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Docker
  output: 'standalone',

  // Disable ESLint during build (we'll fix linting issues later)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript errors during build (for now)
  typescript: {
    ignoreBuildErrors: false, // Keep TS checking enabled
  },

  // Image optimization for external images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  // API rewrite for Docker
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },

  // Environment variables - use relative URL for production (nginx proxies /api to Django)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
};

module.exports = nextConfig;
