#!/usr/bin/env bash
set -euo pipefail
SRC=/opt/youtube-giveaway-studio/data/giveaway.sqlite
DEST=/var/backups/youtube-giveaway-studio
install -d -m 0700 "$DEST"
test -f "$SRC" && cp "$SRC" "$DEST/giveaway-$(date +%F-%H%M%S).sqlite"
find "$DEST" -type f -name 'giveaway-*.sqlite' -mtime +14 -delete
