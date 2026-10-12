#!/bin/bash
set -euo pipefail

: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD before starting PostgreSQL}"

docker run -d \
  --name wildvn-postgres \
  -e POSTGRES_USER="${POSTGRES_USER:-postgres}" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -e POSTGRES_DB="${POSTGRES_DB:-wildvn}" \
  -p 5433:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine
