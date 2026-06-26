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
echo "=== 5. Database ==="
sh deploy/verify-db.sh

echo ""
echo "=== 6. NEXT_PUBLIC_API_URL trong .env ==="
grep -E '^NEXT_PUBLIC_API_URL=' .env 2>/dev/null || echo "Không thấy .env"
