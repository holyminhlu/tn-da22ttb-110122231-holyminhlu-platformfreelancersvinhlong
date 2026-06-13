-- Tài khoản ngân hàng nhận tiền rút của freelancer
BEGIN;

CREATE TABLE IF NOT EXISTS public.freelancer_payout_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  bank_name character varying(120) NOT NULL,
  account_holder_name character varying(255) NOT NULL,
  account_number character varying(32) NOT NULL,
  linked_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freelancer_payout_accounts_user
  ON public.freelancer_payout_accounts (user_id);

COMMIT;
