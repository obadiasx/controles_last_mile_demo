#!/usr/bin/env bash
set -e

ORIGEM_DB="${POSTGRES_ORIGEM_DB:-erp_origem}"

psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set origem_db="$ORIGEM_DB" \
  --set db_owner="$POSTGRES_USER" \
  --set ON_ERROR_STOP=1 <<'EOSQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'origem_db', :'db_owner')
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = :'origem_db'
)\gexec
EOSQL
