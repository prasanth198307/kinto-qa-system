-- T014: Audit Trail
-- T016: Inline Entity Attachments
-- Run date: 2026-05-01
-- Safe to re-run (IF NOT EXISTS throughout)

-- ── audit_logs ──────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.audit_logs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          integer NOT NULL DEFAULT nextval('audit_logs_id_seq'),
    tenant_id   integer,
    user_id     varchar(255),
    action      varchar(50) NOT NULL,
    table_name  varchar(100) NOT NULL,
    record_id   varchar(255),
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;

CREATE INDEX IF NOT EXISTS audit_logs_tenant_table_idx
    ON public.audit_logs (tenant_id, table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx
    ON public.audit_logs (created_at DESC);

-- ── entity_attachments ──────────────────────────────────────────────
-- Generic attachment table: one record per file, linked to any entity by type+id
CREATE SEQUENCE IF NOT EXISTS public.entity_attachments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.entity_attachments (
    id            integer NOT NULL DEFAULT nextval('entity_attachments_id_seq'),
    tenant_id     integer NOT NULL,
    entity_type   text NOT NULL,
    entity_id     integer NOT NULL,
    file_name     text NOT NULL,
    file_path     text NOT NULL,
    file_size     integer,
    mime_type     text,
    uploaded_by   integer,
    created_at    timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER SEQUENCE public.entity_attachments_id_seq OWNED BY public.entity_attachments.id;

CREATE INDEX IF NOT EXISTS entity_attachments_entity_idx
    ON public.entity_attachments (tenant_id, entity_type, entity_id);
