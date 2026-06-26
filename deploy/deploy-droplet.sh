#!/bin/bash
# Triển khai VL Connected trên Droplet (Ubuntu).
# Chạy: bash deploy/deploy-droplet.sh
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/vlc/tn-da22ttb-holyminhlu-freelancer-next-node-js}"

echo ">>> VLC deploy — $PROJECT_DIR"
cd "$PROJECT_DIR"

if [ ! -f .envexpamle ]; then
  echo "ERROR: Không thấy .envexpamle — git pull trước."
  exit 1
fi

echo ">>> git pull"
git pull origin main

echo ">>> copy .envexpamle -> .env"
cp .envexpamle .env

if [ ! -s Database.sql ] || ! grep -q "CREATE TABLE" Database.sql 2>/dev/null; then
  echo ""
  echo "WARN: Database.sql thiếu CREATE TABLE (file dump không đầy đủ)."
  echo "      Trên máy dev, export schema rồi upload lên server:"
  echo "        pg_dump -U postgres -s -d vl_freelancer -f Database.sql"
  echo "        scp Database.sql root@SERVER:$PROJECT_DIR/Database.sql"
  echo "      Sau đó reset volume DB (MẤT DỮ LIỆU):"
  echo "        docker compose down && docker volume rm vl-connected_postgres_data"
  echo ""
fi

echo ">>> docker compose build & up"
docker compose up -d --build

echo ">>> đợi container healthy..."
sleep 20
docker compose ps

echo ""
echo ">>> health"
curl -sf http://127.0.0.1:5000/health && echo "" || echo "Backend chưa healthy — xem: docker compose logs backend"

echo ""
echo ">>> kiểm tra DB"
sh deploy/verify-db.sh

echo ""
echo "Done. Tiếp theo: cấu hình Nginx + SSL (deploy/nginx-minhlu.app.conf)"
