#!/bin/sh
set -eu

echo "[db-init] Importing VL Connected schema from Database.sql..."

if [ ! -f /schema/DB.sql ]; then
  echo "[db-init] WARN: /schema/DB.sql not found — skip schema import."
  exit 0
fi

# pg_dump 18: strip meta-commands, PG18-only settings, and remap owner to container user.
sed \
  -e '/^\\restrict/d' \
  -e '/^\\unrestrict/d' \
  -e '/transaction_timeout/d' \
  -e "s/OWNER TO postgres/OWNER TO ${POSTGRES_USER}/g" \
  /schema/DB.sql \
  | psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"

echo "[db-init] Schema import finished."

if [ -d /schema/migrations ]; then
  echo "[db-init] Applying SQL migrations in backend/sql..."
  for file in $(find /schema/migrations -maxdepth 1 -name '*.sql' | sort); do
    echo "[db-init] -> $(basename "$file")"
    psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file" || true
  done
  echo "[db-init] Migrations pass finished."
fi
