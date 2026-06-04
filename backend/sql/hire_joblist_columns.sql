-- Cột & bảng phục vụ trang Hire / Job List (budget type, báo giá, thống kê client).
-- Chạy một lần trên PostgreSQL.

BEGIN;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS budget_type character varying(20) NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS budget_max numeric(12,2);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_budget_type_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_budget_type_check
  CHECK (budget_type IN ('fixed', 'hourly'));

COMMENT ON COLUMN public.jobs.budget_type IS 'fixed = trọn gói, hourly = theo giờ (budget = mức giờ hoặc ngân sách chính).';
COMMENT ON COLUMN public.jobs.budget_max IS 'Ngân sách tối đa / trần dự án (VND).';

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS country character varying(120),
  ADD COLUMN IF NOT EXISTS client_satisfaction_score smallint;

COMMENT ON COLUMN public.user_profiles.country IS 'Quốc gia hiển thị trên card employer (job list).';
COMMENT ON COLUMN public.user_profiles.client_satisfaction_score IS 'Điểm hài lòng employer 0–100 (tùy chọn, hiển thị trên card).';

CREATE TABLE IF NOT EXISTS public.job_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(12,2),
  currency character(3) NOT NULL DEFAULT 'VND',
  message text,
  status character varying(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'shortlisted', 'interviewing', 'offered', 'accepted', 'declined', 'withdrawn')),
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_quotes_job_freelancer_active
  ON public.job_quotes (job_id, freelancer_id)
  WHERE status NOT IN ('withdrawn', 'declined');

CREATE INDEX IF NOT EXISTS idx_job_quotes_job_id
  ON public.job_quotes (job_id, created_at DESC);

COMMIT;
