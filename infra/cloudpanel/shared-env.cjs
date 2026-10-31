// The site's shared settings for the PM2 process lists (docs/deploy-cloudpanel.md): `~/sokomesh/shared/.env`,
// the same file Django and deploy.sh read. Only plain KEY=value lines; surrounding quotes are dropped.

const fs = require('node:fs')
const path = require('node:path')

const home = process.env.SOKOMESH_HOME || path.join(process.env.HOME, 'sokomesh')

function sharedEnv() {
  const out = {}
  const text = fs.readFileSync(path.join(home, 'shared', '.env'), 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

module.exports = { home, sharedEnv }
