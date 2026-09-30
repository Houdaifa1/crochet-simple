#!/bin/sh
# Saves the Cloudflare API token from the clipboard into .env (never into git or the website).
set -e
ENV="$(cd "$(dirname "$0")/.." && pwd)/.env"
KEY="$(pbpaste | tr -d '[:space:]')"
if [ "${#KEY}" -lt 30 ]; then echo "Copy the Cloudflare API token first, then run this again."; exit 1; fi
touch "$ENV"
grep -v '^CLOUDFLARE_API_TOKEN=' "$ENV" > "$ENV.tmp" || true
printf 'CLOUDFLARE_API_TOKEN=%s\n' "$KEY" >> "$ENV.tmp"
mv "$ENV.tmp" "$ENV"
chmod 600 "$ENV"
echo "Saved. Restart the admin (or run setup:mac again) so Publish can put the site online."
