-- Migration: Configuration & Assignment System (FIXED)
-- Date: 2025-11-12 14:00:03
-- Tables: product_categories, product_types, notification_config, machine_startup_tasks, checklist_assignments
-- Dependencies: machines, checklist_templates, users
-- FIX: Works with existing machine_startup_tasks table structure

-- Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  category_name varchar(255) NOT NULL,
  description text,
  is_active integer DEFAULT 1 NOT NULL,
  display_order integer,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT product_categories_category_name_unique UNIQUE(category_name)
);

-- Product Types Table
CREATE TABLE IF NOT EXISTS product_types (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  type_name varchar(255) NOT NULL,
  description text,
  is_active integer DEFAULT 1 NOT NULL,
  display_order integer,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT product_types_type_name_unique UNIQUE(type_name)
);

-- Notification Config Table
CREATE TABLE IF NOT EXISTS notification_config (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  config_key varchar(100) NOT NULL,
  config_value text,
  description text,
  category varchar(50),
  is_active integer DEFAULT 1 NOT NULL,
  metadata jsonb,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT notification_config_config_key_unique UNIQUE(config_key)
);

-- Machine Startup Tasks Table - Add missing template_id column if not exists
-- Note: Table already exists with assigned_user_id column
DO $$ 
BEGIN
  -- Add template_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'machine_startup_tasks' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE machine_startup_tasks ADD COLUMN template_id varchar;
  END IF;
END $$;

-- Checklist Assignments Table
CREATE TABLE IF NOT EXISTS checklist_assignments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  template_id varchar NOT NULL,
  machine_id varchar NOT NULL,
  operator_id varchar NOT NULL,
  reviewer_id varchar,
  assigned_date date NOT NULL,
  shift varchar(50),
  due_date_time timestamp,
  status varchar(50) DEFAULT 'pending',
  submission_id varchar,
  assigned_by varchar NOT NULL,
  notes text,
  missed_notification_sent integer DEFAULT 0 NOT NULL,
  missed_notification_sent_at timestamp,
  whatsapp_enabled integer DEFAULT 0 NOT NULL,
  task_reference_id varchar(50),
  whatsapp_notification_sent integer DEFAULT 0 NOT NULL,
  whatsapp_notification_sent_at timestamp,
  operator_response text,
  operator_response_time timestamp,
  record_status integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Foreign Keys for machine_startup_tasks
-- Use existing column name: assigned_user_id (not assigned_operator_id)

-- Drop existing constraints if they exist (to avoid errors on re-run)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_startup_tasks_machine_id_machines_id_fk') THEN
    ALTER TABLE machine_startup_tasks DROP CONSTRAINT machine_startup_tasks_machine_id_machines_id_fk;
  END IF;
END $$;

ALTER TABLE machine_startup_tasks ADD CONSTRAINT machine_startup_tasks_machine_id_machines_id_fk 
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE cascade ON UPDATE no action;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_startup_tasks_template_id_checklist_templates_id_fk') THEN
    ALTER TABLE machine_startup_tasks DROP CONSTRAINT machine_startup_tasks_template_id_checklist_templates_id_fk;
  END IF;
END $$;

ALTER TABLE machine_startup_tasks ADD CONSTRAINT machine_startup_tasks_template_id_checklist_templates_id_fk 
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE set null ON UPDATE no action;

-- FIXED: Use existing column assigned_user_id instead of assigned_operator_id
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machine_startup_tasks_assigned_user_id_users_id_fk') THEN
    ALTER TABLE machine_startup_tasks DROP CONSTRAINT machine_startup_tasks_assigned_user_id_users_id_fk;
  END IF;
END $$;

ALTER TABLE machine_startup_tasks ADD CONSTRAINT machine_startup_tasks_assigned_user_id_users_id_fk 
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

-- Foreign Keys for checklist_assignments
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checklist_assignments_template_id_checklist_templates_id_fk') THEN
    ALTER TABLE checklist_assignments DROP CONSTRAINT checklist_assignments_template_id_checklist_templates_id_fk;
  END IF;
END $$;

ALTER TABLE checklist_assignments ADD CONSTRAINT checklist_assignments_template_id_checklist_templates_id_fk 
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE cascade ON UPDATE no action;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checklist_assignments_machine_id_machines_id_fk') THEN
    ALTER TABLE checklist_assignments DROP CONSTRAINT checklist_assignments_machine_id_machines_id_fk;
  END IF;
END $$;

ALTER TABLE checklist_assignments ADD CONSTRAINT checklist_assignments_machine_id_machines_id_fk 
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE cascade ON UPDATE no action;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checklist_assignments_operator_id_users_id_fk') THEN
    ALTER TABLE checklist_assignments DROP CONSTRAINT checklist_assignments_operator_id_users_id_fk;
  END IF;
END $$;

ALTER TABLE checklist_assignments ADD CONSTRAINT checklist_assignments_operator_id_users_id_fk 
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE cascade ON UPDATE no action;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checklist_assignments_reviewer_id_users_id_fk') THEN
    ALTER TABLE checklist_assignments DROP CONSTRAINT checklist_assignments_reviewer_id_users_id_fk;
  END IF;
END $$;

ALTER TABLE checklist_assignments ADD CONSTRAINT checklist_assignments_reviewer_id_users_id_fk 
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE set null ON UPDATE no action;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checklist_assignments_submission_id_checklist_submissions_id_') THEN
    ALTER TABLE checklist_assignments DROP CONSTRAINT checklist_assignments_submission_id_checklist_submissions_id_;
  END IF;
END $$;

ALTER TABLE checklist_assignments ADD CONSTRAINT checklist_assignments_submission_id_checklist_submissions_id_fk 
  FOREIGN KEY (submission_id) REFERENCES checklist_submissions(id) ON DELETE set null ON UPDATE no action;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'checklist_assignments_assigned_by_users_id_fk') THEN
    ALTER TABLE checklist_assignments DROP CONSTRAINT checklist_assignments_assigned_by_users_id_fk;
  END IF;
END $$;

ALTER TABLE checklist_assignments ADD CONSTRAINT checklist_assignments_assigned_by_users_id_fk 
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE restrict ON UPDATE no action;
