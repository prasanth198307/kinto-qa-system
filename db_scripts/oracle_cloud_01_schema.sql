--
-- PostgreSQL database dump
--

\restrict Zeu5hhvwwYH34rwv8NWmN6EnkrWvOeT1x7eYFqZkwCuCTJqKqzfBehWVIoaV4AD

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_subtypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_subtypes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    account_type character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    label character varying(150) NOT NULL,
    is_system integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: account_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    label character varying(150) NOT NULL,
    is_system integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: advance_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advance_applications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    advance_id character varying NOT NULL,
    invoice_id character varying NOT NULL,
    invoice_payment_id character varying,
    applied_amount integer NOT NULL,
    application_date date NOT NULL,
    applied_by character varying,
    remarks text,
    reversed_at timestamp without time zone,
    reversal_remarks text,
    reversed_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id character varying(255),
    action character varying(50) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id character varying(255),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bank_statement_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statement_imports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    file_name character varying(255) NOT NULL,
    bank_account_id character varying,
    bank_name character varying(100),
    account_number character varying(50),
    start_date character varying(50),
    end_date character varying(50),
    total_rows integer DEFAULT 0,
    duplicate_count integer DEFAULT 0,
    created_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    import_id character varying NOT NULL,
    bank_account_id character varying,
    txn_date character varying(50) NOT NULL,
    value_date character varying(50),
    description text NOT NULL,
    reference character varying(500),
    branch_code character varying(20),
    debit numeric(15,2) DEFAULT 0,
    credit numeric(15,2) DEFAULT 0,
    balance numeric(15,2),
    category character varying(50),
    matched_account_id character varying,
    matched_account_name character varying(255),
    memo text,
    status character varying(20) DEFAULT 'needs_review'::character varying NOT NULL,
    duplicate_hash character varying(64),
    journal_entry_id character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    reconciled_with character varying(50),
    reconciled_source_id character varying,
    reconciled_details text,
    tenant_id integer DEFAULT 1
);


--
-- Name: banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    bank_name character varying NOT NULL,
    account_number character varying NOT NULL,
    ifsc_code character varying NOT NULL,
    upi_id character varying,
    is_default integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    record_status integer DEFAULT 1 NOT NULL,
    account_holder_name character varying(255),
    branch_name character varying(255),
    account_type character varying(50),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tenant_id integer DEFAULT 1
);


--
-- Name: billing_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_events (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    subscription_id integer,
    event_type character varying(50) NOT NULL,
    from_plan character varying(50),
    to_plan character varying(50),
    billing_cycle character varying(20),
    amount integer DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: billing_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_events_id_seq OWNED BY public.billing_events.id;


--
-- Name: budget_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    budget_id character varying NOT NULL,
    account_id character varying NOT NULL,
    apr integer DEFAULT 0 NOT NULL,
    may integer DEFAULT 0 NOT NULL,
    jun integer DEFAULT 0 NOT NULL,
    jul integer DEFAULT 0 NOT NULL,
    aug integer DEFAULT 0 NOT NULL,
    sep integer DEFAULT 0 NOT NULL,
    oct integer DEFAULT 0 NOT NULL,
    nov integer DEFAULT 0 NOT NULL,
    "dec" integer DEFAULT 0 NOT NULL,
    jan integer DEFAULT 0 NOT NULL,
    feb integer DEFAULT 0 NOT NULL,
    mar integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    financial_year character varying(10) NOT NULL,
    period_type character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: cash_register_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_register_days (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    register_date date NOT NULL,
    salesperson_id character varying,
    salesperson_name character varying(100) NOT NULL,
    opening_balance integer DEFAULT 0 NOT NULL,
    closing_balance integer DEFAULT 0 NOT NULL,
    total_deposits integer DEFAULT 0 NOT NULL,
    total_cash_received integer DEFAULT 0 NOT NULL,
    total_expenses integer DEFAULT 0 NOT NULL,
    total_transfers integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    reconciled_by character varying,
    reconciled_at timestamp without time zone,
    variance_amount integer DEFAULT 0,
    notes text,
    imported_from_file character varying(500),
    imported_at timestamp without time zone,
    created_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    has_discrepancy integer DEFAULT 0 NOT NULL,
    discrepancy_details jsonb,
    actual_closing_balance integer,
    variance_notes text,
    tenant_id integer DEFAULT 1
);


--
-- Name: cash_register_expense_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_register_expense_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying NOT NULL,
    item_label character varying(255) NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    expense_category_id character varying,
    raw_text character varying(500),
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: cash_register_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_register_transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    day_id character varying NOT NULL,
    transaction_type character varying(30) NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    reference character varying(255),
    description text,
    transfer_to character varying(100),
    converted_to_voucher_id character varying,
    converted_at timestamp without time zone,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    source_type character varying(50),
    document_path character varying(500),
    document_name character varying(255),
    tenant_id integer DEFAULT 1
);


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    account_type character varying(50) NOT NULL,
    sub_type character varying(100),
    parent_id character varying,
    description text,
    is_active integer DEFAULT 1 NOT NULL,
    is_system_account integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    node_type character varying(10) DEFAULT 'ledger'::character varying NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: checklist_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    template_id character varying NOT NULL,
    machine_id character varying NOT NULL,
    operator_id character varying NOT NULL,
    reviewer_id character varying,
    assigned_date date NOT NULL,
    shift character varying(50),
    status character varying(50) DEFAULT 'pending'::character varying,
    submission_id character varying,
    assigned_by character varying NOT NULL,
    notes text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    missed_notification_sent integer DEFAULT 0,
    missed_notification_sent_at timestamp without time zone,
    due_date_time timestamp without time zone,
    whatsapp_enabled integer DEFAULT 0 NOT NULL,
    task_reference_id character varying(50),
    whatsapp_notification_sent integer DEFAULT 0 NOT NULL,
    whatsapp_notification_sent_at timestamp without time zone,
    operator_response text,
    operator_response_time timestamp without time zone,
    tenant_id integer DEFAULT 1
);


--
-- Name: checklist_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_submissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    template_id character varying,
    machine_id character varying,
    operator_id character varying,
    reviewer_id character varying,
    manager_id character varying,
    status character varying(50) DEFAULT 'pending'::character varying,
    date timestamp without time zone NOT NULL,
    shift character varying(50),
    supervisor_name character varying(255),
    general_remarks text,
    signature_data text,
    submitted_at timestamp without time zone,
    reviewed_at timestamp without time zone,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: checklist_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    machine_id character varying,
    shift_types text[],
    created_by character varying,
    is_active character varying DEFAULT 'true'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: credit_note_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_note_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    credit_note_id character varying NOT NULL,
    product_id character varying NOT NULL,
    invoice_item_id character varying,
    description text NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0 NOT NULL,
    taxable_value numeric(15,2) NOT NULL,
    cgst_rate numeric(5,2) DEFAULT 0 NOT NULL,
    cgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
    sgst_rate numeric(5,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
    igst_rate numeric(5,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tenant_id integer DEFAULT 1
);


--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    note_number character varying(100) NOT NULL,
    invoice_id character varying,
    sales_return_id character varying,
    credit_date character varying NOT NULL,
    reason character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    cgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(15,2) DEFAULT 0 NOT NULL,
    grand_total numeric(15,2) DEFAULT 0 NOT NULL,
    issued_by character varying,
    notes text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    approved_by character varying,
    vendor_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: customer_advances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_advances (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    advance_number character varying(100) NOT NULL,
    vendor_id character varying NOT NULL,
    receipt_date date NOT NULL,
    amount integer NOT NULL,
    used_amount integer DEFAULT 0 NOT NULL,
    payment_method character varying(50) NOT NULL,
    reference_number character varying(100),
    bank_name character varying(255),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    purpose text,
    remarks text,
    received_by character varying,
    cancelled_at timestamp without time zone,
    cancellation_remarks text,
    cancelled_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    advance_type character varying(50) DEFAULT 'security_deposit'::character varying NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: debit_note_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debit_note_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    debit_note_id character varying NOT NULL,
    invoice_item_id character varying,
    product_id character varying NOT NULL,
    description text NOT NULL,
    original_quantity integer NOT NULL,
    original_unit_price integer NOT NULL,
    additional_quantity integer DEFAULT 0 NOT NULL,
    new_unit_price integer NOT NULL,
    price_difference_per_unit integer DEFAULT 0 NOT NULL,
    taxable_value integer NOT NULL,
    cgst_rate integer DEFAULT 0 NOT NULL,
    cgst_amount integer DEFAULT 0 NOT NULL,
    sgst_rate integer DEFAULT 0 NOT NULL,
    sgst_amount integer DEFAULT 0 NOT NULL,
    igst_rate integer DEFAULT 0 NOT NULL,
    igst_amount integer DEFAULT 0 NOT NULL,
    total_amount integer NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: debit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debit_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    note_number character varying(100) NOT NULL,
    invoice_id character varying NOT NULL,
    debit_date date NOT NULL,
    reason character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    subtotal integer NOT NULL,
    cgst_amount integer DEFAULT 0 NOT NULL,
    sgst_amount integer DEFAULT 0 NOT NULL,
    igst_amount integer DEFAULT 0 NOT NULL,
    grand_total integer NOT NULL,
    issued_by character varying,
    approved_by character varying,
    notes text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: deletion_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deletion_audit (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    tenant_name character varying(255) NOT NULL,
    tenant_slug character varying(100) NOT NULL,
    owner_email character varying(255),
    deleted_at timestamp without time zone DEFAULT now() NOT NULL,
    rows_deleted jsonb DEFAULT '{}'::jsonb,
    export_url character varying,
    export_expires_at timestamp without time zone,
    deleted_by character varying(255),
    reason text
);


--
-- Name: deletion_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deletion_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deletion_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deletion_audit_id_seq OWNED BY public.deletion_audit.id;


--
-- Name: document_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category_id character varying,
    file_name character varying(500) NOT NULL,
    file_type character varying(100),
    file_size integer,
    file_path text NOT NULL,
    related_entity_type character varying(50),
    related_entity_id character varying,
    document_date date,
    expiry_date date,
    version_number integer DEFAULT 1 NOT NULL,
    parent_document_id character varying,
    tags text[],
    remarks text,
    uploaded_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    expiry_alert_sent integer DEFAULT 0,
    expiry_alert_sent_at timestamp without time zone,
    tenant_id integer DEFAULT 1
);


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    driver_code character varying(50) NOT NULL,
    driver_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    alternate_phone character varying(20),
    license_number character varying(50),
    license_expiry date,
    address text,
    transporter_id character varying,
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: expense_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_attachments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    voucher_id character varying NOT NULL,
    file_name character varying(500) NOT NULL,
    file_type character varying(100),
    file_size integer,
    file_path text NOT NULL,
    description text,
    uploaded_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id character varying,
    gst_applicable integer DEFAULT 0 NOT NULL,
    default_gst_rate numeric(5,2) DEFAULT 0,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: expense_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    voucher_id character varying NOT NULL,
    category_id character varying,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price integer DEFAULT 0 NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    gst_rate numeric(5,2) DEFAULT 0,
    gst_amount integer DEFAULT 0 NOT NULL,
    reference_invoice_number character varying(100),
    reference_invoice_date date,
    cost_center character varying(100),
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: expense_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_vouchers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    voucher_number character varying(50) NOT NULL,
    voucher_date date NOT NULL,
    payee_type character varying(20) NOT NULL,
    payee_id character varying,
    payee_name character varying(255) NOT NULL,
    payment_mode character varying(50) NOT NULL,
    bank_name character varying(100),
    cheque_number character varying(50),
    transaction_reference character varying(100),
    subtotal integer DEFAULT 0 NOT NULL,
    gst_amount integer DEFAULT 0 NOT NULL,
    total_amount integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    purpose text,
    remarks text,
    prepared_by character varying NOT NULL,
    approved_by character varying,
    approved_at timestamp without time zone,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: finished_goods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finished_goods (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    batch_number character varying(100) NOT NULL,
    production_date timestamp without time zone NOT NULL,
    quantity integer NOT NULL,
    uom_id character varying,
    quality_status character varying(50) DEFAULT 'pending'::character varying,
    machine_id character varying,
    operator_id character varying,
    inspected_by character varying,
    inspection_date timestamp without time zone,
    storage_location character varying(255),
    remarks text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    original_batch_number character varying(100),
    source character varying(50) DEFAULT 'production'::character varying,
    sales_return_item_id character varying,
    repacking_date timestamp without time zone,
    tenant_id integer DEFAULT 1
);


--
-- Name: gatepass_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gatepass_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    gatepass_id character varying NOT NULL,
    finished_good_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity_dispatched integer NOT NULL,
    uom_id character varying,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    batch_number character varying(100),
    tenant_id integer DEFAULT 1
);


