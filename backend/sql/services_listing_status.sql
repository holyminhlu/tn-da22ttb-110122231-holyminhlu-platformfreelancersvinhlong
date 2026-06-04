-- Trạng thái hiển thị dịch vụ (gig) trên marketplace
BEGIN;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS listing_status character varying(32) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS published_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_listing_status_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_listing_status_check
  CHECK (listing_status IN ('draft', 'pending', 'active', 'paused', 'denied'));

UPDATE public.services
SET listing_status = 'active',
    published_at = COALESCE(published_at, created_at)
WHERE listing_status IS NULL OR listing_status = '';

CREATE INDEX IF NOT EXISTS idx_services_freelancer_listing
  ON public.services (freelancer_id, listing_status, created_at DESC);

ALTER TABLE public.contract_reviews
  ADD COLUMN IF NOT EXISTS freelancer_reply text,
  ADD COLUMN IF NOT EXISTS freelancer_reply_at timestamp without time zone;

COMMIT;
