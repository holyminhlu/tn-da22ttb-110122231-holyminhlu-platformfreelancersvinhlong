-- Mở rộng category giao dịch cho hoàn tiền / thanh toán hủy đơn
BEGIN;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_category_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_check
  CHECK (
    category IS NULL
    OR category IN (
      'milestone',
      'deposit',
      'withdraw',
      'processing_fee',
      'refund',
      'escrow_hold',
      'escrow_release',
      'compensation'
    )
  );

COMMIT;
