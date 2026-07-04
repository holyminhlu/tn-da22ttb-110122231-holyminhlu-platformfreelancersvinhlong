-- Chỉnh sửa đánh giá: Khách hàng "Nguyễn Thị Thiên Lý" -> Freelancer "Thạch Thị Huệ Trinh"
-- Nội dung cũ: "Nó ngu"  =>  Nội dung mới: "Tôi rất hài lòng"
--
-- Chạy bằng psql (thay <user> và <db> theo .env DATABASE_URL):
--   psql -U <user> -d <db> -f backend/sql/update_review_thien_ly_hue_trinh.sql
--
-- Hoặc từ thư mục backend:
--   node scripts/run-update-review-thien-ly-hue-trinh.js

BEGIN;

-- 1) Xem trước đánh giá cần sửa
SELECT
  cr.id,
  cr.contract_id,
  cr.rating,
  cr.comment,
  cr.created_at,
  cr.updated_at,
  client_up.full_name AS client_name,
  freelancer_up.full_name AS freelancer_name
FROM public.contract_reviews cr
INNER JOIN public.users client_u ON client_u.id = cr.client_id
INNER JOIN public.user_profiles client_up ON client_up.user_id = cr.client_id
INNER JOIN public.users freelancer_u ON freelancer_u.id = cr.freelancer_id
INNER JOIN public.user_profiles freelancer_up ON freelancer_up.user_id = cr.freelancer_id
WHERE client_u.deleted_at IS NULL
  AND freelancer_u.deleted_at IS NULL
  AND TRIM(client_up.full_name) ILIKE 'Nguyễn Thị Thiên Lý'
  AND TRIM(freelancer_up.full_name) ILIKE 'Thạch Thị Huệ Trinh'
  AND TRIM(cr.comment) = 'Nó ngu';

-- 2) Cập nhật nội dung đánh giá
UPDATE public.contract_reviews cr
SET
  comment = 'Tôi rất hài lòng',
  updated_at = CURRENT_TIMESTAMP
FROM public.users client_u,
     public.user_profiles client_up,
     public.users freelancer_u,
     public.user_profiles freelancer_up
WHERE cr.client_id = client_u.id
  AND client_up.user_id = cr.client_id
  AND cr.freelancer_id = freelancer_u.id
  AND freelancer_up.user_id = cr.freelancer_id
  AND client_u.deleted_at IS NULL
  AND freelancer_u.deleted_at IS NULL
  AND TRIM(client_up.full_name) ILIKE 'Nguyễn Thị Thiên Lý'
  AND TRIM(freelancer_up.full_name) ILIKE 'Thạch Thị Huệ Trinh'
  AND TRIM(cr.comment) = 'Nó ngu';

-- 3) Kiểm tra sau khi cập nhật
SELECT
  cr.id,
  cr.contract_id,
  cr.rating,
  cr.comment,
  cr.created_at,
  cr.updated_at,
  client_up.full_name AS client_name,
  freelancer_up.full_name AS freelancer_name
FROM public.contract_reviews cr
INNER JOIN public.users client_u ON client_u.id = cr.client_id
INNER JOIN public.user_profiles client_up ON client_up.user_id = cr.client_id
INNER JOIN public.users freelancer_u ON freelancer_u.id = cr.freelancer_id
INNER JOIN public.user_profiles freelancer_up ON freelancer_up.user_id = cr.freelancer_id
WHERE client_u.deleted_at IS NULL
  AND freelancer_u.deleted_at IS NULL
  AND TRIM(client_up.full_name) ILIKE 'Nguyễn Thị Thiên Lý'
  AND TRIM(freelancer_up.full_name) ILIKE 'Thạch Thị Huệ Trinh'
  AND TRIM(cr.comment) = 'Tôi rất hài lòng';

COMMIT;
