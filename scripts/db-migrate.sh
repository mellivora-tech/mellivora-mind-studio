#!/usr/bin/env bash
# =============================================================================
# db-migrate.sh - PostgreSQL migration runner with tracking
#
# Usage:
#   DATABASE_URL=<url> ./scripts/db-migrate.sh [migrations/postgres]
#
# Falls back to local dev URL if DATABASE_URL is not set.
# =============================================================================

set -euo pipefail

MIGRATIONS_DIR="${1:-migrations/postgres}"
PSQL="${PSQL_BIN:-psql}"

# Default to local dev if DATABASE_URL not set
DATABASE_URL="${DATABASE_URL:-postgresql://mellivora:mellivora_dev@localhost:5432/mellivora}"

echo "=== Mellivora Mind Studio - DB Migration ==="
echo "Target: $(echo "$DATABASE_URL" | sed 's|://[^@]*@|://***@|')"
echo "Dir:    $MIGRATIONS_DIR"
echo ""

# Create migration tracking table if not exists
"$PSQL" "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(255) PRIMARY KEY,
    applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
SQL

echo "✓ schema_migrations table ready"
echo ""

# Apply each SQL file in order
APPLIED=0
SKIPPED=0

for f in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    version=$(basename "$f")

    # Check if already applied
    count=$("$PSQL" "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" | tr -d '[:space:]')

    if [ "$count" = "1" ]; then
        echo "  skip  $version (already applied)"
        SKIPPED=$((SKIPPED + 1))
    else
        echo "  apply $version..."
        "$PSQL" "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" -q
        "$PSQL" "$DATABASE_URL" -q -c "INSERT INTO schema_migrations (version) VALUES ('$version');"
        echo "  ✓     $version"
        APPLIED=$((APPLIED + 1))
    fi
done

echo ""
echo "=== Done: applied=$APPLIED skipped=$SKIPPED ==="