--
-- Name: gatepasses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gatepasses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    gatepass_number character varying(100) NOT NULL,
    gatepass_date timestamp without time zone NOT NULL,
    vehicle_number character varying(50) NOT NULL,
    driver_name character varying(255) NOT NULL,
    driver_contact character varying(50),
    transporter_name text,
    destination text,
    customer_name text,
    invoice_number character varying(100),
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    issued_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    vendor_id character varying,
    invoice_id character varying,
    is_cluster integer DEFAULT 0 NOT NULL,
    cases_count integer,
    security_seal_no character varying(100),
    status character varying(50) DEFAULT 'generated'::character varying NOT NULL,
    out_time timestamp without time zone,
    in_time timestamp without time zone,
    verified_by character varying(255),
    pod_received_by character varying(255),
    pod_date timestamp without time zone,
    pod_remarks text,
    pod_signature text,
    transporter_id character varying,
    vehicle_id character varying,
    driver_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    product_id character varying,
    description character varying NOT NULL,
    hsn_code character varying,
    sac_code character varying,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    taxable_amount integer NOT NULL,
    cgst_rate integer DEFAULT 0,
    cgst_amount integer DEFAULT 0,
    sgst_rate integer DEFAULT 0,
    sgst_amount integer DEFAULT 0,
    igst_rate integer DEFAULT 0,
    igst_amount integer DEFAULT 0,
    cess_rate integer DEFAULT 0,
    cess_amount integer DEFAULT 0,
    total_amount integer NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    uom_id character varying,
    discount integer DEFAULT 0 NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    transport_rate_per_case integer DEFAULT 0 NOT NULL,
    transport_charges integer DEFAULT 0 NOT NULL,
    discount_mode character varying(5) DEFAULT '%'::character varying NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: invoice_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    amount integer NOT NULL,
    payment_method character varying(50) NOT NULL,
    reference_number character varying(100),
    payment_type character varying(50) NOT NULL,
    bank_name character varying(255),
    remarks text,
    recorded_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cancelled_at timestamp without time zone,
    cancellation_remarks text,
    cancelled_by character varying,
    paid_by character varying(50),
    payer_name character varying(255),
    bulk_allocation_id character varying(100),
    tenant_id integer DEFAULT 1
);


--
-- Name: invoice_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255) NOT NULL,
    description text,
    default_seller_name character varying(255),
    default_seller_gstin character varying(15),
    default_seller_address text,
    default_seller_state character varying(100),
    default_seller_state_code character varying(2),
    default_seller_phone character varying(50),
    default_seller_email character varying(255),
    default_bank_name character varying(255),
    default_bank_account_number character varying(50),
    default_bank_ifsc_code character varying(11),
    default_account_holder_name character varying(255),
    default_branch_name character varying(255),
    default_upi_id character varying(100),
    is_default integer DEFAULT 0 NOT NULL,
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    logo_url text,
    default_signature_image text,
    authorized_signatory_name character varying(255),
    hpcl_signature_image text,
    hpcl_signatory_name character varying(255),
    alternate_signature_image text,
    alternate_signatory_name character varying(255),
    tenant_id integer DEFAULT 1
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_number character varying NOT NULL,
    invoice_date date NOT NULL,
    gatepass_id character varying,
    seller_name character varying,
    seller_address character varying,
    seller_state character varying,
    seller_state_code character varying,
    seller_gstin character varying,
    buyer_name character varying NOT NULL,
    buyer_address character varying,
    buyer_state character varying,
    buyer_state_code character varying,
    buyer_gstin character varying,
    subtotal integer NOT NULL,
    cgst_amount integer DEFAULT 0,
    sgst_amount integer DEFAULT 0,
    igst_amount integer DEFAULT 0,
    cess_amount integer DEFAULT 0,
    round_off integer DEFAULT 0,
    total_amount integer NOT NULL,
    bank_name character varying,
    bank_account_number character varying,
    bank_ifsc_code character varying,
    upi_id character varying,
    remarks character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    record_status integer DEFAULT 1 NOT NULL,
    is_cluster integer DEFAULT 0 NOT NULL,
    buyer_contact character varying(50),
    payment_terms character varying(255),
    place_of_supply character varying(100),
    reverse_charge integer DEFAULT 0 NOT NULL,
    transport_mode character varying(50),
    vehicle_number character varying(50),
    date_of_supply timestamp without time zone,
    generated_by character varying,
    template_id character varying,
    terms_conditions_id character varying,
    seller_phone character varying(50),
    seller_email character varying(255),
    ship_to_name character varying(255),
    ship_to_address text,
    ship_to_city character varying(100),
    ship_to_state character varying(100),
    ship_to_pincode character varying(10),
    account_holder_name character varying(255),
    branch_name character varying(255),
    amount_received integer DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    dispatch_date timestamp without time zone,
    delivery_date timestamp without time zone,
    received_by character varying(255),
    pod_remarks text,
    authorized_signatory_name character varying(255),
    original_invoice_id character varying,
    replaced_by_invoice_id character varying,
    cancelled_at timestamp without time zone,
    cancelled_by character varying,
    include_signature integer DEFAULT 1 NOT NULL,
    transport_rate_per_case integer DEFAULT 0 NOT NULL,
    transport_charges integer DEFAULT 0 NOT NULL,
    signature_type character varying(50) DEFAULT 'default'::character varying,
    sales_order_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    journal_number character varying(100) NOT NULL,
    journal_date date NOT NULL,
    source_type character varying(50),
    source_id character varying,
    description text NOT NULL,
    status character varying(20) DEFAULT 'posted'::character varying NOT NULL,
    is_auto_generated integer DEFAULT 0 NOT NULL,
    total_debit integer DEFAULT 0 NOT NULL,
    total_credit integer DEFAULT 0 NOT NULL,
    created_by character varying,
    reversed_at timestamp without time zone,
    reversal_journal_id character varying,
    notes text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: journal_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_lines (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    journal_id character varying NOT NULL,
    account_id character varying NOT NULL,
    debit integer DEFAULT 0 NOT NULL,
    credit integer DEFAULT 0 NOT NULL,
    party_type character varying(20),
    party_id character varying,
    party_name character varying(255),
    memo text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: machine_spares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_spares (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    machine_id character varying NOT NULL,
    spare_part_id character varying NOT NULL,
    recommended_quantity integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: machine_startup_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_startup_tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    machine_id character varying NOT NULL,
    assigned_user_id character varying NOT NULL,
    scheduled_start_time timestamp without time zone NOT NULL,
    reminder_before_minutes integer DEFAULT 30 NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    notification_sent_at timestamp without time zone,
    machine_started_at timestamp without time zone,
    whatsapp_enabled integer DEFAULT 1 NOT NULL,
    email_enabled integer DEFAULT 1 NOT NULL,
    whatsapp_sent integer DEFAULT 0 NOT NULL,
    email_sent integer DEFAULT 0 NOT NULL,
    production_date date NOT NULL,
    shift character varying(50),
    notes text,
    created_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    task_reference_id character varying(50),
    operator_response text,
    operator_response_time timestamp without time zone,
    response_status character varying(20) DEFAULT 'no_response'::character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: machine_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active character varying(10) DEFAULT 'true'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: machines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machines (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    location character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    installation_date timestamp without time zone,
    last_maintenance timestamp without time zone,
    next_pm_due timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    warmup_time_minutes integer DEFAULT 0,
    code character varying(50),
    tenant_id integer DEFAULT 1
);


--
-- Name: maintenance_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_history (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    machine_id character varying,
    plan_id character varying,
    performed_date timestamp without time zone NOT NULL,
    performed_by character varying,
    type character varying(100) NOT NULL,
    description text,
    spare_parts_used text,
    downtime_hours integer,
    cost integer,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: maintenance_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_plans (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    machine_id character varying,
    plan_name character varying(255) NOT NULL,
    plan_type character varying(100) NOT NULL,
    frequency character varying(50) NOT NULL,
    next_due_date timestamp without time zone,
    assigned_to character varying,
    is_active character varying DEFAULT 'true'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    task_list_template_id character varying,
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: manual_credit_note_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_credit_note_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    sales_return_id character varying NOT NULL,
    reason_code character varying(50) NOT NULL,
    requested_by character varying NOT NULL,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    assigned_to character varying,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    completed_at timestamp without time zone,
    completed_by character varying,
    external_credit_note_number character varying(100),
    external_credit_note_date timestamp without time zone,
    notes text,
    processing_notes text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tenant_id integer DEFAULT 1
);


--
-- Name: monthly_expense_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_expense_payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    expense_id character varying NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    payment_date character varying(10) NOT NULL,
    payment_mode character varying(50),
    paid_by character varying(150),
    payment_source character varying(30) DEFAULT 'company'::character varying NOT NULL,
    reference_number character varying(100),
    notes character varying(500),
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: monthly_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_expenses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    amount integer DEFAULT 0 NOT NULL,
    expense_month character varying(7) NOT NULL,
    due_date character varying(10),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_date character varying(10),
    payment_mode character varying(50),
    reference_number character varying(100),
    carry_to_next_month integer DEFAULT 0 NOT NULL,
    notes character varying(500),
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    paid_amount integer DEFAULT 0 NOT NULL,
    expense_type character varying(20) DEFAULT 'fixed'::character varying NOT NULL,
    base_amount integer,
    tenant_id integer DEFAULT 1
);


--
-- Name: notification_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_config (
    id integer NOT NULL,
    whatsapp_enabled integer,
    email_enabled integer,
    test_mode integer,
    sendgrid_sender_email character varying,
    twilio_phone_number character varying,
    sender_email character varying,
    sender_name character varying(255),
    record_status integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    meta_phone_number_id character varying(255),
    meta_access_token text,
    meta_verify_token character varying(255),
    email_provider character varying(50) DEFAULT 'SendGrid'::character varying,
    smtp_host character varying(255),
    smtp_port integer DEFAULT 587,
    smtp_user character varying(255),
    smtp_password text,
    smtp_secure integer DEFAULT 0,
    smtp_from_name character varying(255),
    tenant_id integer DEFAULT 1
);


--
-- Name: partial_task_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partial_task_answers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    assignment_id character varying NOT NULL,
    task_order integer NOT NULL,
    task_name character varying(255) NOT NULL,
    status character varying(10) NOT NULL,
    remarks text,
    answered_at timestamp without time zone DEFAULT now() NOT NULL,
    answered_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    photo_url character varying(500),
    spare_part_id character varying,
    spare_part_request_text text,
    waiting_for_photo integer DEFAULT 0,
    waiting_for_spare_part integer DEFAULT 0,
    tenant_id integer DEFAULT 1
);


--
-- Name: payment_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_evidence (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    parent_payment_id character varying,
    vendor_id character varying,
    amount integer NOT NULL,
    received_on timestamp without time zone,
    reference_number character varying(100),
    payment_mode character varying(50),
    bank_name character varying(255),
    match_confidence integer DEFAULT 100,
    match_status character varying(20) DEFAULT 'matched'::character varying,
    source_row text,
    import_batch_id character varying(100),
    source_file character varying(255),
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    invoice_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: pm_execution_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pm_execution_tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    execution_id character varying NOT NULL,
    task_name character varying(255) NOT NULL,
    description text,
    result character varying(10),
    remarks text,
    photo_url text,
    order_index integer,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: pm_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pm_executions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    maintenance_plan_id character varying NOT NULL,
    machine_id character varying NOT NULL,
    task_list_template_id character varying,
    completed_by character varying NOT NULL,
    completed_at timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying,
    overall_result character varying(50),
    remarks text,
    downtime_hours integer,
    spare_parts_used text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: pm_task_list_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pm_task_list_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    machine_type_id character varying,
    category character varying(100),
    is_active character varying DEFAULT 'true'::character varying,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: pm_template_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pm_template_tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    template_id character varying NOT NULL,
    task_name character varying(255) NOT NULL,
    description text,
    verification_criteria text,
    order_index integer,
    requires_photo character varying DEFAULT 'false'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: product_bom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_bom (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    raw_material_id character varying,
    quantity_required numeric NOT NULL,
    uom character varying,
    notes character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1,
    material_type_id character varying,
    configuration_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: product_bom_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_bom_configurations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    config_name character varying(255) NOT NULL,
    description text,
    is_default integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active character varying DEFAULT 'true'::character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    display_order integer,
    tenant_id integer DEFAULT 1
);


--
-- Name: product_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active character varying DEFAULT 'true'::character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    display_order integer,
    tenant_id integer DEFAULT 1
);


--
-- Name: production_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    issuance_id character varying NOT NULL,
    production_date timestamp without time zone NOT NULL,
    shift character varying(20) NOT NULL,
    produced_quantity numeric(12,2) NOT NULL,
    rejected_quantity numeric(12,2) DEFAULT '0'::numeric,
    empty_bottles_produced numeric(12,2) DEFAULT '0'::numeric,
    empty_bottles_used numeric(12,2) DEFAULT '0'::numeric,
    empty_bottles_pending numeric(12,2) DEFAULT '0'::numeric,
    derived_units numeric(12,2),
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    empty_bottles_opening numeric(12,2) DEFAULT '0'::numeric,
    product_id character varying,
    uom_id character varying,
    batch_number character varying(100),
    tenant_id integer DEFAULT 1
);


