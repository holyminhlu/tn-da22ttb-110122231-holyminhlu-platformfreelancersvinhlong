--
-- PostgreSQL database dump
--

\restrict aW4ItWnYGz3piqVRkCaeaxf2ehRXrPtRofcmDkJF69jmLIUcxYDb05IovIP5O9F

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: contract_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contract_status AS ENUM (
    'pending',
    'active',
    'completed',
    'cancelled',
    'disputed'
);


ALTER TYPE public.contract_status OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: update_freelancer_rating(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_freelancer_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_freelancer_id uuid;
BEGIN

    -- Xác định freelancer cần update
    IF TG_OP = 'DELETE' THEN
        v_freelancer_id := OLD.reviewee_id;
    ELSE
        v_freelancer_id := NEW.reviewee_id;
    END IF;

    -- Update bằng subquery aggregate (KHÔNG lock toàn bảng)
    UPDATE public.freelancer_profiles fp
    SET 
        rating_avg = COALESCE(sub.avg_rating, 0),
        total_reviews = COALESCE(sub.total_reviews, 0),
        updated_at = now()
    FROM (
        SELECT 
            reviewee_id,
            AVG(rating)::numeric(3,2) AS avg_rating,
            COUNT(*) AS total_reviews
        FROM public.reviews
        WHERE reviewee_id = v_freelancer_id
          AND deleted_at IS NULL
        GROUP BY reviewee_id
    ) sub
    WHERE fp.user_id = sub.reviewee_id;

    -- Nếu không còn review nào
    IF NOT FOUND THEN
        UPDATE public.freelancer_profiles
        SET rating_avg = 0,
            total_reviews = 0,
            updated_at = now()
        WHERE user_id = v_freelancer_id;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_freelancer_rating() OWNER TO postgres;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;	
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance numeric(18,2) DEFAULT 0 NOT NULL,
    currency character(3) DEFAULT 'VND'::bpchar NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    escrow_balance numeric(18,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: billing_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    user_id uuid NOT NULL,
    invoice_number character varying(80) NOT NULL,
    issued_at timestamp without time zone DEFAULT now() NOT NULL,
    currency character(3) DEFAULT 'VND'::bpchar NOT NULL,
    subtotal numeric(18,2) DEFAULT 0 NOT NULL,
    fee_amount numeric(18,2) DEFAULT 0 NOT NULL,
    total_amount numeric(18,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'issued'::character varying NOT NULL,
    pdf_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['issued'::character varying, 'void'::character varying, 'refunded'::character varying])::text[])))
);


ALTER TABLE public.billing_invoices OWNER TO postgres;

--
-- Name: chat_blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_blocks (
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_blocks_not_self CHECK ((blocker_id <> blocked_id))
);


ALTER TABLE public.chat_blocks OWNER TO postgres;

--
-- Name: chat_conversation_user_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_conversation_user_state (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    hidden_at timestamp with time zone,
    last_read_at timestamp with time zone
);


ALTER TABLE public.chat_conversation_user_state OWNER TO postgres;

--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    job_quote_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_id uuid,
    context_title text,
    CONSTRAINT chat_conversations_participants_check CHECK ((client_id <> freelancer_id))
);


ALTER TABLE public.chat_conversations OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind character varying(20) DEFAULT 'text'::character varying NOT NULL,
    context_type character varying(20),
    attachment_url text,
    attachment_name text,
    attachment_mime text,
    CONSTRAINT chat_messages_body_not_empty CHECK ((char_length(TRIM(BOTH FROM body)) > 0)),
    CONSTRAINT chat_messages_context_type_check CHECK (((context_type IS NULL) OR ((context_type)::text = ANY ((ARRAY['job'::character varying, 'service'::character varying])::text[])))),
    CONSTRAINT chat_messages_kind_check CHECK (((kind)::text = ANY ((ARRAY['text'::character varying, 'context'::character varying, 'image'::character varying, 'file'::character varying])::text[])))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: client_billing_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_billing_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    method_type character varying(20) NOT NULL,
    provider character varying(80),
    card_brand character varying(40),
    card_last4 character varying(4),
    card_exp_month smallint,
    card_exp_year smallint,
    paypal_email character varying(255),
    bank_name character varying(120),
    bank_account_last4 character varying(4),
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    auto_billing_enabled boolean DEFAULT false NOT NULL,
    auto_topup_threshold numeric(18,2),
    auto_topup_amount numeric(18,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_billing_methods_method_type_check CHECK (((method_type)::text = ANY ((ARRAY['card'::character varying, 'paypal'::character varying, 'bank'::character varying])::text[])))
);


ALTER TABLE public.client_billing_methods OWNER TO postgres;

--
-- Name: client_billing_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_billing_profiles (
    user_id uuid NOT NULL,
    company_name character varying(255),
    company_address text,
    tax_id character varying(100),
    billing_email character varying(255),
    contact_name character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.client_billing_profiles OWNER TO postgres;

--
-- Name: client_favorite_freelancers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_favorite_freelancers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    saved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.client_favorite_freelancers OWNER TO postgres;

--
-- Name: TABLE client_favorite_freelancers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.client_favorite_freelancers IS 'Freelancer client đã thêm vào danh sách yêu thích';


--
-- Name: contact_social_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_social_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    label text NOT NULL,
    url text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.contact_social_links OWNER TO postgres;

--
-- Name: contract_cancel_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_cancel_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    reason text NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    respond_by_at timestamp without time zone NOT NULL,
    freelancer_response text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reason_code character varying(64),
    detail text,
    refund_method character varying(32) DEFAULT 'wallet'::character varying,
    legitimacy character varying(32),
    split_type character varying(32),
    penalty_percent numeric(5,4),
    work_done_percent numeric(5,2),
    client_refund_amount numeric(14,2),
    freelancer_amount numeric(14,2),
    platform_fee_amount numeric(14,2),
    workflow_stage_at_request character varying(32),
    had_progress_at_request boolean DEFAULT false NOT NULL,
    admin_note text,
    CONSTRAINT contract_cancel_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'auto_approved'::character varying, 'withdrawn'::character varying])::text[])))
);


