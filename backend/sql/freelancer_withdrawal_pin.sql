-- Mã PIN rút tiền (6 chữ số) cho freelancer
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_user_set_at timestamp without time zone;

UPDATE public.users
SET password_user_set_at = COALESCE(password_user_set_at, created_at)
WHERE google_id IS NULL AND password_user_set_at IS NULL;

CREATE TABLE IF NOT EXISTS public.freelancer_withdrawal_pins (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  pin_hash character varying(255) NOT NULL,
  failed_attempts smallint NOT NULL DEFAULT 0,
  locked_until timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

COMMIT;
