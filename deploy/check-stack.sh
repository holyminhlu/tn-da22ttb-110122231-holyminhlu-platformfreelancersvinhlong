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
echo "=== 5b. Chat ảnh/tệp (schema) ==="
chat_health=$(curl -sf "http://127.0.0.1:5000/health?chat=1" 2>/dev/null || true)
if [ -n "$chat_health" ]; then
  echo "$chat_health" | head -c 400
  echo ""
  if printf '%s' "$chat_health" | grep -q '"kindSupportsMedia":true'; then
    echo "OK: /health?chat=1 — schema hỗ trợ ảnh/tệp"
  else
    echo "FAIL: schema chat chưa đủ — chạy: bash deploy/apply-chat-migrations.sh && docker compose restart backend"
  fi
else
  echo "WARN: Backend chưa có /health?chat=1 — cập nhật code và rebuild backend"
  missing_cols=$(docker compose exec -T db psql -U "${POSTGRES_USER:-vl_user}" -d "${POSTGRES_DB:-vl_connected}" -tAc "
SELECT COUNT(*)
FROM unnest(ARRAY['kind', 'attachment_url', 'attachment_name', 'attachment_mime']) AS expected_column
WHERE expected_column NOT IN (
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'chat_messages'
);
" | tr -d ' ')
if [ "${missing_cols:-0}" != "0" ]; then
  echo "FAIL: Thiếu $missing_cols cột chat — chạy: bash deploy/apply-chat-migrations.sh"
else
  kind_def=$(docker compose exec -T db psql -U "${POSTGRES_USER:-vl_user}" -d "${POSTGRES_DB:-vl_connected}" -tAc "
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.chat_messages'::regclass AND conname = 'chat_messages_kind_check';
" 2>/dev/null | tr -d '\r' || true)
  if printf '%s' "$kind_def" | grep -q 'image' && printf '%s' "$kind_def" | grep -q 'file'; then
    echo "OK: chat_messages hỗ trợ kind image/file"
  else
    echo "FAIL: constraint kind chưa có image/file — chạy: bash deploy/apply-chat-migrations.sh"
    echo "     Hiện tại: ${kind_def:-<không có>}"
  fi
fi
fi

echo ""
echo "=== 6. Gemini AI (support chat) ==="
if grep -qE '^GEMINI_API_KEY=.+' .env 2>/dev/null; then
  echo "OK: GEMINI_API_KEY có trong .env"
else
  echo "WARN: Thiếu GEMINI_API_KEY trong .env — chat AI sẽ lỗi trên production"
fi
ai_code=$(curl -s -o /tmp/vlc-ai-chat-probe.json -w "%{http_code}" \
  -X POST http://127.0.0.1:5000/api/support/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"ping"}' || true)
echo "POST /api/support/ai-chat (local backend) → HTTP ${ai_code:-?}"
if [ "$ai_code" = "200" ]; then
  echo "OK: Gemini chat hoạt động"
elif [ "$ai_code" = "503" ]; then
  echo "FAIL: Gemini chưa cấu hình hoặc API key/model sai — sửa .env hoặc Admin → Quản lý API key"
  head -c 200 /tmp/vlc-ai-chat-probe.json 2>/dev/null; echo ""
elif [ "$ai_code" = "502" ]; then
  echo "FAIL: Backend trả 502 (có thể bị Cloudflare che) — cập nhật code mới và kiểm tra GEMINI_API_KEY"
else
  echo "FAIL: HTTP ${ai_code:-?}"
fi

echo ""
echo "=== 7. NEXT_PUBLIC_API_URL trong .env ==="
grep -E '^NEXT_PUBLIC_API_URL=' .env 2>/dev/null || echo "Không thấy .env"
