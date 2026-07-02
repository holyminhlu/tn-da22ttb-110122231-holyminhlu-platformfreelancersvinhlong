-- Kiểm duyệt bài đăng việc (admin): ẩn khỏi Find Work, lưu lý do và người xử lý.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS admin_hidden_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS admin_hidden_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS admin_hidden_by UUID NULL REFERENCES public.users(id);

COMMENT ON COLUMN public.jobs.admin_hidden_at IS 'Admin ẩn bài đăng khỏi danh sách công khai';
COMMENT ON COLUMN public.jobs.admin_hidden_reason IS 'Lý do admin ẩn/xử lý vi phạm';
COMMENT ON COLUMN public.jobs.admin_hidden_by IS 'Admin thực hiện ẩn bài đăng';

CREATE INDEX IF NOT EXISTS idx_jobs_admin_hidden_at
  ON public.jobs (admin_hidden_at DESC NULLS LAST)
  WHERE admin_hidden_at IS NOT NULL;
