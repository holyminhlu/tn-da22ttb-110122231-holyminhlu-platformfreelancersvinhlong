BEGIN;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category character varying(255),
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tech_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requirements text,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS response_time_hours integer,
  ADD COLUMN IF NOT EXISTS support_upsell character varying(255);

UPDATE public.services
SET
  category = COALESCE(category, 'Lập trình Web > Website Builder & CMS'),
  media_urls = COALESCE(media_urls, '[]'::jsonb),
  packages = COALESCE(
    NULLIF(packages, '[]'::jsonb),
    jsonb_build_array(
      jsonb_build_object(
        'id', 'basic',
        'name', 'Basic',
        'price', GREATEST(500000, ROUND(price * 0.7)),
        'deliveryDays', GREATEST(2, COALESCE(delivery_days, 5) - 2),
        'revisions', '1 lần',
        'features', jsonb_build_array('1 trang', 'Responsive cơ bản', 'Bàn giao mã nguồn')
      ),
      jsonb_build_object(
        'id', 'standard',
        'name', 'Standard',
        'price', GREATEST(900000, ROUND(price)),
        'deliveryDays', GREATEST(3, COALESCE(delivery_days, 5)),
        'revisions', '3 lần',
        'features', jsonb_build_array('3 trang', 'Responsive đầy đủ', 'SEO on-page')
      ),
      jsonb_build_object(
        'id', 'premium',
        'name', 'Premium',
        'price', GREATEST(1400000, ROUND(price * 1.5)),
        'deliveryDays', GREATEST(7, COALESCE(delivery_days, 5) + 4),
        'revisions', 'Không giới hạn',
        'features', jsonb_build_array('5+ trang', 'SEO kỹ thuật', 'Hỗ trợ sau bàn giao 7 ngày')
      )
    )
  ),
  tech_stack = COALESCE(tech_stack, '[]'::jsonb),
  faqs = COALESCE(faqs, '[]'::jsonb),
  response_time_hours = COALESCE(response_time_hours, 1),
  support_upsell = COALESCE(support_upsell, 'Gói bảo trì 1 tháng: 1.200.000 VND');

COMMIT;
