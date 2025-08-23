/** @type {import('next').NextConfig} */

import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development'
})

const nextConfig = {
  reactStrictMode: process.env.NODE_ENV !== 'development',
  output: 'standalone',
  images: {
    domains: ['s3.konsulin.care', '37.27.46.214']
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.watchOptions = {
        followSymlinks: false,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '../**' // Ignore any parent directories
        ],
      };
    }
    return config;
  }
}

export default withSerwist(nextConfig)
