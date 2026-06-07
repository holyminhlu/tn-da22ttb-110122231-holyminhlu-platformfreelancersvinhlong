-- Google OAuth — chạy trên PostgreSQL (vl_connected)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_id character varying(255);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique
  ON public.users (google_id)
  WHERE google_id IS NOT NULL AND deleted_at IS NULL;
