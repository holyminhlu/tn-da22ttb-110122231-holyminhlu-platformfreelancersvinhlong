-- Bảo mật tài khoản: khôi phục, cảnh báo đăng nhập, tạm khóa
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS recovery_email character varying(255),
  ADD COLUMN IF NOT EXISTS recovery_phone character varying(40),
  ADD COLUMN IF NOT EXISTS login_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS password_user_set_at timestamp without time zone;

COMMENT ON COLUMN public.users.recovery_email IS 'Email khôi phục (có thể khác email đăng nhập)';
COMMENT ON COLUMN public.users.recovery_phone IS 'SĐT khôi phục (có thể khác SĐT hồ sơ)';
COMMENT ON COLUMN public.users.login_alerts_enabled IS 'Gửi cảnh báo khi đăng nhập từ IP/thiết bị mới';
COMMENT ON COLUMN public.users.deactivated_at IS 'Tài khoản tạm khóa bởi người dùng';
COMMENT ON COLUMN public.users.password_user_set_at IS 'Thời điểm người dùng đặt mật khẩu ứng dụng (kể cả sau Google OAuth)';

COMMIT;
