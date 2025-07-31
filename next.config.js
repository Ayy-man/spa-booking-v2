/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  eslint: {
    // Ignore ESLint during builds for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds for deployment
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 