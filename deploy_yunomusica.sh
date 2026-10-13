#!/bin/sh
#
#   A step that fails stops the deploy: the backup is the rollback point,
#   and without `set -e` a failed one went on to the rsync.
#
set -eu

NODE="yunomusica.com"

# do a backup
BACKUP_DIR="/yuneta/gui/backups/$NODE/$(date +%Y%m%d_%H%M%S)"
ssh "yuneta@$NODE" "mkdir -p '$BACKUP_DIR' && cp -a '/yuneta/gui/$NODE/.' '$BACKUP_DIR/'"

rsync -avzL --delete \
    --exclude \.webassets-cache --exclude \.sass-cache --exclude \.cache \
    --filter 'P images/*' \
    ./dist/ \
    "yuneta@$NODE:/yuneta/gui/$NODE"