--
-- Name: production_reconciliation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_reconciliation_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    reconciliation_id character varying NOT NULL,
    raw_material_id character varying NOT NULL,
    issuance_item_id character varying,
    quantity_issued integer NOT NULL,
    quantity_used integer NOT NULL,
    quantity_returned integer DEFAULT 0 NOT NULL,
    quantity_pending integer DEFAULT 0 NOT NULL,
    net_consumed integer NOT NULL,
    uom_id character varying,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tenant_id integer DEFAULT 1
);


--
-- Name: production_reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_reconciliations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    reconciliation_number character varying(100) NOT NULL,
    reconciliation_date timestamp without time zone NOT NULL,
    shift character varying(20) NOT NULL,
    issuance_id character varying NOT NULL,
    production_entry_id character varying NOT NULL,
    produced_cases integer NOT NULL,
    rejected_cases integer DEFAULT 0 NOT NULL,
    empty_bottles_produced integer DEFAULT 0 NOT NULL,
    empty_bottles_used integer DEFAULT 0 NOT NULL,
    empty_bottles_pending integer DEFAULT 0 NOT NULL,
    edit_count integer DEFAULT 0 NOT NULL,
    last_edited_by character varying,
    last_edited_at timestamp without time zone,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    product_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_code character varying(100) NOT NULL,
    product_name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    uom_id character varying,
    standard_cost integer,
    is_active character varying DEFAULT 'true'::character varying,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    sku_code character varying,
    product_type character varying,
    base_unit character varying,
    derived_unit character varying,
    conversion_method character varying,
    derived_value_per_base numeric,
    weight_per_base numeric,
    weight_per_derived numeric,
    usable_derived_units character varying,
    default_loss_percent numeric,
    base_price numeric(12,2),
    gst_percent numeric,
    total_price numeric(12,2),
    hsn_code character varying,
    sac_code character varying,
    tax_type character varying,
    minimum_stock_level numeric,
    net_volume integer,
    mrp integer,
    category_id character varying,
    type_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id character varying NOT NULL,
    serial_no integer NOT NULL,
    raw_material_id character varying,
    item_name character varying(255) NOT NULL,
    description text,
    hsn_code character varying(50),
    quantity numeric(12,2) NOT NULL,
    uom_id character varying,
    unit_name character varying(50),
    unit_price integer NOT NULL,
    gst_rate integer DEFAULT 1800,
    amount integer NOT NULL,
    cgst_amount integer,
    sgst_amount integer,
    igst_amount integer,
    total_amount integer,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    po_number character varying(100) NOT NULL,
    spare_part_id character varying,
    quantity integer NOT NULL,
    urgency character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    requested_by character varying,
    approved_by character varying,
    supplier character varying(255),
    estimated_cost integer,
    expected_delivery_date timestamp without time zone,
    actual_delivery_date timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    po_date timestamp without time zone DEFAULT now(),
    vendor_id character varying,
    unit_price integer,
    total_amount integer,
    approved_date timestamp without time zone,
    delivery_address text,
    payment_terms text,
    gst_applicable integer DEFAULT 1,
    gst_rate integer DEFAULT 1800,
    cgst_amount integer,
    sgst_amount integer,
    igst_amount integer,
    grand_total integer,
    signature_image text,
    include_signature integer DEFAULT 1,
    terms_and_conditions text,
    transport_mode character varying(100),
    vendor_name text,
    tenant_id integer DEFAULT 1
);


--
-- Name: purchase_return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_return_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    purchase_return_id character varying NOT NULL,
    raw_material_id character varying,
    item_name character varying(255) NOT NULL,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    total_amount integer NOT NULL,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: purchase_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_returns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    return_number character varying(100) NOT NULL,
    return_date timestamp without time zone NOT NULL,
    purchase_order_id character varying,
    vendor_id character varying,
    vendor_name character varying(255) NOT NULL,
    return_reason character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    total_amount integer DEFAULT 0,
    debit_note_id character varying,
    remarks text,
    approved_by character varying,
    approval_date timestamp without time zone,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: raw_material_issuance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_issuance (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    issuance_date timestamp without time zone NOT NULL,
    batch_number character varying(100),
    issued_to character varying(255),
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    issued_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    issuance_number character varying(100),
    product_id character varying,
    production_reference character varying(255),
    planned_output numeric(12,2),
    bom_configuration_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: raw_material_issuance_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_issuance_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    issuance_id character varying NOT NULL,
    raw_material_id character varying NOT NULL,
    product_id character varying,
    quantity_issued numeric(12,6) NOT NULL,
    uom_id character varying,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    suggested_quantity numeric(12,6),
    calculation_basis character varying(50),
    tenant_id integer DEFAULT 1
);


--
-- Name: raw_material_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    material_id character varying NOT NULL,
    transaction_type character varying(50) NOT NULL,
    quantity integer NOT NULL,
    reference character varying(255),
    remarks text,
    performed_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: raw_material_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_material_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type_code character varying(100) NOT NULL,
    type_name character varying(255) NOT NULL,
    conversion_method character varying(50),
    base_unit character varying(50),
    base_unit_weight real,
    derived_unit character varying(50),
    weight_per_derived_unit real,
    derived_value_per_base real,
    output_type character varying(50),
    output_units_covered real,
    conversion_value real,
    loss_percent real DEFAULT 0,
    usable_units real,
    description text,
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    category character varying(100),
    tenant_id integer DEFAULT 1
);


--
-- Name: raw_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_materials (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    material_code character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    uom_id character varying,
    current_stock integer DEFAULT 0,
    reorder_level integer,
    max_stock_level integer,
    unit_cost numeric(12,2),
    location character varying(255),
    supplier character varying(255),
    is_active character varying DEFAULT 'true'::character varying,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    type_id character varying,
    is_opening_stock_only integer DEFAULT 1,
    opening_stock integer,
    opening_date date,
    closing_stock integer,
    closing_stock_usable integer,
    received_quantity integer,
    returned_quantity integer,
    adjustments integer,
    base_unit character varying(50),
    derived_unit character varying(50),
    conversion_method character varying(50),
    derived_value_per_base numeric(10,2),
    weight_per_base numeric(10,2),
    weight_per_derived numeric(10,2),
    default_loss_percent numeric(5,2),
    weight_per_unit integer,
    conversion_type character varying(50),
    conversion_value integer,
    weight_per_piece integer,
    loss_percent integer DEFAULT 0,
    received_date date,
    batch_code character varying(50),
    purchase_order_id character varying,
    purchase_order_item_id character varying,
    gst_rate integer DEFAULT 0,
    total_cost numeric(12,2),
    total_valuation numeric(14,2),
    tenant_id integer DEFAULT 1
);


--
-- Name: required_spares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.required_spares (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    submission_id character varying,
    spare_item character varying(255) NOT NULL,
    quantity integer NOT NULL,
    urgency character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    submission_task_id character varying,
    spare_part_id character varying,
    approved_by character varying,
    approved_at timestamp without time zone,
    rejection_reason text,
    tenant_id integer DEFAULT 1
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    role_id character varying NOT NULL,
    screen_key character varying(100) NOT NULL,
    can_view integer DEFAULT 0 NOT NULL,
    can_create integer DEFAULT 0 NOT NULL,
    can_edit integer DEFAULT 0 NOT NULL,
    can_delete integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: sales_officers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_officers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying,
    phone character varying(20),
    record_status integer DEFAULT 1,
    tenant_id integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    code character varying(50),
    mobile_number character varying(15),
    territory character varying(255),
    is_active integer DEFAULT 1 NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    so_id character varying NOT NULL,
    product_id character varying NOT NULL,
    description character varying(255),
    hsn_code character varying(8),
    quantity integer DEFAULT 0 NOT NULL,
    unit_price integer DEFAULT 0 NOT NULL,
    cgst_rate numeric,
    sgst_rate numeric,
    igst_rate numeric,
    taxable_amount integer DEFAULT 0 NOT NULL,
    total_amount integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    discount integer DEFAULT 0 NOT NULL,
    discount_mode character varying(5) DEFAULT '%'::character varying NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    so_number character varying(50) NOT NULL,
    so_date character varying(20) NOT NULL,
    vendor_id character varying,
    buyer_name character varying(255) NOT NULL,
    buyer_gstin character varying(15),
    buyer_address text,
    buyer_contact character varying(50),
    ship_to_name character varying(255),
    ship_to_address text,
    ship_to_city character varying(100),
    ship_to_state character varying(100),
    ship_to_pin character varying(10),
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    remarks text,
    total_amount integer DEFAULT 0 NOT NULL,
    recorded_by character varying,
    confirmed_by character varying,
    confirmed_at character varying(50),
    cancelled_at character varying(50),
    cancelled_by character varying,
    cancellation_reason character varying(255),
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    delivery_date character varying(20),
    buyer_state character varying(100),
    tenant_id integer DEFAULT 1
);


--
-- Name: sales_return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_return_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    return_id character varying NOT NULL,
    product_id character varying NOT NULL,
    batch_number character varying(255),
    quantity_returned integer NOT NULL,
    condition_on_receipt character varying(50),
    disposition character varying(50),
    unit_price integer NOT NULL,
    credit_amount integer NOT NULL,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    invoice_item_id character varying,
    original_quantity_invoiced integer,
    unit_cost integer,
    damage_reason character varying(50),
    damage_evidence_url character varying(500),
    return_transport_cost integer DEFAULT 0,
    expiry_date timestamp without time zone,
    is_near_expiry integer DEFAULT 0,
    repack_status character varying(20),
    repack_bottles integer,
    repack_completed_at timestamp without time zone,
    tenant_id integer DEFAULT 1
);


