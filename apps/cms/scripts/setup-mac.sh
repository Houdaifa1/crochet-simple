#!/bin/sh
# One-time setup on the owner's Mac: builds the admin, then starts it at login and backs up every night.
set -e
CMS="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs/Crochet Simple"
mkdir -p "$AGENTS" "$LOGS" "$CMS/data" "$CMS/media"

if [ ! -f "$CMS/.env" ] || ! grep -q '^PAYLOAD_SECRET=.\+' "$CMS/.env"; then
  printf 'PAYLOAD_SECRET=%s\nDATABASE_URL=file:./data/cms.db\n' "$("$NODE" -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" > "$CMS/.env"
fi

echo "Building the admin (about a minute)..."
(cd "$CMS" && "$NODE" node_modules/next/dist/bin/next build > "$LOGS/build.log" 2>&1) || { echo "Build failed, see $LOGS/build.log"; exit 1; }

cat > "$AGENTS/com.crochetsimple.admin.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.crochetsimple.admin</string>
  <key>WorkingDirectory</key><string>$CMS</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string><string>node_modules/next/dist/bin/next</string><string>start</string>
    <string>--hostname</string><string>127.0.0.1</string><string>--port</string><string>3000</string>
  </array>
  <key>EnvironmentVariables</key><dict><key>NODE_ENV</key><string>production</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOGS/admin.log</string>
  <key>StandardErrorPath</key><string>$LOGS/admin.log</string>
</dict></plist>
PLIST

cat > "$AGENTS/com.crochetsimple.backup.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.crochetsimple.backup</string>
  <key>WorkingDirectory</key><string>$CMS</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string><string>--experimental-strip-types</string><string>--env-file=.env</string><string>scripts/backup.ts</string>
  </array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$LOGS/backup.log</string>
  <key>StandardErrorPath</key><string>$LOGS/backup.log</string>
</dict></plist>
PLIST

for job in admin backup; do
  launchctl bootout "gui/$(id -u)/com.crochetsimple.$job" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$AGENTS/com.crochetsimple.$job.plist"
done
echo "Done. The admin runs at http://127.0.0.1:3000/admin and starts by itself when you log in."
echo "Backups go to ${BACKUP_DIR:-$HOME/Crochet Simple Backups} every night at 3:00 and on every publish."