ALTER TABLE public.contract_cancel_requests OWNER TO postgres;

--
-- Name: contract_dispute_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_dispute_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dispute_id uuid NOT NULL,
    author_id uuid,
    author_role character varying(16) NOT NULL,
    body text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT contract_dispute_messages_author_role_check CHECK (((author_role)::text = ANY ((ARRAY['client'::character varying, 'freelancer'::character varying, 'admin'::character varying, 'system'::character varying])::text[])))
);


ALTER TABLE public.contract_dispute_messages OWNER TO postgres;

--
-- Name: contract_disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    reason text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'open'::character varying NOT NULL,
    resolution character varying(32),
    admin_notes text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    issue_category character varying(64),
    desired_resolution character varying(64),
    desired_resolution_note text,
    dispute_stage character varying(32) DEFAULT 'initiated'::character varying,
    respond_by_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contract_disputes_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))
);


ALTER TABLE public.contract_disputes OWNER TO postgres;

--
-- Name: contract_milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    amount numeric(12,2) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT contract_milestones_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'funded'::character varying, 'in_progress'::character varying, 'submitted'::character varying, 'approved'::character varying, 'paid'::character varying])::text[])))
);


ALTER TABLE public.contract_milestones OWNER TO postgres;

--
-- Name: contract_progress_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_progress_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    entry_type character varying(32) NOT NULL,
    note text NOT NULL,
    demo_url text,
    actor_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT contract_progress_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['progress'::character varying, 'revision'::character varying])::text[])))
);


ALTER TABLE public.contract_progress_entries OWNER TO postgres;

--
-- Name: contract_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    job_id uuid NOT NULL,
    client_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    freelancer_reply text,
    freelancer_reply_at timestamp without time zone,
    CONSTRAINT contract_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.contract_reviews OWNER TO postgres;

--
-- Name: contract_workflow_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_workflow_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    event_type character varying(64) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    actor_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.contract_workflow_events OWNER TO postgres;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    service_id uuid,
    client_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    agreed_price numeric(12,2),
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status public.contract_status NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    progress_note text,
    delivered_at timestamp without time zone,
    workflow_stage character varying(32) DEFAULT 'selection'::character varying NOT NULL,
    escrow_status character varying(32) DEFAULT 'none'::character varying NOT NULL,
    package_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    client_brief text,
    proposal_text text,
    proposal_budget numeric(12,2),
    proposal_submitted_at timestamp without time zone,
    demo_url character varying(2000),
    revisions_limit integer DEFAULT 2 NOT NULL,
    revisions_used integer DEFAULT 0 NOT NULL,
    funded_at timestamp without time zone,
    released_at timestamp without time zone,
    accepted_at timestamp without time zone,
    stage_deadline_at timestamp without time zone,
    escrow_deadline_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    cancelled_by uuid,
    cancel_reason text,
    cancel_type character varying(32),
    delivery_review_deadline_at timestamp without time zone,
    auto_accepted_at timestamp without time zone,
    revision_requested_at timestamp without time zone,
    sla_reminder_48_sent boolean DEFAULT false NOT NULL,
    sla_reminder_24_sent boolean DEFAULT false NOT NULL,
    last_rejected_proposal_text text,
    last_rejected_proposal_at timestamp without time zone,
    proposal_rejection_note text,
    proposal_delivery_days integer
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: COLUMN contracts.proposal_delivery_days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.contracts.proposal_delivery_days IS 'Ngày làm việc dự kiến — chọn ở bước gửi đề xuất (selection)';


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_verification_tokens (
    user_id uuid,
    token text,
    expires_at timestamp without time zone
);


ALTER TABLE public.email_verification_tokens OWNER TO postgres;

--
-- Name: freelancer_exclusive_resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.freelancer_exclusive_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    resource_type character varying(20) DEFAULT 'link'::character varying NOT NULL,
    link_url character varying(500),
    file_url character varying(500),
    file_name character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT freelancer_exclusive_resources_type_chk CHECK (((resource_type)::text = ANY ((ARRAY['link'::character varying, 'file'::character varying])::text[])))
);


ALTER TABLE public.freelancer_exclusive_resources OWNER TO postgres;

--
-- Name: TABLE freelancer_exclusive_resources; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.freelancer_exclusive_resources IS 'Tài nguyên dành riêng (link hoặc file) freelancer chia sẻ với khách hàng.';


--
-- Name: freelancer_payout_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.freelancer_payout_accounts (
    user_id uuid NOT NULL,
    bank_name character varying(120) NOT NULL,
    account_holder_name character varying(255) NOT NULL,
    account_number character varying(32) NOT NULL,
    linked_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    bank_bin character varying(6)
);


ALTER TABLE public.freelancer_payout_accounts OWNER TO postgres;

--
-- Name: freelancer_portfolios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.freelancer_portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    project_url text,
    images jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.freelancer_portfolios OWNER TO postgres;

--
-- Name: freelancer_profile_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.freelancer_profile_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    file_url character varying(500) NOT NULL,
    file_name character varying(255),
    file_size integer,
    mime_type character varying(120),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.freelancer_profile_files OWNER TO postgres;

--
-- Name: TABLE freelancer_profile_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.freelancer_profile_files IS 'Tệp tin đính kèm trên hồ sơ freelancer.';


--
-- Name: freelancer_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.freelancer_profiles (
    user_id uuid NOT NULL,
    title character varying(255),
    hourly_rate numeric(10,2),
    experience_years integer,
    availability_status character varying(50),
    total_earnings numeric(12,2) DEFAULT 0,
    rating_avg numeric(3,2) DEFAULT 0,
    total_reviews integer DEFAULT 0,
    languages jsonb DEFAULT '[]'::jsonb,
    deleted_at timestamp without time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    job_success_score smallint,
    avg_response_minutes integer,
    profile_badges jsonb DEFAULT '[]'::jsonb NOT NULL
)
WITH (fillfactor='80');


