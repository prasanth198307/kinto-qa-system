CREATE TABLE "banks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"account_holder_name" varchar(255) NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"ifsc_code" varchar(11) NOT NULL,
	"branch_name" varchar(255),
	"account_type" varchar(50),
	"upi_id" varchar(100),
	"is_default" integer DEFAULT 0 NOT NULL,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "banks_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "checklist_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"machine_id" varchar NOT NULL,
	"operator_id" varchar NOT NULL,
	"reviewer_id" varchar,
	"assigned_date" date NOT NULL,
	"shift" varchar(50),
	"due_date_time" timestamp,
	"status" varchar(50) DEFAULT 'pending',
	"submission_id" varchar,
	"assigned_by" varchar NOT NULL,
	"notes" text,
	"missed_notification_sent" integer DEFAULT 0 NOT NULL,
	"missed_notification_sent_at" timestamp,
	"whatsapp_enabled" integer DEFAULT 0 NOT NULL,
	"task_reference_id" varchar(50),
	"whatsapp_notification_sent" integer DEFAULT 0 NOT NULL,
	"whatsapp_notification_sent_at" timestamp,
	"operator_response" text,
	"operator_response_time" timestamp,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar,
	"machine_id" varchar,
	"operator_id" varchar,
	"reviewer_id" varchar,
	"manager_id" varchar,
	"status" varchar(50) DEFAULT 'pending',
	"date" timestamp NOT NULL,
	"shift" varchar(50),
	"supervisor_name" varchar(255),
	"general_remarks" text,
	"signature_data" text,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"machine_id" varchar,
	"shift_types" text[],
	"created_by" varchar,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_note_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_note_id" varchar NOT NULL,
	"invoice_item_id" varchar,
	"product_id" varchar NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"taxable_value" integer NOT NULL,
	"cgst_rate" integer DEFAULT 0 NOT NULL,
	"cgst_amount" integer DEFAULT 0 NOT NULL,
	"sgst_rate" integer DEFAULT 0 NOT NULL,
	"sgst_amount" integer DEFAULT 0 NOT NULL,
	"igst_rate" integer DEFAULT 0 NOT NULL,
	"igst_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_number" varchar(100) NOT NULL,
	"invoice_id" varchar NOT NULL,
	"sales_return_id" varchar,
	"credit_date" date NOT NULL,
	"reason" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"subtotal" integer NOT NULL,
	"cgst_amount" integer DEFAULT 0 NOT NULL,
	"sgst_amount" integer DEFAULT 0 NOT NULL,
	"igst_amount" integer DEFAULT 0 NOT NULL,
	"grand_total" integer NOT NULL,
	"issued_by" varchar,
	"approved_by" varchar,
	"notes" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "credit_notes_note_number_unique" UNIQUE("note_number")
);
--> statement-breakpoint
CREATE TABLE "finished_goods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"batch_number" varchar(100) NOT NULL,
	"production_date" timestamp NOT NULL,
	"quantity" integer NOT NULL,
	"uom_id" varchar,
	"quality_status" varchar(50) DEFAULT 'pending',
	"machine_id" varchar,
	"operator_id" varchar,
	"inspected_by" varchar,
	"inspection_date" timestamp,
	"storage_location" varchar(255),
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gatepass_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gatepass_id" varchar NOT NULL,
	"finished_good_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity_dispatched" integer NOT NULL,
	"uom_id" varchar,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gatepasses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gatepass_number" varchar(100) NOT NULL,
	"gatepass_date" timestamp NOT NULL,
	"vehicle_number" varchar(50) NOT NULL,
	"driver_name" varchar(255) NOT NULL,
	"driver_contact" varchar(50),
	"transporter_name" varchar(255),
	"destination" varchar(255),
	"vendor_id" varchar,
	"customer_name" varchar(255),
	"is_cluster" integer DEFAULT 0 NOT NULL,
	"invoice_id" varchar,
	"remarks" text,
	"cases_count" integer,
	"security_seal_no" varchar(100),
	"status" varchar(50) DEFAULT 'generated' NOT NULL,
	"out_time" timestamp,
	"in_time" timestamp,
	"verified_by" varchar(255),
	"pod_received_by" varchar(255),
	"pod_date" timestamp,
	"pod_remarks" text,
	"pod_signature" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"issued_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "gatepasses_gatepass_number_unique" UNIQUE("gatepass_number"),
	CONSTRAINT "gatepasses_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"hsn_code" varchar(8),
	"sac_code" varchar(6),
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"uom_id" varchar,
	"unit_price" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"taxable_amount" integer NOT NULL,
	"cgst_rate" integer DEFAULT 0 NOT NULL,
	"cgst_amount" integer DEFAULT 0 NOT NULL,
	"sgst_rate" integer DEFAULT 0 NOT NULL,
	"sgst_amount" integer DEFAULT 0 NOT NULL,
	"igst_rate" integer DEFAULT 0 NOT NULL,
	"igst_amount" integer DEFAULT 0 NOT NULL,
	"cess_rate" integer DEFAULT 0 NOT NULL,
	"cess_amount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"payment_date" timestamp NOT NULL,
	"amount" integer NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"reference_number" varchar(100),
	"payment_type" varchar(50) NOT NULL,
	"bank_name" varchar(255),
	"remarks" text,
	"recorded_by" varchar,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"description" text,
	"logo_url" text,
	"default_seller_name" varchar(255),
	"default_seller_gstin" varchar(15),
	"default_seller_address" text,
	"default_seller_state" varchar(100),
	"default_seller_state_code" varchar(2),
	"default_seller_phone" varchar(50),
	"default_seller_email" varchar(255),
	"default_bank_name" varchar(255),
	"default_bank_account_number" varchar(50),
	"default_bank_ifsc_code" varchar(11),
	"default_account_holder_name" varchar(255),
	"default_branch_name" varchar(255),
	"default_upi_id" varchar(100),
	"is_default" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoice_templates_template_name_unique" UNIQUE("template_name")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"template_id" varchar,
	"terms_conditions_id" varchar,
	"seller_gstin" varchar(15),
	"seller_name" varchar(255),
	"seller_address" text,
	"seller_state" varchar(100),
	"seller_state_code" varchar(2),
	"seller_phone" varchar(50),
	"seller_email" varchar(255),
	"buyer_gstin" varchar(15),
	"buyer_name" varchar(255) NOT NULL,
	"buyer_address" text,
	"buyer_state" varchar(100),
	"buyer_state_code" varchar(2),
	"buyer_contact" varchar(50),
	"is_cluster" integer DEFAULT 0 NOT NULL,
	"ship_to_name" varchar(255),
	"ship_to_address" text,
	"ship_to_city" varchar(100),
	"ship_to_state" varchar(100),
	"ship_to_pincode" varchar(10),
	"subtotal" integer NOT NULL,
	"cgst_amount" integer DEFAULT 0 NOT NULL,
	"sgst_amount" integer DEFAULT 0 NOT NULL,
	"igst_amount" integer DEFAULT 0 NOT NULL,
	"cess_amount" integer DEFAULT 0 NOT NULL,
	"round_off" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"amount_received" integer DEFAULT 0 NOT NULL,
	"payment_terms" varchar(255),
	"bank_name" varchar(255),
	"bank_account_number" varchar(50),
	"bank_ifsc_code" varchar(11),
	"account_holder_name" varchar(255),
	"branch_name" varchar(255),
	"upi_id" varchar(100),
	"place_of_supply" varchar(100),
	"reverse_charge" integer DEFAULT 0 NOT NULL,
	"transport_mode" varchar(50),
	"vehicle_number" varchar(50),
	"date_of_supply" timestamp,
	"remarks" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"dispatch_date" timestamp,
	"delivery_date" timestamp,
	"received_by" varchar(255),
	"pod_remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"generated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "machine_spares" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" varchar NOT NULL,
	"spare_part_id" varchar NOT NULL,
	"recommended_quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "machine_startup_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" varchar NOT NULL,
	"assigned_user_id" varchar NOT NULL,
	"scheduled_start_time" timestamp NOT NULL,
	"reminder_before_minutes" integer DEFAULT 30 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notification_sent_at" timestamp,
	"machine_started_at" timestamp,
	"whatsapp_enabled" integer DEFAULT 1 NOT NULL,
	"email_enabled" integer DEFAULT 1 NOT NULL,
	"whatsapp_sent" integer DEFAULT 0 NOT NULL,
	"email_sent" integer DEFAULT 0 NOT NULL,
	"production_date" date NOT NULL,
	"shift" varchar(50),
	"notes" text,
	"task_reference_id" varchar(50),
	"operator_response" text,
	"operator_response_time" timestamp,
	"response_status" varchar(20) DEFAULT 'no_response',
	"created_by" varchar,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "machine_startup_tasks_task_reference_id_unique" UNIQUE("task_reference_id")
);
--> statement-breakpoint
CREATE TABLE "machine_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" varchar(10) DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "machine_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"location" varchar(255),
	"status" varchar(50) DEFAULT 'active',
	"warmup_time_minutes" integer DEFAULT 0,
	"installation_date" timestamp,
	"last_maintenance" timestamp,
	"next_pm_due" timestamp,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" varchar,
	"plan_id" varchar,
	"performed_date" timestamp NOT NULL,
	"performed_by" varchar,
	"type" varchar(100) NOT NULL,
	"description" text,
	"spare_parts_used" text,
	"downtime_hours" integer,
	"cost" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" varchar,
	"plan_name" varchar(255) NOT NULL,
	"plan_type" varchar(100) NOT NULL,
	"frequency" varchar(50) NOT NULL,
	"next_due_date" timestamp,
	"task_list_template_id" varchar,
	"assigned_to" varchar,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manual_credit_note_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_return_id" varchar NOT NULL,
	"reason_code" varchar(50) NOT NULL,
	"requested_by" varchar NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"assigned_to" varchar,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"completed_at" timestamp,
	"completed_by" varchar,
	"external_credit_note_number" varchar(100),
	"external_credit_note_date" timestamp,
	"notes" text,
	"processing_notes" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_enabled" integer DEFAULT 0 NOT NULL,
	"sender_email" varchar(255),
	"sender_name" varchar(255),
	"whatsapp_enabled" integer DEFAULT 0 NOT NULL,
	"meta_phone_number_id" varchar(255),
	"meta_access_token" text,
	"meta_verify_token" varchar(255),
	"test_mode" integer DEFAULT 1 NOT NULL,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partial_task_answers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" varchar NOT NULL,
	"task_order" integer NOT NULL,
	"task_name" varchar(255) NOT NULL,
	"status" varchar(10) NOT NULL,
	"remarks" text,
	"photo_url" varchar(500),
	"spare_part_id" varchar,
	"spare_part_request_text" text,
	"waiting_for_photo" integer DEFAULT 0,
	"waiting_for_spare_part" integer DEFAULT 0,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"answered_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pm_execution_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" varchar NOT NULL,
	"task_name" varchar(255) NOT NULL,
	"description" text,
	"result" varchar(10),
	"remarks" text,
	"photo_url" varchar(500),
	"order_index" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pm_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenance_plan_id" varchar NOT NULL,
	"machine_id" varchar NOT NULL,
	"task_list_template_id" varchar,
	"completed_by" varchar NOT NULL,
	"completed_at" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'completed',
	"overall_result" varchar(50),
	"remarks" text,
	"downtime_hours" integer,
	"spare_parts_used" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pm_task_list_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"machine_type_id" varchar,
	"category" varchar(100),
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pm_template_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"task_name" varchar(255) NOT NULL,
	"description" text,
	"verification_criteria" text,
	"order_index" integer,
	"requires_photo" varchar DEFAULT 'false',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_bom" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"raw_material_id" varchar NOT NULL,
	"quantity_required" numeric(12, 6) NOT NULL,
	"uom" varchar(50),
	"notes" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "production_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuance_id" varchar NOT NULL,
	"production_date" timestamp NOT NULL,
	"shift" varchar(20) NOT NULL,
	"produced_quantity" numeric(12, 2) NOT NULL,
	"rejected_quantity" numeric(12, 2) DEFAULT '0',
	"empty_bottles_produced" numeric(12, 2) DEFAULT '0',
	"empty_bottles_used" numeric(12, 2) DEFAULT '0',
	"empty_bottles_pending" numeric(12, 2) DEFAULT '0',
	"derived_units" numeric(12, 2),
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_entries_issuance_id_production_date_shift_unique" UNIQUE("issuance_id","production_date","shift")
);
--> statement-breakpoint
CREATE TABLE "production_reconciliation_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_id" varchar NOT NULL,
	"raw_material_id" varchar NOT NULL,
	"issuance_item_id" varchar,
	"quantity_issued" integer NOT NULL,
	"quantity_used" integer NOT NULL,
	"quantity_returned" integer DEFAULT 0 NOT NULL,
	"quantity_pending" integer DEFAULT 0 NOT NULL,
	"uom_id" varchar,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "production_reconciliations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_number" varchar(100) NOT NULL,
	"reconciliation_date" timestamp NOT NULL,
	"shift" varchar(20) NOT NULL,
	"issuance_id" varchar NOT NULL,
	"production_entry_id" varchar NOT NULL,
	"produced_cases" integer NOT NULL,
	"rejected_cases" integer DEFAULT 0 NOT NULL,
	"empty_bottles_produced" integer DEFAULT 0 NOT NULL,
	"empty_bottles_used" integer DEFAULT 0 NOT NULL,
	"empty_bottles_pending" integer DEFAULT 0 NOT NULL,
	"edit_count" integer DEFAULT 0 NOT NULL,
	"last_edited_by" varchar,
	"last_edited_at" timestamp,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "production_reconciliations_reconciliation_number_unique" UNIQUE("reconciliation_number")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"sku_code" varchar(100),
	"category_id" varchar,
	"type_id" varchar,
	"category" varchar(100),
	"product_type" varchar(100),
	"description" text,
	"base_unit" varchar(50),
	"derived_unit" varchar(50),
	"conversion_method" varchar(50),
	"derived_value_per_base" numeric(10, 2),
	"weight_per_base" numeric(10, 2),
	"weight_per_derived" numeric(10, 2),
	"default_loss_percent" numeric(5, 2) DEFAULT '0',
	"usable_derived_units" numeric(12, 4),
	"net_volume" integer,
	"base_price" integer,
	"gst_percent" numeric(5, 2),
	"total_price" integer,
	"mrp" integer,
	"hsn_code" varchar(50),
	"sac_code" varchar(50),
	"tax_type" varchar(50),
	"minimum_stock_level" numeric(10, 2),
	"uom_id" varchar,
	"standard_cost" integer,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_product_code_unique" UNIQUE("product_code"),
	CONSTRAINT "products_sku_code_unique" UNIQUE("sku_code")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" varchar(100) NOT NULL,
	"spare_part_id" varchar,
	"quantity" integer NOT NULL,
	"urgency" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"requested_by" varchar,
	"approved_by" varchar,
	"supplier" varchar(255),
	"estimated_cost" integer,
	"expected_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "raw_material_issuance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuance_number" varchar(100) NOT NULL,
	"issuance_date" timestamp NOT NULL,
	"issued_to" varchar(255),
	"product_id" varchar,
	"production_reference" varchar(255),
	"planned_output" numeric(12, 2),
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"issued_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "raw_material_issuance_issuance_number_unique" UNIQUE("issuance_number")
);
--> statement-breakpoint
CREATE TABLE "raw_material_issuance_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuance_id" varchar NOT NULL,
	"raw_material_id" varchar NOT NULL,
	"product_id" varchar,
	"quantity_issued" numeric(12, 6) NOT NULL,
	"suggested_quantity" numeric(12, 6),
	"calculation_basis" varchar(50),
	"uom_id" varchar,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "raw_material_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" varchar NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"reference" varchar(255),
	"remarks" text,
	"performed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "raw_material_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_code" varchar(100) NOT NULL,
	"type_name" varchar(255) NOT NULL,
	"conversion_method" varchar(50),
	"base_unit" varchar(50),
	"base_unit_weight" integer,
	"derived_unit" varchar(50),
	"weight_per_derived_unit" integer,
	"derived_value_per_base" integer,
	"output_type" varchar(50),
	"output_units_covered" integer,
	"conversion_value" integer,
	"loss_percent" integer DEFAULT 0,
	"usable_units" integer,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "raw_material_types_type_code_unique" UNIQUE("type_code")
);
--> statement-breakpoint
CREATE TABLE "raw_materials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_code" varchar(100) NOT NULL,
	"material_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"base_unit" varchar(50),
	"weight_per_unit" integer,
	"conversion_type" varchar(50),
	"conversion_value" integer,
	"weight_per_piece" integer,
	"loss_percent" integer DEFAULT 0,
	"type_id" varchar,
	"uom_id" varchar,
	"current_stock" integer DEFAULT 0,
	"reorder_level" integer,
	"max_stock_level" integer,
	"unit_cost" integer,
	"location" varchar(255),
	"supplier" varchar(255),
	"is_opening_stock_only" integer DEFAULT 1,
	"opening_stock" integer,
	"opening_date" date,
	"closing_stock" integer,
	"closing_stock_usable" integer,
	"received_quantity" integer,
	"returned_quantity" integer,
	"adjustments" integer,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "raw_materials_material_code_unique" UNIQUE("material_code")
);
--> statement-breakpoint
CREATE TABLE "required_spares" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar,
	"submission_task_id" varchar,
	"spare_part_id" varchar,
	"spare_item" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"urgency" varchar(50) DEFAULT 'medium' NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar NOT NULL,
	"screen_key" varchar(100) NOT NULL,
	"can_view" integer DEFAULT 0 NOT NULL,
	"can_create" integer DEFAULT 0 NOT NULL,
	"can_edit" integer DEFAULT 0 NOT NULL,
	"can_delete" integer DEFAULT 0 NOT NULL,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"permissions" text[],
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sales_return_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"batch_number" varchar(255),
	"quantity_returned" integer NOT NULL,
	"condition_on_receipt" varchar(50),
	"disposition" varchar(50),
	"unit_price" integer NOT NULL,
	"credit_amount" integer NOT NULL,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_number" varchar(100) NOT NULL,
	"return_date" timestamp NOT NULL,
	"invoice_id" varchar NOT NULL,
	"gatepass_id" varchar,
	"return_reason" varchar(50) NOT NULL,
	"return_type" varchar(20) NOT NULL,
	"status" varchar(50) DEFAULT 'pending_receipt' NOT NULL,
	"received_date" timestamp,
	"inspected_date" timestamp,
	"inspected_by" varchar,
	"credit_note_number" varchar(100),
	"credit_note_date" timestamp,
	"total_credit_amount" integer DEFAULT 0 NOT NULL,
	"credit_note_status" varchar(30) DEFAULT 'pending_auto' NOT NULL,
	"remarks" text,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sales_returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spare_parts_catalog" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"part_name" varchar(255) NOT NULL,
	"part_number" varchar(100),
	"category" varchar(100),
	"machine_id" varchar,
	"unit_price" integer,
	"reorder_threshold" integer,
	"current_stock" integer DEFAULT 0,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "submission_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar,
	"task_name" varchar(255) NOT NULL,
	"result" varchar(10),
	"remarks" text,
	"photo_url" varchar(500),
	"verified_by_name" varchar(255),
	"verified_signature" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar,
	"task_name" varchar(255) NOT NULL,
	"verification_criteria" text,
	"order_index" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "terms_conditions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tc_name" varchar(255) NOT NULL,
	"description" text,
	"terms" text[] NOT NULL,
	"is_default" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "terms_conditions_tc_name_unique" UNIQUE("tc_name")
);
--> statement-breakpoint
CREATE TABLE "uom" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "uom_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" varchar,
	"reviewer_id" varchar,
	"manager_id" varchar,
	"machine_ids" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"email" varchar,
	"mobile_number" varchar(15) NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role_id" varchar,
	"reset_token" varchar(255),
	"reset_token_expiry" timestamp,
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_code" varchar(100) NOT NULL,
	"vendor_name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(20),
	"gst_number" varchar(20),
	"aadhaar_number" varchar(20),
	"mobile_number" varchar(20) NOT NULL,
	"email" varchar(255),
	"contact_person" varchar(255),
	"vendor_type" varchar(50),
	"is_cluster" integer DEFAULT 0 NOT NULL,
	"is_active" varchar DEFAULT 'true',
	"record_status" integer DEFAULT 1 NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vendors_vendor_code_unique" UNIQUE("vendor_code")
);
--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_submission_id_checklist_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."checklist_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_assignments" ADD CONSTRAINT "checklist_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_submissions" ADD CONSTRAINT "checklist_submissions_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_submissions" ADD CONSTRAINT "checklist_submissions_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_submissions" ADD CONSTRAINT "checklist_submissions_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_submissions" ADD CONSTRAINT "checklist_submissions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_submissions" ADD CONSTRAINT "checklist_submissions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_credit_note_id_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_invoice_item_id_invoice_items_id_fk" FOREIGN KEY ("invoice_item_id") REFERENCES "public"."invoice_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_sales_return_id_sales_returns_id_fk" FOREIGN KEY ("sales_return_id") REFERENCES "public"."sales_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods" ADD CONSTRAINT "finished_goods_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gatepass_items" ADD CONSTRAINT "gatepass_items_gatepass_id_gatepasses_id_fk" FOREIGN KEY ("gatepass_id") REFERENCES "public"."gatepasses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gatepass_items" ADD CONSTRAINT "gatepass_items_finished_good_id_finished_goods_id_fk" FOREIGN KEY ("finished_good_id") REFERENCES "public"."finished_goods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gatepass_items" ADD CONSTRAINT "gatepass_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gatepass_items" ADD CONSTRAINT "gatepass_items_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gatepasses" ADD CONSTRAINT "gatepasses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gatepasses" ADD CONSTRAINT "gatepasses_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gatepasses" ADD CONSTRAINT "gatepasses_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_template_id_invoice_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."invoice_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_terms_conditions_id_terms_conditions_id_fk" FOREIGN KEY ("terms_conditions_id") REFERENCES "public"."terms_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_spares" ADD CONSTRAINT "machine_spares_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_spares" ADD CONSTRAINT "machine_spares_spare_part_id_spare_parts_catalog_id_fk" FOREIGN KEY ("spare_part_id") REFERENCES "public"."spare_parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_startup_tasks" ADD CONSTRAINT "machine_startup_tasks_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_startup_tasks" ADD CONSTRAINT "machine_startup_tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_startup_tasks" ADD CONSTRAINT "machine_startup_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_task_list_template_id_pm_task_list_templates_id_fk" FOREIGN KEY ("task_list_template_id") REFERENCES "public"."pm_task_list_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_credit_note_requests" ADD CONSTRAINT "manual_credit_note_requests_sales_return_id_sales_returns_id_fk" FOREIGN KEY ("sales_return_id") REFERENCES "public"."sales_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_credit_note_requests" ADD CONSTRAINT "manual_credit_note_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_credit_note_requests" ADD CONSTRAINT "manual_credit_note_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_credit_note_requests" ADD CONSTRAINT "manual_credit_note_requests_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partial_task_answers" ADD CONSTRAINT "partial_task_answers_assignment_id_checklist_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."checklist_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partial_task_answers" ADD CONSTRAINT "partial_task_answers_spare_part_id_spare_parts_catalog_id_fk" FOREIGN KEY ("spare_part_id") REFERENCES "public"."spare_parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partial_task_answers" ADD CONSTRAINT "partial_task_answers_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_execution_tasks" ADD CONSTRAINT "pm_execution_tasks_execution_id_pm_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."pm_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_executions" ADD CONSTRAINT "pm_executions_maintenance_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("maintenance_plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_executions" ADD CONSTRAINT "pm_executions_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_executions" ADD CONSTRAINT "pm_executions_task_list_template_id_pm_task_list_templates_id_fk" FOREIGN KEY ("task_list_template_id") REFERENCES "public"."pm_task_list_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_executions" ADD CONSTRAINT "pm_executions_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_task_list_templates" ADD CONSTRAINT "pm_task_list_templates_machine_type_id_machine_types_id_fk" FOREIGN KEY ("machine_type_id") REFERENCES "public"."machine_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_task_list_templates" ADD CONSTRAINT "pm_task_list_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_template_tasks" ADD CONSTRAINT "pm_template_tasks_template_id_pm_task_list_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pm_task_list_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bom" ADD CONSTRAINT "product_bom_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_entries" ADD CONSTRAINT "production_entries_issuance_id_raw_material_issuance_id_fk" FOREIGN KEY ("issuance_id") REFERENCES "public"."raw_material_issuance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_entries" ADD CONSTRAINT "production_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_reconciliation_items" ADD CONSTRAINT "production_reconciliation_items_reconciliation_id_production_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."production_reconciliations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_reconciliation_items" ADD CONSTRAINT "production_reconciliation_items_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_reconciliation_items" ADD CONSTRAINT "production_reconciliation_items_issuance_item_id_raw_material_issuance_items_id_fk" FOREIGN KEY ("issuance_item_id") REFERENCES "public"."raw_material_issuance_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_reconciliation_items" ADD CONSTRAINT "production_reconciliation_items_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_reconciliations" ADD CONSTRAINT "production_reconciliations_issuance_id_raw_material_issuance_id_fk" FOREIGN KEY ("issuance_id") REFERENCES "public"."raw_material_issuance"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "production_reconciliations" ADD CONSTRAINT "production_reconciliations_production_entry_id_production_entries_id_fk" FOREIGN KEY ("production_entry_id") REFERENCES "public"."production_entries"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "production_reconciliations" ADD CONSTRAINT "production_reconciliations_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_reconciliations" ADD CONSTRAINT "production_reconciliations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_type_id_product_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_spare_part_id_spare_parts_catalog_id_fk" FOREIGN KEY ("spare_part_id") REFERENCES "public"."spare_parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_issuance" ADD CONSTRAINT "raw_material_issuance_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_issuance" ADD CONSTRAINT "raw_material_issuance_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_issuance_items" ADD CONSTRAINT "raw_material_issuance_items_issuance_id_raw_material_issuance_id_fk" FOREIGN KEY ("issuance_id") REFERENCES "public"."raw_material_issuance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_issuance_items" ADD CONSTRAINT "raw_material_issuance_items_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_issuance_items" ADD CONSTRAINT "raw_material_issuance_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_issuance_items" ADD CONSTRAINT "raw_material_issuance_items_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_transactions" ADD CONSTRAINT "raw_material_transactions_material_id_raw_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."raw_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_transactions" ADD CONSTRAINT "raw_material_transactions_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_material_types" ADD CONSTRAINT "raw_material_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_type_id_raw_material_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."raw_material_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_uom_id_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_spares" ADD CONSTRAINT "required_spares_submission_id_checklist_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."checklist_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_spares" ADD CONSTRAINT "required_spares_submission_task_id_submission_tasks_id_fk" FOREIGN KEY ("submission_task_id") REFERENCES "public"."submission_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_spares" ADD CONSTRAINT "required_spares_spare_part_id_spare_parts_catalog_id_fk" FOREIGN KEY ("spare_part_id") REFERENCES "public"."spare_parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_spares" ADD CONSTRAINT "required_spares_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_return_id_sales_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."sales_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_gatepass_id_gatepasses_id_fk" FOREIGN KEY ("gatepass_id") REFERENCES "public"."gatepasses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_inspected_by_users_id_fk" FOREIGN KEY ("inspected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spare_parts_catalog" ADD CONSTRAINT "spare_parts_catalog_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_tasks" ADD CONSTRAINT "submission_tasks_submission_id_checklist_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."checklist_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tasks" ADD CONSTRAINT "template_tasks_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms_conditions" ADD CONSTRAINT "terms_conditions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_bom_product_id_idx" ON "product_bom" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_bom_raw_material_id_idx" ON "product_bom" USING btree ("raw_material_id");--> statement-breakpoint
CREATE INDEX "product_bom_record_status_idx" ON "product_bom" USING btree ("record_status");--> statement-breakpoint
CREATE UNIQUE INDEX "production_reconciliations_issuance_shift_idx" ON "production_reconciliations" USING btree ("issuance_id","shift");--> statement-breakpoint
CREATE INDEX "production_reconciliations_date_shift_status_idx" ON "production_reconciliations" USING btree ("reconciliation_date","shift","record_status");--> statement-breakpoint
CREATE INDEX "production_reconciliations_issuance_status_idx" ON "production_reconciliations" USING btree ("issuance_id","record_status");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");