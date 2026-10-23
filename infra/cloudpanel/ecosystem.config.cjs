// PM2 processes for SokoMesh on a CloudPanel server (docs/deploy-cloudpanel.md). Run by the site user from the
// `current` release: `pm2 startOrReload ~/sokomesh/current/infra/cloudpanel/ecosystem.config.cjs --update-env`.
// Paths go through the `current` symlink, so a reload after a deploy starts the new release. Every process
// has a memory ceiling; PM2 restarts one that passes it.

const fs = require('node:fs')
const path = require('node:path')

const home = process.env.SOKOMESH_HOME || path.join(process.env.HOME, 'sokomesh')
const current = path.join(home, 'current')
const backend = path.join(current, 'backend')

// The web server needs two values from the shared .env (Django reads the whole file itself).
function sharedEnv(...keys) {
  const out = {}
  const text = fs.readFileSync(path.join(home, 'shared', '.env'), 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && keys.includes(m[1])) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

const django = { DJANGO_SETTINGS_MODULE: 'config.settings.prod', PYTHONUNBUFFERED: '1' }
const manage = (name, command, memory) => ({
  name,
  cwd: backend,
  script: path.join(backend, '.venv', 'bin', 'python'),
  args: ['manage.py', command],
  interpreter: 'none',
  env: django,
  max_memory_restart: memory,
  restart_delay: 5000,
})

module.exports = {
  apps: [
    {
      // The CloudPanel Node.js site proxies to this port (its App Port).
      name: 'sokomesh-web',
      cwd: path.join(current, 'web', '.next', 'standalone'),
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
        API_ORIGIN: 'http://127.0.0.1:8000',
        ...sharedEnv('NEXT_PUBLIC_SITE_URL', 'API_ORIGIN'),
      },
      max_memory_restart: '600M',
    },
    {
      // Django over ASGI, reached only through NGINX (`location /api/`) and the web server; never public.
      name: 'sokomesh-api',
      cwd: backend,
      script: path.join(backend, '.venv', 'bin', 'uvicorn'),
      args: ['config.asgi:application', '--host', '127.0.0.1', '--port', '8000', '--workers', '2', '--proxy-headers', '--forwarded-allow-ips', '127.0.0.1'],
      interpreter: 'none',
      env: django,
      max_memory_restart: '800M',
      kill_timeout: 10000,
    },
    manage('sokomesh-media', 'process_media', '400M'),
    manage('sokomesh-holds', 'expire_reservations', '250M'),
    manage('sokomesh-relay', 'relay_outbox', '250M'),
  ],
}
