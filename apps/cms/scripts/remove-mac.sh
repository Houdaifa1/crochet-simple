#!/bin/sh
# Stops the admin from starting at login and turns off the nightly backup. Content and backups are kept.
for job in admin backup; do
  launchctl bootout "gui/$(id -u)/com.crochetsimple.$job" 2>/dev/null || true
  rm -f "$HOME/Library/LaunchAgents/com.crochetsimple.$job.plist"
done
echo "Removed. Your content, files and backups are untouched."