ALTER TABLE public.freelancer_profiles OWNER TO postgres;

--
-- Name: COLUMN freelancer_profiles.job_success_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.freelancer_profiles.job_success_score IS 'Điểm thành công hợp đồng (0–100), nhập thủ công hoặc cập nhật từ batch sau.';


--
-- Name: COLUMN freelancer_profiles.avg_response_minutes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.freelancer_profiles.avg_response_minutes IS 'Thời gian phản hồi trung bình (phút), phục vụ hiển thị “trả lời trong X giờ”.';


--
-- Name: COLUMN freelancer_profiles.profile_badges; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.freelancer_profiles.profile_badges IS 'Mảng chuỗi huy hiệu/hạn ngữ hiển thị trên hồ sơ (vd: Top Rated, Đã xác thực địa phương).';


--
-- Name: freelancer_withdrawal_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.freelancer_withdrawal_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reference_id character varying(64) NOT NULL,
    amount numeric(18,2) NOT NULL,
    status character varying(24) DEFAULT 'PENDING_AUTH'::character varying NOT NULL,
    payos_payout_id character varying(128),
    payos_tx_id character varying(128),
    payos_tx_state character varying(32),
    bank_name character varying(120) NOT NULL,
    account_holder_name character varying(255) NOT NULL,
    account_last4 character varying(4) DEFAULT ''::character varying NOT NULL,
    to_bin character varying(6) NOT NULL,
    to_account_number character varying(32) NOT NULL,
    description character varying(100),
    failure_reason text,
    transaction_id uuid,
    auth_verified_at timestamp without time zone,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT freelancer_withdrawal_orders_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT freelancer_withdrawal_orders_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING_AUTH'::character varying, 'PROCESSING'::character varying, 'SUCCEEDED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.freelancer_withdrawal_orders OWNER TO postgres;

--
-- Name: freelancer_withdrawal_pins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.freelancer_withdrawal_pins (
    user_id uuid NOT NULL,
    pin_hash character varying(255) NOT NULL,
    failed_attempts smallint DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.freelancer_withdrawal_pins OWNER TO postgres;

--
-- Name: identity_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.identity_verifications (
    user_id uuid NOT NULL,
    account_type character varying(20) DEFAULT 'personal'::character varying NOT NULL,
    use_existing_account_info boolean DEFAULT true NOT NULL,
    legal_first_name character varying(100),
    legal_last_name character varying(100),
    address_search character varying(255),
    address_street character varying(255),
    address_country character varying(100) DEFAULT 'Việt Nam'::character varying,
    address_state character varying(100),
    address_city character varying(100),
    address_postal character varying(20),
    contact_confirmed boolean DEFAULT false NOT NULL,
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    card_last4 character varying(4),
    card_brand character varying(20),
    card_expiry character varying(7),
    cardholder_name character varying(120),
    is_business_card boolean DEFAULT false NOT NULL,
    billing_street character varying(255),
    billing_country character varying(100),
    billing_state character varying(100),
    billing_city character varying(100),
    billing_postal character varying(20),
    billing_phone character varying(40),
    billing_currency character varying(40) DEFAULT 'VND'::character varying,
    card_charge_cents integer,
    card_added_at timestamp without time zone,
    card_verified_at timestamp without time zone,
    address_lat double precision,
    address_lng double precision,
    admin_review_status character varying(20),
    admin_reviewed_at timestamp without time zone,
    admin_reviewed_by uuid,
    admin_review_note text,
    CONSTRAINT identity_verifications_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['personal'::character varying, 'company'::character varying])::text[])))
);


ALTER TABLE public.identity_verifications OWNER TO postgres;

--
-- Name: TABLE identity_verifications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.identity_verifications IS 'Hồ sơ xác minh danh tính freelancer (KYC).';


--
-- Name: COLUMN identity_verifications.card_charge_cents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.identity_verifications.card_charge_cents IS 'Số tiền tạm trừ xác minh (cent USD), người dùng nhập lại để xác nhận.';


--
-- Name: COLUMN identity_verifications.address_lat; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.identity_verifications.address_lat IS 'Vĩ độ từ GPS hoặc chọn trên bản đồ (Nominatim).';


--
-- Name: COLUMN identity_verifications.address_lng; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.identity_verifications.address_lng IS 'Kinh độ từ GPS hoặc chọn trên bản đồ (Nominatim).';


--
-- Name: COLUMN identity_verifications.admin_review_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.identity_verifications.admin_review_status IS 'pending | approved | rejected — sau bước 3 gửi xem xét';


--
-- Name: job_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    amount numeric(12,2),
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pricing_type character varying(20) DEFAULT 'fixed'::character varying NOT NULL,
    CONSTRAINT job_quotes_pricing_type_check CHECK (((pricing_type)::text = ANY ((ARRAY['fixed'::character varying, 'hourly'::character varying])::text[]))),
    CONSTRAINT job_quotes_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'shortlisted'::character varying, 'interviewing'::character varying, 'offered'::character varying, 'accepted'::character varying, 'declined'::character varying, 'withdrawn'::character varying])::text[])))
);


ALTER TABLE public.job_quotes OWNER TO postgres;

--
-- Name: COLUMN job_quotes.pricing_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_quotes.pricing_type IS 'fixed = trọn gói dự án, hourly = theo giờ.';


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    budget numeric(12,2),
    status character varying(20) DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    due_at timestamp without time zone,
    location_label text,
    location_lat double precision,
    location_lng double precision,
    category character varying(255),
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    budget_type character varying(20) DEFAULT 'fixed'::character varying NOT NULL,
    budget_max numeric(12,2),
    deleted_at timestamp without time zone,
    CONSTRAINT jobs_budget_type_check CHECK (((budget_type)::text = ANY ((ARRAY['fixed'::character varying, 'hourly'::character varying])::text[]))),
    CONSTRAINT jobs_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'closed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: COLUMN jobs.images; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.images IS 'Mảng URL ảnh đính kèm tin (tối đa 3)';


