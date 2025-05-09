import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Helps with network issues
  reactStrictMode: true,
  // Add any Turbopack specific configurations here if needed
};

export default nextConfig;