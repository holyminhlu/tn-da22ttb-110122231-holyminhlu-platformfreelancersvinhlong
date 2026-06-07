-- Ảnh bìa hồ sơ freelancer (hiển thị trên trang /ho-so).
-- PostgreSQL 11+. Chạy một lần trên database dự án.

BEGIN;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cover_url character varying(500);

COMMENT ON COLUMN public.user_profiles.cover_url IS 'URL ảnh bìa hồ sơ freelancer (tải qua upload dịch vụ / lưu đường dẫn tương đối).';

COMMIT;
