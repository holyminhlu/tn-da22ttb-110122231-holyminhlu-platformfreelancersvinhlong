-- Thông báo in-app (real-time qua Socket.IO)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL DEFAULT 'system',
  action VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href VARCHAR(512) NULL,
  actor_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NULL,
  entity_type VARCHAR(32) NULL,
  entity_id UUID NULL,
  read_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read_at)
  WHERE deleted_at IS NULL AND read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_category
  ON public.notifications (user_id, category, created_at DESC)
  WHERE deleted_at IS NULL;
