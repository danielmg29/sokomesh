# Deploying SokoMesh on CloudPanel: two sites, web and API

This guide adds SokoMesh to a server that **already runs CloudPanel and other sites**, and gets it running on the internet over HTTPS as **two new CloudPanel sites**:

- the **web site** on your main domain (the Next.js storefront and dashboards people visit), and
- the **API site** on a subdomain (the Django backend, its database and its background workers).

It is written for someone doing this for the first time. Every command says **who runs it** and is followed by what you should see, so you can check each step before moving on. Expect about two hours the first time; most of it is waiting for installs and builds.

**The other sites keep running throughout.** Nothing here reinstalls CloudPanel, restarts the server or changes another site's settings. Where SokoMesh shares something with them (ports, PostgreSQL, Redis, memory), the guide first checks what is already in use and gives SokoMesh its own: its own ports, its own database, its own Redis database number and its own Linux users.

Checked in October 2026 against the CloudPanel v2 documentation (v2.5.4, released 1 July 2026), its published vhost templates, the GitHub and Let's Encrypt documentation, and this repository's code.

The repository carries the files this guide uses, in [`infra/cloudpanel/`](../infra/cloudpanel/):

| File | What it does |
|---|---|
| [`deploy.sh`](../infra/cloudpanel/deploy.sh) | Deploys one half: `deploy.sh api` as the API site's user, `deploy.sh web` as the web site's user. Builds into a fresh release folder, checks it, switches over, health-checks, and goes back to the previous release if anything fails |
| [`ecosystem.api.cjs`](../infra/cloudpanel/ecosystem.api.cjs) | The API site's four PM2 processes: Django and three workers |
| [`ecosystem.web.cjs`](../infra/cloudpanel/ecosystem.web.cjs) | The web site's PM2 process: the Next.js server |
| [`shared-env.cjs`](../infra/cloudpanel/shared-env.cjs) | Lets both PM2 files read their site's settings (such as its App Port) |
| [`vhost-web.conf`](../infra/cloudpanel/vhost-web.conf) | The `location /api/` block you paste into the web site's vhost |

---

## Before you start

### What you need