--
-- Name: COLUMN jobs.due_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.due_at IS 'Thời điểm mong muốn hoàn thành (tùy chọn, gấp)';


--
-- Name: COLUMN jobs.location_label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.location_label IS 'Mô tả địa điểm làm việc do client nhập (VD: TP. Vĩnh Long — phường 1)';


--
-- Name: COLUMN jobs.location_lat; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.location_lat IS 'Vĩ độ khi client dùng GPS lúc đăng tin (tùy chọn)';


--
-- Name: COLUMN jobs.location_lng; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.location_lng IS 'Kinh độ khi client dùng GPS lúc đăng tin (tùy chọn)';


--
-- Name: COLUMN jobs.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.category IS 'Danh mục việc (hiển thị trên card Find Work)';


--
-- Name: COLUMN jobs.tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.tags IS 'Thẻ kỹ năng / từ khóa (mảng chuỗi JSON)';


--
-- Name: COLUMN jobs.budget_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.budget_type IS 'fixed = trọn gói, hourly = theo giờ (budget = mức giờ hoặc ngân sách chính).';


--
-- Name: COLUMN jobs.budget_max; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.budget_max IS 'Ngân sách tối đa / trần dự án (VND).';


--
-- Name: COLUMN jobs.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jobs.deleted_at IS 'Client xóa mềm tin — không hiển thị trong quản lý / danh sách của client';


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    account_id uuid NOT NULL,
    amount numeric(18,2) NOT NULL,
    direction character varying(10),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT ledger_entries_direction_check CHECK (((direction)::text = ANY ((ARRAY['debit'::character varying, 'credit'::character varying])::text[])))
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    ip_address character varying(45) NOT NULL,
    success boolean NOT NULL,
    attempted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.login_attempts OWNER TO postgres;

--
-- Name: TABLE login_attempts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.login_attempts IS 'Tracks login attempts for rate limiting and security';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category character varying(32) DEFAULT 'system'::character varying NOT NULL,
    action character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    href character varying(512),
    actor_id uuid,
    actor_name character varying(255),
    entity_type character varying(32),
    entity_id uuid,
    read_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: oauth_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.oauth_accounts (
    user_id uuid,
    provider character varying(50) NOT NULL,
    provider_user_id character varying(255) NOT NULL
);


ALTER TABLE public.oauth_accounts OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    user_id uuid,
    token text,
    expires_at timestamp without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: profile_analytics_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    event_type character varying(40) NOT NULL,
    service_id uuid,
    portfolio_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT profile_analytics_events_type_check CHECK (((event_type)::text = ANY ((ARRAY['profile_view'::character varying, 'website_click'::character varying, 'work_invitation'::character varying, 'service_view'::character varying, 'service_conversion'::character varying, 'portfolio_view'::character varying])::text[])))
);


ALTER TABLE public.profile_analytics_events OWNER TO postgres;

--
-- Name: TABLE profile_analytics_events; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.profile_analytics_events IS 'Sự kiện analytics hồ sơ freelancer (xem hồ sơ, nhấp web, xem/chuyển đổi dịch vụ, portfolio).';


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent text,
    is_revoked boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    revoked_at timestamp without time zone
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.refresh_tokens IS 'Stores refresh tokens for JWT authentication';


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid,
    reviewer_id uuid,
    reviewee_id uuid,
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
)
WITH (fillfactor='80');


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: saved_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    job_id uuid NOT NULL,
    saved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.saved_jobs OWNER TO postgres;

--
-- Name: TABLE saved_jobs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.saved_jobs IS 'Công việc freelancer đã lưu từ marketplace Tìm việc';


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schema_migrations_id_seq OWNER TO postgres;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_categories (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.service_categories OWNER TO postgres;

--
-- Name: service_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_categories_id_seq OWNER TO postgres;

--
-- Name: service_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    freelancer_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    delivery_days integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(255),
    media_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    packages jsonb DEFAULT '[]'::jsonb NOT NULL,
    tech_stack jsonb DEFAULT '[]'::jsonb NOT NULL,
    requirements text,
    faqs jsonb DEFAULT '[]'::jsonb NOT NULL,
    response_time_hours integer,
    support_upsell character varying(255),
    demo_media jsonb,
    thumbnail_url character varying(2000),
    listing_status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    admin_note text,
    published_at timestamp without time zone,
    CONSTRAINT services_listing_status_check CHECK (((listing_status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'active'::character varying, 'paused'::character varying, 'denied'::character varying])::text[])))
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: COLUMN services.demo_media; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.services.demo_media IS 'Một file giới thiệu/demo: {"url":"...","kind":"image"|"video"} hoặc null';


--
-- Name: COLUMN services.thumbnail_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.services.thumbnail_url IS 'Ảnh đại diện hiển thị trên card dịch vụ (URL https hoặc /uploads/services/...)';


--
-- Name: site_contact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_contact (
    id smallint DEFAULT 1 NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT site_contact_id_check CHECK ((id = 1))
);


ALTER TABLE public.site_contact OWNER TO postgres;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.skills_id_seq OWNER TO postgres;

