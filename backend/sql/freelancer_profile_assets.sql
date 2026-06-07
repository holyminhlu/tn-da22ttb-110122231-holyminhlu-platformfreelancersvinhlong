-- Tài nguyên dành riêng và tệp tin chia sẻ trên hồ sơ freelancer.
-- PostgreSQL 11+. Chạy một lần trên database dự án.

BEGIN;

CREATE TABLE IF NOT EXISTS public.freelancer_exclusive_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title character varying(200) NOT NULL,
  description text,
  resource_type character varying(20) NOT NULL DEFAULT 'link',
  link_url character varying(500),
  file_url character varying(500),
  file_name character varying(255),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  CONSTRAINT freelancer_exclusive_resources_type_chk
    CHECK (resource_type IN ('link', 'file'))
);

CREATE INDEX IF NOT EXISTS idx_freelancer_exclusive_resources_user
  ON public.freelancer_exclusive_resources (freelancer_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.freelancer_profile_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title character varying(200) NOT NULL,
  description text,
  file_url character varying(500) NOT NULL,
  file_name character varying(255),
  file_size integer,
  mime_type character varying(120),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_freelancer_profile_files_user
  ON public.freelancer_profile_files (freelancer_id)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.freelancer_exclusive_resources IS 'Tài nguyên dành riêng (link hoặc file) freelancer chia sẻ với khách hàng.';
COMMENT ON TABLE public.freelancer_profile_files IS 'Tệp tin đính kèm trên hồ sơ freelancer.';

COMMIT;
