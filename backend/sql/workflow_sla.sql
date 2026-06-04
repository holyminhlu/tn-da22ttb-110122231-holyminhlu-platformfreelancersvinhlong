-- SLA workflow: hết hạn pre-Escrow, hoàn tiền, auto-accept, tranh chấp
BEGIN;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS stage_deadline_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS escrow_deadline_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_type character varying(32),
  ADD COLUMN IF NOT EXISTS delivery_review_deadline_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS auto_accepted_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS revision_requested_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS sla_reminder_48_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_reminder_24_sent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contracts_sla_stage_deadline
  ON public.contracts (workflow_stage, stage_deadline_at)
  WHERE deleted_at IS NULL AND cancel_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_delivery_review_deadline
  ON public.contracts (delivery_review_deadline_at)
  WHERE deleted_at IS NULL AND accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.contract_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type character varying(64) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_workflow_events_contract
  ON public.contract_workflow_events (contract_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.contract_cancel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status character varying(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved', 'withdrawn')),
  respond_by_at timestamp without time zone NOT NULL,
  freelancer_response text,
  resolved_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_cancel_requests_pending
  ON public.contract_cancel_requests (contract_id, status, respond_by_at);

CREATE TABLE IF NOT EXISTS public.contract_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status character varying(32) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution character varying(32),
  admin_notes text,
  resolved_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_disputes_open
  ON public.contract_disputes (contract_id, status);

COMMIT;
