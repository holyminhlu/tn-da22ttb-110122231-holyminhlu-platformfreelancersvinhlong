-- Rút tiền freelancer qua payOS Chi hộ
BEGIN;

ALTER TABLE public.freelancer_payout_accounts
  ADD COLUMN IF NOT EXISTS bank_bin character varying(6);

CREATE TABLE IF NOT EXISTS public.freelancer_withdrawal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reference_id character varying(64) NOT NULL,
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  status character varying(24) NOT NULL DEFAULT 'PENDING_AUTH'
    CHECK (status IN ('PENDING_AUTH', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  payos_payout_id character varying(128),
  payos_tx_id character varying(128),
  payos_tx_state character varying(32),
  bank_name character varying(120) NOT NULL,
  account_holder_name character varying(255) NOT NULL,
  account_last4 character varying(4) NOT NULL DEFAULT '',
  to_bin character varying(6) NOT NULL,
  to_account_number character varying(32) NOT NULL,
  description character varying(100),
  failure_reason text,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  auth_verified_at timestamp without time zone,
  paid_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT freelancer_withdrawal_orders_reference_id_key UNIQUE (reference_id)
);

CREATE INDEX IF NOT EXISTS idx_freelancer_withdrawal_orders_user
  ON public.freelancer_withdrawal_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_freelancer_withdrawal_orders_processing
  ON public.freelancer_withdrawal_orders (status, created_at DESC)
  WHERE status = 'PROCESSING';

COMMIT;
