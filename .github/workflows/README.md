nonbonk – README (app + server + CI deploy)

This doc explains how to develop, build, and deploy a Vite + Vue + TypeScript app to a tiny Debian VPS using rsync and GitHub Actions. It also covers SSH keys, a safer deploy user, nginx, and etckeeper.

⸻

TL;DR – copy/paste scripts

Read once before you run. Adjust placeholders in ALL CAPS. These are idempotent-ish but still powerful. Run server-side blocks on the VPS. Run local blocks on your Mac.

A) First-time server setup (create deploy user, SSH key, web root, nginx)

# --- run on the SERVER (as root) ---
set -euxo pipefail

# 0) variables – change these
APP_DOMAIN="nonbonk.com"
WEBROOT="/var/www/${APP_DOMAIN}"
DEPLOY_USER="deploy"
DEPLOY_PUBKEY="ssh-ed25519 AAAA...CI_PUBLIC_KEY... github-actions-nonbonk"  # paste your .pub here

# 1) create deploy user if missing
id -u "$DEPLOY_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$DEPLOY_USER"
mkdir -p /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
if ! grep -q "${DEPLOY_PUBKEY}" /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null; then
  echo "$DEPLOY_PUBKEY" >> /home/$DEPLOY_USER/.ssh/authorized_keys
fi
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh

# 2) web root and perms
mkdir -p "$WEBROOT"
chown -R $DEPLOY_USER:www-data "$WEBROOT"
chmod -R 755 "$WEBROOT"

# 3) nginx install + simple SPA config
apt-get update
apt-get install -y nginx
cat >/etc/nginx/sites-available/${APP_DOMAIN} <<EOF
server {
    listen 80;
    server_name ${APP_DOMAIN} www.${APP_DOMAIN};

    root ${WEBROOT};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|mjs|woff2|woff|ttf|eot|ico|png|jpg|jpeg|gif|svg)$ {
        try_files $uri =404;
        access_log off;
    }
}
EOF
ln -sf /etc/nginx/sites-available/${APP_DOMAIN} /etc/nginx/sites-enabled/${APP_DOMAIN}
nginx -t
systemctl reload nginx

# 4) optional – certbot for https
# apt-get install -y certbot python3-certbot-nginx
# certbot --nginx -d ${APP_DOMAIN} -d www.${APP_DOMAIN}

# 5) sanity
ls -la "$WEBROOT"

B) Local one-command deploy (build + rsync)

# --- run on your MAC (in the vite app folder) ---
set -euxo pipefail

# adjust these if you do not use an SSH alias
SSH_HOST="45.76.92.129"
SSH_USER="deploy"     # or root if you insist
REMOTE_PATH="/var/www/nonbonk.com"

# build production and deploy
pnpm install
pnpm build
rsync -avz --delete -e "ssh -p 22" dist/ "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/"

C) Minimal GitHub Actions workflow (push to main builds and rsyncs)

Create .github/workflows/deploy.yml:

name: Build & Deploy (Vite Vue TS)

on:
  push:
    branches: [ "main" ]
  workflow_dispatch:

