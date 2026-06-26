#!/bin/sh
# Kiểm tra DB sau khi docker compose up (chạy trên server).
set -eu

cd "$(dirname "$0")/.."

DB_USER="${POSTGRES_USER:-vl_user}"
DB_NAME="${POSTGRES_DB:-vl_connected}"

echo "=== VLC — Kiểm tra cơ sở dữ liệu ==="

TABLE_COUNT=$(docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc "
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
" | tr -d ' ')

echo "Số bảng public: $TABLE_COUNT (kỳ vọng ~51)"
if [ "$TABLE_COUNT" -lt 40 ] 2>/dev/null; then
  echo "WARN: Thiếu bảng — cần Database.sql đầy đủ + bash deploy/reset-db.sh"
fi

docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"

echo ""
echo "--- Bảng quan trọng còn thiếu (nếu có dòng = thiếu) ---"
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT expected_table
FROM unnest(ARRAY[
  'users','accounts','jobs','job_quotes','contracts',
  'services','transactions','identity_verifications',
  'notifications','chat_conversations','chat_messages',
  'contract_disputes','contract_cancel_requests',
  'wallet_deposit_orders','freelancer_profiles'
]) AS expected_table
EXCEPT
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
"

echo ""
echo "--- PostGIS ---"
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT PostGIS_Version();" || echo "WARN: PostGIS chưa sẵn sàng"

echo ""
echo "--- API health ---"
curl -sf http://127.0.0.1:5000/health && echo "" || echo "FAIL: backend /health"
