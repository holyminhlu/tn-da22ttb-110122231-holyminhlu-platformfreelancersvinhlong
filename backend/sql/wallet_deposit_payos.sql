-- Nạp tiền ví qua payOS — đơn hàng top-up (orderCode gửi sang payOS)
BEGIN;

CREATE TABLE IF NOT EXISTS public.wallet_deposit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_code bigint NOT NULL,
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  type character varying(20) NOT NULL DEFAULT 'DEPOSIT',
  status character varying(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'CANCELLED')),
  payment_link_id character varying(128),
  checkout_url text,
  payos_reference character varying(128),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  cancel_reason text,
  paid_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_deposit_orders_order_code_key UNIQUE (order_code)
);

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_orders_user
  ON public.wallet_deposit_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_orders_pending
  ON public.wallet_deposit_orders (status, created_at DESC)
  WHERE status = 'PENDING';

COMMIT;