--
-- Name: sales_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_returns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    return_number character varying(100) NOT NULL,
    return_date timestamp without time zone NOT NULL,
    invoice_id character varying NOT NULL,
    gatepass_id character varying,
    return_reason character varying(50) NOT NULL,
    return_type character varying(20) NOT NULL,
    status character varying(50) DEFAULT 'pending_receipt'::character varying NOT NULL,
    received_date timestamp without time zone,
    inspected_date timestamp without time zone,
    inspected_by character varying,
    credit_note_number character varying(100),
    credit_note_date timestamp without time zone,
    total_credit_amount integer DEFAULT 0 NOT NULL,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    credit_note_status character varying(30) DEFAULT 'pending_auto'::character varying NOT NULL,
    total_return_transport_cost integer DEFAULT 0,
    transporter_name character varying(255),
    scrap_approval_status character varying(30) DEFAULT 'not_applicable'::character varying,
    scrap_approved_by character varying,
    scrap_approval_date timestamp without time zone,
    inspection_date timestamp without time zone,
    tenant_id integer DEFAULT 1
);


--
-- Name: salesperson_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salesperson_mappings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    excel_name character varying(100) NOT NULL,
    user_id character varying,
    display_name character varying(100),
    is_active integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: scrap_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scrap_inventory (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    scrap_number character varying(100) NOT NULL,
    scrap_date timestamp without time zone NOT NULL,
    sales_return_id character varying,
    sales_return_item_id character varying,
    invoice_id character varying,
    product_id character varying NOT NULL,
    product_name character varying(255) NOT NULL,
    batch_number character varying(100),
    quantity integer NOT NULL,
    unit_cost integer NOT NULL,
    selling_price integer NOT NULL,
    total_cost_value integer NOT NULL,
    total_selling_value integer NOT NULL,
    loss_amount integer NOT NULL,
    damage_reason character varying(50) NOT NULL,
    condition_description text,
    damage_evidence_url character varying(500),
    approval_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    approved_by character varying,
    approval_date timestamp without time zone,
    approval_remarks text,
    processed_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    processed_date timestamp without time zone,
    disposal_method character varying(50),
    disposal_value integer DEFAULT 0,
    gst_reversal integer DEFAULT 0,
    gst_reversal_status character varying(30) DEFAULT 'pending'::character varying,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: spare_part_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_part_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    spare_part_id character varying NOT NULL,
    purchase_date timestamp without time zone NOT NULL,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    vendor_id character varying,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    total_amount integer,
    gst_amount integer,
    gst_percent integer,
    tenant_id integer DEFAULT 1
);


--
-- Name: spare_part_issuances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_part_issuances (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    spare_part_id character varying NOT NULL,
    machine_id character varying,
    issued_to character varying,
    issued_by character varying,
    issue_date timestamp without time zone NOT NULL,
    quantity integer NOT NULL,
    purpose text,
    work_order_number character varying(100),
    status character varying(50) DEFAULT 'issued'::character varying,
    returned_quantity integer DEFAULT 0,
    return_date timestamp without time zone,
    remarks text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: spare_parts_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_parts_catalog (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    part_name character varying(255) NOT NULL,
    part_number character varying(100),
    category character varying(100),
    unit_price integer,
    reorder_threshold integer,
    current_stock integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    machine_id character varying,
    opening_stock_date timestamp without time zone,
    tenant_id integer DEFAULT 1
);


--
-- Name: submission_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission_tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    submission_id character varying,
    task_name character varying(255) NOT NULL,
    result character varying(10),
    remarks text,
    verified_by_name character varying(255),
    verified_signature text,
    created_at timestamp without time zone DEFAULT now(),
    photo_url text,
    tenant_id integer DEFAULT 1
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(50) NOT NULL,
    tagline character varying(255),
    description text,
    price_monthly integer DEFAULT 0 NOT NULL,
    price_yearly integer DEFAULT 0 NOT NULL,
    max_users integer DEFAULT 5 NOT NULL,
    modules jsonb DEFAULT '[]'::jsonb,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    trial_days integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    plan_id integer NOT NULL,
    plan_slug character varying(50) NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    current_period_start timestamp without time zone,
    current_period_end timestamp without time zone,
    trial_ends_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    cancel_reason text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: system_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_alerts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    alert_type character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying NOT NULL,
    entity_name character varying(255),
    severity character varying(20) DEFAULT 'warning'::character varying NOT NULL,
    message text NOT NULL,
    details jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    detected_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone,
    resolved_by character varying,
    created_by_invoice_id character varying,
    tenant_id integer DEFAULT 1
);


--
-- Name: tds_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tds_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    entry_date timestamp without time zone NOT NULL,
    vendor_id character varying,
    vendor_name character varying(255) NOT NULL,
    tds_rate_id character varying,
    section character varying(20) NOT NULL,
    gross_amount integer NOT NULL,
    tds_rate integer NOT NULL,
    tds_amount integer NOT NULL,
    net_amount integer NOT NULL,
    purchase_order_id character varying,
    description text,
    deposit_status character varying(30) DEFAULT 'pending'::character varying,
    deposit_date timestamp without time zone,
    challan_number character varying(100),
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: tds_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tds_rates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    section character varying(20) NOT NULL,
    description text,
    individual_rate integer NOT NULL,
    company_rate integer NOT NULL,
    threshold integer DEFAULT 0,
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: template_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_tasks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    template_id character varying,
    task_name character varying(255) NOT NULL,
    verification_criteria text,
    order_index integer,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    plan character varying(50) DEFAULT 'trial'::character varying,
    status character varying(50) DEFAULT 'trial'::character varying,
    trial_ends_at timestamp without time zone,
    max_users integer DEFAULT 5,
    logo_url character varying,
    primary_color character varying(20) DEFAULT '#1a56db'::character varying,
    billing_email character varying,
    contact_name character varying(255),
    contact_phone character varying(20),
    gst_number character varying(20),
    address text,
    is_super_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: terms_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terms_conditions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    tc_name character varying(255) NOT NULL,
    description text,
    terms text[] NOT NULL,
    is_default integer DEFAULT 0 NOT NULL,
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: transporters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transporters (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    transporter_code character varying(50) NOT NULL,
    transporter_name character varying(255) NOT NULL,
    contact_person character varying(255),
    phone character varying(20),
    email character varying(255),
    address text,
    gst_number character varying(20),
    pan_number character varying(20),
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: uom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uom (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active character varying DEFAULT 'true'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1 NOT NULL,
    tenant_id integer DEFAULT 1
);


--
-- Name: user_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    operator_id character varying,
    reviewer_id character varying,
    manager_id character varying,
    machine_ids text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url text,
    role character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying(255),
    password text,
    role_id character varying,
    reset_token character varying(255),
    reset_token_expiry timestamp without time zone,
    record_status integer DEFAULT 1 NOT NULL,
    mobile_number character varying(15),
    tenant_id integer DEFAULT 1
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vehicle_number character varying(20) NOT NULL,
    vehicle_type character varying(50),
    capacity character varying(50),
    transporter_id character varying,
    owner_name character varying(255),
    owner_phone character varying(20),
    insurance_expiry date,
    fitness_expiry date,
    permit_expiry date,
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: vendor_debit_note_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_debit_note_adjustments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vendor_debit_note_id character varying NOT NULL,
    reference_type character varying(20) NOT NULL,
    invoice_id character varying,
    purchase_order_id character varying,
    adjustment_amount integer NOT NULL,
    adjustment_date date NOT NULL,
    remarks text,
    adjusted_by character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: vendor_debit_note_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_debit_note_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vendor_debit_note_id character varying NOT NULL,
    raw_material_id character varying,
    description text NOT NULL,
    hsn_code character varying(20),
    quantity integer NOT NULL,
    unit character varying(20) DEFAULT 'units'::character varying NOT NULL,
    unit_price integer NOT NULL,
    taxable_value integer NOT NULL,
    cgst_rate integer DEFAULT 0 NOT NULL,
    cgst_amount integer DEFAULT 0 NOT NULL,
    sgst_rate integer DEFAULT 0 NOT NULL,
    sgst_amount integer DEFAULT 0 NOT NULL,
    igst_rate integer DEFAULT 0 NOT NULL,
    igst_amount integer DEFAULT 0 NOT NULL,
    total_amount integer NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: vendor_debit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_debit_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    note_number character varying(100) NOT NULL,
    vendor_id character varying NOT NULL,
    purchase_order_id character varying,
    debit_date date NOT NULL,
    reason character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    subtotal integer NOT NULL,
    cgst_amount integer DEFAULT 0 NOT NULL,
    sgst_amount integer DEFAULT 0 NOT NULL,
    igst_amount integer DEFAULT 0 NOT NULL,
    grand_total integer NOT NULL,
    settled_amount integer DEFAULT 0 NOT NULL,
    settlement_date date,
    settlement_reference character varying(255),
    issued_by character varying,
    approved_by character varying,
    notes text,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: vendor_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: vendor_vendor_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_vendor_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vendor_id character varying NOT NULL,
    vendor_type_id character varying NOT NULL,
    is_primary integer DEFAULT 0 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id integer DEFAULT 1
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vendor_code character varying(100) NOT NULL,
    vendor_name character varying(255) NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    gst_number character varying(20),
    aadhaar_number character varying(20),
    mobile_number character varying(20) NOT NULL,
    email character varying(255),
    contact_person character varying(255),
    vendor_type character varying(50),
    is_active character varying DEFAULT 'true'::character varying,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_cluster integer DEFAULT 0 NOT NULL,
    gst_status character varying(50),
    gst_legal_name character varying(255),
    gst_trade_name character varying(255),
    gst_verified_at timestamp without time zone,
    ship_to_name character varying(255),
    ship_to_address text,
    ship_to_city character varying(100),
    ship_to_state character varying(100),
    ship_to_pincode character varying(20),
    ship_to_gstin character varying(20),
    parent_vendor_id character varying(255),
    tenant_id integer DEFAULT 1
);


--
-- Name: whatsapp_conversation_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversation_sessions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    phone_number character varying(20) NOT NULL,
    submission_id character varying,
    template_id character varying,
    machine_id character varying,
    operator_id character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    current_task_index integer DEFAULT 0,
    total_tasks integer NOT NULL,
    answers jsonb DEFAULT '[]'::jsonb,
    last_message_at timestamp without time zone DEFAULT now(),
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    expires_at timestamp without time zone NOT NULL,
    assignment_id character varying,
    pending_photo_url text,
    ai_session_id character varying(255),
    tenant_id integer DEFAULT 1
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: billing_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_events ALTER COLUMN id SET DEFAULT nextval('public.billing_events_id_seq'::regclass);


