#!/usr/bin/env bash
# Interactive Ubuntu host bootstrap for LinkForty self-host (no Coolify).
# Run as sudo-capable user from anywhere:
#   bash deploy/selfhost/bootstrap.sh
# Keep a second SSH session open before enabling SSH password lock.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run as normal user with sudo, not as root."
  exit 1
fi

if [[ ! -f "$REPO_ROOT/docker-compose.selfhost.yml" ]]; then
  echo "Cannot find docker-compose.selfhost.yml at $REPO_ROOT"
  exit 1
fi

# --- helpers ---
prompt() {
  # prompt VAR "Label" "default"
  local __var="$1" __label="$2" __default="${3:-}"
  local __val=""
  if [[ -n "$__default" ]]; then
    read -r -p "$__label [$__default]: " __val || true
    __val="${__val:-$__default}"
  else
    while [[ -z "${__val}" ]]; do
      read -r -p "$__label: " __val || true
      [[ -z "$__val" ]] && echo "  required."
    done
  fi
  printf -v "$__var" '%s' "$__val"
}

prompt_secret() {
  # prompt_secret VAR "Label"
  local __var="$1" __label="$2" __a="" __b=""
  while true; do
    read -r -s -p "$__label: " __a
    echo
    [[ -n "$__a" ]] || { echo "  required."; continue; }
    [[ ${#__a} -ge 12 ]] || { echo "  min 12 characters."; continue; }
    read -r -s -p "Confirm $__label: " __b
    echo
    [[ "$__a" == "$__b" ]] && break
    echo "  mismatch — try again."
  done
  printf -v "$__var" '%s' "$__a"
}

prompt_yn() {
  # prompt_yn VAR "Label" "y|n default"
  local __var="$1" __label="$2" __default="$3" __val=""
  local __hint="y/N"
  [[ "$__default" == "y" ]] && __hint="Y/n"
  read -r -p "$__label [$__hint]: " __val || true
  if [[ -z "$__val" ]]; then
    __val="$__default"
  fi
  case "$(printf '%s' "$__val" | tr '[:upper:]' '[:lower:]')" in
    y|yes) printf -v "$__var" 'y' ;;
    *) printf -v "$__var" 'n' ;;
  esac
}

b64_bcrypt() {
  LF_ADMIN_PASS="$1" python3 - <<'PY'
import os, base64, bcrypt
pw = os.environ["LF_ADMIN_PASS"].encode()
h = bcrypt.hashpw(pw, bcrypt.gensalt(rounds=12))
print(base64.b64encode(h).decode())
PY
}

echo "=============================================="
echo " LinkForty self-host interactive bootstrap"
echo " Repo: $REPO_ROOT"
echo "=============================================="
echo

# --- interactive config ---
prompt SHORTLINK_DOMAIN "Shortlink domain (Core)" "links.example.com"
prompt DASHBOARD_DOMAIN "Dashboard domain" "dashboard.example.com"
prompt LE_EMAIL "Let's Encrypt email" "admin@example.com"
prompt ADMIN_USERNAME "Dashboard admin username" "admin"
prompt_secret ADMIN_PASSWORD "Dashboard admin password"
prompt POSTGRES_USER "Postgres user" "linkforty"
prompt POSTGRES_DB "Postgres database" "linkforty"
prompt SSH_ALLOW_USER "SSH AllowUsers (for later harden)" "$USER"

prompt_yn DO_HOST "Install/harden host (Docker, Caddy, UFW, fail2ban)?" "y"
prompt_yn DO_ENV "Write .env + generate secrets?" "y"
prompt_yn DO_CADDY "Install Caddyfile to /etc/caddy/Caddyfile?" "y"
prompt_yn DO_COMPOSE "Build & start docker compose stack now?" "y"
prompt_yn DO_SSH "Write SSH harden config (PasswordAuthentication no)?" "n"

echo
echo "--- Summary ---"
echo "  Shortlinks : https://$SHORTLINK_DOMAIN"
echo "  Dashboard  : https://$DASHBOARD_DOMAIN"
echo "  LE email   : $LE_EMAIL"
echo "  Admin user : $ADMIN_USERNAME"
echo "  Host setup : $DO_HOST"
echo "  Write .env : $DO_ENV"
echo "  Caddyfile  : $DO_CADDY"
echo "  Compose up : $DO_COMPOSE"
echo "  SSH lock   : $DO_SSH"
echo
prompt_yn CONFIRM "Proceed?" "y"
[[ "$CONFIRM" == "y" ]] || { echo "Aborted."; exit 0; }

# --- host packages ---
if [[ "$DO_HOST" == "y" ]]; then
  echo
  echo "==> Packages"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates curl gnupg git ufw fail2ban unattended-upgrades \
    openssl uuid-runtime python3 python3-bcrypt \
    debian-keyring debian-archive-keyring apt-transport-https

  echo "==> Unattended security upgrades"
  sudo dpkg-reconfigure -plow unattended-upgrades || true
  sudo tee /etc/apt/apt.conf.d/51unattended-upgrades-linkforty >/dev/null <<'EOF'
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

  echo "==> Docker"
  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sudo sh
  fi
  sudo usermod -aG docker "$USER"
  sudo systemctl enable --now docker

  echo "==> Caddy"
  if ! command -v caddy >/dev/null 2>&1; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
      | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
      | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y caddy
  fi
  sudo systemctl enable --now caddy

  echo "==> UFW (SSH + HTTP/HTTPS only)"
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow OpenSSH
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
  sudo ufw status verbose

  echo "==> fail2ban (sshd)"
  sudo tee /etc/fail2ban/jail.local >/dev/null <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
mode = aggressive
EOF
  sudo systemctl enable --now fail2ban
  sudo fail2ban-client status sshd || true
else
  if [[ "$DO_ENV" == "y" ]] && ! python3 -c "import bcrypt" 2>/dev/null; then
    sudo apt-get update -y
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-bcrypt openssl uuid-runtime
  fi
fi

# --- .env ---
if [[ "$DO_ENV" == "y" ]]; then
  ENV_FILE="$REPO_ROOT/.env"
  if [[ -f "$ENV_FILE" ]]; then
    prompt_yn OVERWRITE_ENV ".env exists — overwrite?" "n"
    if [[ "$OVERWRITE_ENV" != "y" ]]; then
      echo "Keeping existing .env"
      DO_ENV=n
    fi
  fi
fi

if [[ "$DO_ENV" == "y" ]]; then
  echo "==> Generating secrets + writing .env"
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  REDIS_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  AUTH_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  OPERATOR_USER_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  ADMIN_PASSWORD_HASH_B64="$(b64_bcrypt "$ADMIN_PASSWORD")"

  umask 077
  cat > "$REPO_ROOT/.env" <<EOF
# Generated by deploy/selfhost/bootstrap.sh — $(date -u +%Y-%m-%dT%H:%MZ)
# Do not commit.

CORS_ORIGIN=https://${DASHBOARD_DOMAIN}
AUTH_URL=https://${DASHBOARD_DOMAIN}
SHORTLINK_BASE_URL=https://${SHORTLINK_DOMAIN}
SHORTLINK_DOMAIN=${SHORTLINK_DOMAIN}
CORE_URL=http://linkforty:3000
TRUST_PROXY=1

POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

REDIS_PASSWORD=${REDIS_PASSWORD}

JWT_SECRET=${JWT_SECRET}

AUTH_SECRET=${AUTH_SECRET}
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD_HASH_B64=${ADMIN_PASSWORD_HASH_B64}
OPERATOR_USER_ID=${OPERATOR_USER_ID}
EOF
  chmod 600 "$REPO_ROOT/.env"
  echo "  wrote $REPO_ROOT/.env (mode 600)"
fi

ADMIN_PASSWORD=""

# --- Caddyfile.generated (from prompts — not committed) ---
CADDY_OUT="$REPO_ROOT/deploy/selfhost/Caddyfile.generated"
cat > "$CADDY_OUT" <<EOF
# Generated by bootstrap.sh — $(date -u +%Y-%m-%dT%H:%MZ)
# Domains from interactive prompts. Installed to /etc/caddy/Caddyfile when you answer y.

{
	email ${LE_EMAIL}
}

# Shortlinks + public API
${SHORTLINK_DOMAIN} {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		Permissions-Policy "geolocation=(), microphone=(), camera=()"
		-Server
	}

	@blocked path /.env /.git* /wp-admin* /xmlrpc.php
	respond @blocked 404

	reverse_proxy 127.0.0.1:3000 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
	}
}

