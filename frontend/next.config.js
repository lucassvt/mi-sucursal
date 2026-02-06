/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/misucursal',
  assetPrefix: '/misucursal',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
