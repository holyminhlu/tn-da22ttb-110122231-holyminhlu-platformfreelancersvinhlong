-- Vị trí đăng tin việc làm (địa chỉ tự nhập và/hoặc tọa độ GPS).
-- Chạy thủ công: psql -f backend/sql/jobs_location.sql

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location_label text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location_lng double precision;

COMMENT ON COLUMN public.jobs.location_label IS 'Mô tả địa điểm làm việc do client nhập (VD: TP. Vĩnh Long — phường 1)';
COMMENT ON COLUMN public.jobs.location_lat IS 'Vĩ độ khi client dùng GPS lúc đăng tin (tùy chọn)';
COMMENT ON COLUMN public.jobs.location_lng IS 'Kinh độ khi client dùng GPS lúc đăng tin (tùy chọn)';
