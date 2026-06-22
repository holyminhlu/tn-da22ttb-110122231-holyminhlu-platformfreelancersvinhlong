-- Khách hàng lưu freelancer yêu thích (hire/search)
CREATE TABLE IF NOT EXISTS public.client_favorite_freelancers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  saved_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS idx_client_favorite_freelancers_client_saved_at
  ON public.client_favorite_freelancers (client_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_favorite_freelancers_freelancer
  ON public.client_favorite_freelancers (freelancer_id);

COMMENT ON TABLE public.client_favorite_freelancers IS 'Freelancer khách hàng đã thêm vào danh sách yêu thích';
