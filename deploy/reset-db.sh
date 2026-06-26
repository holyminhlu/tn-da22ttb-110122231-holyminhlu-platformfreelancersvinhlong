#!/bin/bash
# Reset volume Postgres và import lại schema (XÓA TOÀN BỘ DỮ LIỆU DB).
# Yêu cầu: file Database.sql đầy đủ (có CREATE TABLE) đã có trong thư mục project.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f Database.sql ]; then
  echo "ERROR: Thiếu Database.sql"
  exit 1
fi

if ! grep -q "CREATE TABLE" Database.sql; then
  echo "ERROR: Database.sql không có CREATE TABLE — export lại từ máy dev:"
  echo "  pg_dump -U postgres -s -d vl_freelancer -f Database.sql --encoding=UTF8"
  exit 1
fi

echo "WARN: Sẽ xóa volume postgres_data và import lại schema."
read -r -p "Gõ YES để tiếp tục: " confirm
if [ "$confirm" != "YES" ]; then
  echo "Đã hủy."
  exit 1
fi

docker compose down
docker volume rm vl-connected_postgres_data

docker compose up -d db
echo "Đợi Postgres init schema (có thể 1–3 phút)..."
sleep 30

until docker compose exec -T db pg_isready -U vl_user -d vl_connected >/dev/null 2>&1; do
  sleep 5
done

docker compose up -d
sleep 15
bash deploy/verify-db.sh