--
-- Name: deletion_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deletion_audit ALTER COLUMN id SET DEFAULT nextval('public.deletion_audit_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: account_subtypes account_subtypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_subtypes
    ADD CONSTRAINT account_subtypes_pkey PRIMARY KEY (id);


--
-- Name: account_types account_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_types
    ADD CONSTRAINT account_types_name_key UNIQUE (name);


--
-- Name: account_types account_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_types
    ADD CONSTRAINT account_types_pkey PRIMARY KEY (id);


--
-- Name: advance_applications advance_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advance_applications
    ADD CONSTRAINT advance_applications_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_statement_imports bank_statement_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_imports
    ADD CONSTRAINT bank_statement_imports_pkey PRIMARY KEY (id);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


--
-- Name: billing_events billing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_events
    ADD CONSTRAINT billing_events_pkey PRIMARY KEY (id);


--
-- Name: budget_items budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: cash_register_days cash_register_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_days
    ADD CONSTRAINT cash_register_days_pkey PRIMARY KEY (id);


--
-- Name: cash_register_expense_items cash_register_expense_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_expense_items
    ADD CONSTRAINT cash_register_expense_items_pkey PRIMARY KEY (id);


--
-- Name: cash_register_transactions cash_register_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_transactions
    ADD CONSTRAINT cash_register_transactions_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: checklist_assignments checklist_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_assignments
    ADD CONSTRAINT checklist_assignments_pkey PRIMARY KEY (id);


--
-- Name: checklist_submissions checklist_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_submissions
    ADD CONSTRAINT checklist_submissions_pkey PRIMARY KEY (id);


--
-- Name: checklist_templates checklist_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts coa_code_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT coa_code_tenant_unique UNIQUE (code, tenant_id);


--
-- Name: credit_note_items credit_note_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_note_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_note_number_key UNIQUE (note_number);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: customer_advances customer_advances_advance_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_advances
    ADD CONSTRAINT customer_advances_advance_number_key UNIQUE (advance_number);


--
-- Name: customer_advances customer_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_advances
    ADD CONSTRAINT customer_advances_pkey PRIMARY KEY (id);


--
-- Name: debit_note_items debit_note_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_pkey PRIMARY KEY (id);


--
-- Name: debit_notes debit_notes_note_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_note_number_key UNIQUE (note_number);


--
-- Name: debit_notes debit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_pkey PRIMARY KEY (id);


--
-- Name: deletion_audit deletion_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deletion_audit
    ADD CONSTRAINT deletion_audit_pkey PRIMARY KEY (id);


--
-- Name: document_categories document_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_name_key UNIQUE (name);


--
-- Name: document_categories document_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_name_unique UNIQUE (name);


--
-- Name: document_categories document_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_driver_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_driver_code_key UNIQUE (driver_code);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: expense_attachments expense_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_attachments
    ADD CONSTRAINT expense_attachments_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_items expense_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_items
    ADD CONSTRAINT expense_items_pkey PRIMARY KEY (id);


--
-- Name: expense_vouchers expense_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_pkey PRIMARY KEY (id);


--
-- Name: expense_vouchers expense_vouchers_voucher_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_voucher_number_key UNIQUE (voucher_number);


--
-- Name: expense_vouchers expense_vouchers_voucher_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_voucher_number_unique UNIQUE (voucher_number);


--
-- Name: finished_goods finished_goods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finished_goods
    ADD CONSTRAINT finished_goods_pkey PRIMARY KEY (id);


--
-- Name: gatepass_items gatepass_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepass_items
    ADD CONSTRAINT gatepass_items_pkey PRIMARY KEY (id);


--
-- Name: gatepasses gatepasses_gatepass_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_gatepass_number_key UNIQUE (gatepass_number);


--
-- Name: gatepasses gatepasses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_payments invoice_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: invoice_templates invoice_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_templates
    ADD CONSTRAINT invoice_templates_pkey PRIMARY KEY (id);


--
-- Name: invoice_templates invoice_templates_template_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_templates
    ADD CONSTRAINT invoice_templates_template_name_key UNIQUE (template_name);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_journal_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_journal_number_key UNIQUE (journal_number);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_lines journal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_pkey PRIMARY KEY (id);


--
-- Name: machine_spares machine_spares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_spares
    ADD CONSTRAINT machine_spares_pkey PRIMARY KEY (id);


--
-- Name: machine_startup_tasks machine_startup_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_startup_tasks
    ADD CONSTRAINT machine_startup_tasks_pkey PRIMARY KEY (id);


--
-- Name: machine_startup_tasks machine_startup_tasks_task_reference_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_startup_tasks
    ADD CONSTRAINT machine_startup_tasks_task_reference_id_key UNIQUE (task_reference_id);


--
-- Name: machine_types machine_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_types
    ADD CONSTRAINT machine_types_name_unique UNIQUE (name);


--
-- Name: machine_types machine_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_types
    ADD CONSTRAINT machine_types_pkey PRIMARY KEY (id);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: maintenance_history maintenance_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_pkey PRIMARY KEY (id);


--
-- Name: maintenance_plans maintenance_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_plans
    ADD CONSTRAINT maintenance_plans_pkey PRIMARY KEY (id);


--
-- Name: manual_credit_note_requests manual_credit_note_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_credit_note_requests
    ADD CONSTRAINT manual_credit_note_requests_pkey PRIMARY KEY (id);


--
-- Name: monthly_expense_payments monthly_expense_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_expense_payments
    ADD CONSTRAINT monthly_expense_payments_pkey PRIMARY KEY (id);


--
-- Name: monthly_expenses monthly_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_expenses
    ADD CONSTRAINT monthly_expenses_pkey PRIMARY KEY (id);


--
-- Name: notification_config notification_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_config
    ADD CONSTRAINT notification_config_pkey PRIMARY KEY (id);


--
-- Name: partial_task_answers partial_task_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partial_task_answers
    ADD CONSTRAINT partial_task_answers_pkey PRIMARY KEY (id);


--
-- Name: payment_evidence payment_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_evidence
    ADD CONSTRAINT payment_evidence_pkey PRIMARY KEY (id);


--
-- Name: pm_execution_tasks pm_execution_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_execution_tasks
    ADD CONSTRAINT pm_execution_tasks_pkey PRIMARY KEY (id);


--
-- Name: pm_executions pm_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_executions
    ADD CONSTRAINT pm_executions_pkey PRIMARY KEY (id);


--
-- Name: pm_task_list_templates pm_task_list_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_task_list_templates
    ADD CONSTRAINT pm_task_list_templates_pkey PRIMARY KEY (id);


--
-- Name: pm_template_tasks pm_template_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_template_tasks
    ADD CONSTRAINT pm_template_tasks_pkey PRIMARY KEY (id);


--
-- Name: product_bom_configurations product_bom_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom_configurations
    ADD CONSTRAINT product_bom_configurations_pkey PRIMARY KEY (id);


--
-- Name: product_bom product_bom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom
    ADD CONSTRAINT product_bom_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_code_key UNIQUE (code);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_types product_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_code_key UNIQUE (code);


--
-- Name: product_types product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_pkey PRIMARY KEY (id);


--
-- Name: production_entries production_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_entries
    ADD CONSTRAINT production_entries_pkey PRIMARY KEY (id);


--
-- Name: production_entries production_entries_unique_issuance_date_shift; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_entries
    ADD CONSTRAINT production_entries_unique_issuance_date_shift UNIQUE (issuance_id, production_date, shift);


--
-- Name: production_reconciliation_items production_reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliation_items
    ADD CONSTRAINT production_reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: production_reconciliations production_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliations
    ADD CONSTRAINT production_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: production_reconciliations production_reconciliations_reconciliation_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliations
    ADD CONSTRAINT production_reconciliations_reconciliation_number_key UNIQUE (reconciliation_number);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_product_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_product_code_key UNIQUE (product_code);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_unique UNIQUE (po_number);


--
-- Name: purchase_return_items purchase_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_items
    ADD CONSTRAINT purchase_return_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_returns purchase_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_pkey PRIMARY KEY (id);


--
-- Name: purchase_returns purchase_returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_return_number_key UNIQUE (return_number);


--
-- Name: raw_material_issuance raw_material_issuance_issuance_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance
    ADD CONSTRAINT raw_material_issuance_issuance_number_key UNIQUE (issuance_number);


--
-- Name: raw_material_issuance_items raw_material_issuance_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance_items
    ADD CONSTRAINT raw_material_issuance_items_pkey PRIMARY KEY (id);


--
-- Name: raw_material_issuance raw_material_issuance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance
    ADD CONSTRAINT raw_material_issuance_pkey PRIMARY KEY (id);


--
-- Name: raw_material_transactions raw_material_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_transactions
    ADD CONSTRAINT raw_material_transactions_pkey PRIMARY KEY (id);


--
-- Name: raw_material_types raw_material_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_types
    ADD CONSTRAINT raw_material_types_pkey PRIMARY KEY (id);


--
-- Name: raw_material_types raw_material_types_type_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_types
    ADD CONSTRAINT raw_material_types_type_code_key UNIQUE (type_code);


--
-- Name: raw_material_types raw_material_types_type_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_types
    ADD CONSTRAINT raw_material_types_type_code_unique UNIQUE (type_code);


--
-- Name: raw_materials raw_materials_material_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_material_code_key UNIQUE (material_code);


--
-- Name: raw_materials raw_materials_material_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_material_code_unique UNIQUE (material_code);


--
-- Name: raw_materials raw_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_pkey PRIMARY KEY (id);


--
-- Name: required_spares required_spares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.required_spares
    ADD CONSTRAINT required_spares_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_screen_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_screen_unique UNIQUE (role_id, screen_key);


--
-- Name: roles roles_name_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_tenant_unique UNIQUE (name, tenant_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_officers sales_officers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_officers
    ADD CONSTRAINT sales_officers_code_key UNIQUE (code);


--
-- Name: sales_officers sales_officers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_officers
    ADD CONSTRAINT sales_officers_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_so_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_so_number_key UNIQUE (so_number);


--
-- Name: sales_return_items sales_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_return_number_key UNIQUE (return_number);


--
-- Name: salesperson_mappings salesperson_mappings_excel_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salesperson_mappings
    ADD CONSTRAINT salesperson_mappings_excel_name_key UNIQUE (excel_name);


--
-- Name: salesperson_mappings salesperson_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salesperson_mappings
    ADD CONSTRAINT salesperson_mappings_pkey PRIMARY KEY (id);


--
-- Name: scrap_inventory scrap_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrap_inventory
    ADD CONSTRAINT scrap_inventory_pkey PRIMARY KEY (id);


--
-- Name: scrap_inventory scrap_inventory_scrap_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrap_inventory
    ADD CONSTRAINT scrap_inventory_scrap_number_key UNIQUE (scrap_number);


--
-- Name: scrap_inventory scrap_inventory_scrap_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scrap_inventory
    ADD CONSTRAINT scrap_inventory_scrap_number_unique UNIQUE (scrap_number);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: spare_part_entries spare_part_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_entries
    ADD CONSTRAINT spare_part_entries_pkey PRIMARY KEY (id);


--
-- Name: spare_part_issuances spare_part_issuances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_issuances
    ADD CONSTRAINT spare_part_issuances_pkey PRIMARY KEY (id);


--
-- Name: spare_parts_catalog spare_parts_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts_catalog
    ADD CONSTRAINT spare_parts_catalog_pkey PRIMARY KEY (id);


--
-- Name: submission_tasks submission_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_tasks
    ADD CONSTRAINT submission_tasks_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_slug_key UNIQUE (slug);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_unique UNIQUE (tenant_id);


--
-- Name: system_alerts system_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);


--
-- Name: tds_entries tds_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tds_entries
    ADD CONSTRAINT tds_entries_pkey PRIMARY KEY (id);


--
-- Name: tds_rates tds_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tds_rates
    ADD CONSTRAINT tds_rates_pkey PRIMARY KEY (id);


--
-- Name: template_tasks template_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_tasks
    ADD CONSTRAINT template_tasks_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: terms_conditions terms_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms_conditions
    ADD CONSTRAINT terms_conditions_pkey PRIMARY KEY (id);


--
-- Name: terms_conditions terms_conditions_tc_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms_conditions
    ADD CONSTRAINT terms_conditions_tc_name_key UNIQUE (tc_name);


--
-- Name: transporters transporters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_pkey PRIMARY KEY (id);


--
-- Name: transporters transporters_transporter_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_transporter_code_key UNIQUE (transporter_code);


--
-- Name: uom uom_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_code_key UNIQUE (code);


--
-- Name: uom uom_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_code_unique UNIQUE (code);


--
-- Name: uom uom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_pkey PRIMARY KEY (id);


--
-- Name: user_assignments user_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assignments
    ADD CONSTRAINT user_assignments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_tenant_unique UNIQUE (email, tenant_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_tenant_unique UNIQUE (username, tenant_id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_vehicle_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vehicle_number_key UNIQUE (vehicle_number);


--
-- Name: vendor_debit_note_adjustments vendor_debit_note_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_adjustments
    ADD CONSTRAINT vendor_debit_note_adjustments_pkey PRIMARY KEY (id);


--
-- Name: vendor_debit_note_items vendor_debit_note_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_items
    ADD CONSTRAINT vendor_debit_note_items_pkey PRIMARY KEY (id);


--
-- Name: vendor_debit_notes vendor_debit_notes_note_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_notes
    ADD CONSTRAINT vendor_debit_notes_note_number_key UNIQUE (note_number);


--
-- Name: vendor_debit_notes vendor_debit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_notes
    ADD CONSTRAINT vendor_debit_notes_pkey PRIMARY KEY (id);


--
-- Name: vendor_types vendor_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_types
    ADD CONSTRAINT vendor_types_code_key UNIQUE (code);


--
-- Name: vendor_types vendor_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_types
    ADD CONSTRAINT vendor_types_pkey PRIMARY KEY (id);


--
-- Name: vendor_vendor_types vendor_vendor_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_vendor_types
    ADD CONSTRAINT vendor_vendor_types_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_vendor_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_code_key UNIQUE (vendor_code);


--
-- Name: whatsapp_conversation_sessions whatsapp_conversation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_sessions
    ADD CONSTRAINT whatsapp_conversation_sessions_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: advance_applications_advance_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX advance_applications_advance_idx ON public.advance_applications USING btree (advance_id);


--
-- Name: advance_applications_invoice_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX advance_applications_invoice_idx ON public.advance_applications USING btree (invoice_id);


--
-- Name: ast_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ast_type_idx ON public.account_subtypes USING btree (account_type);


--
-- Name: bi_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bi_account_idx ON public.budget_items USING btree (account_id);


--
-- Name: bi_budget_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bi_budget_idx ON public.budget_items USING btree (budget_id);


--
-- Name: bt_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bt_hash_idx ON public.bank_transactions USING btree (duplicate_hash);


--
-- Name: bt_import_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bt_import_idx ON public.bank_transactions USING btree (import_id);


--
-- Name: bt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bt_status_idx ON public.bank_transactions USING btree (status);


--
-- Name: cash_register_days_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_register_days_date_idx ON public.cash_register_days USING btree (register_date);


--
-- Name: cash_register_days_salesperson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_register_days_salesperson_idx ON public.cash_register_days USING btree (salesperson_id);


--
-- Name: cash_register_days_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cash_register_days_status_idx ON public.cash_register_days USING btree (status);


--
-- Name: coa_node_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coa_node_type_idx ON public.chart_of_accounts USING btree (node_type);


--
-- Name: coa_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coa_parent_idx ON public.chart_of_accounts USING btree (parent_id);


--
-- Name: coa_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coa_type_idx ON public.chart_of_accounts USING btree (account_type);


--
-- Name: customer_advances_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_advances_status_idx ON public.customer_advances USING btree (status);


--
-- Name: customer_advances_vendor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_advances_vendor_idx ON public.customer_advances USING btree (vendor_id);


--
-- Name: documents_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_category_idx ON public.documents USING btree (category_id);


--
-- Name: documents_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_expiry_idx ON public.documents USING btree (expiry_date);


--
-- Name: documents_related_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_related_entity_idx ON public.documents USING btree (related_entity_type, related_entity_id);


--
-- Name: expense_vouchers_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expense_vouchers_date_idx ON public.expense_vouchers USING btree (voucher_date);


--
-- Name: expense_vouchers_payee_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expense_vouchers_payee_idx ON public.expense_vouchers USING btree (payee_type, payee_id);


--
-- Name: expense_vouchers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expense_vouchers_status_idx ON public.expense_vouchers USING btree (status);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_table_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_credit_notes_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_vendor_id ON public.credit_notes USING btree (vendor_id);


--
-- Name: idx_deletion_audit_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deletion_audit_deleted_at ON public.deletion_audit USING btree (deleted_at);


--
-- Name: idx_deletion_audit_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deletion_audit_tenant_id ON public.deletion_audit USING btree (tenant_id);


--
-- Name: idx_machine_startup_tasks_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_startup_tasks_date ON public.machine_startup_tasks USING btree (production_date);


--
-- Name: idx_machine_startup_tasks_machine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_startup_tasks_machine ON public.machine_startup_tasks USING btree (machine_id);


--
-- Name: idx_machine_startup_tasks_record_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_startup_tasks_record_status ON public.machine_startup_tasks USING btree (record_status);


--
-- Name: idx_machine_startup_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_startup_tasks_status ON public.machine_startup_tasks USING btree (status);


--
-- Name: idx_machine_startup_tasks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_startup_tasks_user ON public.machine_startup_tasks USING btree (assigned_user_id);


--
-- Name: idx_prod_recon_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_created_by ON public.production_reconciliations USING btree (created_by);


--
-- Name: idx_prod_recon_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_date ON public.production_reconciliations USING btree (reconciliation_date);


--
-- Name: idx_prod_recon_issuance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_issuance ON public.production_reconciliations USING btree (issuance_id);


--
-- Name: idx_prod_recon_items_issuance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_items_issuance ON public.production_reconciliation_items USING btree (issuance_item_id);


--
-- Name: idx_prod_recon_items_material; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_items_material ON public.production_reconciliation_items USING btree (raw_material_id);


--
-- Name: idx_prod_recon_items_recon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_items_recon ON public.production_reconciliation_items USING btree (reconciliation_id);


--
-- Name: idx_prod_recon_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_items_status ON public.production_reconciliation_items USING btree (record_status);


--
-- Name: idx_prod_recon_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_number ON public.production_reconciliations USING btree (reconciliation_number);


--
-- Name: idx_prod_recon_production; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_production ON public.production_reconciliations USING btree (production_entry_id);


--
-- Name: idx_prod_recon_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_shift ON public.production_reconciliations USING btree (shift);


--
-- Name: idx_prod_recon_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prod_recon_status ON public.production_reconciliations USING btree (record_status);


--
-- Name: idx_raw_materials_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_materials_po_id ON public.raw_materials USING btree (purchase_order_id);


--
-- Name: idx_raw_materials_po_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_materials_po_item_id ON public.raw_materials USING btree (purchase_order_item_id);


--
-- Name: idx_scrap_inventory_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrap_inventory_approval ON public.scrap_inventory USING btree (approval_status);


--
-- Name: idx_scrap_inventory_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrap_inventory_date ON public.scrap_inventory USING btree (scrap_date);


--
-- Name: idx_scrap_inventory_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrap_inventory_product ON public.scrap_inventory USING btree (product_id);


--
-- Name: idx_scrap_inventory_sales_return; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scrap_inventory_sales_return ON public.scrap_inventory USING btree (sales_return_id);


--
-- Name: idx_system_alerts_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_entity ON public.system_alerts USING btree (entity_type, entity_id, status);


--
-- Name: idx_system_alerts_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_type_status ON public.system_alerts USING btree (alert_type, status);


--
-- Name: jl_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jl_account_idx ON public.journal_lines USING btree (account_id);


--
-- Name: jl_journal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jl_journal_idx ON public.journal_lines USING btree (journal_id);


--
-- Name: journal_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_date_idx ON public.journal_entries USING btree (journal_date);


--
-- Name: journal_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_source_idx ON public.journal_entries USING btree (source_type, source_id);


--
-- Name: me_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX me_month_idx ON public.monthly_expenses USING btree (expense_month);


--
-- Name: me_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX me_status_idx ON public.monthly_expenses USING btree (status);


--
-- Name: mep_expense_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mep_expense_idx ON public.monthly_expense_payments USING btree (expense_id);


--
-- Name: product_bom_configuration_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_bom_configuration_id_idx ON public.product_bom USING btree (configuration_id);


--
-- Name: product_bom_configurations_is_default_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_bom_configurations_is_default_idx ON public.product_bom_configurations USING btree (is_default);


--
-- Name: product_bom_configurations_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_bom_configurations_product_id_idx ON public.product_bom_configurations USING btree (product_id);


--
-- Name: product_bom_configurations_record_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_bom_configurations_record_status_idx ON public.product_bom_configurations USING btree (record_status);


--
-- Name: product_bom_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_bom_product_id_idx ON public.product_bom USING btree (product_id);


--
-- Name: product_bom_raw_material_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_bom_raw_material_id_idx ON public.product_bom USING btree (raw_material_id);


--
-- Name: product_bom_record_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_bom_record_status_idx ON public.product_bom USING btree (record_status);


--
-- Name: so_buyer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX so_buyer_idx ON public.sales_orders USING btree (buyer_name);


--
-- Name: so_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX so_status_idx ON public.sales_orders USING btree (status);


--
-- Name: so_vendor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX so_vendor_idx ON public.sales_orders USING btree (vendor_id);


--
-- Name: soi_so_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX soi_so_idx ON public.sales_order_items USING btree (so_id);


--
-- Name: vendor_types_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_types_code_idx ON public.vendor_types USING btree (code);


--
-- Name: vendor_types_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_types_is_active_idx ON public.vendor_types USING btree (is_active);


--
-- Name: vendor_vendor_types_unique_constraint; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_vendor_types_unique_constraint ON public.vendor_vendor_types USING btree (vendor_id, vendor_type_id);


--
-- Name: vendor_vendor_types_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_vendor_types_unique_idx ON public.vendor_vendor_types USING btree (vendor_id, vendor_type_id);


--
-- Name: vendor_vendor_types_vendor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_vendor_types_vendor_id_idx ON public.vendor_vendor_types USING btree (vendor_id);


--
-- Name: vendor_vendor_types_vendor_type_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_vendor_types_vendor_type_id_idx ON public.vendor_vendor_types USING btree (vendor_type_id);


--
-- Name: advance_applications advance_applications_advance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advance_applications
    ADD CONSTRAINT advance_applications_advance_id_fkey FOREIGN KEY (advance_id) REFERENCES public.customer_advances(id);


--
-- Name: advance_applications advance_applications_applied_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advance_applications
    ADD CONSTRAINT advance_applications_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES public.users(id);


--
-- Name: advance_applications advance_applications_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advance_applications
    ADD CONSTRAINT advance_applications_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: advance_applications advance_applications_invoice_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advance_applications
    ADD CONSTRAINT advance_applications_invoice_payment_id_fkey FOREIGN KEY (invoice_payment_id) REFERENCES public.invoice_payments(id);


--
-- Name: advance_applications advance_applications_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advance_applications
    ADD CONSTRAINT advance_applications_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.users(id);


--
-- Name: bank_statement_imports bank_statement_imports_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_imports
    ADD CONSTRAINT bank_statement_imports_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: bank_transactions bank_transactions_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: bank_transactions bank_transactions_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_import_id_fkey FOREIGN KEY (import_id) REFERENCES public.bank_statement_imports(id);


--
-- Name: bank_transactions bank_transactions_matched_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_matched_account_id_fkey FOREIGN KEY (matched_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: budget_items budget_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: budget_items budget_items_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id);


--
-- Name: budgets budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: cash_register_days cash_register_days_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_days
    ADD CONSTRAINT cash_register_days_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: cash_register_days cash_register_days_reconciled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_days
    ADD CONSTRAINT cash_register_days_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES public.users(id);


--
-- Name: cash_register_days cash_register_days_salesperson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_days
    ADD CONSTRAINT cash_register_days_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES public.users(id);


--
-- Name: cash_register_expense_items cash_register_expense_items_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_expense_items
    ADD CONSTRAINT cash_register_expense_items_expense_category_id_fkey FOREIGN KEY (expense_category_id) REFERENCES public.expense_categories(id);


--
-- Name: cash_register_expense_items cash_register_expense_items_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_expense_items
    ADD CONSTRAINT cash_register_expense_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.cash_register_transactions(id) ON DELETE CASCADE;


--
-- Name: cash_register_transactions cash_register_transactions_converted_to_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_transactions
    ADD CONSTRAINT cash_register_transactions_converted_to_voucher_id_fkey FOREIGN KEY (converted_to_voucher_id) REFERENCES public.expense_vouchers(id);


--
-- Name: cash_register_transactions cash_register_transactions_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_register_transactions
    ADD CONSTRAINT cash_register_transactions_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.cash_register_days(id) ON DELETE CASCADE;


--
-- Name: checklist_assignments checklist_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_assignments
    ADD CONSTRAINT checklist_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: checklist_assignments checklist_assignments_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_assignments
    ADD CONSTRAINT checklist_assignments_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: checklist_assignments checklist_assignments_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_assignments
    ADD CONSTRAINT checklist_assignments_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: checklist_assignments checklist_assignments_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_assignments
    ADD CONSTRAINT checklist_assignments_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: checklist_assignments checklist_assignments_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_assignments
    ADD CONSTRAINT checklist_assignments_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.checklist_submissions(id);


--
-- Name: checklist_assignments checklist_assignments_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_assignments
    ADD CONSTRAINT checklist_assignments_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id);


--
-- Name: checklist_submissions checklist_submissions_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_submissions
    ADD CONSTRAINT checklist_submissions_machine_id_machines_id_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: checklist_submissions checklist_submissions_manager_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_submissions
    ADD CONSTRAINT checklist_submissions_manager_id_users_id_fk FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: checklist_submissions checklist_submissions_operator_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_submissions
    ADD CONSTRAINT checklist_submissions_operator_id_users_id_fk FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: checklist_submissions checklist_submissions_reviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_submissions
    ADD CONSTRAINT checklist_submissions_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: checklist_submissions checklist_submissions_template_id_checklist_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_submissions
    ADD CONSTRAINT checklist_submissions_template_id_checklist_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id);


--
-- Name: checklist_templates checklist_templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: checklist_templates checklist_templates_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_machine_id_machines_id_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: credit_note_items credit_note_items_credit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES public.credit_notes(id);


--
-- Name: credit_note_items credit_note_items_invoice_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_invoice_item_id_fkey FOREIGN KEY (invoice_item_id) REFERENCES public.invoice_items(id);


--
-- Name: credit_note_items credit_note_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: credit_notes credit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: credit_notes credit_notes_sales_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_sales_return_id_fkey FOREIGN KEY (sales_return_id) REFERENCES public.sales_returns(id);


--
-- Name: credit_notes credit_notes_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: customer_advances customer_advances_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_advances
    ADD CONSTRAINT customer_advances_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: customer_advances customer_advances_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_advances
    ADD CONSTRAINT customer_advances_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: customer_advances customer_advances_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_advances
    ADD CONSTRAINT customer_advances_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: debit_note_items debit_note_items_debit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_debit_note_id_fkey FOREIGN KEY (debit_note_id) REFERENCES public.debit_notes(id);


--
-- Name: debit_note_items debit_note_items_invoice_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_invoice_item_id_fkey FOREIGN KEY (invoice_item_id) REFERENCES public.invoice_items(id);


--
-- Name: debit_note_items debit_note_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_note_items
    ADD CONSTRAINT debit_note_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: debit_notes debit_notes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: debit_notes debit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: debit_notes debit_notes_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debit_notes
    ADD CONSTRAINT debit_notes_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: documents documents_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.document_categories(id);


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: drivers drivers_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id);


