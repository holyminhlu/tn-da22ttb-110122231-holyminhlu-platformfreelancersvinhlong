BEGIN;

CREATE TABLE IF NOT EXISTS public.service_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.service_categories (name, sort_order) VALUES
  ('Thiết kế đồ họa & Logo', 10),
  ('UI/UX & Thiết kế website', 20),
  ('Lập trình Web & Ứng dụng', 30),
  ('Mobile App', 40),
  ('Marketing & SEO', 50),
  ('Nội dung & Copywriting', 60),
  ('Video & Hoạt ảnh', 70),
  ('Dữ liệu & AI', 80),
  ('Hỗ trợ kỹ thuật & IT', 90),
  ('Khác', 100)
ON CONFLICT (name) DO NOTHING;

COMMIT;
