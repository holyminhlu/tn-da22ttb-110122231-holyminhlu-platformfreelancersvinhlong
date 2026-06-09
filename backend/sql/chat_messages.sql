-- Chat 1-1 giữa client và freelancer
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_quote_id UUID NULL REFERENCES public.job_quotes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_conversations_participants_check CHECK (client_id <> freelancer_id),
  CONSTRAINT chat_conversations_client_freelancer_unique UNIQUE (client_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_client
  ON public.chat_conversations (client_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_freelancer
  ON public.chat_conversations (freelancer_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_messages_body_not_empty CHECK (char_length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON public.chat_messages (conversation_id, created_at ASC);
