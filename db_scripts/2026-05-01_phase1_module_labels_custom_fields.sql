-- Phase 1: Configurable Module Labels + Custom Field Definitions
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

-- ── tenant_module_labels ────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.tenant_module_labels_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.tenant_module_labels (
    id          integer NOT NULL DEFAULT nextval('tenant_module_labels_id_seq'),
    tenant_id   integer NOT NULL,
    module_key  text NOT NULL,
    custom_label text NOT NULL,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.tenant_module_labels_id_seq OWNED BY public.tenant_module_labels.id;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_module_labels_tenant_module_uidx
    ON public.tenant_module_labels (tenant_id, module_key);

-- ── custom_field_definitions ────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.custom_field_definitions_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id           integer NOT NULL DEFAULT nextval('custom_field_definitions_id_seq'),
    tenant_id    integer NOT NULL,
    entity_type  text NOT NULL,
    field_name   text NOT NULL,
    field_label  text NOT NULL,
    field_type   text DEFAULT 'text',
    options      jsonb,
    is_required  boolean DEFAULT false,
    sort_order   integer DEFAULT 0,
    record_status integer DEFAULT 1,
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.custom_field_definitions_id_seq OWNED BY public.custom_field_definitions.id;

-- ── custom_field_values ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.custom_field_values_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.custom_field_values (
    id            integer NOT NULL DEFAULT nextval('custom_field_values_id_seq'),
    tenant_id     integer NOT NULL,
    field_def_id  integer NOT NULL,
    entity_type   text NOT NULL,
    entity_id     integer NOT NULL,
    field_value   text,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.custom_field_values_id_seq OWNED BY public.custom_field_values.id;

CREATE INDEX IF NOT EXISTS custom_field_values_entity_idx
    ON public.custom_field_values (tenant_id, entity_type, entity_id);
