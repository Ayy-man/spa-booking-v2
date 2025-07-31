/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  eslint: {
    // Ignore ESLint during builds for deployment
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 