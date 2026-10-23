# Deploying SokoMesh on CloudPanel

A step-by-step guide to running SokoMesh on one server managed by [CloudPanel](https://www.cloudpanel.io/docs/v2/) v2, deployed from its GitHub repository over SSH with a read-only deploy key, and served over HTTPS with a Let's Encrypt certificate. Checked against the CloudPanel v2 documentation (v2.5.4, July 2026), GitHub's deploy-key and host-key documentation, and Let's Encrypt's current certificate policy in October 2026.

The repository carries the three files this guide uses, in [`infra/cloudpanel/`](../infra/cloudpanel/):

| File | What it does |
|---|---|
| [`deploy.sh`](../infra/cloudpanel/deploy.sh) | Builds a commit into a fresh release directory, checks it, migrates, switches, health-checks and rolls back on failure |
| [`ecosystem.config.cjs`](../infra/cloudpanel/ecosystem.config.cjs) | The five PM2 processes: the web server, the API and three workers |
| [`nginx-api.conf`](../infra/cloudpanel/nginx-api.conf) | The `location /api/` block to paste into the site's vhost |

## How it fits together

```text
browser ── https://sokomesh.example.co.ke ──► NGINX (CloudPanel Node.js site, Let's Encrypt)
                                                 │
                         /api/*  ────────────────┼──► uvicorn  127.0.0.1:8000   Django over ASGI   (PM2: sokomesh-api)
                         everything else ────────┴──► Next.js  127.0.0.1:3000   standalone server  (PM2: sokomesh-web)
                                                          └─ server-side reads also go to 127.0.0.1:8000
workers (PM2): process_media · expire_reservations · relay_outbox          cron: expire_quotes, pm2 resurrect
data: PostgreSQL 17 (installed beside CloudPanel, or managed) · Redis · ~/sokomesh/shared/media
```

**Why a Node.js site and not a Python site.** CloudPanel's Python guide runs a WSGI application under uWSGI. SokoMesh's backend is an ASGI application (Django with Channels) served by uvicorn, exactly as in its container image (`infra/docker/api.Dockerfile`), and the browser only ever talks to the site's own origin (the `/api` path is first-party, so session and CSRF cookies stay same-site). So there is one public site, a CloudPanel **Node.js site** for the domain, whose vhost sends `/api/` to Django and everything else to Next.js. Django is never reachable from outside the server.

**Why PM2 for everything.** CloudPanel's documented way to keep a Node.js application running is PM2 under the site user, restored at boot by the site user's crontab. Running the API and the workers under the same PM2 keeps every process owned by the site user, so a deploy needs no root and no `sudo`.

**What CloudPanel does not manage.** CloudPanel's database tooling is MySQL or MariaDB only. SokoMesh needs **PostgreSQL** and **Redis**, installed beside CloudPanel (step 3) or provided as managed services.

## 1. The server

- **Operating system:** one of the releases CloudPanel v2 supports: Ubuntu 26.04, 24.04 or 22.04 LTS, or Debian 13 or 12. Ubuntu 24.04 LTS is a safe choice. x86-64 or ARM64.
- **Size:** CloudPanel's minimum is 1 CPU, 2 GB RAM and 10 GB disk. Building the Next.js application needs more memory than serving it: use **2 vCPU and 4 GB RAM** (or add a 2 GB swap file on a 2 GB server) and at least 30 GB disk for releases, dependencies, photographs and the database.
- **DNS:** an `A` record (and `AAAA` if the server has IPv6) for the domain, and for `www` if you want it, pointing at the server. Create these first: the certificate in step 8 can only be issued once they resolve.

## 2. Install CloudPanel

As `root` on a fresh server:

```bash
apt update && apt -y upgrade && apt -y install curl wget sudo
```

Then run the installer from the [installation page for your provider](https://www.cloudpanel.io/docs/v2/getting-started/) (the "Other" page for any server). The page shows the installer's current SHA-256 checksum; copy the command from there rather than from an old guide, because the checksum changes with each installer release. At the time of writing it reads:

```bash
curl -sS https://installer.cloudpanel.io/ce/v2/install.sh -o install.sh; \
echo "8146dbe0a488e7088b04071b0c34d59aa0ab1fe9dcec382d395fd155c9e6c476 install.sh" | \
sha256sum -c && sudo DB_ENGINE=MYSQL_8.4 bash install.sh
```

`DB_ENGINE` chooses CloudPanel's own MySQL or MariaDB; SokoMesh does not use it, so keep the default your OS's tab suggests. Open `https://<server-ip>:8443` straight away, accept the self-signed certificate once, and create the admin user. Then, in **Admin Area → Security**, restrict port **8443** (and **22**) to your own IP address, and keep **80** and **443** open to everyone; `443/udp` too if you enable HTTP/3 later.

## 3. PostgreSQL and Redis

Either use managed services (a hosted PostgreSQL such as Neon, which the project's development setup already uses, and a hosted Redis) and skip to step 4, or install both on the server as `root`.

**PostgreSQL 17** from the PostgreSQL project's own repository (the distribution's package is often an older major version):

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-17
```

Create the database and its owner (choose a long random password):

```bash
sudo -u postgres psql -c "CREATE ROLE sokomesh LOGIN PASSWORD 'change-me';"
sudo -u postgres psql -c "CREATE DATABASE sokomesh OWNER sokomesh;"
```

PostgreSQL listens on `localhost` only by default; leave it that way.

**Redis** (the cache, throttling and the channel layer):

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
redis-cli ping    # PONG
```

The package binds to `127.0.0.1`; leave it that way. Back PostgreSQL up yourself (CloudPanel's backups cover its own databases and the site files, not PostgreSQL): a nightly `pg_dump -Fc` to a file outside the server, or the managed service's backups.

## 4. The site

In CloudPanel: **Sites → Add Site → Create a Node.js Site**.

| Field | Value |
|---|---|
| Domain Name | `sokomesh.example.co.ke` (yours) |
| Node.js Version | **24 LTS** (as in `infra/docker/web.Dockerfile`; CloudPanel supports it from v2.5.4) |
| App Port | **3000** (the Next.js server in `ecosystem.config.cjs`) |
| Site User / Password | `sokomesh` and a strong password |

Or as `root` with the CLI: `clpctl site:add:nodejs --domainName=sokomesh.example.co.ke --nodejsVersion=24 --appPort=3000 --siteUser=sokomesh --siteUserPassword='…'`.

Then on the site's **SSH/FTP** tab, add your **public** SSH key for the site user, so you can log in as `sokomesh` with a key instead of the password. Everything from here on runs as that user unless it says otherwise:

```bash
ssh sokomesh@<server-ip>
```

Node.js is installed for the site user by CloudPanel. Add the other tools to the site user's account:

```bash
corepack enable pnpm                              # pnpm, at the version web/package.json pins
curl -LsSf https://astral.sh/uv/install.sh | sh    # uv, into ~/.local/bin (it installs Python 3.13 for the backend itself)
npm install pm2@latest -g                         # PM2, as in CloudPanel's Node.js guide
exec $SHELL -l                                    # pick up ~/.local/bin
```

## 5. Deploy from GitHub with a read-only deploy key

A deploy key is an SSH key that GitHub attaches to **one repository**, read-only unless you allow writing. The server only ever needs to read, so it never holds a key to your GitHub account. (Password access to Git over HTTPS was removed by GitHub years ago, and the old `git://` protocol is gone; use SSH as below, or HTTPS with a fine-grained token or a GitHub App if you prefer.)

**Make the key, as the site user**, with no passphrase so deploys can run unattended:

```bash
ssh-keygen -t ed25519 -C "sokomesh-deploy@$(hostname)" -f ~/.ssh/sokomesh_deploy -N ""
cat ~/.ssh/sokomesh_deploy.pub
```

**Add it to the repository:** on GitHub, the repository's **Settings → Deploy keys → Add deploy key**. Give it a title (the server's name), paste the public key, and leave **Allow write access** unticked. A deploy key can be used for one repository only, never expires and is not tied to a person: delete it on GitHub when the server is retired.

**Point SSH at it** with a host alias, so this key is used for this repository only. Add to `~/.ssh/config`:

```text
Host github.com-sokomesh
  HostName github.com
  User git
  IdentityFile ~/.ssh/sokomesh_deploy
  IdentitiesOnly yes
```

**Trust GitHub's host key, checked against the fingerprint GitHub publishes.** GitHub replaced its RSA host key in March 2023, so an old `known_hosts` line, or one copied from an old guide, is wrong. Add the Ed25519 key and compare its fingerprint with the one on [GitHub's SSH key fingerprints page](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints) (`SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU` at the time of writing) before you continue:

```bash
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
ssh-keygen -lf ~/.ssh/known_hosts | grep github.com
ssh -T github.com-sokomesh    # "Hi danielmg29/sokomesh! You've successfully authenticated, but GitHub does not provide shell access."
```

**Clone a mirror** that every deploy exports from, and make the shared folders:

```bash
mkdir -p ~/sokomesh/releases ~/sokomesh/shared/media
git clone --mirror git@github.com-sokomesh:danielmg29/sokomesh.git ~/sokomesh/repo.git
```

## 6. Production settings

Create `~/sokomesh/shared/.env` (every release links to it; it is never in Git) and make it private:

```bash
umask 077 && nano ~/sokomesh/shared/.env
```

```ini
# Django (config/settings/prod.py: nothing has a default)
DJANGO_SECRET_KEY=<50+ random characters>
DJANGO_ALLOWED_HOSTS=sokomesh.example.co.ke,www.sokomesh.example.co.ke,127.0.0.1,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=https://sokomesh.example.co.ke,https://www.sokomesh.example.co.ke
DATABASE_URL=postgres://sokomesh:<password>@127.0.0.1:5432/sokomesh
REDIS_URL=redis://127.0.0.1:6379/0

# Accounts and email (Brevo sends mail when both are set)
AC_AUTH_MODE=multi
AC_VERIFY=email
BREVO_API_KEY=<key>
BREVO_SENDER_EMAIL=SokoMesh <no-reply@sokomesh.example.co.ke>

# Files: uploads live outside the releases
AC_MEDIA_ROOT=/home/sokomesh/sokomesh/shared/media

# Payments: the sandbox provider (docs/architecture/decisions.md #80)
AC_PAYMENT_PROVIDER=sandbox
AC_PAYMENT_SANDBOX=true
AC_PAYMENT_SANDBOX_SECRET=<40+ random characters>

# A portfolio demo lists the demo accounts on /login; leave false for a real marketplace
AC_DEMO_ACCOUNTS=true

# Web (also read when the web server is built)
NEXT_PUBLIC_SITE_URL=https://sokomesh.example.co.ke
API_ORIGIN=http://127.0.0.1:8000
```

Generate the two secrets with `openssl rand -base64 48`. Keep a copy of `DJANGO_SECRET_KEY` somewhere safe: changing it signs everyone out, invalidates list cursors, and **changes every webhook's signing secret** (each is derived from it), so integrations would need their new secrets.

`AC_AUTH_MODE` and `AC_VERIFY` are published in the contract, so they must match the committed `contract/ac-contract.json` (`multi` and `email`); a different value stops the deploy at `contract check` until the contract is exported with it and committed.

`127.0.0.1` and `localhost` are in `DJANGO_ALLOWED_HOSTS` because the Next.js server reads the API at `http://127.0.0.1:8000` while rendering pages. With a managed PostgreSQL, use its connection string (with `?sslmode=require`).

## 7. The vhost

In CloudPanel, open the site's **Vhost** tab. The generated configuration already redirects HTTP to HTTPS, leaves `/.well-known/` reachable for certificate checks, and proxies `location /` to `127.0.0.1:{{app_port}}` (port 3000). Leave all of that as it is, and paste the contents of [`infra/cloudpanel/nginx-api.conf`](../infra/cloudpanel/nginx-api.conf) inside the `server` block that listens on `443`, **directly above** its `location / {` block. Save: CloudPanel checks the syntax and refuses a broken configuration. The block sends `/api/` straight to Django, with the forwarded headers Django needs to know the request was HTTPS, and allows the 15 MB photograph uploads.

Django's own admin (`/admin/` on port 8000) is deliberately not proxied: the `/admin` paths on the public site belong to the marketplace administration pages. If you need the Django admin, use an SSH tunnel: `ssh -L 8000:127.0.0.1:8000 sokomesh@<server-ip>`, then open `http://localhost:8000/admin/`.

## 8. HTTPS with Let's Encrypt

Once the DNS records from step 1 resolve to the server and ports 80 and 443 are open: **Sites → Manage → SSL/TLS → Actions → New Let's Encrypt Certificate**, enter the domain names (the domain and, if you use it, `www`), and **Create and Install**. Or as `root`:

```bash
clpctl lets-encrypt:install:certificate --domainName=sokomesh.example.co.ke --subjectAlternativeName=www.sokomesh.example.co.ke
```

CloudPanel renews its Let's Encrypt certificates itself. Things that have changed and make older advice wrong:

- **Let's Encrypt no longer emails before a certificate expires** (it stopped on 4 June 2025). Nothing will warn you if renewal breaks, so add an external certificate-expiry monitor (any uptime service that checks TLS expiry).
- **Certificates are getting shorter.** Let's Encrypt's default certificates last 90 days today, 64 days from 10 February 2027 and 45 days from 16 February 2028. Never install a Let's Encrypt certificate by hand, and never schedule your own renewal at a fixed interval such as "every 60 days": let CloudPanel renew, and do not run a second ACME client (certbot, acme.sh) for the same domain.
- **HSTS is on in production** (`config/settings/prod.py`: one year, subdomains included). After the first HTTPS visit, browsers refuse plain HTTP for the domain *and every subdomain*, so give any subdomain you add a certificate too. Do not submit the domain to the HSTS preload list unless you mean it to be permanent.
- **HTTP/3** is optional: set `http3` to `on` in the Vhost once the real certificate is installed, and open `443/udp`.

## 9. First deploy

As the site user:

```bash
git -C ~/sokomesh/repo.git archive main infra/cloudpanel/deploy.sh | tar -x -O > ~/deploy.sh && chmod +x ~/deploy.sh
~/deploy.sh main
```

The script (read it first: [`infra/cloudpanel/deploy.sh`](../infra/cloudpanel/deploy.sh)) exports the commit into `~/sokomesh/releases/<time>-<commit>`, then:

1. installs the backend's locked dependencies with `uv sync --frozen --no-dev`, runs `check --deploy`, `contract check` (the committed contract must match the backend) and `migrate`;
2. installs the web's locked dependencies, builds the Next.js standalone server (which generates the contract client and design tokens from the committed sources first), and copies its static files and `public/` beside it;
3. points `~/sokomesh/current` at the new release, starts or reloads the five PM2 processes, and waits for `http://127.0.0.1:8000/healthz` and `http://127.0.0.1:3000/` to answer; if they do not, it points `current` back at the previous release and reloads again;
4. keeps the last three releases.

From then on, deploy with `~/sokomesh/current/infra/cloudpanel/deploy.sh` (a branch, tag or commit; `main` by default). Migrations run before the switch, so the previous release briefly runs against the new schema: keep migrations backwards compatible (add, then remove in a later deploy).

**Demo data.** For the portfolio demo, seed once after the first deploy (it prints the demo accounts' shared password; the accounts are listed on `/login` when `AC_DEMO_ACCOUNTS=true`):

```bash
cd ~/sokomesh/current/backend && DJANGO_SETTINGS_MODULE=config.settings.prod uv run --no-sync python manage.py seed_demo
```

## 10. Keep it running

**Start at boot**, as in CloudPanel's Node.js guide: save the process list, then add PM2's resurrect to the site user's crontab with the site user's `PATH` (CloudPanel's Node.js lives under `~/.nvm`, which cron does not know):

```bash
pm2 save
echo $PATH        # copy this
crontab -e
```

```text
PATH=<the output of echo $PATH>
@reboot pm2 resurrect &> /dev/null
*/15 * * * * cd ~/sokomesh/current/backend && DJANGO_SETTINGS_MODULE=config.settings.prod .venv/bin/python manage.py expire_quotes > /dev/null 2>&1
```

The second line expires quotes nobody opens (they also expire when read). The site's **Cron Jobs** tab in CloudPanel manages the same crontab if you prefer the interface. Reboot once and check `pm2 status` shows every process `online`.

| PM2 process | What it is |
|---|---|
| `sokomesh-web` | The Next.js server on 127.0.0.1:3000 |
| `sokomesh-api` | uvicorn with two workers on 127.0.0.1:8000 |
| `sokomesh-media` | `process_media`: checks and publishes uploaded photographs |
| `sokomesh-holds` | `expire_reservations`: releases lapsed stock holds and cancels orders left unpaid |
| `sokomesh-relay` | `relay_outbox`: delivers webhooks to integrations, with backoff |

Each has a memory ceiling in `ecosystem.config.cjs`; PM2 restarts one that passes it. Logs: `pm2 logs`, or `pm2 logs sokomesh-api`; PM2's log files grow until rotated, so install rotation once with `pm2 install pm2-logrotate`.

## 11. Check it

- `https://sokomesh.example.co.ke` serves the storefront with a valid certificate, and `http://` redirects to it.
- `curl -I https://sokomesh.example.co.ke/api/v1/session` answers from Django (it carries an `X-Request-ID` header).
- Sign in, place an order, and pay it from the sandbox phone on the order page: the order moves from "Awaiting payment" to "Submitted" and the seller sees it.
- As the administrator, `/admin/reconciliation` shows every check agreeing (the seeded demo deliberately keeps one failed webhook delivery).

## Optional: deploy from GitHub Actions

To deploy on every push to `main` without giving CI a shell on the server, add a second SSH key to the site user's `~/.ssh/authorized_keys` that can only run the deploy script:

```text
command="/home/sokomesh/sokomesh/current/infra/cloudpanel/deploy.sh main",restrict ssh-ed25519 AAAA… github-actions-deploy
```

Store the private half and the server's host key line as repository secrets, and have a workflow job run `ssh -i <key> -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<file> sokomesh@<server>`. Whatever the job sends, the server runs only the deploy. GitHub-hosted runners connect from a large and changing set of addresses, so if port 22 is restricted to your own IP (step 2), run this job on a self-hosted runner or a runner with a fixed IP address instead.

## Troubleshooting

| Symptom | Look at |
|---|---|
| `502 Bad Gateway` on every page | `pm2 status`; `pm2 logs sokomesh-web` (the App Port must be 3000) |
| Pages load but sign-in or carts fail | `pm2 logs sokomesh-api`; the `/api/` block in the vhost; `DJANGO_ALLOWED_HOSTS` and `DJANGO_CSRF_TRUSTED_ORIGINS` |
| `DisallowedHost` in the API log | Add the host it names to `DJANGO_ALLOWED_HOSTS`, then `pm2 reload sokomesh-api --update-env` |
| The build is killed | Memory: add swap or a larger server (step 1) |
| Photographs stay "checking" | `pm2 logs sokomesh-media` |
| Orders never leave "awaiting payment" | The sandbox phone on the order page answers the prompt; check `pm2 logs sokomesh-api` for the callback |
| Let's Encrypt fails | The DNS records resolve to this server; port 80 is open; nothing else answers `/.well-known/` |

## Sources

- CloudPanel v2: [requirements](https://www.cloudpanel.io/docs/v2/requirements/), [installation](https://www.cloudpanel.io/docs/v2/getting-started/other/), [Node.js with PM2](https://www.cloudpanel.io/docs/v2/nodejs/deployment/pm2/), [Python with uWSGI](https://www.cloudpanel.io/docs/v2/python/deployment/uwsgi/), [SSL/TLS](https://www.cloudpanel.io/docs/v2/frontend-area/tls/), [Vhost](https://www.cloudpanel.io/docs/v2/frontend-area/vhost/), [cron jobs](https://www.cloudpanel.io/docs/v2/frontend-area/cron-jobs/), [SSH/FTP](https://www.cloudpanel.io/docs/v2/frontend-area/ssh-ftp/), [root CLI commands](https://www.cloudpanel.io/docs/v2/cloudpanel-cli/root-user-commands/), [changelog](https://www.cloudpanel.io/docs/v2/changelog/)
- GitHub: [managing deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys), [GitHub's SSH key fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
- Let's Encrypt: [ending expiration emails](https://letsencrypt.org/2025/01/22/ending-expiration-emails/), [from 90 to 45 days](https://isrg.org/post/from-90-to-45/)
- [PostgreSQL apt repository](https://www.postgresql.org/download/linux/ubuntu/), [uv installation](https://docs.astral.sh/uv/getting-started/installation/), Next.js `output: 'standalone'` (`web/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`)
