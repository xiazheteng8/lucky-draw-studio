#!/usr/bin/env bash
set -euo pipefail
APP_NAME=youtube-giveaway-studio
APP_DIR=/opt/$APP_NAME
APP_USER=$APP_NAME
SERVICE=/etc/systemd/system/$APP_NAME.service
SITE=/etc/nginx/sites-available/$APP_NAME
fail(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ $(id -u) -eq 0 ]] || fail 'run as root on the target Linux host'
[[ $(uname -s) == Linux ]] || fail 'Linux is required'
command -v node >/dev/null || fail 'Node.js is required'; command -v npm >/dev/null || fail 'npm is required'
node -e "const [a]=process.versions.node.split('.').map(Number);process.exit(a>=20?0:1)" || fail 'Node.js 20 or newer is required'
command -v systemctl >/dev/null || fail 'systemd is required'
[[ ! -e "$APP_DIR" ]] || fail "$APP_DIR already exists; refusing to overwrite an existing application"
[[ ! -e "$SERVICE" ]] || fail "$SERVICE already exists; refusing to replace a service"
[[ ! -e "$SITE" ]] || fail "$SITE already exists; refusing to replace an nginx site"
if command -v ss >/dev/null && ss -ltn | grep -qE ':(3000)\b'; then fail 'port 3000 is already listening'; fi
id "$APP_USER" >/dev/null 2>&1 && fail "user $APP_USER already exists; inspect it before installing"
getent passwd 0 | grep -q "^$APP_USER:" && fail 'refusing root-equivalent service user'
useradd --system --create-home --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$APP_DIR" "$APP_DIR/data"
tar --exclude='./node_modules' --exclude='./data' --exclude='./.env' -cf - . | tar -C "$APP_DIR" -xf -
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
cd "$APP_DIR"; npm ci --omit=dev
install -o root -g root -m 0644 deploy/youtube-giveaway.service "$SERVICE"
install -o root -g root -m 0644 deploy/nginx.conf "$SITE"
install -o "$APP_USER" -g "$APP_USER" -m 0600 .env.example .env
systemctl daemon-reload
printf '%s\n' 'Installed without enabling nginx or starting/enabling the service.' 'Next: edit /opt/youtube-giveaway-studio/.env, inspect the service/site, run nginx -t, enable the site manually, then systemctl enable --now youtube-giveaway-studio.' 'Restore: stop service; copy a verified backup sqlite file to data/giveaway.sqlite as the service user; start service.'