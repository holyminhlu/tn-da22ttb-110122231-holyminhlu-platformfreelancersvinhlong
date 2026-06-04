-- Mở rộng trạng thái job_quotes cho quy trình screening/interview/offer.
BEGIN;

ALTER TABLE public.job_quotes
  DROP CONSTRAINT IF EXISTS job_quotes_status_check;

ALTER TABLE public.job_quotes
  ADD CONSTRAINT job_quotes_status_check
  CHECK (
    status IN (
      'pending',
      'shortlisted',
      'interviewing',
      'offered',
      'accepted',
      'declined',
      'withdrawn'
    )
  );

COMMIT;