--
-- Name: expense_attachments expense_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_attachments
    ADD CONSTRAINT expense_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: expense_attachments expense_attachments_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_attachments
    ADD CONSTRAINT expense_attachments_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.expense_vouchers(id) ON DELETE CASCADE;


--
-- Name: expense_items expense_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_items
    ADD CONSTRAINT expense_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: expense_items expense_items_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_items
    ADD CONSTRAINT expense_items_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.expense_vouchers(id) ON DELETE CASCADE;


--
-- Name: expense_vouchers expense_vouchers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: expense_vouchers expense_vouchers_prepared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_prepared_by_fkey FOREIGN KEY (prepared_by) REFERENCES public.users(id);


--
-- Name: finished_goods finished_goods_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finished_goods
    ADD CONSTRAINT finished_goods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: finished_goods finished_goods_inspected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finished_goods
    ADD CONSTRAINT finished_goods_inspected_by_fkey FOREIGN KEY (inspected_by) REFERENCES public.users(id);


--
-- Name: finished_goods finished_goods_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finished_goods
    ADD CONSTRAINT finished_goods_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: finished_goods finished_goods_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finished_goods
    ADD CONSTRAINT finished_goods_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: finished_goods finished_goods_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finished_goods
    ADD CONSTRAINT finished_goods_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: finished_goods finished_goods_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finished_goods
    ADD CONSTRAINT finished_goods_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: gatepass_items gatepass_items_finished_good_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepass_items
    ADD CONSTRAINT gatepass_items_finished_good_id_fkey FOREIGN KEY (finished_good_id) REFERENCES public.finished_goods(id);


