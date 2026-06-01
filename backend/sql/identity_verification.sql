-- Xác minh danh tính: thông tin pháp lý, ảnh selfie, giấy tờ, bằng chứng địa chỉ.
-- Chạy file này một lần trên PostgreSQL của dự án.

BEGIN;

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  account_type character varying(20) NOT NULL DEFAULT 'personal',
  use_existing_account_info boolean NOT NULL DEFAULT true,
  legal_first_name character varying(100),
  legal_last_name character varying(100),
  address_search character varying(255),
  address_street character varying(255),
  address_country character varying(100) DEFAULT 'Việt Nam',
  address_state character varying(100),
  address_city character varying(100),
  address_postal character varying(20),
  address_lat double precision,
  address_lng double precision,
  contact_confirmed boolean NOT NULL DEFAULT false,
  contact_confirmed_at timestamp without time zone,
  selfie_url character varying(500),
  id_doc_type character varying(50),
  id_front_url character varying(500),
  id_back_url character varying(500),
  address_proof_type character varying(50),
  address_proof_url character varying(500),
  phone_submitted_at timestamp without time zone,
  photo_submitted_at timestamp without time zone,
  id_submitted_at timestamp without time zone,
  address_proof_submitted_at timestamp without time zone,
  submitted_for_review_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT identity_verifications_account_type_check CHECK (
    account_type IN ('personal', 'company')
  )
);

COMMENT ON TABLE public.identity_verifications IS 'Hồ sơ xác minh danh tính freelancer (KYC).';

COMMIT;
