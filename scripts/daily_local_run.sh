#!/bin/bash
# daily_local_run.sh
# Run this locally on your Mac every day to render today's video and dispatch to YouTube/TikTok

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "⏰ Starting Daily GuessTheMovie Video Run at $(date)"

# Activate virtualenv and run daily pipeline
"$PROJECT_DIR/.venv/bin/python" "$PROJECT_DIR/scripts/daily_pipeline.py" --all

# Display macOS desktop notification
osascript -e 'display notification "Today'\''s GuessTheMovie video has been rendered and dispatched!" with title "GuessTheMovie Daily Short"'
