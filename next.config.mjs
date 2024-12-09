/** @type {import('next').NextConfig} */

import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development'
})

const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['s3.konsulin.care', '37.27.46.214']
  }
}

export default withSerwist(nextConfig)
