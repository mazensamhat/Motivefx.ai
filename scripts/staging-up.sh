#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.staging ]]; then
  cp .env.staging.example .env.staging
  echo "Created .env.staging — edit it, generate secrets, then re-run."
  exit 1
fi

echo "Building and starting staging stack on http://localhost:8080 ..."
docker compose -f docker-compose.staging.yml up -d --build

echo ""
echo "Staging is up:"
echo "  App:  http://localhost:8080"
echo "  API:  http://localhost:8080/api/health"
