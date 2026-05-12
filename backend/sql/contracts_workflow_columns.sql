-- Tiến độ / bàn giao trên hợp đồng (chạy thủ công khi triển khai DB).

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS progress_note text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS delivered_at timestamp without time zone;
