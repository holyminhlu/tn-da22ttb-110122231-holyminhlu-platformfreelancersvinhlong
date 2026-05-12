-- Một job chỉ có tối đa một hợp đồng đang pending/active (tránh race condition song song).
-- Chạy thủ công trên PostgreSQL nếu cần: psql -f backend/sql/unique_active_contract_per_job.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_one_open_per_job
  ON public.contracts (job_id)
  WHERE deleted_at IS NULL
    AND job_id IS NOT NULL
    AND status IN ('pending', 'active');
