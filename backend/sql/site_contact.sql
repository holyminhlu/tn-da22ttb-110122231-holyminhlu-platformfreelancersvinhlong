-- Thông tin liên hệ website + liên kết mạng xã hội (quản lý từ Admin).

CREATE TABLE IF NOT EXISTS public.site_contact (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.site_contact (id, email, phone, address)
VALUES (1, 'vinhlongconnect@gmail.com', '0983149203', 'Tiểu Cần, Vĩnh Long')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.contact_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.contact_social_links (platform, label, url, sort_order)
SELECT v.platform, v.label, v.url, v.sort_order
FROM (
  VALUES
    ('facebook', 'Facebook', '', 1),
    ('twitter', 'Twitter / X', '', 2),
    ('linkedin', 'LinkedIn', '', 3)
) AS v(platform, label, url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.contact_social_links LIMIT 1);
