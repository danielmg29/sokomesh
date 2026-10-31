// PM2 processes of the API site (docs/deploy-cloudpanel.md, step 7), run by that site's user from the `current`
// release: `pm2 startOrReload ~/sokomesh/current/infra/cloudpanel/ecosystem.api.cjs --update-env` (deploy.sh api
// does this). Paths go through the `current` symlink, so a reload after a deploy starts the new release. Each
// process has a memory ceiling; PM2 restarts one that passes it. Django reads its settings from the shared .env;
// so does this file, for APP_PORT: the API site's App Port in CloudPanel (8000 unless another site has it).

const path = require('node:path')
const { home, sharedEnv } = require('./shared-env.cjs')

const backend = path.join(home, 'current', 'backend')
const port = sharedEnv().APP_PORT || '8000'
const django = { DJANGO_SETTINGS_MODULE: 'config.settings.prod', PYTHONUNBUFFERED: '1' }

/** A long-running `manage.py` worker. */
const worker = (name, command, memory) => ({
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
      // Django over ASGI on the API site's App Port. NGINX reaches it twice: the API site's own vhost
      // (api.<domain>) and the web site's `location /api/` block; both connect from 127.0.0.1, whose
      // X-Forwarded-* headers uvicorn trusts.
      name: 'sokomesh-api',
      cwd: backend,
      script: path.join(backend, '.venv', 'bin', 'uvicorn'),
      args: ['config.asgi:application', '--host', '127.0.0.1', '--port', port, '--workers', '2', '--proxy-headers', '--forwarded-allow-ips', '127.0.0.1'],
      interpreter: 'none',
      env: django,
      max_memory_restart: '800M',
      kill_timeout: 10000,
    },
    worker('sokomesh-media', 'process_media', '400M'),
    worker('sokomesh-holds', 'expire_reservations', '250M'),
    worker('sokomesh-relay', 'relay_outbox', '250M'),
  ],
}
