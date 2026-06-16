-- Hợp đồng từ job (client đăng việc): không giới hạn lượt chỉnh sửa
BEGIN;

UPDATE public.contracts
SET revisions_limit = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE job_id IS NOT NULL
  AND service_id IS NULL
  AND revisions_limit <> 0;

COMMIT;
