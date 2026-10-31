// PM2 process of the web site (docs/deploy-cloudpanel.md, step 8), run by that site's user from the `current`
// release: `pm2 startOrReload ~/sokomesh/current/infra/cloudpanel/ecosystem.web.cjs --update-env` (deploy.sh web
// does this). The path goes through the `current` symlink, so a reload after a deploy starts the new release.

const path = require('node:path')
const { home, sharedEnv } = require('./shared-env.cjs')

const env = sharedEnv()

module.exports = {
  apps: [
    {
      // The Next.js standalone server on the web site's App Port (APP_PORT, 3000 unless another site has it),
      // which CloudPanel's vhost proxies to.
      name: 'sokomesh-web',
      cwd: path.join(home, 'current', 'web', '.next', 'standalone'),
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        PORT: env.APP_PORT || '3000',
        HOSTNAME: '127.0.0.1',
        API_ORIGIN: env.API_ORIGIN || 'http://127.0.0.1:8000',
        ...(env.NEXT_PUBLIC_SITE_URL ? { NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL } : {}),
      },
      max_memory_restart: '600M',
    },
  ],
}
