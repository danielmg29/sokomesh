import type { NextConfig } from 'next'

// The API is proxied under the site's own origin, so session and CSRF cookies are first-party and the
// browser never makes a cross-origin call. The API path itself comes from the contract (meta.apiBase).
const apiOrigin = process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:8000'

const nextConfig: NextConfig = {
  output: 'standalone', // small production image (infra/docker/web.Dockerfile)
  cacheComponents: true, // explicit "use cache" model
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  // Seeded product galleries reference Unsplash photographs by address (apps/demo/products.py).
  images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' }] },
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  // Brand files live only under public/brand/; serve the conventional root path from there.
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/brand/icons/favicon.ico' },
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
    ]
  },
}

export default nextConfig
