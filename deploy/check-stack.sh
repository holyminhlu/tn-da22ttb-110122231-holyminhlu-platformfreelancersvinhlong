#!/bin/sh
# Kiểm tra backend + DB + URL trên server.
set -eu
cd "$(dirname "$0")/.."

echo "=== 1. Docker containers ==="
docker compose ps

echo ""
echo "=== 2. Backend health (local) ==="
curl -sf http://127.0.0.1:5000/health && echo "" || echo "FAIL: backend :5000"

echo ""
echo "=== 3. Frontend (local) ==="
code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || true)
echo "HTTP $code (mong đợi 200)"

echo ""
echo "=== 4. API qua Nginx (public) ==="
curl -sf https://minhlu.app/health && echo "" || curl -sf http://minhlu.app/health && echo "" || echo "FAIL: minhlu.app/health"

echo ""
echo "=== 4b. Uploads qua Nginx (phải do backend trả 404, không phải Next.js) ==="
uploads_headers=$(curl -sI https://minhlu.app/uploads/avatars/__nginx_probe__.jpg 2>/dev/null || true)
code_uploads=$(printf '%s' "$uploads_headers" | head -n1 | awk '{print $2}')
echo "GET /uploads/avatars/__nginx_probe__.jpg → HTTP ${code_uploads:-?}"
if printf '%s' "$uploads_headers" | grep -qi 'x-powered-by: Next.js'; then
  echo "FAIL: /uploads/ đang route tới Next.js — chạy: sudo cp deploy/nginx-minhlu.app.conf /etc/nginx/sites-available/minhlu.app && sudo nginx -t && sudo systemctl reload nginx"
  echo "     Hoặc redeploy frontend (next.config có rewrite /uploads → backend)."
elif [ "$code_uploads" = "404" ]; then
  echo "OK: Nginx proxy /uploads/ → backend (404 = file probe không tồn tại)"
elif [ "$code_uploads" = "200" ]; then
  echo "WARN: 200 bất thường cho file probe"
else
  echo "FAIL: HTTP ${code_uploads:-?} — kiểm tra nginx và backend"
fi

echo ""
echo "=== 4c. Socket.IO qua Nginx (polling handshake) ==="
socket_headers=$(curl -sI "https://minhlu.app/socket.io/?EIO=4&transport=polling" 2>/dev/null || true)
socket_code=$(printf '%s' "$socket_headers" | head -n1 | awk '{print $2}')
echo "GET /socket.io/?EIO=4&transport=polling → HTTP ${socket_code:-?}"
if printf '%s' "$socket_headers" | grep -qi 'x-powered-by: Next.js'; then
  echo "FAIL: /socket.io/ đang route tới Next.js — cập nhật nginx hoặc redeploy frontend (rewrite socket.io)."
elif [ "$socket_code" = "400" ] || [ "$socket_code" = "200" ]; then
  echo "OK: Socket.IO đến backend (400/200 là phản hồi handshake bình thường)"
else
  echo "FAIL: HTTP ${socket_code:-?} — kiểm tra location /socket.io/ trong nginx"
fi

echo ""
echo "=== 5. Database ==="
sh deploy/verify-db.sh

echo ""
echo "=== 6. NEXT_PUBLIC_API_URL trong .env ==="
grep -E '^NEXT_PUBLIC_API_URL=' .env 2>/dev/null || echo "Không thấy .env"
