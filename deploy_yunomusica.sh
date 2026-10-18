#!/bin/sh
#
#   A step that fails stops the deploy: the backup is the rollback point,
#   and without `set -e` a failed one went on to the rsync.
#
set -eu

NODE="yunomusica.com"

# do a backup
BACKUP_DIR="/yuneta/gui/backups/$NODE/$(date +%Y%m%d_%H%M%S)"
#   A first deploy to a host has nothing to back up: without the test, the
#   cp of a missing directory would stop it there (set -e).
ssh "yuneta@$NODE" "mkdir -p '$BACKUP_DIR' && if [ -d '/yuneta/gui/$NODE' ]; then cp -a '/yuneta/gui/$NODE/.' '$BACKUP_DIR/'; fi"

rsync -avzL --delete \
    --exclude \.webassets-cache --exclude \.sass-cache --exclude \.cache \
    --filter 'P images/*' \
    ./dist/ \
    "yuneta@$NODE:/yuneta/gui/$NODE"
