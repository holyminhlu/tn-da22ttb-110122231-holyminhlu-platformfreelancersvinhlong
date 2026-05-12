BEGIN;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS thumbnail_url character varying(2000);

COMMENT ON COLUMN public.services.thumbnail_url IS 'Ảnh đại diện hiển thị trên card dịch vụ (URL https hoặc /uploads/services/...)';

COMMIT;
