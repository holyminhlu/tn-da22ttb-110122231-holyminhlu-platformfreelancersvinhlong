-- Luồng đặt dịch vụ / escrow / milestone cho Client thuê Gig
BEGIN;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS workflow_stage character varying(32) NOT NULL DEFAULT 'selection',
  ADD COLUMN IF NOT EXISTS escrow_status character varying(32) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS package_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS client_brief text,
  ADD COLUMN IF NOT EXISTS proposal_text text,
  ADD COLUMN IF NOT EXISTS proposal_budget numeric(12,2),
  ADD COLUMN IF NOT EXISTS proposal_submitted_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS demo_url character varying(2000),
  ADD COLUMN IF NOT EXISTS revisions_limit integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS revisions_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funded_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS released_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp without time zone;

CREATE TABLE IF NOT EXISTS public.contract_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title character varying(255) NOT NULL,
  amount numeric(12,2) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status character varying(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'funded', 'in_progress', 'submitted', 'approved', 'paid')),
  note text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_milestones_contract
  ON public.contract_milestones (contract_id, sort_order);

COMMIT;