--
-- Name: gatepass_items gatepass_items_gatepass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepass_items
    ADD CONSTRAINT gatepass_items_gatepass_id_fkey FOREIGN KEY (gatepass_id) REFERENCES public.gatepasses(id);


--
-- Name: gatepass_items gatepass_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepass_items
    ADD CONSTRAINT gatepass_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: gatepass_items gatepass_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepass_items
    ADD CONSTRAINT gatepass_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: gatepasses gatepasses_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: gatepasses gatepasses_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: gatepasses gatepasses_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: gatepasses gatepasses_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id);


--
-- Name: gatepasses gatepasses_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: gatepasses gatepasses_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: invoice_items invoice_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: invoice_payments invoice_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_payments invoice_payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: invoice_templates invoice_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_templates
    ADD CONSTRAINT invoice_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_gatepass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_gatepass_id_fkey FOREIGN KEY (gatepass_id) REFERENCES public.gatepasses(id);


--
-- Name: invoices invoices_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.invoice_templates(id);


--
-- Name: invoices invoices_terms_conditions_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_terms_conditions_id_fkey FOREIGN KEY (terms_conditions_id) REFERENCES public.terms_conditions(id);


--
-- Name: journal_entries journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_lines journal_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: journal_lines journal_lines_journal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_lines
    ADD CONSTRAINT journal_lines_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.journal_entries(id);


--
-- Name: machine_spares machine_spares_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_spares
    ADD CONSTRAINT machine_spares_machine_id_machines_id_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: machine_spares machine_spares_spare_part_id_spare_parts_catalog_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_spares
    ADD CONSTRAINT machine_spares_spare_part_id_spare_parts_catalog_id_fk FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts_catalog(id);


--
-- Name: machine_startup_tasks machine_startup_tasks_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_startup_tasks
    ADD CONSTRAINT machine_startup_tasks_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id);


--
-- Name: machine_startup_tasks machine_startup_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_startup_tasks
    ADD CONSTRAINT machine_startup_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: machine_startup_tasks machine_startup_tasks_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_startup_tasks
    ADD CONSTRAINT machine_startup_tasks_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: maintenance_history maintenance_history_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_machine_id_machines_id_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: maintenance_history maintenance_history_performed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_performed_by_users_id_fk FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: maintenance_history maintenance_history_plan_id_maintenance_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_plan_id_maintenance_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.maintenance_plans(id);


--
-- Name: maintenance_plans maintenance_plans_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_plans
    ADD CONSTRAINT maintenance_plans_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: maintenance_plans maintenance_plans_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_plans
    ADD CONSTRAINT maintenance_plans_machine_id_machines_id_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: maintenance_plans maintenance_plans_task_list_template_id_pm_task_list_templates_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_plans
    ADD CONSTRAINT maintenance_plans_task_list_template_id_pm_task_list_templates_ FOREIGN KEY (task_list_template_id) REFERENCES public.pm_task_list_templates(id);


--
-- Name: manual_credit_note_requests manual_credit_note_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_credit_note_requests
    ADD CONSTRAINT manual_credit_note_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: manual_credit_note_requests manual_credit_note_requests_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_credit_note_requests
    ADD CONSTRAINT manual_credit_note_requests_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: manual_credit_note_requests manual_credit_note_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_credit_note_requests
    ADD CONSTRAINT manual_credit_note_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: manual_credit_note_requests manual_credit_note_requests_sales_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_credit_note_requests
    ADD CONSTRAINT manual_credit_note_requests_sales_return_id_fkey FOREIGN KEY (sales_return_id) REFERENCES public.sales_returns(id);


--
-- Name: monthly_expense_payments monthly_expense_payments_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_expense_payments
    ADD CONSTRAINT monthly_expense_payments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.monthly_expenses(id);


--
-- Name: partial_task_answers partial_task_answers_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partial_task_answers
    ADD CONSTRAINT partial_task_answers_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.users(id);


--
-- Name: partial_task_answers partial_task_answers_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partial_task_answers
    ADD CONSTRAINT partial_task_answers_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.checklist_assignments(id);


--
-- Name: partial_task_answers partial_task_answers_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partial_task_answers
    ADD CONSTRAINT partial_task_answers_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts_catalog(id);


--
-- Name: payment_evidence payment_evidence_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_evidence
    ADD CONSTRAINT payment_evidence_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: payment_evidence payment_evidence_parent_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_evidence
    ADD CONSTRAINT payment_evidence_parent_payment_id_fkey FOREIGN KEY (parent_payment_id) REFERENCES public.invoice_payments(id);


--
-- Name: payment_evidence payment_evidence_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_evidence
    ADD CONSTRAINT payment_evidence_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: pm_execution_tasks pm_execution_tasks_execution_id_pm_executions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_execution_tasks
    ADD CONSTRAINT pm_execution_tasks_execution_id_pm_executions_id_fk FOREIGN KEY (execution_id) REFERENCES public.pm_executions(id);


--
-- Name: pm_executions pm_executions_completed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_executions
    ADD CONSTRAINT pm_executions_completed_by_users_id_fk FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: pm_executions pm_executions_machine_id_machines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_executions
    ADD CONSTRAINT pm_executions_machine_id_machines_id_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: pm_executions pm_executions_maintenance_plan_id_maintenance_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_executions
    ADD CONSTRAINT pm_executions_maintenance_plan_id_maintenance_plans_id_fk FOREIGN KEY (maintenance_plan_id) REFERENCES public.maintenance_plans(id);


--
-- Name: pm_executions pm_executions_task_list_template_id_pm_task_list_templates_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_executions
    ADD CONSTRAINT pm_executions_task_list_template_id_pm_task_list_templates_id_f FOREIGN KEY (task_list_template_id) REFERENCES public.pm_task_list_templates(id);


--
-- Name: pm_task_list_templates pm_task_list_templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_task_list_templates
    ADD CONSTRAINT pm_task_list_templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pm_task_list_templates pm_task_list_templates_machine_type_id_machine_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_task_list_templates
    ADD CONSTRAINT pm_task_list_templates_machine_type_id_machine_types_id_fk FOREIGN KEY (machine_type_id) REFERENCES public.machine_types(id);


--
-- Name: pm_template_tasks pm_template_tasks_template_id_pm_task_list_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pm_template_tasks
    ADD CONSTRAINT pm_template_tasks_template_id_pm_task_list_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.pm_task_list_templates(id);


--
-- Name: product_bom product_bom_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom
    ADD CONSTRAINT product_bom_configuration_id_fkey FOREIGN KEY (configuration_id) REFERENCES public.product_bom_configurations(id) ON DELETE CASCADE;