--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid,
    type character varying(50) NOT NULL,
    status character varying(30) NOT NULL,
    idempotency_key text,
    created_at timestamp without time zone DEFAULT now(),
    user_id uuid,
    amount numeric(18,2),
    currency character(3) DEFAULT 'VND'::bpchar,
    direction character varying(10),
    category character varying(40),
    job_id uuid,
    freelancer_id uuid,
    description text,
    occurred_at timestamp without time zone DEFAULT now(),
    CONSTRAINT transactions_category_check CHECK (((category IS NULL) OR ((category)::text = ANY ((ARRAY['milestone'::character varying, 'deposit'::character varying, 'withdraw'::character varying, 'processing_fee'::character varying, 'refund'::character varying, 'escrow_hold'::character varying, 'escrow_release'::character varying, 'compensation'::character varying])::text[])))),
    CONSTRAINT transactions_direction_check CHECK (((direction)::text = ANY ((ARRAY['in'::character varying, 'out'::character varying])::text[])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: user_login_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_login_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    ip_address inet,
    user_agent text,
    logged_in_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_login_logs OWNER TO postgres;

--
-- Name: user_payout_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_payout_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    provider character varying(50),
    provider_account_id text,
    is_default boolean DEFAULT false
);


ALTER TABLE public.user_payout_methods OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    user_id uuid NOT NULL,
    full_name character varying(255),
    avatar_url text,
    phone character varying(20),
    date_of_birth date,
    gender character varying(20),
    bio text,
    website text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location public.geography(Point,4326),
    tagline character varying(220),
    district_city character varying(180),
    city character varying(120),
    state_province character varying(120),
    country character varying(120),
    client_satisfaction_score smallint,
    cover_url character varying(500)
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: COLUMN user_profiles.tagline; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.tagline IS 'Dòng định vị ngắn hiển thị dưới tên (vd: Chuyên gia Full-Stack | Node & React).';


--
-- Name: COLUMN user_profiles.district_city; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.district_city IS 'Địa danh hiển thị cấp quận/huyện/thị xã/thành phố (hyper-local).';


--
-- Name: COLUMN user_profiles.city; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.city IS 'Thành phố / đô thị (hiển thị tìm kiếm freelancer).';


--
-- Name: COLUMN user_profiles.state_province; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.state_province IS 'Bang / tỉnh / vùng.';


--
-- Name: COLUMN user_profiles.country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.country IS 'Quốc gia hiển thị trên card employer (job list).';


--
-- Name: COLUMN user_profiles.client_satisfaction_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.client_satisfaction_score IS 'Điểm hài lòng employer 0–100 (tùy chọn, hiển thị trên card).';


--
-- Name: COLUMN user_profiles.cover_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_profiles.cover_url IS 'URL ảnh bìa hồ sơ freelancer (tải qua upload dịch vụ / lưu đường dẫn tương đối).';


--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_skills (
    user_id uuid NOT NULL,
    skill_id integer NOT NULL,
    level character varying(20),
    years_of_experience integer DEFAULT 0,
    CONSTRAINT user_skills_years_of_experience_check CHECK ((years_of_experience >= 0))
);


ALTER TABLE public.user_skills OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    is_email_verified boolean DEFAULT false,
    is_phone_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    google_id character varying(255),
    password_user_set_at timestamp without time zone,
    recovery_email character varying(255),
    recovery_phone character varying(40),
    login_alerts_enabled boolean DEFAULT true NOT NULL,
    deactivated_at timestamp without time zone,
    notification_prefs jsonb DEFAULT '{"orders": true, "quotes": true, "messages": true, "emailDigest": false}'::jsonb NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['client'::character varying, 'freelancer'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.recovery_email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.recovery_email IS 'Email khôi phục (có thể khác email đăng nhập)';


--
-- Name: COLUMN users.recovery_phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.recovery_phone IS 'SĐT khôi phục (có thể khác SĐT hồ sơ)';


--
-- Name: COLUMN users.login_alerts_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.login_alerts_enabled IS 'Gửi cảnh báo khi đăng nhập từ IP/thiết bị mới';


--
-- Name: COLUMN users.deactivated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.deactivated_at IS 'Tài khoản tạm khóa bởi người dùng';


--
-- Name: COLUMN users.notification_prefs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.notification_prefs IS 'Tùy chọn thông báo in-app: orders, messages, quotes';


--
-- Name: wallet_deposit_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_deposit_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_code bigint NOT NULL,
    amount numeric(18,2) NOT NULL,
    type character varying(20) DEFAULT 'DEPOSIT'::character varying NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    payment_link_id character varying(128),
    checkout_url text,
    payos_reference character varying(128),
    transaction_id uuid,
    cancel_reason text,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_deposit_orders_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT wallet_deposit_orders_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SUCCESS'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.wallet_deposit_orders OWNER TO postgres;

--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: service_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);


--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('public.skills_id_seq'::regclass);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_user_id_currency_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_currency_key UNIQUE (user_id, currency);


--
-- Name: billing_invoices billing_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: billing_invoices billing_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_pkey PRIMARY KEY (id);


--
-- Name: billing_invoices billing_invoices_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_transaction_id_key UNIQUE (transaction_id);


--
-- Name: chat_blocks chat_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_blocks
    ADD CONSTRAINT chat_blocks_pkey PRIMARY KEY (blocker_id, blocked_id);


--
-- Name: chat_conversation_user_state chat_conversation_user_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversation_user_state
    ADD CONSTRAINT chat_conversation_user_state_pkey PRIMARY KEY (conversation_id, user_id);


--
-- Name: chat_conversations chat_conversations_client_freelancer_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_client_freelancer_unique UNIQUE (client_id, freelancer_id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: client_billing_methods client_billing_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_billing_methods
    ADD CONSTRAINT client_billing_methods_pkey PRIMARY KEY (id);


--
-- Name: client_billing_profiles client_billing_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_billing_profiles
    ADD CONSTRAINT client_billing_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: client_favorite_freelancers client_favorite_freelancers_client_id_freelancer_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_favorite_freelancers
    ADD CONSTRAINT client_favorite_freelancers_client_id_freelancer_id_key UNIQUE (client_id, freelancer_id);


--
-- Name: client_favorite_freelancers client_favorite_freelancers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_favorite_freelancers
    ADD CONSTRAINT client_favorite_freelancers_pkey PRIMARY KEY (id);


--
-- Name: contact_social_links contact_social_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_social_links
    ADD CONSTRAINT contact_social_links_pkey PRIMARY KEY (id);


--
-- Name: contract_cancel_requests contract_cancel_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_cancel_requests
    ADD CONSTRAINT contract_cancel_requests_pkey PRIMARY KEY (id);


--
-- Name: contract_dispute_messages contract_dispute_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_dispute_messages
    ADD CONSTRAINT contract_dispute_messages_pkey PRIMARY KEY (id);


--
-- Name: contract_disputes contract_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_disputes
    ADD CONSTRAINT contract_disputes_pkey PRIMARY KEY (id);


--
-- Name: contract_milestones contract_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_milestones
    ADD CONSTRAINT contract_milestones_pkey PRIMARY KEY (id);


--
-- Name: contract_progress_entries contract_progress_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_progress_entries
    ADD CONSTRAINT contract_progress_entries_pkey PRIMARY KEY (id);


--
-- Name: contract_reviews contract_reviews_client_id_contract_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_reviews
    ADD CONSTRAINT contract_reviews_client_id_contract_id_key UNIQUE (client_id, contract_id);


--
-- Name: contract_reviews contract_reviews_contract_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_reviews
    ADD CONSTRAINT contract_reviews_contract_id_key UNIQUE (contract_id);


--
-- Name: contract_reviews contract_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_reviews
    ADD CONSTRAINT contract_reviews_pkey PRIMARY KEY (id);


--
-- Name: contract_workflow_events contract_workflow_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_workflow_events
    ADD CONSTRAINT contract_workflow_events_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: freelancer_exclusive_resources freelancer_exclusive_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_exclusive_resources
    ADD CONSTRAINT freelancer_exclusive_resources_pkey PRIMARY KEY (id);


--
-- Name: freelancer_payout_accounts freelancer_payout_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_payout_accounts
    ADD CONSTRAINT freelancer_payout_accounts_pkey PRIMARY KEY (user_id);


--
-- Name: freelancer_portfolios freelancer_portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_portfolios
    ADD CONSTRAINT freelancer_portfolios_pkey PRIMARY KEY (id);


--
-- Name: freelancer_profile_files freelancer_profile_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_profile_files
    ADD CONSTRAINT freelancer_profile_files_pkey PRIMARY KEY (id);


--
-- Name: freelancer_profiles freelancer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_profiles
    ADD CONSTRAINT freelancer_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: freelancer_withdrawal_orders freelancer_withdrawal_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_withdrawal_orders
    ADD CONSTRAINT freelancer_withdrawal_orders_pkey PRIMARY KEY (id);


--
-- Name: freelancer_withdrawal_orders freelancer_withdrawal_orders_reference_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_withdrawal_orders
    ADD CONSTRAINT freelancer_withdrawal_orders_reference_id_key UNIQUE (reference_id);


--
-- Name: freelancer_withdrawal_pins freelancer_withdrawal_pins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_withdrawal_pins
    ADD CONSTRAINT freelancer_withdrawal_pins_pkey PRIMARY KEY (user_id);


--
-- Name: identity_verifications identity_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_verifications
    ADD CONSTRAINT identity_verifications_pkey PRIMARY KEY (user_id);


--
-- Name: job_quotes job_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_quotes
    ADD CONSTRAINT job_quotes_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_accounts oauth_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_pkey PRIMARY KEY (provider, provider_user_id);


--
-- Name: profile_analytics_events profile_analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_analytics_events
    ADD CONSTRAINT profile_analytics_events_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: saved_jobs saved_jobs_freelancer_id_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_freelancer_id_job_id_key UNIQUE (freelancer_id, job_id);


--
-- Name: saved_jobs saved_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_name_key UNIQUE (name);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: site_contact site_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_contact
    ADD CONSTRAINT site_contact_pkey PRIMARY KEY (id);


--
-- Name: skills skills_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_key UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_login_logs user_login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_pkey PRIMARY KEY (id);


--
-- Name: user_payout_methods user_payout_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_payout_methods
    ADD CONSTRAINT user_payout_methods_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (user_id, skill_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallet_deposit_orders wallet_deposit_orders_order_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_deposit_orders
    ADD CONSTRAINT wallet_deposit_orders_order_code_key UNIQUE (order_code);


--
-- Name: wallet_deposit_orders wallet_deposit_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_deposit_orders
    ADD CONSTRAINT wallet_deposit_orders_pkey PRIMARY KEY (id);


--
-- Name: idx_billing_invoices_user_issued; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_invoices_user_issued ON public.billing_invoices USING btree (user_id, issued_at DESC);


--
-- Name: idx_chat_blocks_blocked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_blocks_blocked ON public.chat_blocks USING btree (blocked_id);


--
-- Name: idx_chat_conv_user_state_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_conv_user_state_user ON public.chat_conversation_user_state USING btree (user_id);


--
-- Name: idx_chat_conversations_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_conversations_client ON public.chat_conversations USING btree (client_id, updated_at DESC);


--
-- Name: idx_chat_conversations_freelancer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_conversations_freelancer ON public.chat_conversations USING btree (freelancer_id, updated_at DESC);


--
-- Name: idx_chat_conversations_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_conversations_service ON public.chat_conversations USING btree (service_id) WHERE (service_id IS NOT NULL);


--
-- Name: idx_chat_messages_conversation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_conversation_created ON public.chat_messages USING btree (conversation_id, created_at);


--
-- Name: idx_client_billing_methods_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_client_billing_methods_default ON public.client_billing_methods USING btree (user_id) WHERE ((is_default = true) AND (is_active = true));


--
-- Name: idx_client_billing_methods_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_billing_methods_user ON public.client_billing_methods USING btree (user_id, method_type);


--
-- Name: idx_client_favorite_freelancers_client_saved_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_favorite_freelancers_client_saved_at ON public.client_favorite_freelancers USING btree (client_id, saved_at DESC);


--
-- Name: idx_client_favorite_freelancers_freelancer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_favorite_freelancers_freelancer ON public.client_favorite_freelancers USING btree (freelancer_id);


--
-- Name: idx_contract_cancel_requests_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_cancel_requests_pending ON public.contract_cancel_requests USING btree (contract_id, status, respond_by_at);


--
-- Name: idx_contract_dispute_messages_dispute; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_dispute_messages_dispute ON public.contract_dispute_messages USING btree (dispute_id, created_at);


--
-- Name: idx_contract_disputes_open; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_disputes_open ON public.contract_disputes USING btree (contract_id, status);


--
-- Name: idx_contract_milestones_contract; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_milestones_contract ON public.contract_milestones USING btree (contract_id, sort_order);


--
-- Name: idx_contract_progress_entries_contract; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_progress_entries_contract ON public.contract_progress_entries USING btree (contract_id, created_at);


--
-- Name: idx_contract_workflow_events_contract; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contract_workflow_events_contract ON public.contract_workflow_events USING btree (contract_id, created_at DESC);


--
-- Name: idx_contracts_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_client ON public.contracts USING btree (client_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_contracts_delivery_review_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_delivery_review_deadline ON public.contracts USING btree (delivery_review_deadline_at) WHERE ((deleted_at IS NULL) AND (accepted_at IS NULL));


--
-- Name: idx_contracts_freelancer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_freelancer ON public.contracts USING btree (freelancer_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_contracts_sla_stage_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_sla_stage_deadline ON public.contracts USING btree (workflow_stage, stage_deadline_at) WHERE ((deleted_at IS NULL) AND (cancel_type IS NULL));


--
-- Name: idx_freelancer_exclusive_resources_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_freelancer_exclusive_resources_user ON public.freelancer_exclusive_resources USING btree (freelancer_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_freelancer_payout_accounts_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_freelancer_payout_accounts_user ON public.freelancer_payout_accounts USING btree (user_id);


--
-- Name: idx_freelancer_profile_files_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_freelancer_profile_files_user ON public.freelancer_profile_files USING btree (freelancer_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_freelancer_profiles_languages; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_freelancer_profiles_languages ON public.freelancer_profiles USING gin (languages);


--
-- Name: idx_freelancer_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_freelancer_rating ON public.freelancer_profiles USING btree (rating_avg DESC);


--
-- Name: idx_freelancer_withdrawal_orders_processing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_freelancer_withdrawal_orders_processing ON public.freelancer_withdrawal_orders USING btree (status, created_at DESC) WHERE ((status)::text = 'PROCESSING'::text);


--
-- Name: idx_freelancer_withdrawal_orders_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_freelancer_withdrawal_orders_user ON public.freelancer_withdrawal_orders USING btree (user_id, created_at DESC);


--
-- Name: idx_job_quotes_job_freelancer_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_job_quotes_job_freelancer_active ON public.job_quotes USING btree (job_id, freelancer_id) WHERE ((status)::text <> ALL ((ARRAY['withdrawn'::character varying, 'declined'::character varying])::text[]));


--
-- Name: idx_job_quotes_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_quotes_job_id ON public.job_quotes USING btree (job_id, created_at DESC);


--
-- Name: idx_jobs_client_not_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_client_not_deleted ON public.jobs USING btree (client_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_login_attempts_attempted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts USING btree (attempted_at);


--
-- Name: idx_login_attempts_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_attempts_email ON public.login_attempts USING btree (email);


--
-- Name: idx_login_attempts_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address);


--
-- Name: idx_notifications_user_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_category ON public.notifications USING btree (user_id, category, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read_at) WHERE ((deleted_at IS NULL) AND (read_at IS NULL));


--
-- Name: idx_profile_analytics_freelancer_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_analytics_freelancer_created ON public.profile_analytics_events USING btree (freelancer_id, created_at DESC);


--
-- Name: idx_profile_analytics_freelancer_type_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_analytics_freelancer_type_created ON public.profile_analytics_events USING btree (freelancer_id, event_type, created_at DESC);


--
-- Name: idx_profile_analytics_portfolio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_analytics_portfolio ON public.profile_analytics_events USING btree (portfolio_id) WHERE (portfolio_id IS NOT NULL);


--
-- Name: idx_profile_analytics_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_analytics_service ON public.profile_analytics_events USING btree (service_id) WHERE (service_id IS NOT NULL);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_reviews_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_active ON public.reviews USING btree (reviewee_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_reviews_reviewee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_reviewee ON public.reviews USING btree (reviewee_id);


--
-- Name: idx_reviews_reviewee_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_reviewee_rating ON public.reviews USING btree (reviewee_id, rating) WHERE (deleted_at IS NULL);


--
-- Name: idx_saved_jobs_freelancer_saved_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saved_jobs_freelancer_saved_at ON public.saved_jobs USING btree (freelancer_id, saved_at DESC);


--
-- Name: idx_services_freelancer_listing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_freelancer_listing ON public.services USING btree (freelancer_id, listing_status, created_at DESC);


--
-- Name: idx_transactions_client_filters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_client_filters ON public.transactions USING btree (user_id, occurred_at DESC, category);


--
-- Name: idx_transactions_project_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_project_filter ON public.transactions USING btree (job_id, freelancer_id, occurred_at DESC);


--
-- Name: idx_unique_contract_review; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_contract_review ON public.reviews USING btree (contract_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_unique_default_payout; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_default_payout ON public.user_payout_methods USING btree (user_id) WHERE (is_default = true);


--
-- Name: idx_user_profiles_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_location ON public.user_profiles USING gist (location);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_active ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_wallet_deposit_orders_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_deposit_orders_pending ON public.wallet_deposit_orders USING btree (status, created_at DESC) WHERE ((status)::text = 'PENDING'::text);


--
-- Name: idx_wallet_deposit_orders_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_deposit_orders_user ON public.wallet_deposit_orders USING btree (user_id, created_at DESC);


--
-- Name: users_google_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_google_id_unique ON public.users USING btree (google_id) WHERE ((google_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: freelancer_profiles trg_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.freelancer_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reviews trg_update_freelancer_rating; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_freelancer_rating AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_freelancer_rating();


--
-- Name: contract_milestones update_contract_milestones_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_contract_milestones_modtime BEFORE UPDATE ON public.contract_milestones FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: freelancer_portfolios update_freelancer_portfolios_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_freelancer_portfolios_modtime BEFORE UPDATE ON public.freelancer_portfolios FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: freelancer_profiles update_freelancer_profiles_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_freelancer_profiles_modtime BEFORE UPDATE ON public.freelancer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: users update_user_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: user_profiles update_user_profiles_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_profiles_modtime BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: billing_invoices billing_invoices_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: billing_invoices billing_invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_blocks chat_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_blocks
    ADD CONSTRAINT chat_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_blocks chat_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_blocks
    ADD CONSTRAINT chat_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_conversation_user_state chat_conversation_user_state_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversation_user_state
    ADD CONSTRAINT chat_conversation_user_state_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_conversation_user_state chat_conversation_user_state_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversation_user_state
    ADD CONSTRAINT chat_conversation_user_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_conversations chat_conversations_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_conversations chat_conversations_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_conversations chat_conversations_job_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_job_quote_id_fkey FOREIGN KEY (job_quote_id) REFERENCES public.job_quotes(id) ON DELETE SET NULL;


--
-- Name: chat_conversations chat_conversations_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_billing_methods client_billing_methods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_billing_methods
    ADD CONSTRAINT client_billing_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_billing_profiles client_billing_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_billing_profiles
    ADD CONSTRAINT client_billing_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_favorite_freelancers client_favorite_freelancers_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_favorite_freelancers
    ADD CONSTRAINT client_favorite_freelancers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_favorite_freelancers client_favorite_freelancers_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_favorite_freelancers
    ADD CONSTRAINT client_favorite_freelancers_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contract_cancel_requests contract_cancel_requests_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_cancel_requests
    ADD CONSTRAINT contract_cancel_requests_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_cancel_requests contract_cancel_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_cancel_requests
    ADD CONSTRAINT contract_cancel_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contract_dispute_messages contract_dispute_messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_dispute_messages
    ADD CONSTRAINT contract_dispute_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contract_dispute_messages contract_dispute_messages_dispute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_dispute_messages
    ADD CONSTRAINT contract_dispute_messages_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.contract_disputes(id) ON DELETE CASCADE;


--
-- Name: contract_disputes contract_disputes_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_disputes
    ADD CONSTRAINT contract_disputes_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_disputes contract_disputes_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_disputes
    ADD CONSTRAINT contract_disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contract_milestones contract_milestones_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_milestones
    ADD CONSTRAINT contract_milestones_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_progress_entries contract_progress_entries_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_progress_entries
    ADD CONSTRAINT contract_progress_entries_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contract_progress_entries contract_progress_entries_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_progress_entries
    ADD CONSTRAINT contract_progress_entries_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_reviews contract_reviews_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_reviews
    ADD CONSTRAINT contract_reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contract_reviews contract_reviews_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_reviews
    ADD CONSTRAINT contract_reviews_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_reviews contract_reviews_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_reviews
    ADD CONSTRAINT contract_reviews_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contract_reviews contract_reviews_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_reviews
    ADD CONSTRAINT contract_reviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: contract_workflow_events contract_workflow_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_workflow_events
    ADD CONSTRAINT contract_workflow_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contract_workflow_events contract_workflow_events_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_workflow_events
    ADD CONSTRAINT contract_workflow_events_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reviews fk_reviews_contract; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT fk_reviews_contract FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: freelancer_exclusive_resources freelancer_exclusive_resources_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_exclusive_resources
    ADD CONSTRAINT freelancer_exclusive_resources_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: freelancer_payout_accounts freelancer_payout_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_payout_accounts
    ADD CONSTRAINT freelancer_payout_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: freelancer_portfolios freelancer_portfolios_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_portfolios
    ADD CONSTRAINT freelancer_portfolios_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.freelancer_profiles(user_id) ON DELETE CASCADE;


--
-- Name: freelancer_profile_files freelancer_profile_files_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_profile_files
    ADD CONSTRAINT freelancer_profile_files_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: freelancer_profiles freelancer_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_profiles
    ADD CONSTRAINT freelancer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: freelancer_withdrawal_orders freelancer_withdrawal_orders_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_withdrawal_orders
    ADD CONSTRAINT freelancer_withdrawal_orders_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: freelancer_withdrawal_orders freelancer_withdrawal_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_withdrawal_orders
    ADD CONSTRAINT freelancer_withdrawal_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: freelancer_withdrawal_pins freelancer_withdrawal_pins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.freelancer_withdrawal_pins
    ADD CONSTRAINT freelancer_withdrawal_pins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: identity_verifications identity_verifications_admin_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_verifications
    ADD CONSTRAINT identity_verifications_admin_reviewed_by_fkey FOREIGN KEY (admin_reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: identity_verifications identity_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.identity_verifications
    ADD CONSTRAINT identity_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_quotes job_quotes_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_quotes
    ADD CONSTRAINT job_quotes_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_quotes job_quotes_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_quotes
    ADD CONSTRAINT job_quotes_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: ledger_entries ledger_entries_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: oauth_accounts oauth_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: profile_analytics_events profile_analytics_events_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_analytics_events
    ADD CONSTRAINT profile_analytics_events_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profile_analytics_events profile_analytics_events_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_analytics_events
    ADD CONSTRAINT profile_analytics_events_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.freelancer_portfolios(id) ON DELETE SET NULL;


--
-- Name: profile_analytics_events profile_analytics_events_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_analytics_events
    ADD CONSTRAINT profile_analytics_events_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: saved_jobs saved_jobs_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: saved_jobs saved_jobs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: services services_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: transactions transactions_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_login_logs user_login_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_payout_methods user_payout_methods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_payout_methods
    ADD CONSTRAINT user_payout_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id);


--
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wallet_deposit_orders wallet_deposit_orders_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_deposit_orders
    ADD CONSTRAINT wallet_deposit_orders_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: wallet_deposit_orders wallet_deposit_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_deposit_orders
    ADD CONSTRAINT wallet_deposit_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict aW4ItWnYGz3piqVRkCaeaxf2ehRXrPtRofcmDkJF69jmLIUcxYDb05IovIP5O9F

