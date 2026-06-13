-- Việc làm freelancer đã lưu (bookmark)
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  saved_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (freelancer_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_freelancer_saved_at
  ON public.saved_jobs (freelancer_id, saved_at DESC);

COMMENT ON TABLE public.saved_jobs IS 'Công việc freelancer đã lưu từ marketplace Tìm việc';
