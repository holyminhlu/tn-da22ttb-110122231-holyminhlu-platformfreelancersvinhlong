-- Cột phục vụ danh sách Find Work (category, tags)
-- Chạy: psql -f backend/sql/jobs_listing_columns.sql

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category character varying(255);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb NOT NULL;

COMMENT ON COLUMN public.jobs.category IS 'Danh mục việc (hiển thị trên card Find Work)';
COMMENT ON COLUMN public.jobs.tags IS 'Thẻ kỹ năng / từ khóa (mảng chuỗi JSON)';
