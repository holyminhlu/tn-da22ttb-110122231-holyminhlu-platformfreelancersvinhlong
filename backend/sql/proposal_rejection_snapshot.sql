-- Lưu đề xuất bị từ chối để freelancer xem lại trước khi gửi đề xuất mới
BEGIN;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS last_rejected_proposal_text text,
  ADD COLUMN IF NOT EXISTS last_rejected_proposal_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS proposal_rejection_note text;

COMMIT;
