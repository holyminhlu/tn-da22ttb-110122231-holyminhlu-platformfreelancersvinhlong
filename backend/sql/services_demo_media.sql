BEGIN;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS demo_media jsonb;

COMMENT ON COLUMN public.services.demo_media IS 'Một file giới thiệu/demo: {"url":"...","kind":"image"|"video"} hoặc null';

COMMIT;
