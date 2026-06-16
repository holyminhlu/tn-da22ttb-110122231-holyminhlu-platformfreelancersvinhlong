-- Phân bổ hoàn tiền / hủy đơn theo chính sách chính đáng
BEGIN;

ALTER TABLE public.contract_cancel_requests
  ADD COLUMN IF NOT EXISTS legitimacy character varying(32),
  ADD COLUMN IF NOT EXISTS split_type character varying(32),
  ADD COLUMN IF NOT EXISTS penalty_percent numeric(5, 4),
  ADD COLUMN IF NOT EXISTS work_done_percent numeric(5, 2),
  ADD COLUMN IF NOT EXISTS client_refund_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS freelancer_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS workflow_stage_at_request character varying(32),
  ADD COLUMN IF NOT EXISTS had_progress_at_request boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_note text;

COMMIT;
