-- Tọa độ GPS / bản đồ cho địa chỉ xác minh danh tính (mục Thông tin liên hệ).
-- Chạy một lần trên PostgreSQL.

BEGIN;

ALTER TABLE public.identity_verifications
  ADD COLUMN IF NOT EXISTS address_lat double precision,
  ADD COLUMN IF NOT EXISTS address_lng double precision;

COMMENT ON COLUMN public.identity_verifications.address_lat IS 'Vĩ độ từ GPS hoặc chọn trên bản đồ (Nominatim).';
COMMENT ON COLUMN public.identity_verifications.address_lng IS 'Kinh độ từ GPS hoặc chọn trên bản đồ (Nominatim).';

COMMIT;
