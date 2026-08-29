/** @type {import('next').NextConfig} */

const nextConfig = {
  // Static export only for production build; dev mode needs the in-memory
  // chunk server. Without this condition, next dev returns 404 for all
  // app-specific chunks (app/page.js, app/layout.js, layout.css, etc.).
  ...(process.env.NODE_ENV === 'development' ? {} : { output: 'export' }),
  images: {
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'swiper',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-tooltip'
    ]
  }
}

export default nextConfig
