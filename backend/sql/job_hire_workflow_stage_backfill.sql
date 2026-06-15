-- Đưa hợp đồng job về giai đoạn 1 (selection) nếu bị nhảy thẳng execution/escrow khi chưa nạp ký quỹ
BEGIN;

UPDATE public.contracts c
SET workflow_stage = 'selection',
    status = CASE
      WHEN COALESCE(c.escrow_status, 'none') IN ('funded', 'released') THEN c.status
      ELSE 'pending'
    END,
    escrow_status = CASE
      WHEN c.escrow_status IS NULL OR c.escrow_status = '' THEN 'none'
      ELSE c.escrow_status
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE c.deleted_at IS NULL
  AND c.job_id IS NOT NULL
  AND c.workflow_stage IN ('execution', 'escrow')
  AND COALESCE(c.escrow_status, 'none') NOT IN ('funded', 'released')
  AND c.funded_at IS NULL;

COMMIT;
