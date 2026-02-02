/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  output: 'standalone',
  basePath: isProd ? '/misucursal' : '',
  assetPrefix: isProd ? '/misucursal' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
