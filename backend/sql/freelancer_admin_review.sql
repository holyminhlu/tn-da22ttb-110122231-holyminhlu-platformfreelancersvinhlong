-- Duyệt tài khoản freelancer sau khi hoàn thành 3 bước xác minh danh tính
BEGIN;

ALTER TABLE public.identity_verifications
  ADD COLUMN IF NOT EXISTS admin_review_status character varying(20),
  ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_review_note text;

COMMENT ON COLUMN public.identity_verifications.admin_review_status IS 'pending | approved | rejected — sau bước 3 gửi xem xét';

COMMIT;
