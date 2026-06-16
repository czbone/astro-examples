#!/bin/bash
set -e

echo "Starting application..."
exec node dist/server/entry.mjs
