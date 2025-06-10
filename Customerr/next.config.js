/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: [
      'http://localhost:3000',
      'http://192.168.1.84:3000' // <--- REPLACE WITH YOUR ACTUAL IP
    ],
  },
  // Add any other Next.js configurations here if you need them in the future.
  // For now, keep it simple.
};

module.exports = nextConfig;