# Operator dashboard
${DASHBOARD_DOMAIN} {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy strict-origin-when-cross-origin
		Permissions-Policy "geolocation=(), microphone=(), camera=()"
		Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' wss: https:; frame-ancestors 'none'"
		-Server
	}

	@blocked path /.env /.git* /wp-admin* /xmlrpc.php
	respond @blocked 404

	reverse_proxy 127.0.0.1:3001 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
	}
}
EOF
echo "  wrote $CADDY_OUT"

if [[ "$DO_CADDY" == "y" ]]; then
  echo "==> Installing Caddyfile → /etc/caddy/Caddyfile"
  sudo cp "$CADDY_OUT" /etc/caddy/Caddyfile
  sudo caddy validate --config /etc/caddy/Caddyfile
  sudo systemctl reload caddy
  echo "  Caddy reloaded (TLS for ${SHORTLINK_DOMAIN} + ${DASHBOARD_DOMAIN})"
fi

# --- compose ---
if [[ "$DO_COMPOSE" == "y" ]]; then
  if [[ ! -f "$REPO_ROOT/.env" ]]; then
    echo "ERROR: .env missing — cannot start compose. Re-run with Write .env = y"
    exit 1
  fi
  echo "==> docker compose up --build -d"
  if groups | grep -qw docker 2>/dev/null || [[ -w /var/run/docker.sock ]]; then
    docker compose -f "$REPO_ROOT/docker-compose.selfhost.yml" --env-file "$REPO_ROOT/.env" up --build -d
  else
    echo "  docker group not active in this shell — using sudo"
    sudo docker compose -f "$REPO_ROOT/docker-compose.selfhost.yml" --env-file "$REPO_ROOT/.env" up --build -d
  fi
  echo "  waiting for health..."
  for i in $(seq 1 36); do
    if curl -sfS "http://127.0.0.1:3000/api/sdk/v1/health" >/dev/null 2>&1 \
      && curl -sfS -o /dev/null "http://127.0.0.1:3001/login" 2>/dev/null; then
      echo "  Core + Dashboard responding on localhost"
      break
    fi
    sleep 5
    echo "  ... still starting ($i)"
  done
