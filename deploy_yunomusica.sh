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

# --delay-updates + --delete-after: the new files land together at the end
# of the upload and the old ones are removed only after them, so a page
# loaded during the upload never gets an index.html whose chunks are not
# there yet. A tab still running the old build is told by its
# C_YUI_UPDATE_WATCH bar (gobj-ui) to reload.
rsync -avzL --delete-after --delay-updates \
    --exclude \.webassets-cache --exclude \.sass-cache --exclude \.cache \
    --filter 'P images/*' \
    ./dist/ \
    "yuneta@$NODE:/yuneta/gui/$NODE"