- [ ] **Your CloudPanel server**: its public IP address, **root access over SSH** (as `root`, or a user with `sudo`), and your **CloudPanel admin login**. Step 2 checks it has room for SokoMesh beside the sites already there: about 3.5 GB of free memory (or swap) and 10 GB of free disk.
- [ ] **A domain** whose DNS you can edit, and the **subdomain for the API** you have chosen.
- [ ] **An SSH client** on your computer. On Windows, PowerShell and Windows Terminal include `ssh`; on macOS and Linux, use Terminal.
- [ ] **The repository address**: `https://github.com/danielmg29/sokomesh` (public, so the server can download it without a key; for a private copy see step 11.2).
- [ ] Optional: a [Brevo](https://www.brevo.com/) account if you want SokoMesh to send real emails (step 11.4). The demo works without it.

### The names this guide uses

Replace these with your own values **everywhere** you see them. Keep a note of your values in a text file as you go; you will paste them often.

| In this guide | What it is | Yours |
|---|---|---|
| `sokomesh.example.co.ke` | Your main domain: the web site visitors open | |
| `api.sokomesh.example.co.ke` | The subdomain for the API site | |
| `203.0.113.10` | Your server's public IP address | |
| `sokoapi` | The Linux user that owns the API site (you choose it in step 5.1) | |
| `sokoweb` | The Linux user that owns the web site (you choose it in step 5.2) | |
| `8000` | The API site's App Port: a local port no other site uses (checked in step 2.3) | |
| `3000` | The web site's App Port: a local port no other site uses (checked in step 2.3) | |

### How to read the commands

Each block of commands starts with a line saying who runs it:

- **As root**: you are logged in as the server's administrator. The prompt ends in `#`, like `root@server:~#`.
- **As sokoapi** or **As sokoweb**: you are logged in as that site's user. The prompt ends in `$`, like `sokoapi@server:~$`.

If you are not sure who you are, run `whoami`. Copy commands one block at a time and read the output before going on. Lines starting with `#` inside a block are comments; you can paste them, the shell ignores them.

### Editing files with nano

This guide edits files with `nano`, a simple editor that runs in the terminal:

1. `nano path/to/file` opens the file (or creates it).
2. Paste with a right-click (Windows Terminal, PowerShell) or `Ctrl+Shift+V` (most Linux terminals) or `Cmd+V` (macOS).
3. Save with `Ctrl+O`, then `Enter`. Exit with `Ctrl+X`.

### Making passwords and secrets

Whenever this guide asks for a password or a secret, make one with:

```bash
openssl rand -hex 32
```

It prints 64 random letters and digits. Hex is used on purpose: it has no characters such as `@`, `/` or `#` that would break a database address or a settings file. Store each one in your notes; never put them in Git.

---

## 1. How it fits together

```text
                                  ┌──────────────────────── one server, managed by CloudPanel ────────────────────────┐
 visitor's browser                │                                                                                   │
   https://sokomesh.example.co.ke ──► NGINX: web site (Node.js site, user sokoweb)                                     │
                                  │     /api/*  ───────────────────────────────┐                                      │
                                  │     everything else ──► Next.js  127.0.0.1:3000  (PM2 as sokoweb)                 │
                                  │                            └─ server-side reads ─┐                                │
                                  │                                                  ▼                                │
 integrations, you (admin)        │                                        Django (uvicorn)  127.0.0.1:8000           │
   https://api.sokomesh.example.co.ke ──► NGINX: API site (Python site, user sokoapi) ──►  (PM2 as sokoapi)           │
                                  │                                        workers: process_media,                    │
                                  │                                        expire_reservations, relay_outbox          │
                                  │                                                  │                                │
                                  │                                   PostgreSQL 17 · Redis · /home/sokoapi/…/media   │
                                  └───────────────────────────────────────────────────────────────────────────────────┘
```

Ports 3000 and 8000 are the two sites' App Ports; on a server shared with other sites they may be others (step 2.3).

**Two sites, two users.** CloudPanel gives every site its own Linux user, and that user owns the site's files and processes. The API site's user (`sokoapi`) holds the backend code, its settings, the uploaded files and the Django processes. The web site's user (`sokoweb`) holds the frontend code and the Next.js process. Neither can read the other's files, so a problem in one does not expose the other.

**Why the browser still calls `/api` on the main domain.** SokoMesh's frontend is built to call the API at `/api/…` on its **own** address, so sign-in and security cookies stay first-party and no cross-site rules (CORS) are needed. Product photographs are also served at `/api/v1/media/…` on the main domain. So the web site's NGINX forwards `/api/` straight to Django on the same server (step 8.4). The API's subdomain is the backend's own public address: you use it to check the API on its own (`/healthz`), to open the Django admin (step 11.1), and integrations call the token API there.

**Words you will meet**

| Word | Meaning here |
|---|---|
| Site user | The Linux account CloudPanel creates for a site; you log in as it to deploy |
| Vhost | A site's NGINX configuration: which address it answers and where it sends requests |
| Reverse proxy | NGINX receiving a request and passing it to a program on the server (Next.js on port 3000, Django on 8000) |
| App Port | The local port CloudPanel's vhost forwards to: 3000 for the web site, 8000 for the API site |
| PM2 | A process manager: it starts the programs, restarts them if they crash and brings them back after a reboot |
| Release | One deployed version of the code, in its own folder under `~/sokomesh/releases/`; `~/sokomesh/current` points at the live one |

---

## 2. Check the server, then point the names at it

Your server already runs CloudPanel and other sites, so before adding anything, look at what is there. Nothing in this step changes the server.

### 2.1 Log in as root

**On your computer:**

```bash
ssh root@203.0.113.10
```

If you normally log in as another user with `sudo` rights (such as `ubuntu`), log in as that user, then run `sudo -i` to become root.

### 2.2 Look at what is already there

**As root**, run these one at a time and note the answers:

```bash
lsb_release -d
free -h
swapon --show
df -h /home
ss -ltn | grep -E ':(3000|8000) '
ls /home
pg_lsclusters
redis-cli ping
```

What each answer tells you, and what to do about it:

| Command | Look for | What to do |
|---|---|---|
| `lsb_release -d` | The OS, such as `Ubuntu 24.04.3 LTS` | Ubuntu 22.04, 24.04 or 26.04, or Debian 12 or 13, are all fine |
| `free -h` | The **available** figure on the `Mem:` line | SokoMesh uses about 1.5 GB while running and needs about 2 GB more while it builds. With less than 3.5 GB available, add swap (step 2.4) |
| `swapon --show` | Any line at all | No output means there is no swap yet |
| `df -h /home` | **Avail** | Keep at least 10 GB free for SokoMesh's releases, dependencies and photographs |
| `ss -ltn` with `grep` | Any line | A line ending in `:3000` or `:8000` means another site already uses that port. Choose free ones instead (step 2.3) |
| `ls /home` | The existing site users | The two users you create in step 5 must have new names |
| `pg_lsclusters` | Lines with a version and a port, such as `16 main 5432 online` | Tells you which case of step 4.1 to follow. `command not found` means there is no PostgreSQL |
| `redis-cli ping` | `PONG`, `NOAUTH …` or `command not found` | Tells you which case of step 4.3 to follow |

### 2.3 Choose the two App Ports

Each site needs a local port that no other site uses. This guide uses **8000** for the API site and **3000** for the web site. If step 2.2 showed either one in use, pick another free one, such as `8010` and `3010`, and check it is free:

```bash
ss -ltn | grep -E ':(3010|8010) '
```

No output means both are free. Write your two ports in the names table above; you will type them in steps 5, 7.3, 8.3 and 8.4. Everywhere this guide says `8000` or `3000`, use yours.

### 2.4 Add swap (only if memory is short)

Skip this if `free -h` showed 3.5 GB or more available, or if `swapon --show` already lists swap. Otherwise, **as root**, add 2 GB of swap. It takes effect at once, needs no restart and does not affect the other sites:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

**You should see** a `Swap:` line with about `2.0Gi` total. (If `fallocate` says the file exists, the server already has a `/swapfile`: skip this step.)

### 2.5 Point both names at the server

At your DNS provider, create two **A records** (and two **AAAA** records if your server has an IPv6 address). If you already made the record for the API's subdomain, check it points at this server.

| Type | Name | Value |
|---|---|---|
| A | `sokomesh.example.co.ke` (often written `@` for the bare domain) | `203.0.113.10` |
| A | `api.sokomesh.example.co.ke` (often written `api`) | `203.0.113.10` |

If you use **Cloudflare**, set both records to **DNS only** (grey cloud) while you follow this guide. With the orange-cloud proxy on, the certificates in step 6 and the checks in this guide behave differently.

DNS can take a few minutes to an hour to spread. Check from your own computer:

```bash
nslookup sokomesh.example.co.ke
nslookup api.sokomesh.example.co.ke
```

**You should see** your server's IP address in both answers. Do not go past step 5 until you do.

---

## 3. CloudPanel is already installed

Your server already runs CloudPanel, so **do not run the CloudPanel installer**: it is for empty servers only and would damage the sites already there. You also do not need a system-wide `apt upgrade` for SokoMesh; if you want one, do it at a quiet time, because it can briefly restart services the other sites use.

**Check that your CloudPanel is recent enough.** SokoMesh's web site runs on **Node.js 24**, which CloudPanel offers from v2.5.4 (July 2026). You will see in step 5.2 whether **24** is in the Node.js Version list. If it is not, update CloudPanel first. Take a snapshot of the server at your hosting provider (in case anything goes wrong), then, **as root**, at a quiet time:

```bash
clp-update
```

**Check the firewall, but leave it as it is.** In CloudPanel's **Admin Area → Security**, ports **80** and **443** must be open to everyone. They already are if the other sites work over HTTPS. SokoMesh needs no new rules: Django, PostgreSQL and Redis are only reached from inside the server.

---

## 4. PostgreSQL and Redis

CloudPanel manages MySQL and MariaDB only. SokoMesh needs **PostgreSQL** (its database) and **Redis** (its cache and rate limits). The server may already have either one for another site. SokoMesh gets **its own database** and **its own Redis database number**, so it never touches the other sites' data.

If you would rather use managed services (for example a hosted PostgreSQL such as Neon and a hosted Redis), skip to step 5 and use their connection addresses in step 7.3.

### 4.1 PostgreSQL: use the one that is there, or install version 17

Django 6.1, which SokoMesh uses, needs **PostgreSQL 15 or newer**. Look at what `pg_lsclusters` showed in step 2.2 and follow one case:

**A. PostgreSQL 15, 16, 17 or 18 is already running.** Use it; install nothing. Note its **port** (the third column, usually `5432`) and go to step 4.2.

**B. There is no PostgreSQL** (`command not found`), **or only version 14 or older.** Install PostgreSQL 17 from the PostgreSQL project's own package repository. **As root:**

```bash
apt install -y postgresql-common
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
```

The script explains what it will do and asks you to **press Enter** to continue. Then:

```bash
apt update
apt install -y postgresql-17
pg_lsclusters
```

**You should see** a `17 main` line that is `online`. Note its **port**. If no PostgreSQL was installed before, it is `5432`. If an older version already runs on 5432, the new one takes the next free port, usually `5433`, and the old one keeps running for the sites that use it.

### 4.2 Create SokoMesh's database and its user

Make a database password with `openssl rand -hex 32` and save it in your notes. **As root**, replacing `PASTE-THE-PASSWORD` (keep the single quotes) and `5432` with your cluster's port from step 4.1:

```bash
sudo -u postgres psql -p 5432 -c "CREATE ROLE sokomesh LOGIN PASSWORD 'PASTE-THE-PASSWORD';"
sudo -u postgres psql -p 5432 -c "CREATE DATABASE sokomesh OWNER sokomesh;"
```

**You should see** `CREATE ROLE` and then `CREATE DATABASE`. If you see `role "sokomesh" already exists`, another site already uses that name: use different names (for example `sokomesh_app`) here and in step 7.3.

Check the password works over the same route Django will use (with your port):

```bash
psql "postgres://sokomesh:PASTE-THE-PASSWORD@127.0.0.1:5432/sokomesh" -c "SELECT version();"
```

**You should see** a line starting `PostgreSQL 15`, `16`, `17` or `18`. PostgreSQL only listens on the server itself (`localhost`) by default. Leave its settings as they are, since other sites may rely on them.

### 4.3 Redis: use the one that is there, or install it

Look at what `redis-cli ping` answered in step 2.2:

**A. `PONG`: Redis is running without a password.** Use it, but give SokoMesh its **own database number**, so its keys never mix with another site's. Redis has 16 numbered databases (0 to 15). See which are in use:

```bash
redis-cli info keyspace
```

Each line such as `db0:keys=120,…` is a database in use. Pick a number that is not listed, such as `5`. In step 7.3 you will write it at the end of `REDIS_URL` (`redis://127.0.0.1:6379/5`).

**B. `NOAUTH Authentication required`: Redis has a password.** Find it, **as root**:

```bash
grep '^requirepass' /etc/redis/redis.conf
```

Then check which database numbers are in use, replacing `PASSWORD`:

```bash
redis-cli -a 'PASSWORD' --no-auth-warning info keyspace
```

Pick an unused number as in case A. In step 7.3, `REDIS_URL` becomes `redis://:PASSWORD@127.0.0.1:6379/5` (note the colon before the password). If the password contains characters such as `@`, `/` or `#`, ask whoever set up Redis for a URL-safe one.

**C. `command not found`: no Redis yet.** Install it, **as root**:

```bash
apt install -y redis-server
systemctl enable --now redis-server
redis-cli ping
```

**You should see** `PONG`. Redis listens on `127.0.0.1` only; leave it that way. Database number `0` is free, but using `5` as in case A costs nothing and leaves room for other sites later.

### 4.4 Backups

CloudPanel's backups cover its own MySQL databases and the sites' files, **not PostgreSQL**. Before real people use the site, set up a nightly `pg_dump -Fc sokomesh` to storage outside the server (or use your managed database's backups), and test restoring it once. If the server already backs up PostgreSQL for another site, make sure the new `sokomesh` database is included.

---

## 5. Create the two sites

### 5.1 The API site

In CloudPanel: **Sites → Add Site → Create a Python Site**.

| Field | Value |
|---|---|
| Domain Name | `api.sokomesh.example.co.ke` |
| Python Version | The newest offered. SokoMesh brings its own Python 3.13 through `uv` (step 7.1), so this choice does not matter much |
| App Port | **8000**, or the free port you chose in step 2.3 |
| Site User | `sokoapi`, or another name not already in `/home` |
| Site User Password | A strong password (save it) |

Or, as root, with CloudPanel's command line (on Ubuntu 24.04 the standard Python is 3.12):

```bash
clpctl site:add:python --domainName=api.sokomesh.example.co.ke --pythonVersion=3.12 --appPort=8000 --siteUser=sokoapi --siteUserPassword='PASTE-A-PASSWORD'
```

**If you already created a site for the backend subdomain**, open it and check two things in its settings: it is a **Python** site, and its **App Port** is the free port from step 2.3. If it is a different type (PHP or static), delete it and create it again as above. A **Reverse Proxy** site whose Reverse Proxy URL is `http://127.0.0.1:8000` also works, apart from the Django admin's styling in step 11.1.

The Python site's vhost already forwards every request to the App Port with the headers Django needs, so **the API site's vhost needs no changes**.

### 5.2 The web site

**Sites → Add Site → Create a Node.js Site**.

| Field | Value |
|---|---|
| Domain Name | `sokomesh.example.co.ke` |
| Node.js Version | **24 LTS** (the version the project is built and tested with). If 24 is not in the list, update CloudPanel first (step 3) |
| App Port | **3000**, or the free port you chose in step 2.3 |
| Site User | `sokoweb`, or another name not already in `/home` |
| Site User Password | A strong password (save it) |

Or as root:

```bash
clpctl site:add:nodejs --domainName=sokomesh.example.co.ke --nodejsVersion=24 --appPort=3000 --siteUser=sokoweb --siteUserPassword='PASTE-A-PASSWORD'
```

**You should see** both sites in the **Sites** list. If you open either address in a browser now, a **502 Bad Gateway** page is expected: nothing is running on the two App Ports yet. The other sites are unaffected.

### 5.3 Log in as each site user

You can log in as a site user with the password you set. An SSH key is safer and saves typing. **On your computer**, if you do not have a key yet:

```bash
ssh-keygen -t ed25519
```

Press Enter to accept the file name, and choose a passphrase. Then show the **public** half:

```bash
cat ~/.ssh/id_ed25519.pub
```

On Windows PowerShell use `type $env:USERPROFILE\.ssh\id_ed25519.pub`. In CloudPanel, open each site, go to its **SSH/FTP** tab, and add this public key to the site user. Then test both logins from your computer:

```bash
ssh sokoapi@203.0.113.10
```

```bash
ssh sokoweb@203.0.113.10
```

**You should see** a prompt like `sokoapi@server:~$`. Type `exit` to leave. Keep two terminal windows open from now on, one per site user; it makes the rest of the guide easier.

---

## 6. HTTPS certificates for both sites

Do this now, while nothing else can go wrong: it only needs the DNS records from step 2.5 and ports 80 and 443 open.

For **each** site (the API site and the web site): open the site in CloudPanel, go to **SSL/TLS**, click **Actions → New Let's Encrypt Certificate**, check the domain name, and click **Create and Install**. Or as root:

```bash
clpctl lets-encrypt:install:certificate --domainName=api.sokomesh.example.co.ke
clpctl lets-encrypt:install:certificate --domainName=sokomesh.example.co.ke
```

**You should see** a padlock when you open `https://api.sokomesh.example.co.ke` and `https://sokomesh.example.co.ke` (still showing 502 until the deploys).

Things to know, because older guides get them wrong:

- **CloudPanel renews these certificates by itself.** Do not install certbot or another ACME client for the same domains, and do not schedule your own renewals.
- **Let's Encrypt no longer emails you before a certificate expires** (it stopped in June 2025). Add a free uptime monitor that checks certificate expiry, so you hear about a renewal problem before visitors do.
- **Certificates are getting shorter-lived**: 90 days today, 64 days from February 2027 and 45 days from February 2028. With CloudPanel renewing automatically, you have nothing to change.
- **SokoMesh turns on HSTS in production** (one year, including subdomains). After the first HTTPS visit, browsers refuse plain HTTP for the domain *and every subdomain of it*, so any subdomain you add later needs a certificate too. On a shared server, check this before going live: if another site on this server (or anywhere) lives on a subdomain of SokoMesh's domain, it must already work over HTTPS. For example, with SokoMesh on `example.co.ke` and another site on `shop.example.co.ke`, the shop must have a certificate, or browsers will refuse it after visiting SokoMesh. A SokoMesh domain such as `sokomesh.example.co.ke` only covers names ending in `.sokomesh.example.co.ke`.

---

## 7. The API site

Everything in this step runs **as sokoapi**. Log in with `ssh sokoapi@203.0.113.10`.

### 7.1 Install the tools

**uv** installs Python 3.13 and the backend's exact dependencies. **Node.js and PM2** keep Django and the workers running (CloudPanel only installs Node.js for Node.js sites, so the API site's user gets its own through nvm, the same tool CloudPanel uses).

**As sokoapi:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
exec $SHELL -l
```

The last line restarts your shell so it finds the new tools; if the next commands say `nvm: command not found`, run `source ~/.bashrc` and try again. (nvm's version, `v0.40.8`, was current when this was written; the [nvm README](https://github.com/nvm-sh/nvm#installing-and-updating) shows the latest install line.) Then:

```bash
nvm install 24
npm install -g pm2@latest
uv --version
node --version
pm2 --version
```

**You should see** three version numbers: `uv 0.…`, `v24.…` and PM2's.

### 7.2 Get the code

The server keeps one **mirror** of the GitHub repository and exports each deploy from it.

**As sokoapi:**

```bash
mkdir -p ~/sokomesh/releases ~/sokomesh/shared/media
git clone --mirror https://github.com/danielmg29/sokomesh.git ~/sokomesh/repo.git
```

**You should see** `Cloning into bare repository '/home/sokoapi/sokomesh/repo.git'...` and `done.`

### 7.3 The API's settings

Find the API site's **root directory**: in CloudPanel, open the API site's **Settings**; it is normally `/home/sokoapi/htdocs/api.sokomesh.example.co.ke`. The Django admin's style files go into a `static` folder inside it, where NGINX already serves files.

Create the settings file. Every release links to it, and it is never in Git. **As sokoapi:**

```bash
nano ~/sokomesh/shared/.env
```

Paste this, then replace every example value with yours:

```ini
# Django. These have no default: the API will not start without them.
DJANGO_SECRET_KEY=PASTE-64-HEX-CHARACTERS
DJANGO_ALLOWED_HOSTS=sokomesh.example.co.ke,api.sokomesh.example.co.ke,127.0.0.1,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=https://sokomesh.example.co.ke,https://api.sokomesh.example.co.ke
DATABASE_URL=postgres://sokomesh:PASTE-THE-DATABASE-PASSWORD@127.0.0.1:5432/sokomesh
REDIS_URL=redis://127.0.0.1:6379/5

# The API site's App Port in CloudPanel (step 5.1).
APP_PORT=8000

# The web site's address. Links in emails and on product pages point here.
NEXT_PUBLIC_SITE_URL=https://sokomesh.example.co.ke

# Files: uploads live outside the releases; the admin's style files in the site's root directory.
AC_MEDIA_ROOT=/home/sokoapi/sokomesh/shared/media
AC_STATIC_ROOT=/home/sokoapi/htdocs/api.sokomesh.example.co.ke/static

# Payments: the built-in sandbox, no real money (docs/architecture/decisions.md #80).
AC_PAYMENT_PROVIDER=sandbox
AC_PAYMENT_SANDBOX=true
AC_PAYMENT_SANDBOX_SECRET=PASTE-64-HEX-CHARACTERS

# Demo: list the demo accounts on the sign-in page. Set to false for a real marketplace.
AC_DEMO_ACCOUNTS=true

# Email (optional, step 11.4). Without these, sign-ups work but no email is sent.
# BREVO_API_KEY=
# BREVO_SENDER_EMAIL=SokoMesh <no-reply@sokomesh.example.co.ke>
```

Save (`Ctrl+O`, `Enter`) and exit (`Ctrl+X`). Then make it readable by you only:

```bash
chmod 600 ~/sokomesh/shared/.env
```

What each setting is for:

| Setting | Why |
|---|---|
| `DJANGO_SECRET_KEY` | Signs sessions and links. Make it with `openssl rand -hex 32` and keep a copy: changing it signs everyone out and **changes every webhook's signing secret** (they are derived from it), so integrations would need their new secrets |
| `DJANGO_ALLOWED_HOSTS` | The addresses Django answers to. The **main domain** is needed because the web site forwards `/api/` with its own address; `api.…` for direct calls; `127.0.0.1` and `localhost` because the Next.js server reads the API at `http://127.0.0.1:` plus the API's port |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | The pages allowed to send forms: the web site (sign-in, checkout) and the API site (Django admin). Note the `https://` |
| `DATABASE_URL` | The database from step 4.2, with **your cluster's port** (`5432`, or `5433` if PostgreSQL 17 was installed beside an older version). For a managed database, paste its connection string, usually ending in `?sslmode=require` |
| `REDIS_URL` | Redis, ending in the **database number** you chose in step 4.3 (`/5` here). With a Redis password: `redis://:PASSWORD@127.0.0.1:6379/5` |
| `APP_PORT` | The API site's App Port. Django starts on it, and the deploy checks it |
| `NEXT_PUBLIC_SITE_URL` | The address of the **web** site, used in email links and product pages' canonical addresses |
| `AC_STATIC_ROOT` | The API site's root directory from above, plus `/static` |
| `AC_PAYMENT_SANDBOX_SECRET` | Signs the sandbox's payment results. Another `openssl rand -hex 32` |

Do **not** add `AC_AUTH_MODE` or `AC_VERIFY`: their defaults match the published API contract, and a different value stops the deploy at its contract check.

### 7.4 First deploy

The first time, take the deploy script out of the mirror. **As sokoapi:**

```bash
git -C ~/sokomesh/repo.git show main:infra/cloudpanel/deploy.sh > ~/deploy.sh
chmod +x ~/deploy.sh
~/deploy.sh api
```

The script ([read it](../infra/cloudpanel/deploy.sh)) prints each stage as it goes:

1. **Fetching main**: updates the mirror and exports the latest commit into `~/sokomesh/releases/<date>-<commit>`.
2. **API: dependencies, checks, migrations, admin files**: `uv` installs Python 3.13 and the locked dependencies (a minute or two the first time), Django checks its production settings (`check --deploy`), the API contract is checked against the code, the database tables are created (`migrate`), and the admin's style files are copied (`collectstatic`).
3. **Switching**: `~/sokomesh/current` points at the new release, and PM2 starts the four processes.
4. Waits for `http://127.0.0.1:8000/healthz` to answer; if it does not, it switches back to the previous release.
5. Keeps the last three releases and removes older ones.

**You should see** it end with `Deployed the api at <commit>.` Two warnings from `check --deploy` are expected and harmless: **W008** (NGINX, not Django, redirects HTTP to HTTPS) and **W021** (the domain is deliberately not on the HSTS preload list).

If it stops, it says why (`Deploy stopped: …`) and leaves the running site as it was; see [Troubleshooting](#12-troubleshooting).

From now on, deploy with the script inside the live release, and remove the bootstrap copy:

```bash
rm ~/deploy.sh
echo "alias deploy='~/sokomesh/current/infra/cloudpanel/deploy.sh api'" >> ~/.bashrc
source ~/.bashrc
```

Next time, `deploy` is enough (or `deploy v1.2.0` for a tag, `deploy 2829128` for a commit).

### 7.5 Demo data (optional)

For a portfolio demo, fill the database with the demo marketplace: sellers, buyers, products, stock, orders and their history. **As sokoapi:**

```bash
cd ~/sokomesh/current/backend
DJANGO_SETTINGS_MODULE=config.settings.prod uv run --no-sync python manage.py seed_demo
cd ~
```

It takes a few minutes and ends by printing the demo accounts' shared password. With `AC_DEMO_ACCOUNTS=true`, the sign-in page lists the accounts. Add `--reset` to wipe the demo and seed it again later.

### 7.6 Keep it running after a reboot

The deploy already ran `pm2 save`, which records the running processes. Now tell the server to bring them back at boot. **As sokoapi:**

```bash
echo $PATH
crontab -e
```

Copy the line `echo $PATH` printed. `crontab -e` may ask which editor to use: choose **nano** (usually `1`). At the end of the file, add these lines, pasting your PATH after `PATH=`:

```text
PATH=PASTE-THE-OUTPUT-OF-echo-$PATH
@reboot pm2 resurrect > /dev/null 2>&1
*/15 * * * * cd $HOME/sokomesh/current/backend && DJANGO_SETTINGS_MODULE=config.settings.prod .venv/bin/python manage.py expire_quotes > /dev/null 2>&1
```

Save and exit. The `PATH` line matters: scheduled jobs do not load your shell's settings, so without it they cannot find `pm2` (which lives under `~/.nvm`). The third line expires quotes nobody opened, every 15 minutes. The site's **Cron Jobs** tab in CloudPanel shows the same entries.

PM2's log files grow until they are rotated. Install rotation once:

```bash
pm2 install pm2-logrotate
```

### 7.7 Check the API

**As sokoapi:**

```bash
pm2 status
curl http://127.0.0.1:8000/healthz
```

(Use your API port in place of `8000`.)

**You should see** four processes, all `online`, and `{"status": "ok"}`:

| PM2 process | What it is |
|---|---|
| `sokomesh-api` | Django under uvicorn with two workers, on 127.0.0.1 and the API site's App Port |
| `sokomesh-media` | `process_media`: checks uploaded photographs and makes their display copies |
| `sokomesh-holds` | `expire_reservations`: releases lapsed stock holds and cancels orders left unpaid |
| `sokomesh-relay` | `relay_outbox`: delivers webhooks to integrations, retrying with backoff |

Then, **in your browser**, open `https://api.sokomesh.example.co.ke/healthz`. **You should see** `{"status": "ok"}` with a padlock. The bare address `https://api.sokomesh.example.co.ke/` answers **Not Found**; that is normal, as the API lives under `/api/v1/`.

---

## 8. The web site

Everything in this step runs **as sokoweb**. Log in with `ssh sokoweb@203.0.113.10`. Deploy the API (step 7) first: the web site needs it to show anything.

### 8.1 Install the tools

CloudPanel installed Node.js 24 for this user. Add **pnpm** (at the version `web/package.json` pins) and **PM2**. **As sokoweb:**

```bash
node --version
npm install -g pnpm@11.24.0 pm2@latest
pnpm --version
pm2 --version
```

**You should see** `v24.…`, then `11.24.0` and PM2's version.

### 8.2 Get the code

**As sokoweb:**

```bash
mkdir -p ~/sokomesh/releases ~/sokomesh/shared
git clone --mirror https://github.com/danielmg29/sokomesh.git ~/sokomesh/repo.git
```

### 8.3 The web site's settings

The web site needs only two settings. **As sokoweb:**

```bash
nano ~/sokomesh/shared/.env
```

```ini
# The address visitors use (no slash at the end).
NEXT_PUBLIC_SITE_URL=https://sokomesh.example.co.ke
# Where the Next.js server reads the API: Django on this same server, on the API site's App Port.
API_ORIGIN=http://127.0.0.1:8000
# This site's App Port in CloudPanel (step 5.2).
APP_PORT=3000
```

Save, exit, then:

```bash
chmod 600 ~/sokomesh/shared/.env
```

The first two are built into the site when it is built, so after changing either one, deploy again (step 10).

### 8.4 Send `/api/` to Django: the web site's vhost

In CloudPanel, open the **web** site (`sokomesh.example.co.ke`) and its **Vhost** tab. You will see one `server { … }` block that CloudPanel generated. It already redirects HTTP to HTTPS, keeps `/.well-known/` reachable for certificates, and sends `location /` to `127.0.0.1:{{app_port}}` (this site's App Port). Leave all of that as it is.

Show the block to paste. **As sokoweb:**

```bash
git -C ~/sokomesh/repo.git show main:infra/cloudpanel/vhost-web.conf
```

Copy everything from `location /api/ {` to its closing `}` and paste it **inside the `server` block, on the line above `location / {`**. If your API site's App Port is not 8000, change `8000` on the `proxy_pass` line to it. Click **Save**. CloudPanel tests the configuration and refuses (and keeps the old one) if anything is wrong.

The block sends `/api/…` straight to Django with the headers that tell it the visitor came over HTTPS, and allows uploads up to 26 MB (NGINX's own default is 1 MB, which would refuse product photographs). Without it the site still works, as in development, but every API call and upload takes the longer way through Node.js.

**Check it**, from your computer or the server:

```bash
curl -s -o /dev/null -D - https://sokomesh.example.co.ke/api/v1/session
```

This prints only the answer's headers. **You should see** `HTTP/2 200` and an `x-request-id:` line: that answer came from Django (the web site itself is not running yet, so anything else would be a 502).

### 8.5 First deploy

**As sokoweb:**

```bash
git -C ~/sokomesh/repo.git show main:infra/cloudpanel/deploy.sh > ~/deploy.sh
chmod +x ~/deploy.sh
~/deploy.sh web
```

The stages:

1. **Fetching main**: exports the latest commit into a new release folder.
2. **Web: dependencies and build**: checks the API answers, installs the locked dependencies with pnpm, generates the API client and design tokens from the committed sources, and builds the Next.js server. This takes 3 to 10 minutes depending on the server; it is the step that needs the memory. It runs at a lower CPU priority so the other sites stay responsive, but on a busy server deploy at a quiet time.
3. **Switching**: points `current` at the new release and starts the `sokomesh-web` process.
4. Waits for `http://127.0.0.1:3000/` to answer, or switches back.
5. Keeps the last three releases.

**You should see** `Deployed the web at <commit>.` Then set up the shortcut:

```bash
rm ~/deploy.sh
echo "alias deploy='~/sokomesh/current/infra/cloudpanel/deploy.sh web'" >> ~/.bashrc
source ~/.bashrc
```

### 8.6 Keep it running after a reboot

As in step 7.6, but with only the PM2 line. **As sokoweb:**

```bash
echo $PATH
crontab -e
```

```text
PATH=PASTE-THE-OUTPUT-OF-echo-$PATH
@reboot pm2 resurrect > /dev/null 2>&1
```

Then:

```bash
pm2 install pm2-logrotate
```

### 8.7 Check the web site

**As sokoweb:**

```bash
pm2 status
```

**You should see** `sokomesh-web` `online`. In your browser, open `https://sokomesh.example.co.ke`: **you should see** the storefront with its products (if you seeded the demo in step 7.5), with a padlock. `http://sokomesh.example.co.ke` should redirect to `https://`.

---

## 9. Check everything end to end

Work through this list in a private browser window:

- [ ] The storefront loads over HTTPS; categories and product pages open.
- [ ] **Sign in**: on `/login`, pick a demo buyer (the list appears when `AC_DEMO_ACCOUNTS=true`). Your name appears in the corner.
- [ ] **Order and pay**: add a product to the cart, check out, and on the order page answer the sandbox phone with **Approve**. The order moves from "Awaiting payment" to "Submitted".
- [ ] **Seller side**: sign out, sign in as a demo seller; the order is in **Orders**. Upload a photograph to a product: it shows "Checking", then appears (that tests uploads through `/api/` and the `sokomesh-media` worker).
- [ ] **Administrator**: sign in as the demo administrator and open **Reconciliation**: every check agrees except one webhook delivery that the demo keeps failed on purpose.
- [ ] **Restart test, without rebooting.** Restarting the server would take the other sites down too, so test the restore instead. As sokoapi, then as sokoweb, run `pm2 kill && pm2 resurrect && pm2 status`: every process comes back `online` (SokoMesh is down for a few seconds, the other sites not at all). Also check `crontab -l` shows the `@reboot` line for both users. The next time the server restarts for maintenance, check `pm2 status` for both users afterwards.

### Before real people use it

- Set `AC_DEMO_ACCOUNTS=false` in the API's `.env` (and do not seed demo data), then restart the API: as sokoapi, `pm2 restart all`.
- Set up real email (step 11.4), so sign-ups receive their verification codes.
- Check the web dependencies for published security advisories, and update them before going live. **As sokoweb:** `cd ~/sokomesh/current/web && pnpm audit --prod`.
- Set up PostgreSQL backups (step 4.4) and a certificate-expiry monitor (step 6).

---

## 10. Updating the site later

When new commits are on GitHub's `main`:

1. **API first**, as sokoapi: `deploy`
2. **Then the web site**, as sokoweb: `deploy`

Deploys only restart SokoMesh's own processes; the other sites are never touched. The web build uses a lot of CPU and memory for a few minutes, so on a busy server prefer quiet hours.

Which halves to deploy:

| What changed in the commit | Deploy |
|---|---|
| `backend/` only | the API |
| `web/` or `design/` only | the web site |
| `contract/` (the API's published contract), or you are not sure | both, **API first** |

The web site is built against the committed contract, so when the contract changes the API must be updated first. Each deploy migrates the database **before** switching, so for a few seconds the previous API release runs against the new tables: keep database changes backwards compatible (add a column in one release, remove the old one in a later release).

**Going back** to an earlier version is a deploy of that commit: `deploy <commit>`. Code goes back; database migrations do not, which is why they are kept backwards compatible.

**Changing a setting**:

- API (`/home/sokoapi/sokomesh/shared/.env`): edit it, then as sokoapi `pm2 restart all`.
- Web (`/home/sokoweb/sokomesh/shared/.env`): edit it, then as sokoweb `deploy` (both values are built in).

**Changing the Node.js version** of the web site in CloudPanel changes the folder Node.js lives in: update the `PATH=` line in that user's crontab (step 8.6), then `npm install -g pnpm@11.24.0 pm2@latest` again.

---

## 11. Optional extras

### 11.1 The Django admin

Django's own admin is at `https://api.sokomesh.example.co.ke/admin/`, with its style files served from `AC_STATIC_ROOT`. (The marketplace's administration pages are on the web site; most people never need Django's.) Create a superuser. **As sokoapi:**

```bash
cd ~/sokomesh/current/backend
DJANGO_SETTINGS_MODULE=config.settings.prod uv run --no-sync python manage.py createsuperuser
cd ~
```

Use a long, unique password: this page is public. To restrict it to your own IP address, add above `location / {` in the **API** site's vhost:

```nginx
location /admin/ {
  allow 198.51.100.7;   # your IP address
  deny all;
  proxy_pass http://127.0.0.1:8000;   # the API site's App Port
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 11.2 A private repository: deploy keys

If your copy of the repository is private, the server needs a **deploy key**: an SSH key that GitHub attaches to one repository, read-only. Each site user makes its own; a repository can hold several deploy keys, but one key can only be added to one repository.

**As sokoapi, and again as sokoweb:**

```bash
ssh-keygen -t ed25519 -C "sokomesh-$(whoami)@$(hostname)" -f ~/.ssh/sokomesh_deploy -N ""
cat ~/.ssh/sokomesh_deploy.pub
```

On GitHub, open the repository's **Settings → Deploy keys → Add deploy key**, give it a title (such as `server sokoapi`), paste the public key, and leave **Allow write access** unticked.

Point SSH at the key with a host alias. **As each user**, `nano ~/.ssh/config` and add:

```text
Host github.com-sokomesh
  HostName github.com
  User git
  IdentityFile ~/.ssh/sokomesh_deploy
  IdentitiesOnly yes
```

Trust GitHub's host key, and compare its fingerprint with the one on [GitHub's SSH key fingerprints page](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints) (`SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU` at the time of writing):

```bash
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
ssh-keygen -lf ~/.ssh/known_hosts | grep github.com
ssh -T github.com-sokomesh
```

**You should see** `Hi <owner>/<repository>! You've successfully authenticated, but GitHub does not provide shell access.` Then clone with the alias instead of the HTTPS address in steps 7.2 and 8.2:

```bash
git clone --mirror git@github.com-sokomesh:<owner>/<repository>.git ~/sokomesh/repo.git
```

(GitHub no longer accepts account passwords for Git; use SSH as above, or HTTPS with a fine-grained token.)

### 11.3 Deploying from GitHub Actions

To deploy on every push without giving CI a shell on the server, add a key to each site user that can only run that user's deploy. In each user's `~/.ssh/authorized_keys` (edit with nano), add one line:

```text
command="/home/sokoapi/sokomesh/current/infra/cloudpanel/deploy.sh api main",restrict ssh-ed25519 AAAA… github-actions-api
```

```text
command="/home/sokoweb/sokomesh/current/infra/cloudpanel/deploy.sh web main",restrict ssh-ed25519 AAAA… github-actions-web
```

Store the private keys and the server's host-key line as repository secrets, and have the workflow connect as `sokoapi` first, then `sokoweb`, with `ssh -i <key> -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<file>`. Whatever the job sends, the server runs only the deploy. GitHub's hosted runners connect from many changing addresses, so if CloudPanel's firewall only lets certain addresses reach port 22, use a self-hosted runner or one with a fixed address.

### 11.4 Real email with Brevo

In Brevo, verify a sender address on your domain and create an API key. In the API's `.env`, uncomment and fill:

```ini
BREVO_API_KEY=PASTE-THE-KEY
BREVO_SENDER_EMAIL=SokoMesh <no-reply@sokomesh.example.co.ke>
```

`BREVO_SENDER_EMAIL` may be a bare address or `Name <address>`; the address must be one Brevo has verified. Then, as sokoapi, `pm2 restart all`. A failed send never breaks a sign-up; it is logged (`pm2 logs sokomesh-api`, look for `Email to … failed`).

### 11.5 Moving the API to its own server later

Because the halves are separate sites, the API can move to another server. On the web site, set `API_ORIGIN=https://api.sokomesh.example.co.ke` and redeploy, and in its vhost change the block's `proxy_pass` to `https://api.sokomesh.example.co.ke`, adding `proxy_ssl_server_name on;` and `proxy_set_header Host api.sokomesh.example.co.ke;`. On the API server, give its vhost the same `client_max_body_size 26m;`, and have its NGINX trust the web server's address for the visitor's IP (`set_real_ip_from <web server IP>; real_ip_header X-Forwarded-For;`), or sign-in rate limits would treat every visitor as the web server.

---

## 12. Troubleshooting

### Where to look

| What | Command |
|---|---|
| Is everything running? | `pm2 status` (as the site's user) |
| The last lines a process printed | `pm2 logs sokomesh-api --lines 100` (or `sokomesh-web`, `sokomesh-media`, …) |
| NGINX's view of requests | The site's **Logs** tab in CloudPanel |
| Which release is live | `readlink ~/sokomesh/current` |
| Restart a site's processes | `pm2 restart all` (as that site's user) |

### Common problems

| What you see | Usual cause | What to do |
|---|---|---|
| `502 Bad Gateway` on the main domain | `sokomesh-web` is not running, or `APP_PORT` in the web `.env` differs from the site's App Port | As sokoweb: `pm2 status`, `pm2 logs sokomesh-web --lines 50`; compare the two ports |
| `502 Bad Gateway` on `api.…` | `sokomesh-api` is not running, or `APP_PORT` in the API `.env` differs from the site's App Port | As sokoapi: `pm2 status`, `pm2 logs sokomesh-api --lines 50`; compare the two ports |
| A process keeps restarting, and its log says `address already in use` or `EADDRINUSE` | Another site already uses that port | Choose a free port (step 2.3), set it as the site's App Port in CloudPanel and as `APP_PORT` in the `.env` (and in the web vhost's `/api/` block for the API), then deploy again |
| The storefront says the catalogue is unavailable | The API is down, or `API_ORIGIN` in the web `.env` has the wrong port | As sokoweb: `curl http://127.0.0.1:8000/healthz` (with the API's port) |
| `Bad Request (400)`, or `DisallowedHost` in the API log | The address is missing from `DJANGO_ALLOWED_HOSTS` | Add the host the log names, then as sokoapi `pm2 restart all` |
| Sign-in or checkout fails with `CSRF` or `Forbidden (403)` | The web address is missing from `DJANGO_CSRF_TRUSTED_ORIGINS`, or written without `https://` | Fix it, then as sokoapi `pm2 restart all` |
| The headers from `…/api/v1/session` (step 8.4) have no `x-request-id` | The `/api/` block is not in the web site's vhost | Step 8.4 |
| Photo uploads fail with `413` | The `/api/` block (with its upload limit) is missing | Step 8.4 |
| Deploy stops: `uv is not installed` or `pnpm is not installed` | The tool is missing for this user, or the shell has not been restarted | Step 7.1 or 8.1, then `exec $SHELL -l` |
| Deploy stops at `contract check` | `AC_AUTH_MODE` or `AC_VERIFY` was added to the API's `.env`, or the commit is mid-change | Remove those settings; deploy a commit where the contract was regenerated |
| Deploy stops at `migrate`, with `password authentication failed` or `could not connect` | Wrong password or port in `DATABASE_URL`, or PostgreSQL is not running | Run the `psql` check from step 4.2; as root `pg_lsclusters` |
| `PostgreSQL 15 or later is required` | `DATABASE_URL` points at an older PostgreSQL | Use the PostgreSQL 17 cluster's port (step 4.1, case B) |
| Django fails to start with `NOAUTH Authentication required` | Redis has a password that `REDIS_URL` lacks | Step 4.3, case B |
| The web build is `Killed`, or says `heap out of memory` | Not enough memory | Add swap (step 2.4), or use a larger server |
| After a server restart, SokoMesh is not running (the other sites are) | The `@reboot` line or the `PATH=` line is missing from that user's crontab | Steps 7.6 and 8.6; then `pm2 resurrect` |
| The other sites slow down during a deploy | The web build needs CPU and memory for a few minutes | Deploy at quiet times; add swap (step 2.4) |
| Photographs stay "Checking" | The media worker is stopped or failing | As sokoapi: `pm2 logs sokomesh-media` |
| An order stays "Awaiting payment" | Nobody answered the sandbox phone on the order page | Answer it; after 15 minutes `sokomesh-holds` releases the stock and cancels the order |
| The Django admin has no styling | `AC_STATIC_ROOT` is not inside the API site's root directory | Fix it (step 7.3), then as sokoapi `deploy` |
| No emails arrive | Brevo is not set up, or its sender is not verified | Step 11.4; look for `Email to … failed` in `pm2 logs sokomesh-api` |
| Let's Encrypt fails | DNS does not point at this server yet, port 80 is closed, or Cloudflare's proxy is on | `nslookup` (step 2.5), the firewall (step 3), grey cloud |

---

## Sources

- CloudPanel v2: [requirements](https://www.cloudpanel.io/docs/v2/requirements/), [installation](https://www.cloudpanel.io/docs/v2/getting-started/other/), [adding sites](https://www.cloudpanel.io/docs/v2/frontend-area/add-site/), [Node.js with PM2](https://www.cloudpanel.io/docs/v2/nodejs/deployment/pm2/), [Python](https://www.cloudpanel.io/docs/v2/python/deployment/uwsgi/), [vhost templates](https://github.com/cloudpanel-io/vhost-templates/tree/master/v2) (Python and Node.js), [Vhost](https://www.cloudpanel.io/docs/v2/frontend-area/vhost/), [SSL/TLS](https://www.cloudpanel.io/docs/v2/frontend-area/tls/), [SSH/FTP](https://www.cloudpanel.io/docs/v2/frontend-area/ssh-ftp/), [security](https://www.cloudpanel.io/docs/v2/admin-area/security/), [root CLI commands](https://www.cloudpanel.io/docs/v2/cloudpanel-cli/root-user-commands/), [changelog](https://www.cloudpanel.io/docs/v2/changelog/)
- GitHub: [managing deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys), [GitHub's SSH key fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
- Let's Encrypt: [ending expiration emails](https://letsencrypt.org/2025/01/22/ending-expiration-emails/), [from 90 to 45 days](https://isrg.org/post/from-90-to-45/)
- [PostgreSQL apt repository](https://www.postgresql.org/download/linux/ubuntu/), [uv installation](https://docs.astral.sh/uv/getting-started/installation/), [nvm](https://github.com/nvm-sh/nvm), Next.js `output: 'standalone'` (`web/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`)
