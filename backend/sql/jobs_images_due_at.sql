-- Ảnh minh họa (JSON mảng URL, tối đa 3 phần tử do app kiểm tra) + hạn hoàn thành mong muốn.
-- Chạy thủ công: psql -f backend/sql/jobs_images_due_at.sql

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS due_at timestamp without time zone;

COMMENT ON COLUMN public.jobs.images IS 'Mảng URL ảnh đính kèm tin (tối đa 3)';
COMMENT ON COLUMN public.jobs.due_at IS 'Thời điểm mong muốn hoàn thành (tùy chọn, gấp)';
