#!/bin/sh
# Áp dụng migration chat đính kèm ảnh/tệp trên server (không reset DB).
set -eu
cd "$(dirname "$0")/.."

DB_USER="${POSTGRES_USER:-vl_user}"
DB_NAME="${POSTGRES_DB:-vl_connected}"
SQL_FILE="backend/sql/chat_messages_image_file_fix.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: Không thấy $SQL_FILE"
  exit 1
fi

echo ">>> Áp dụng migration chat: $SQL_FILE"
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$SQL_FILE"

echo ""
echo ">>> Kiểm tra cột chat_messages"
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_messages'
  AND column_name IN ('kind', 'attachment_url', 'attachment_name', 'attachment_mime')
ORDER BY column_name;
"

echo ""
echo "Done. Khởi động lại backend nếu cần: docker compose up -d backend"
