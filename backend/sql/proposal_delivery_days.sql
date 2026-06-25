-- Số ngày bàn giao dự kiến (F chọn khi gửi đề xuất dịch vụ)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS proposal_delivery_days integer;

COMMENT ON COLUMN public.contracts.proposal_delivery_days IS 'Ngày làm việc dự kiến — chọn ở bước gửi đề xuất (selection)';
