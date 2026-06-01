-- DEV ONLY: Đánh dấu xác minh bước 2 (thẻ) & bước 3 (gửi xem xét) cho holyminhlu1@gmail.com
-- Chạy một lần: psql -U <user> -d <db> -f backend/sql/dev_bypass_idv_holyminhlu1.sql

BEGIN;

-- Tạo hàng identity_verifications nếu chưa có
INSERT INTO public.identity_verifications (user_id)
SELECT u.id
FROM public.users u
WHERE LOWER(TRIM(u.email)) = 'holyminhlu1@gmail.com'
  AND u.deleted_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Bước 2: thẻ đã thêm + đã xác minh phí tạm
-- Bước 3: đã gửi xem xét
UPDATE public.identity_verifications iv
SET
  card_added_at = COALESCE(iv.card_added_at, CURRENT_TIMESTAMP),
  card_verified_at = COALESCE(iv.card_verified_at, CURRENT_TIMESTAMP),
  card_last4 = COALESCE(iv.card_last4, '4242'),
  card_brand = COALESCE(iv.card_brand, 'visa'),
  card_expiry = COALESCE(iv.card_expiry, '12/28'),
  cardholder_name = COALESCE(iv.cardholder_name, 'Holy Minh Lu'),
  card_charge_cents = COALESCE(iv.card_charge_cents, 123),
  submitted_for_review_at = COALESCE(iv.submitted_for_review_at, CURRENT_TIMESTAMP),
  updated_at = CURRENT_TIMESTAMP
FROM public.users u
WHERE iv.user_id = u.id
  AND LOWER(TRIM(u.email)) = 'holyminhlu1@gmail.com'
  AND u.deleted_at IS NULL;

-- Đủ điều kiện đăng tin (5 mục bước 1) — chỉ set nếu còn thiếu
UPDATE public.identity_verifications iv
SET
  contact_confirmed = true,
  contact_confirmed_at = COALESCE(iv.contact_confirmed_at, CURRENT_TIMESTAMP),
  phone_submitted_at = COALESCE(iv.phone_submitted_at, CURRENT_TIMESTAMP),
  photo_submitted_at = COALESCE(iv.photo_submitted_at, CURRENT_TIMESTAMP),
  id_submitted_at = COALESCE(iv.id_submitted_at, CURRENT_TIMESTAMP),
  address_proof_submitted_at = COALESCE(iv.address_proof_submitted_at, CURRENT_TIMESTAMP),
  selfie_url = COALESCE(iv.selfie_url, 'dev-bypass-selfie'),
  id_front_url = COALESCE(iv.id_front_url, 'dev-bypass-id-front'),
  id_back_url = COALESCE(iv.id_back_url, 'dev-bypass-id-back'),
  address_proof_url = COALESCE(iv.address_proof_url, 'dev-bypass-address-proof'),
  legal_first_name = COALESCE(NULLIF(TRIM(iv.legal_first_name), ''), 'Minh'),
  legal_last_name = COALESCE(NULLIF(TRIM(iv.legal_last_name), ''), 'Lu'),
  address_search = COALESCE(NULLIF(TRIM(iv.address_search), ''), 'Phường Long Châu, Tỉnh Vĩnh Long'),
  address_country = COALESCE(NULLIF(TRIM(iv.address_country), ''), 'Việt Nam'),
  address_state = COALESCE(NULLIF(TRIM(iv.address_state), ''), 'Tỉnh Vĩnh Long'),
  address_city = COALESCE(NULLIF(TRIM(iv.address_city), ''), 'Phường Long Châu'),
  updated_at = CURRENT_TIMESTAMP
FROM public.users u
WHERE iv.user_id = u.id
  AND LOWER(TRIM(u.email)) = 'holyminhlu1@gmail.com'
  AND u.deleted_at IS NULL;

UPDATE public.users u
SET is_phone_verified = true,
    is_email_verified = COALESCE(u.is_email_verified, true)
WHERE LOWER(TRIM(u.email)) = 'holyminhlu1@gmail.com'
  AND u.deleted_at IS NULL;

COMMIT;

-- Kiểm tra (chạy sau COMMIT nếu cần):
-- SELECT u.email, iv.card_verified_at, iv.submitted_for_review_at, iv.contact_confirmed
-- FROM public.users u
-- LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
-- WHERE LOWER(u.email) = 'holyminhlu1@gmail.com';