fi

# --- SSH harden (optional, dangerous) ---
if [[ "$DO_SSH" == "y" ]]; then
  echo "==> Writing SSH harden config"
  echo "WARNING: PasswordAuthentication will be disabled. Confirm key login in another session first."
  prompt_yn SSH_CONFIRM "I have a working SSH key session open — continue?" "n"
  if [[ "$SSH_CONFIRM" == "y" ]]; then
    sudo tee /etc/ssh/sshd_config.d/99-linkforty.conf >/dev/null <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers ${SSH_ALLOW_USER}
X11Forwarding no
AllowTcpForwarding no
EOF
    sudo sshd -t
    sudo systemctl reload ssh
    echo "  SSH hardened for AllowUsers=${SSH_ALLOW_USER}"
  else
    echo "  skipped SSH harden"
  fi
else
  cat <<EOF

SSH harden later (after key login works):

  sudo tee /etc/ssh/sshd_config.d/99-linkforty.conf >/dev/null <<'SSH'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers ${SSH_ALLOW_USER}
X11Forwarding no
AllowTcpForwarding no
SSH
  sudo sshd -t && sudo systemctl reload ssh

EOF
fi

echo
echo "=============================================="
echo " Done"
echo "=============================================="
echo "  Dashboard : https://${DASHBOARD_DOMAIN}"
echo "  Shortlinks: https://${SHORTLINK_DOMAIN}"
echo "  Health    : https://${SHORTLINK_DOMAIN}/api/sdk/v1/health"
echo "  Login     : https://${DASHBOARD_DOMAIN}/login"
echo "  User      : ${ADMIN_USERNAME}"
echo "  .env      : $REPO_ROOT/.env"
if [[ "$DO_HOST" == "y" ]]; then
  echo
  echo "  Log out / in once so 'docker' group applies without sudo."
fi
echo
echo "  DNS must point both domains at this server before TLS works."
echo
