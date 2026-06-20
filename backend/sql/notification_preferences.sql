-- Cài đặt thông báo người dùng (in-app + email digest)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{
    "orders": true,
    "messages": true,
    "quotes": true
  }'::jsonb;

COMMENT ON COLUMN public.users.notification_prefs IS
  'Tùy chọn thông báo in-app: orders, messages, quotes';
