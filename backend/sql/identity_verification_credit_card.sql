-- Cột xác minh thẻ tín dụng (bước 2 KYC). Chạy sau identity_verification.sql.
-- Không lưu số thẻ đầy đủ, CVV — chỉ 4 số cuối và metadata thanh toán.

BEGIN;

ALTER TABLE public.identity_verifications
  ADD COLUMN IF NOT EXISTS card_last4 character varying(4),
  ADD COLUMN IF NOT EXISTS card_brand character varying(20),
  ADD COLUMN IF NOT EXISTS card_expiry character varying(7),
  ADD COLUMN IF NOT EXISTS cardholder_name character varying(120),
  ADD COLUMN IF NOT EXISTS is_business_card boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_street character varying(255),
  ADD COLUMN IF NOT EXISTS billing_country character varying(100),
  ADD COLUMN IF NOT EXISTS billing_state character varying(100),
  ADD COLUMN IF NOT EXISTS billing_city character varying(100),
  ADD COLUMN IF NOT EXISTS billing_postal character varying(20),
  ADD COLUMN IF NOT EXISTS billing_phone character varying(40),
  ADD COLUMN IF NOT EXISTS billing_currency character varying(40) DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS card_charge_cents integer,
  ADD COLUMN IF NOT EXISTS card_added_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS card_verified_at timestamp without time zone;

COMMENT ON COLUMN public.identity_verifications.card_charge_cents IS
  'Số tiền tạm trừ xác minh (VND), người dùng nhập lại để xác nhận.';

COMMIT;
