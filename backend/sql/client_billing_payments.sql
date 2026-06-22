-- Billing schema cho Khách hàng Payments page (/payments)
-- Bổ sung cấu trúc để lưu: billing methods, auto-billing, billing profile, invoices
-- và metadata giao dịch phục vụ bộ lọc theo project/freelancer/thời gian.

BEGIN;

-- 1) Bổ sung cho accounts: tách số dư khả dụng vs tiền ký quỹ
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS escrow_balance numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

-- 2) Hồ sơ thông tin xuất hóa đơn của khách hàng
CREATE TABLE IF NOT EXISTS public.client_billing_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  company_name character varying(255),
  company_address text,
  tax_id character varying(100),
  billing_email character varying(255),
  contact_name character varying(255),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- 3) Phương thức thanh toán dùng để trừ tiền của khách hàng
CREATE TABLE IF NOT EXISTS public.client_billing_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method_type character varying(20) NOT NULL
    CHECK (method_type IN ('card', 'paypal', 'bank')),
  provider character varying(80),
  card_brand character varying(40),
  card_last4 character varying(4),
  card_exp_month smallint,
  card_exp_year smallint,
  paypal_email character varying(255),
  bank_name character varying(120),
  bank_account_last4 character varying(4),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  auto_billing_enabled boolean NOT NULL DEFAULT false,
  auto_topup_threshold numeric(18,2),
  auto_topup_amount numeric(18,2),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- 1 user chỉ có 1 phương thức mặc định đang active
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_billing_methods_default
  ON public.client_billing_methods (user_id)
  WHERE is_default = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_client_billing_methods_user
  ON public.client_billing_methods (user_id, method_type);

-- 4) Mở rộng transactions để đủ dữ liệu cho khách hàng billing history
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS currency character(3) DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS direction character varying(10)
    CHECK (direction IN ('in', 'out')),
  ADD COLUMN IF NOT EXISTS category character varying(40)
    CHECK (category IN ('milestone', 'deposit', 'withdraw', 'processing_fee', 'refund', 'escrow_hold', 'escrow_release')),
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS freelancer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS occurred_at timestamp without time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_transactions_client_filters
  ON public.transactions (user_id, occurred_at DESC, category);

CREATE INDEX IF NOT EXISTS idx_transactions_project_filter
  ON public.transactions (job_id, freelancer_id, occurred_at DESC);

-- 5) Bảng hóa đơn tương ứng mỗi giao dịch cần xuất chứng từ
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid UNIQUE NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_number character varying(80) UNIQUE NOT NULL,
  issued_at timestamp without time zone NOT NULL DEFAULT now(),
  currency character(3) NOT NULL DEFAULT 'VND',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  fee_amount numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  status character varying(20) NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'void', 'refunded')),
  pdf_url text,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_issued
  ON public.billing_invoices (user_id, issued_at DESC);

COMMIT;
