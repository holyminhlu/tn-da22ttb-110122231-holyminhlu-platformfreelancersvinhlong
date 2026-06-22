-- Khách hàng đã gửi xem xét trước khi admin hỗ trợ cả khách hàng — đặt lại trạng thái chờ duyệt
BEGIN;

UPDATE public.identity_verifications iv
SET admin_review_status = 'pending',
    updated_at = CURRENT_TIMESTAMP
FROM public.users u
WHERE iv.user_id = u.id
  AND u.role = 'client'
  AND u.deleted_at IS NULL
  AND iv.submitted_for_review_at IS NOT NULL
  AND COALESCE(iv.admin_review_status, '') NOT IN ('approved', 'rejected');

COMMIT;
