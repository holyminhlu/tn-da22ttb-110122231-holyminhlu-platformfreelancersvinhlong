-- Chat: đính kèm ảnh/tệp + trạng thái hội thoại (idempotent — chạy an toàn trên server cũ)
--   docker compose exec -T db psql -U vl_user -d vl_connected -f /schema/migrations/chat_messages_image_file_fix.sql
-- hoặc: bash deploy/apply-chat-migrations.sh

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'text';

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS context_type VARCHAR(20) NULL;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT NULL;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_name TEXT NULL;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_mime TEXT NULL;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_kind_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_kind_check
  CHECK (kind IN ('text', 'context', 'image', 'file'));

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_context_type_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_context_type_check
  CHECK (context_type IS NULL OR context_type IN ('job', 'service'));

CREATE TABLE IF NOT EXISTS public.chat_conversation_user_state (
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NULL,
  last_read_at TIMESTAMPTZ NULL,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.chat_conversation_user_state
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conv_user_state_user
  ON public.chat_conversation_user_state (user_id);

CREATE TABLE IF NOT EXISTS public.chat_blocks (
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT chat_blocks_not_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked
  ON public.chat_blocks (blocked_id);
