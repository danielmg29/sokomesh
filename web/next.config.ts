import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone', // small production image (infra/docker/web.Dockerfile)
  cacheComponents: true, // explicit "use cache" model
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  // Brand files live only under public/brand/; serve the conventional root path from there.
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/brand/icons/favicon.ico' }]
  },
}

export default nextConfig
