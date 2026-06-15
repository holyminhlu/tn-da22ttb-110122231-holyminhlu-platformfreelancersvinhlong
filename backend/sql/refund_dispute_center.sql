-- Trung tâm hoàn tiền & tranh chấp
BEGIN;

ALTER TABLE public.contract_cancel_requests
  ADD COLUMN IF NOT EXISTS reason_code character varying(64),
  ADD COLUMN IF NOT EXISTS detail text,
  ADD COLUMN IF NOT EXISTS refund_method character varying(32) DEFAULT 'wallet';

ALTER TABLE public.contract_disputes
  ADD COLUMN IF NOT EXISTS issue_category character varying(64),
  ADD COLUMN IF NOT EXISTS desired_resolution character varying(64),
  ADD COLUMN IF NOT EXISTS desired_resolution_note text,
  ADD COLUMN IF NOT EXISTS dispute_stage character varying(32) DEFAULT 'initiated',
  ADD COLUMN IF NOT EXISTS respond_by_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS public.contract_dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.contract_disputes(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  author_role character varying(16) NOT NULL
    CHECK (author_role IN ('client', 'freelancer', 'admin', 'system')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_dispute_messages_dispute
  ON public.contract_dispute_messages (dispute_id, created_at ASC);

COMMIT;
