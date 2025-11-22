--
-- PostgreSQL database dump
--

\restrict jZL4yYT5VEblwwjcCIr8llYMUckiXPdl92dQ2RMFELS4mOeoUBDybX5eVoluqx6

-- Dumped from database version 16.9 (415ebe8)
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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    operator_response_time timestamp without time zone
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
    created_at timestamp without time zone DEFAULT now()
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
    record_status integer DEFAULT 1 NOT NULL
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    note_number character varying(100) NOT NULL,
    invoice_id character varying NOT NULL,
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
    approved_by character varying
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
    record_status integer DEFAULT 1 NOT NULL
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
    updated_at timestamp without time zone DEFAULT now()
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
    transporter_name character varying(255),
    destination character varying(255),
    customer_name character varying(255),
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
    pod_signature text
);


--
-- Name: COLUMN gatepasses.invoice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gatepasses.invoice_id IS 'Foreign key to invoices table. One-to-one relationship: each invoice can only be linked to one gatepass';


--
-- Name: COLUMN gatepasses.is_cluster; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gatepasses.is_cluster IS 'Flag copied from vendor: 0 = Individual, 1 = Cluster (for mobile app integration)';


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
    updated_at timestamp without time zone DEFAULT now()
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    logo_url text
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
    authorized_signatory_name character varying(255)
);


--
-- Name: COLUMN invoices.is_cluster; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.is_cluster IS 'Flag for buyer/customer: 0 = Individual, 1 = Cluster (for mobile app integration)';


--
-- Name: machine_spares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_spares (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    machine_id character varying NOT NULL,
    spare_part_id character varying NOT NULL,
    recommended_quantity integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now()
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
    response_status character varying(20) DEFAULT 'no_response'::character varying
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
    record_status integer DEFAULT 1 NOT NULL
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
    warmup_time_minutes integer DEFAULT 0
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
    created_at timestamp without time zone DEFAULT now()
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
    record_status integer DEFAULT 1 NOT NULL
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    smtp_from_name character varying(255)
);


--
-- Name: COLUMN notification_config.meta_phone_number_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_config.meta_phone_number_id IS 'Meta WhatsApp Phone Number ID from Business Manager';


--
-- Name: COLUMN notification_config.meta_access_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_config.meta_access_token IS 'Meta WhatsApp permanent access token';


--
-- Name: COLUMN notification_config.meta_verify_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_config.meta_verify_token IS 'Webhook verification token (required for security)';


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
    waiting_for_spare_part integer DEFAULT 0
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
    created_at timestamp without time zone DEFAULT now()
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
    created_at timestamp without time zone DEFAULT now()
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
    record_status integer DEFAULT 1 NOT NULL
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
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_bom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_bom (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    raw_material_id character varying NOT NULL,
    quantity_required numeric NOT NULL,
    uom character varying,
    notes character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    record_status integer DEFAULT 1
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
    display_order integer
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
    display_order integer
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
    updated_at timestamp without time zone DEFAULT now()
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    base_price integer,
    gst_percent numeric,
    total_price integer,
    hsn_code character varying,
    sac_code character varying,
    tax_type character varying,
    minimum_stock_level numeric,
    net_volume integer,
    mrp integer,
    category_id character varying,
    type_id character varying
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
    record_status integer DEFAULT 1 NOT NULL
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
    planned_output numeric(12,2)
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
    calculation_basis character varying(50)
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
    created_at timestamp without time zone DEFAULT now()
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
    base_unit_weight integer,
    derived_unit character varying(50),
    weight_per_derived_unit integer,
    derived_value_per_base integer,
    output_type character varying(50),
    output_units_covered integer,
    conversion_value integer,
    loss_percent integer DEFAULT 0,
    usable_units integer,
    description text,
    is_active integer DEFAULT 1 NOT NULL,
    record_status integer DEFAULT 1 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
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
    unit_cost integer,
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
    loss_percent integer DEFAULT 0
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
    rejection_reason text
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
    updated_at timestamp without time zone DEFAULT now()
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
    record_status integer DEFAULT 1 NOT NULL
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
    updated_at timestamp without time zone DEFAULT now()
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
    credit_note_status character varying(30) DEFAULT 'pending_auto'::character varying NOT NULL
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
    machine_id character varying
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
    photo_url text
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
    created_at timestamp without time zone DEFAULT now()
);


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
    updated_at timestamp without time zone DEFAULT now()
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
    record_status integer DEFAULT 1 NOT NULL
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
    updated_at timestamp without time zone DEFAULT now()
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
    mobile_number character varying(15) NOT NULL
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
    updated_at timestamp without time zone DEFAULT now()
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
    created_at timestamp without time zone DEFAULT now()
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
    is_cluster integer DEFAULT 0 NOT NULL
);


--
-- Name: COLUMN vendors.is_cluster; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendors.is_cluster IS 'Flag to identify cluster vendors: 0 = Individual, 1 = Cluster';


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
    ai_session_id character varying(255)
);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


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
-- Name: gatepasses gatepasses_invoice_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gatepasses
    ADD CONSTRAINT gatepasses_invoice_id_key UNIQUE (invoice_id);


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
-- Name: raw_materials raw_materials_material_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_material_code_key UNIQUE (material_code);


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
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


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
-- Name: template_tasks template_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_tasks
    ADD CONSTRAINT template_tasks_pkey PRIMARY KEY (id);


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
-- Name: uom uom_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_code_key UNIQUE (code);


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
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


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
-- Name: vendor_types_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_types_code_idx ON public.vendor_types USING btree (code);


--
-- Name: vendor_types_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_types_is_active_idx ON public.vendor_types USING btree (is_active);


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

\unrestrict jZL4yYT5VEblwwjcCIr8llYMUckiXPdl92dQ2RMFELS4mOeoUBDybX5eVoluqx6

