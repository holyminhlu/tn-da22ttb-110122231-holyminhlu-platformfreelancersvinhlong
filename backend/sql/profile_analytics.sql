-- Thống kê hồ sơ freelancer: lượt xem, nhấp web, chuyển đổi dịch vụ/portfolio.
-- Chạy file này một lần trên PostgreSQL của dự án.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type character varying(40) NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  portfolio_id uuid REFERENCES public.freelancer_portfolios(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT profile_analytics_events_type_check CHECK (
    event_type IN (
      'profile_view',
      'website_click',
      'work_invitation',
      'service_view',
      'service_conversion',
      'portfolio_view'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_analytics_freelancer_created
  ON public.profile_analytics_events (freelancer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_analytics_freelancer_type_created
  ON public.profile_analytics_events (freelancer_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_analytics_service
  ON public.profile_analytics_events (service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_analytics_portfolio
  ON public.profile_analytics_events (portfolio_id)
  WHERE portfolio_id IS NOT NULL;

COMMENT ON TABLE public.profile_analytics_events IS
  'Sự kiện analytics hồ sơ freelancer (xem hồ sơ, nhấp web, xem/chuyển đổi dịch vụ, portfolio).';

COMMIT;
