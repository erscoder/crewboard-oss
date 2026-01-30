/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    runtime: 'edge',
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
