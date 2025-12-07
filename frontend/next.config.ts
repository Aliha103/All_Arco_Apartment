import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Unsplash - common for stock photos
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Production domain - for uploaded media files
      {
        protocol: 'https',
        hostname: 'allarcoapartment.com',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'www.allarcoapartment.com',
        pathname: '/media/**',
      },
      // Railway deployment domains (if different)
      {
        protocol: 'https',
        hostname: '*.railway.app',
        pathname: '/media/**',
      },
      // Common image hosting services
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      // Localhost for development
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/media/**',
      },
    ],
    // Allow unoptimized images for dynamic external URLs
    // This is needed when team members paste URLs from various sources
    unoptimized: false,
  },
};

export default nextConfig;
