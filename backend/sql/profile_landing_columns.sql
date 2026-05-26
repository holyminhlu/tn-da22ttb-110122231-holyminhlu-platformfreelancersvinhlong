-- Bổ sung cột phục vụ trang hồ sơ dạng landing (tin cậy, địa phương, chỉ số freelancer).
-- PostgreSQL 11+ (hỗ trợ ADD COLUMN IF NOT EXISTS).
-- Chạy file này một lần trên database của dự án.

BEGIN;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tagline character varying(220),
  ADD COLUMN IF NOT EXISTS district_city character varying(180);

COMMENT ON COLUMN public.user_profiles.tagline IS 'Dòng định vị ngắn hiển thị dưới tên (vd: Chuyên gia Full-Stack | Node & React).';
COMMENT ON COLUMN public.user_profiles.district_city IS 'Địa danh hiển thị cấp quận/huyện/thị xã/thành phố (hyper-local).';

ALTER TABLE public.freelancer_profiles
  ADD COLUMN IF NOT EXISTS job_success_score smallint,
  ADD COLUMN IF NOT EXISTS avg_response_minutes integer,
  ADD COLUMN IF NOT EXISTS profile_badges jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.freelancer_profiles.job_success_score IS 'Điểm thành công hợp đồng (0–100), nhập thủ công hoặc cập nhật từ batch sau.';
COMMENT ON COLUMN public.freelancer_profiles.avg_response_minutes IS 'Thời gian phản hồi trung bình (phút), phục vụ hiển thị “trả lời trong X giờ”.';
COMMENT ON COLUMN public.freelancer_profiles.profile_badges IS 'Mảng chuỗi huy hiệu/hạn ngữ hiển thị trên hồ sơ (vd: Top Rated, Đã xác thực địa phương).';

COMMIT;
