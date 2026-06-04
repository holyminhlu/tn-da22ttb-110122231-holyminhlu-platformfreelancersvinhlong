-- Cột pricing_type cho báo giá job (fixed / hourly).
BEGIN;

ALTER TABLE public.job_quotes
  ADD COLUMN IF NOT EXISTS pricing_type character varying(20) NOT NULL DEFAULT 'fixed';

ALTER TABLE public.job_quotes
  DROP CONSTRAINT IF EXISTS job_quotes_pricing_type_check;

ALTER TABLE public.job_quotes
  ADD CONSTRAINT job_quotes_pricing_type_check
  CHECK (pricing_type IN ('fixed', 'hourly'));

COMMENT ON COLUMN public.job_quotes.pricing_type IS 'fixed = trọn gói dự án, hourly = theo giờ.';

COMMIT;
