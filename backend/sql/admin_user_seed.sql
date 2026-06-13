-- Tạo hoặc cập nhật tài khoản admin mẫu (đổi email/mật khẩu trước khi dùng production)

-- Mật khẩu mặc định: Admin@12345

BEGIN;



INSERT INTO public.users (email, password_hash, role, status, is_email_verified)

VALUES (

  'admin@vlconnected.local',

  '$2b$10$Fjsf8vSsb1wUQP3AXLy5Quc147RoSIDI7Uvn5gNP3Y.wkOYC.ZZKK',

  'admin',

  'active',

  true

)

ON CONFLICT (email) DO UPDATE SET

  password_hash = EXCLUDED.password_hash,

  role = EXCLUDED.role,

  status = EXCLUDED.status,

  is_email_verified = EXCLUDED.is_email_verified,

  updated_at = CURRENT_TIMESTAMP;



INSERT INTO public.user_profiles (user_id, full_name)

SELECT u.id, 'Quản trị viên VLC'

FROM public.users u

WHERE LOWER(u.email) = 'admin@vlconnected.local'

  AND u.deleted_at IS NULL

ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;



COMMIT;



-- Đăng nhập: admin@vlconnected.local / Admin@12345

-- Trang quản trị: http://localhost:3000/admin/duyet-tai-khoan

