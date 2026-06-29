#!/bin/bash
# Triển khai VL Connected trên Droplet (Ubuntu).
# Chạy: bash deploy/deploy-droplet.sh
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/vlc/tn-da22ttb-holyminhlu-freelancer-next-node-js}"

echo ">>> VLC deploy — $PROJECT_DIR"
cd "$PROJECT_DIR"

echo ">>> git pull"
git pull origin main

if [ ! -f .env ]; then
  echo "ERROR: Không thấy .env trên server."
  echo "       Tạo một lần: cp .env.production.example .env && nano .env"
  echo "       Không lưu secret trong git — chỉ giữ .env trên máy chủ."
  exit 1
fi

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

if command -v nginx >/dev/null 2>&1 && [ -d /etc/nginx/sites-available ]; then
  echo ""
  echo ">>> cập nhật Nginx (proxy /uploads/ → backend)"
  sudo cp deploy/nginx-minhlu.app.conf /etc/nginx/sites-available/minhlu.app
  sudo ln -sf /etc/nginx/sites-available/minhlu.app /etc/nginx/sites-enabled/minhlu.app 2>/dev/null || true
  sudo nginx -t && sudo systemctl reload nginx
else
  echo ""
  echo "SKIP: Nginx không có trên máy này — trên server chạy thủ công:"
  echo "  sudo cp deploy/nginx-minhlu.app.conf /etc/nginx/sites-available/minhlu.app"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
fi

echo ""
echo "Done."
