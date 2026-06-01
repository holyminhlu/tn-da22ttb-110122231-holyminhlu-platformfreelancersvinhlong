-- Cột phục vụ tìm kiếm freelancer (địa điểm đầy đủ, hiển thị card hire/search).
-- Chạy một lần trên PostgreSQL của dự án.

BEGIN;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS city character varying(120),
  ADD COLUMN IF NOT EXISTS state_province character varying(120),
  ADD COLUMN IF NOT EXISTS country character varying(120);

COMMENT ON COLUMN public.user_profiles.city IS 'Thành phố / đô thị (hiển thị tìm kiếm freelancer).';
COMMENT ON COLUMN public.user_profiles.state_province IS 'Bang / tỉnh / vùng.';
COMMENT ON COLUMN public.user_profiles.country IS 'Quốc gia.';

-- Gợi ý: cập nhật district_city từ city khi chỉ có một trường (tùy dữ liệu hiện có).
-- UPDATE public.user_profiles SET city = district_city WHERE city IS NULL AND district_city IS NOT NULL;

COMMIT;