defaults:
  run:
    working-directory: myapp   # change if your app folder differs

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    env:
      HOST: ${{ vars.SSH_HOST || secrets.SSH_HOST }}
      PORT: ${{ vars.SSH_PORT || secrets.SSH_PORT }}
      USER: ${{ vars.SSH_USER || secrets.SSH_USER }}
      REMOTE_PATH: ${{ vars.REMOTE_PATH || secrets.REMOTE_PATH }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
          run_install: true

      - name: Build
        run: pnpm build

      - name: Sanity check CI inputs
        run: |
          set -euxo pipefail
          : "${HOST:=}"; : "${PORT:=}"; : "${USER:=}"; : "${REMOTE_PATH:=}"
          HOST="$(printf %s "$HOST" | tr -d '\r' | sed -e 's/[[:space:]]\+$//')"
          PORT="$(printf %s "$PORT" | tr -d '\r' | sed -e 's/[[:space:]]\+$//')"
          USER="$(printf %s "$USER" | tr -d '\r' | sed -e 's/[[:space:]]\+$//')"
          REMOTE_PATH="$(printf %s "$REMOTE_PATH" | tr -d '\r' | sed -e 's/[[:space:]]\+$//')"
          if [ -n "$PORT" ] && ! echo "$PORT" | grep -Eq '^[0-9]+$'; then echo "PORT is not numeric: '$PORT'"; exit 1; fi
          echo "HOST=${HOST:-<empty>}"; echo "PORT=${PORT:-<empty>}"; echo "USER=${USER:-<empty>}"; echo "REMOTE_PATH=${REMOTE_PATH:-<empty>}"
          if [ -z "$HOST" ] || [ -z "$USER" ] || [ -z "$REMOTE_PATH" ]; then echo "Missing SSH vars"; exit 1; fi
          if [ -z "$PORT" ]; then PORT=22; fi
          {
            echo "PORT=$PORT"; echo "HOST=$HOST"; echo "USER=$USER"; echo "REMOTE_PATH=$REMOTE_PATH"
          } >> "$GITHUB_ENV"

      - name: Add SSH key
        run: |
          set -euxo pipefail
          install -m 700 -d ~/.ssh
          cat > ~/.ssh/id_ed25519 <<'EOF'
          ${{ secrets.SSH_KEY }}
          EOF
          sed -i 's/\r$//' ~/.ssh/id_ed25519
          [ -s ~/.ssh/id_ed25519 ] || { echo "SSH_KEY is empty"; exit 1; }
          chmod 600 ~/.ssh/id_ed25519
          echo "Scanning host key for $HOST:$PORT"
          ssh-keyscan -p "${PORT}" "${HOST}" > ~/.ssh/known_hosts

      - name: Deploy dist/ via rsync
        run: |
          set -euxo pipefail
          rsync -avz --delete \
            -e "ssh -p ${PORT} -i ~/.ssh/id_ed25519" \
            dist/ "${USER}@${HOST}:${REMOTE_PATH}/"

Set repo Actions variables and secret:

Variables:

SSH_HOST=45.76.92.129
SSH_PORT=22
SSH_USER=deploy
REMOTE_PATH=/var/www/nonbonk.com

Secret:

SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
<your CI private key contents>
-----END OPENSSH PRIVATE KEY-----


⸻

Project layout

App lives in myapp/ (change names as you like):

myapp/
  src/
  public/
  index.html
  vite.config.ts
  tsconfig*.json
  package.json
  pnpm-lock.yaml

.gitignore starter:

node_modules/
dist/
.env
.env.*
!.env.example
.vscode/
.DS_Store


⸻

Local development

# inside myapp/
pnpm install
pnpm dev   # http://localhost:5173

Build preview:

pnpm build
pnpm preview


⸻

Deploy strategies

Simple local deploy (manual)

pnpm build
rsync -avz --delete -e "ssh -p 22" dist/ deploy@45.76.92.129:/var/www/nonbonk.com/

Automated CI deploy (recommended)
	•	On push to main the workflow builds and rsyncs dist/ to the server.
	•	Ensure the public part of the CI keypair is in the server user’s ~/.ssh/authorized_keys.

⸻

SSH keys and users
	•	Generate a dedicated CI keypair on your Mac:

ssh-keygen -t ed25519 -f ~/.ssh/nonbonk_deploy -C "github-actions-nonbonk" -N ""


	•	Put the private key into the GitHub secret SSH_KEY.
	•	Put the public key contents (nonbonk_deploy.pub) into the server user’s ~/.ssh/authorized_keys.

Safer deploy user:

# server
useradd -m -s /bin/bash deploy || true
mkdir -p /home/deploy/.ssh; chmod 700 /home/deploy/.ssh
cat nonbonk_deploy.pub >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chown -R deploy:www-data /var/www/nonbonk.com

sshd basics on the server (/etc/ssh/sshd_config):

PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitRootLogin prohibit-password  # or yes if needed
# PasswordAuthentication no         # only after key login works

Reload:

systemctl reload ssh


⸻

nginx config template (SPA)

/etc/nginx/sites-available/nonbonk.com:

server {
    listen 80;
    server_name nonbonk.com www.nonbonk.com;

    root /var/www/nonbonk.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|mjs|woff2|woff|ttf|eot|ico|png|jpg|jpeg|gif|svg)$ {
        try_files $uri =404;
        access_log off;
    }
}

Enable and reload:

ln -sf /etc/nginx/sites-available/nonbonk.com /etc/nginx/sites-enabled/nonbonk.com
nginx -t && systemctl reload nginx

HTTPS via certbot (optional):

apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d nonbonk.com -d www.nonbonk.com


⸻

etckeeper (what and why)

etckeeper turns /etc into a Git repo with auto-commits on package operations. Great for auditing config drift.

apt-get update && apt-get install -y etckeeper
cd /etc && git status && git log --oneline -n 10
# commit your edits explicitly when you change nginx:
cd /etc && git add nginx/sites-available/nonbonk.com && git commit -m "nginx: update nonbonk.com"

Do not push /etc to a public repo. If you back it up, use a private remote.

⸻

Troubleshooting quick list
	•	CI says SSH_KEY is empty: check the secret value name and content. Use a here-doc secret with exact BEGIN/END lines.
	•	CI says Bad port '-i': your SSH_PORT variable was empty. Set it to 22 or hardcode in the workflow.
	•	CI rsync Permission denied (publickey): the public key does not match what the workflow uses or is not under the correct user on the server.
	•	ssh prompts for password when testing: server is not accepting the key. Re-add .pub to ~/.ssh/authorized_keys, fix perms (700 dir, 600 file), reload ssh.
	•	404s on SPA routes: missing try_files ... /index.html; in nginx.
	•	White page after deploy: cache from old assets. Vite already hashes filenames, so a hard refresh usually fixes. If nginx caches aggressively, review headers.

⸻

Future improvements
	•	Add a staging environment with a second site and another set of Actions variables.
	•	Use an infra repo to store nginx templates and small scripts, plus a manual workflow to push config changes.
	•	Consider a rollbacks folder on the server to snapshot previous dist/ releases.