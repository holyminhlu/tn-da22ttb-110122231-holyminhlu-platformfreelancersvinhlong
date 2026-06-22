-- Xóa mềm tin công việc (client)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone;

CREATE INDEX IF NOT EXISTS idx_jobs_client_not_deleted
  ON public.jobs (client_id, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.jobs.deleted_at IS 'Khách hàng xóa mềm tin — không hiển thị trong quản lý / danh sách của khách hàng';