--
-- Name: product_bom_configurations product_bom_configurations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom_configurations
    ADD CONSTRAINT product_bom_configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: product_bom_configurations product_bom_configurations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom_configurations
    ADD CONSTRAINT product_bom_configurations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_bom product_bom_material_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom
    ADD CONSTRAINT product_bom_material_type_id_fkey FOREIGN KEY (material_type_id) REFERENCES public.raw_material_types(id);


--
-- Name: product_bom product_bom_product_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom
    ADD CONSTRAINT product_bom_product_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_bom product_bom_raw_material_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bom
    ADD CONSTRAINT product_bom_raw_material_id_fk FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id) ON DELETE CASCADE;


--
-- Name: production_entries production_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_entries
    ADD CONSTRAINT production_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: production_entries production_entries_issuance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_entries
    ADD CONSTRAINT production_entries_issuance_id_fkey FOREIGN KEY (issuance_id) REFERENCES public.raw_material_issuance(id);


--
-- Name: production_entries production_entries_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_entries
    ADD CONSTRAINT production_entries_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: production_entries production_entries_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_entries
    ADD CONSTRAINT production_entries_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: production_reconciliation_items production_reconciliation_items_issuance_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliation_items
    ADD CONSTRAINT production_reconciliation_items_issuance_item_id_fkey FOREIGN KEY (issuance_item_id) REFERENCES public.raw_material_issuance_items(id);


--
-- Name: production_reconciliation_items production_reconciliation_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliation_items
    ADD CONSTRAINT production_reconciliation_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: production_reconciliation_items production_reconciliation_items_reconciliation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliation_items
    ADD CONSTRAINT production_reconciliation_items_reconciliation_id_fkey FOREIGN KEY (reconciliation_id) REFERENCES public.production_reconciliations(id);


--
-- Name: production_reconciliation_items production_reconciliation_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliation_items
    ADD CONSTRAINT production_reconciliation_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: production_reconciliations production_reconciliations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliations
    ADD CONSTRAINT production_reconciliations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: production_reconciliations production_reconciliations_issuance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliations
    ADD CONSTRAINT production_reconciliations_issuance_id_fkey FOREIGN KEY (issuance_id) REFERENCES public.raw_material_issuance(id);


--
-- Name: production_reconciliations production_reconciliations_last_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliations
    ADD CONSTRAINT production_reconciliations_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES public.users(id);


--
-- Name: production_reconciliations production_reconciliations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliations
    ADD CONSTRAINT production_reconciliations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: production_reconciliations production_reconciliations_production_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_reconciliations
    ADD CONSTRAINT production_reconciliations_production_entry_id_fkey FOREIGN KEY (production_entry_id) REFERENCES public.production_entries(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id);


--
-- Name: products products_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: products products_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.product_types(id);


--
-- Name: products products_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_order_items purchase_order_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: purchase_order_items purchase_order_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: purchase_orders purchase_orders_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_requested_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_requested_by_users_id_fk FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_spare_part_id_spare_parts_catalog_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_spare_part_id_spare_parts_catalog_id_fk FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts_catalog(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_return_items purchase_return_items_purchase_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_items
    ADD CONSTRAINT purchase_return_items_purchase_return_id_fkey FOREIGN KEY (purchase_return_id) REFERENCES public.purchase_returns(id);


--
-- Name: purchase_return_items purchase_return_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_return_items
    ADD CONSTRAINT purchase_return_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: purchase_returns purchase_returns_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_returns purchase_returns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_returns purchase_returns_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_returns purchase_returns_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_returns
    ADD CONSTRAINT purchase_returns_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: raw_material_issuance raw_material_issuance_bom_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance
    ADD CONSTRAINT raw_material_issuance_bom_configuration_id_fkey FOREIGN KEY (bom_configuration_id) REFERENCES public.product_bom_configurations(id);


--
-- Name: raw_material_issuance raw_material_issuance_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance
    ADD CONSTRAINT raw_material_issuance_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: raw_material_issuance_items raw_material_issuance_items_issuance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance_items
    ADD CONSTRAINT raw_material_issuance_items_issuance_id_fkey FOREIGN KEY (issuance_id) REFERENCES public.raw_material_issuance(id);


--
-- Name: raw_material_issuance_items raw_material_issuance_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance_items
    ADD CONSTRAINT raw_material_issuance_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: raw_material_issuance_items raw_material_issuance_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance_items
    ADD CONSTRAINT raw_material_issuance_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: raw_material_issuance_items raw_material_issuance_items_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance_items
    ADD CONSTRAINT raw_material_issuance_items_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: raw_material_issuance raw_material_issuance_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_issuance
    ADD CONSTRAINT raw_material_issuance_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: raw_material_transactions raw_material_transactions_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_transactions
    ADD CONSTRAINT raw_material_transactions_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.raw_materials(id);


--
-- Name: raw_material_transactions raw_material_transactions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_transactions
    ADD CONSTRAINT raw_material_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: raw_material_types raw_material_types_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_material_types
    ADD CONSTRAINT raw_material_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: raw_materials raw_materials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: raw_materials raw_materials_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: raw_materials raw_materials_purchase_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id);


--
-- Name: raw_materials raw_materials_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.raw_material_types(id);


--
-- Name: raw_materials raw_materials_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: required_spares required_spares_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.required_spares
    ADD CONSTRAINT required_spares_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: required_spares required_spares_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.required_spares
    ADD CONSTRAINT required_spares_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts_catalog(id);


--
-- Name: required_spares required_spares_submission_id_checklist_submissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.required_spares
    ADD CONSTRAINT required_spares_submission_id_checklist_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES public.checklist_submissions(id);


--
-- Name: required_spares required_spares_submission_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.required_spares
    ADD CONSTRAINT required_spares_submission_task_id_fkey FOREIGN KEY (submission_task_id) REFERENCES public.submission_tasks(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: sales_order_items sales_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales_order_items sales_order_items_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.sales_orders(id);


--
-- Name: sales_orders sales_orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: sales_return_items sales_return_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales_return_items sales_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(id);


--
-- Name: sales_returns sales_returns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales_returns sales_returns_gatepass_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_gatepass_id_fkey FOREIGN KEY (gatepass_id) REFERENCES public.gatepasses(id);


--
-- Name: sales_returns sales_returns_inspected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_inspected_by_fkey FOREIGN KEY (inspected_by) REFERENCES public.users(id);


--
-- Name: sales_returns sales_returns_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: salesperson_mappings salesperson_mappings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salesperson_mappings
    ADD CONSTRAINT salesperson_mappings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: spare_part_entries spare_part_entries_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_entries
    ADD CONSTRAINT spare_part_entries_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts_catalog(id);


--
-- Name: spare_part_entries spare_part_entries_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_entries
    ADD CONSTRAINT spare_part_entries_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: spare_part_issuances spare_part_issuances_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_issuances
    ADD CONSTRAINT spare_part_issuances_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: spare_part_issuances spare_part_issuances_issued_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_issuances
    ADD CONSTRAINT spare_part_issuances_issued_to_fkey FOREIGN KEY (issued_to) REFERENCES public.users(id);


--
-- Name: spare_part_issuances spare_part_issuances_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_issuances
    ADD CONSTRAINT spare_part_issuances_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: spare_part_issuances spare_part_issuances_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_issuances
    ADD CONSTRAINT spare_part_issuances_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts_catalog(id);


--
-- Name: spare_parts_catalog spare_parts_catalog_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts_catalog
    ADD CONSTRAINT spare_parts_catalog_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: submission_tasks submission_tasks_submission_id_checklist_submissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_tasks
    ADD CONSTRAINT submission_tasks_submission_id_checklist_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES public.checklist_submissions(id);


--
-- Name: system_alerts system_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: tds_entries tds_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tds_entries
    ADD CONSTRAINT tds_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tds_entries tds_entries_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tds_entries
    ADD CONSTRAINT tds_entries_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: tds_entries tds_entries_tds_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tds_entries
    ADD CONSTRAINT tds_entries_tds_rate_id_fkey FOREIGN KEY (tds_rate_id) REFERENCES public.tds_rates(id);


--
-- Name: tds_entries tds_entries_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tds_entries
    ADD CONSTRAINT tds_entries_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: template_tasks template_tasks_template_id_checklist_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_tasks
    ADD CONSTRAINT template_tasks_template_id_checklist_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id);


--
-- Name: terms_conditions terms_conditions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms_conditions
    ADD CONSTRAINT terms_conditions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: user_assignments user_assignments_manager_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assignments
    ADD CONSTRAINT user_assignments_manager_id_users_id_fk FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: user_assignments user_assignments_operator_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assignments
    ADD CONSTRAINT user_assignments_operator_id_users_id_fk FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: user_assignments user_assignments_reviewer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_assignments
    ADD CONSTRAINT user_assignments_reviewer_id_users_id_fk FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: vehicles vehicles_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id);


--
-- Name: vendor_debit_note_adjustments vendor_debit_note_adjustments_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_adjustments
    ADD CONSTRAINT vendor_debit_note_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id);


--
-- Name: vendor_debit_note_adjustments vendor_debit_note_adjustments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_adjustments
    ADD CONSTRAINT vendor_debit_note_adjustments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: vendor_debit_note_adjustments vendor_debit_note_adjustments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_adjustments
    ADD CONSTRAINT vendor_debit_note_adjustments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: vendor_debit_note_adjustments vendor_debit_note_adjustments_vendor_debit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_adjustments
    ADD CONSTRAINT vendor_debit_note_adjustments_vendor_debit_note_id_fkey FOREIGN KEY (vendor_debit_note_id) REFERENCES public.vendor_debit_notes(id);


--
-- Name: vendor_debit_note_items vendor_debit_note_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_items
    ADD CONSTRAINT vendor_debit_note_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: vendor_debit_note_items vendor_debit_note_items_vendor_debit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_note_items
    ADD CONSTRAINT vendor_debit_note_items_vendor_debit_note_id_fkey FOREIGN KEY (vendor_debit_note_id) REFERENCES public.vendor_debit_notes(id);


--
-- Name: vendor_debit_notes vendor_debit_notes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_notes
    ADD CONSTRAINT vendor_debit_notes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: vendor_debit_notes vendor_debit_notes_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_notes
    ADD CONSTRAINT vendor_debit_notes_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: vendor_debit_notes vendor_debit_notes_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_notes
    ADD CONSTRAINT vendor_debit_notes_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: vendor_debit_notes vendor_debit_notes_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_debit_notes
    ADD CONSTRAINT vendor_debit_notes_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: vendor_types vendor_types_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_types
    ADD CONSTRAINT vendor_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: vendor_vendor_types vendor_vendor_types_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_vendor_types
    ADD CONSTRAINT vendor_vendor_types_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_vendor_types vendor_vendor_types_vendor_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_vendor_types
    ADD CONSTRAINT vendor_vendor_types_vendor_type_id_fkey FOREIGN KEY (vendor_type_id) REFERENCES public.vendor_types(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: whatsapp_conversation_sessions whatsapp_conversation_sessions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_sessions
    ADD CONSTRAINT whatsapp_conversation_sessions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.checklist_assignments(id);


--
-- Name: whatsapp_conversation_sessions whatsapp_conversation_sessions_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_sessions
    ADD CONSTRAINT whatsapp_conversation_sessions_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: whatsapp_conversation_sessions whatsapp_conversation_sessions_operator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_sessions
    ADD CONSTRAINT whatsapp_conversation_sessions_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id);


--
-- Name: whatsapp_conversation_sessions whatsapp_conversation_sessions_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_sessions
    ADD CONSTRAINT whatsapp_conversation_sessions_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.checklist_submissions(id);


--
-- Name: whatsapp_conversation_sessions whatsapp_conversation_sessions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_sessions
    ADD CONSTRAINT whatsapp_conversation_sessions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Zeu5hhvwwYH34rwv8NWmN6EnkrWvOeT1x7eYFqZkwCuCTJqKqzfBehWVIoaV4AD

