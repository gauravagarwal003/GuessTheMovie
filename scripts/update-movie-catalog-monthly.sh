#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="${0:A:h:h}"
COMMIT_MESSAGE="Update monthly popular movie catalog"

cd "$PROJECT_ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [[ "$(git branch --show-current)" != "main" ]]; then
  print -u2 "Catalog update skipped: this checkout is not on main."
  exit 1
fi

npm run catalog:update

git fetch origin main
if ! git diff --quiet -- public/movies.csv; then
  git add -- public/movies.csv
  git commit -m "$COMMIT_MESSAGE"
fi

git fetch origin main
AHEAD_COUNT="$(git rev-list --count origin/main..HEAD)"
LAST_SUBJECT="$(git log -1 --format=%s)"

if [[ "$AHEAD_COUNT" == "1" && "$LAST_SUBJECT" == "$COMMIT_MESSAGE" ]]; then
  git push origin HEAD:main
elif [[ "$AHEAD_COUNT" != "0" ]]; then
  print -u2 "Catalog changes are committed locally, but push was skipped because main has other unpublished commits."
fi
