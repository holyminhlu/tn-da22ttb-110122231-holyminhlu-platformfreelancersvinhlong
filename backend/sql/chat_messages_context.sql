-- Ngữ cảnh công việc / dịch vụ trong chat + tin nhắn đính kèm
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS service_id UUID NULL REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS context_title TEXT NULL;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'text';

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_kind_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_kind_check
  CHECK (kind IN ('text', 'context', 'image', 'file'));

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS context_type VARCHAR(20) NULL;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_context_type_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_context_type_check
  CHECK (context_type IS NULL OR context_type IN ('job', 'service'));

CREATE INDEX IF NOT EXISTS idx_chat_conversations_service
  ON public.chat_conversations (service_id)
  WHERE service_id IS NOT NULL;
