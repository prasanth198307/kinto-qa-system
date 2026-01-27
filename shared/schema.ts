import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  date,
  varchar,
  text,
  integer,
  numeric,
  real,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { mode: 'string' }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Roles table for dynamic role management
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  permissions: text("permissions").array(),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// Role Permissions table - defines which screens each role can access
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").references(() => roles.id).notNull(),
  screenKey: varchar("screen_key", { length: 100 }).notNull(),
  canView: integer("can_view").default(0).notNull(),
  canCreate: integer("can_create").default(0).notNull(),
  canEdit: integer("can_edit").default(0).notNull(),
  canDelete: integer("can_delete").default(0).notNull(),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// User storage table - Email/Password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  email: varchar("email").unique(),
  mobileNumber: varchar("mobile_number", { length: 15 }).notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  roleId: varchar("role_id").references(() => roles.id),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpiry: timestamp("reset_token_expiry", { mode: 'string' }),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  email: z.string().email("Invalid email address").optional(),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Machines table
export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  status: varchar("status", { length: 50 }).default('active'),
  warmupTimeMinutes: integer("warmup_time_minutes").default(0),
  installationDate: timestamp("installation_date", { mode: 'string' }),
  lastMaintenance: timestamp("last_maintenance", { mode: 'string' }),
  nextPmDue: timestamp("next_pm_due", { mode: 'string' }),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertMachineSchema = createInsertSchema(machines).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machines.$inferSelect;

// Checklist templates
export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  machineId: varchar("machine_id").references(() => machines.id),
  shiftTypes: text("shift_types").array(),
  createdBy: varchar("created_by").references(() => users.id),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;

// Template tasks
export const templateTasks = pgTable("template_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => checklistTemplates.id),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  verificationCriteria: text("verification_criteria"),
  orderIndex: integer("order_index"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertTemplateTaskSchema = createInsertSchema(templateTasks).omit({
  id: true,
  createdAt: true,
});

export type InsertTemplateTask = z.infer<typeof insertTemplateTaskSchema>;
export type TemplateTask = typeof templateTasks.$inferSelect;

// Checklist assignments (Manager assigns to Operator)
export const checklistAssignments = pgTable("checklist_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => checklistTemplates.id).notNull(),
  machineId: varchar("machine_id").references(() => machines.id).notNull(),
  operatorId: varchar("operator_id").references(() => users.id).notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  assignedDate: date("assigned_date").notNull(),
  shift: varchar("shift", { length: 50 }),
  dueDateTime: timestamp("due_date_time", { mode: 'string' }),
  status: varchar("status", { length: 50 }).default('pending'),
  submissionId: varchar("submission_id").references(() => checklistSubmissions.id),
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
  notes: text("notes"),
  missedNotificationSent: integer("missed_notification_sent").default(0).notNull(),
  missedNotificationSentAt: timestamp("missed_notification_sent_at", { mode: 'string' }),
  whatsappEnabled: integer("whatsapp_enabled").default(0).notNull(),
  taskReferenceId: varchar("task_reference_id", { length: 50 }),
  whatsappNotificationSent: integer("whatsapp_notification_sent").default(0).notNull(),
  whatsappNotificationSentAt: timestamp("whatsapp_notification_sent_at", { mode: 'string' }),
  operatorResponse: text("operator_response"),
  operatorResponseTime: timestamp("operator_response_time", { mode: 'string' }),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertChecklistAssignmentSchema = createInsertSchema(checklistAssignments, {
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
  submissionId: true,
});

export type InsertChecklistAssignment = z.infer<typeof insertChecklistAssignmentSchema>;
export type ChecklistAssignment = typeof checklistAssignments.$inferSelect;

// Partial task answers (for incremental WhatsApp completion)
export const partialTaskAnswers = pgTable("partial_task_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").references(() => checklistAssignments.id).notNull(),
  taskOrder: integer("task_order").notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).notNull(), // OK, NOK, NA
  remarks: text("remarks"),
  photoUrl: varchar("photo_url", { length: 500 }), // Photo for NOK tasks
  sparePartId: varchar("spare_part_id").references(() => sparePartsCatalog.id), // Optional spare part request
  sparePartRequestText: text("spare_part_request_text"), // Operator's raw spare part request
  waitingForPhoto: integer("waiting_for_photo").default(0), // 1 = waiting for photo upload
  waitingForSparePart: integer("waiting_for_spare_part").default(0), // 1 = waiting for spare part response
  answeredAt: timestamp("answered_at", { mode: 'string' }).defaultNow().notNull(),
  answeredBy: varchar("answered_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertPartialTaskAnswerSchema = createInsertSchema(partialTaskAnswers).omit({
  id: true,
  createdAt: true,
});

export type InsertPartialTaskAnswer = z.infer<typeof insertPartialTaskAnswerSchema>;
export type PartialTaskAnswer = typeof partialTaskAnswers.$inferSelect;

// Checklist submissions
export const checklistSubmissions = pgTable("checklist_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => checklistTemplates.id),
  machineId: varchar("machine_id").references(() => machines.id),
  operatorId: varchar("operator_id").references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  managerId: varchar("manager_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default('pending'),
  date: timestamp("date", { mode: 'string' }).notNull(),
  shift: varchar("shift", { length: 50 }),
  supervisorName: varchar("supervisor_name", { length: 255 }),
  generalRemarks: text("general_remarks"),
  signatureData: text("signature_data"),
  submittedAt: timestamp("submitted_at", { mode: 'string' }),
  reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export type ChecklistSubmission = typeof checklistSubmissions.$inferSelect;

// Submission tasks (individual task results)
export const submissionTasks = pgTable("submission_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").references(() => checklistSubmissions.id),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  result: varchar("result", { length: 10 }),
  remarks: text("remarks"),
  photoUrl: varchar("photo_url", { length: 500 }),
  verifiedByName: varchar("verified_by_name", { length: 255 }),
  verifiedSignature: text("verified_signature"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export type SubmissionTask = typeof submissionTasks.$inferSelect;

// WhatsApp conversation sessions for interactive checklist completion
export const whatsappConversationSessions = pgTable("whatsapp_conversation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  assignmentId: varchar("assignment_id").references(() => checklistAssignments.id),
  submissionId: varchar("submission_id").references(() => checklistSubmissions.id),
  templateId: varchar("template_id").references(() => checklistTemplates.id),
  machineId: varchar("machine_id").references(() => machines.id),
  operatorId: varchar("operator_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default('active'),
  currentTaskIndex: integer("current_task_index").default(0),
  totalTasks: integer("total_tasks").notNull(),
  answers: jsonb("answers").default('[]'),
  pendingPhotoUrl: text("pending_photo_url"), // Store photo received before text answer
  aiSessionId: varchar("ai_session_id", { length: 255 }), // Colloki Flow AI session ID for context
  lastMessageAt: timestamp("last_message_at", { mode: 'string' }).defaultNow(),
  startedAt: timestamp("started_at", { mode: 'string' }).defaultNow(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
});

export const insertWhatsAppConversationSessionSchema = createInsertSchema(whatsappConversationSessions).omit({
  id: true,
  startedAt: true,
});

export type InsertWhatsAppConversationSession = z.infer<typeof insertWhatsAppConversationSessionSchema>;
export type WhatsAppConversationSession = typeof whatsappConversationSessions.$inferSelect;

// Spare parts catalog
export const sparePartsCatalog = pgTable("spare_parts_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partName: varchar("part_name", { length: 255 }).notNull(),
  partNumber: varchar("part_number", { length: 100 }),
  category: varchar("category", { length: 100 }),
  machineId: varchar("machine_id").references(() => machines.id),
  unitPrice: integer("unit_price"),
  reorderThreshold: integer("reorder_threshold"),
  currentStock: integer("current_stock").default(0),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertSparePartSchema = createInsertSchema(sparePartsCatalog).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSparePart = z.infer<typeof insertSparePartSchema>;
export type SparePartCatalog = typeof sparePartsCatalog.$inferSelect;

// Required spares (linked to submissions)
export const requiredSpares = pgTable("required_spares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").references(() => checklistSubmissions.id),
  submissionTaskId: varchar("submission_task_id").references(() => submissionTasks.id), // Link to specific task with photo
  sparePartId: varchar("spare_part_id").references(() => sparePartsCatalog.id), // Link to catalog
  spareItem: varchar("spare_item", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  urgency: varchar("urgency", { length: 50 }).notNull().default('medium'),
  status: varchar("status", { length: 50 }).default('pending'), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id), // Manager who approved
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export type RequiredSpare = typeof requiredSpares.$inferSelect;

// PM Task List Templates (Master templates)
export const pmTaskListTemplates = pgTable("pm_task_list_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  machineTypeId: varchar("machine_type_id").references(() => machineTypes.id),
  category: varchar("category", { length: 100 }),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertPMTaskListTemplateSchema = createInsertSchema(pmTaskListTemplates).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPMTaskListTemplate = z.infer<typeof insertPMTaskListTemplateSchema>;
export type PMTaskListTemplate = typeof pmTaskListTemplates.$inferSelect;

// PM Template Tasks (Tasks within master templates)
export const pmTemplateTasks = pgTable("pm_template_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => pmTaskListTemplates.id).notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  description: text("description"),
  verificationCriteria: text("verification_criteria"),
  orderIndex: integer("order_index"),
  requiresPhoto: varchar("requires_photo").default('false'),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertPMTemplateTaskSchema = createInsertSchema(pmTemplateTasks).omit({
  id: true,
  templateId: true,
  createdAt: true,
});

export type InsertPMTemplateTask = z.infer<typeof insertPMTemplateTaskSchema>;
export type PMTemplateTask = typeof pmTemplateTasks.$inferSelect;

// Maintenance plans
export const maintenancePlans = pgTable("maintenance_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineId: varchar("machine_id").references(() => machines.id),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  planType: varchar("plan_type", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  nextDueDate: timestamp("next_due_date", { mode: 'string' }),
  taskListTemplateId: varchar("task_list_template_id").references(() => pmTaskListTemplates.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertMaintenancePlanSchema = createInsertSchema(maintenancePlans).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenancePlan = z.infer<typeof insertMaintenancePlanSchema>;
export type MaintenancePlan = typeof maintenancePlans.$inferSelect;

// PM Executions (History of PM task completions)
export const pmExecutions = pgTable("pm_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maintenancePlanId: varchar("maintenance_plan_id").references(() => maintenancePlans.id).notNull(),
  machineId: varchar("machine_id").references(() => machines.id).notNull(),
  taskListTemplateId: varchar("task_list_template_id").references(() => pmTaskListTemplates.id),
  completedBy: varchar("completed_by").references(() => users.id).notNull(),
  completedAt: timestamp("completed_at", { mode: 'string' }).notNull(),
  status: varchar("status", { length: 50 }).default('completed'),
  overallResult: varchar("overall_result", { length: 50 }),
  remarks: text("remarks"),
  downtimeHours: integer("downtime_hours"),
  sparePartsUsed: text("spare_parts_used"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertPMExecutionSchema = createInsertSchema(pmExecutions).omit({
  id: true,
  createdAt: true,
});

export type InsertPMExecution = z.infer<typeof insertPMExecutionSchema>;
export type PMExecution = typeof pmExecutions.$inferSelect;

// PM Execution Tasks (Individual task results in execution)
export const pmExecutionTasks = pgTable("pm_execution_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id").references(() => pmExecutions.id).notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  description: text("description"),
  result: varchar("result", { length: 10 }),
  remarks: text("remarks"),
  photoUrl: varchar("photo_url", { length: 500 }),
  orderIndex: integer("order_index"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertPMExecutionTaskSchema = createInsertSchema(pmExecutionTasks).omit({
  id: true,
  executionId: true,
  createdAt: true,
});

export type InsertPMExecutionTask = z.infer<typeof insertPMExecutionTaskSchema>;
export type PMExecutionTask = typeof pmExecutionTasks.$inferSelect;

// Maintenance history
export const maintenanceHistory = pgTable("maintenance_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineId: varchar("machine_id").references(() => machines.id),
  planId: varchar("plan_id").references(() => maintenancePlans.id),
  performedDate: timestamp("performed_date", { mode: 'string' }).notNull(),
  performedBy: varchar("performed_by").references(() => users.id),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description"),
  sparePartsUsed: text("spare_parts_used"),
  downtimeHours: integer("downtime_hours"),
  cost: integer("cost"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export type MaintenanceHistory = typeof maintenanceHistory.$inferSelect;

// User assignments (operator-reviewer-manager relationships)
export const userAssignments = pgTable("user_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  managerId: varchar("manager_id").references(() => users.id),
  machineIds: text("machine_ids").array(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export type UserAssignment = typeof userAssignments.$inferSelect;

// Machine types configuration
export const machineTypes = pgTable("machine_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  isActive: varchar("is_active", { length: 10 }).default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertMachineTypeSchema = createInsertSchema(machineTypes).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMachineType = z.infer<typeof insertMachineTypeSchema>;
export type MachineType = typeof machineTypes.$inferSelect;

// Machine-Spare Parts relationship
export const machineSpares = pgTable("machine_spares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineId: varchar("machine_id").references(() => machines.id).notNull(),
  sparePartId: varchar("spare_part_id").references(() => sparePartsCatalog.id).notNull(),
  recommendedQuantity: integer("recommended_quantity").default(1),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertMachineSpareSchema = createInsertSchema(machineSpares).omit({
  id: true,
  createdAt: true,
});

export type InsertMachineSpare = z.infer<typeof insertMachineSpareSchema>;
export type MachineSpare = typeof machineSpares.$inferSelect;

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poNumber: varchar("po_number", { length: 100 }).notNull().unique(),
  poDate: timestamp("po_date", { mode: 'string' }).defaultNow(),
  sparePartId: varchar("spare_part_id").references(() => sparePartsCatalog.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  // Manual vendor entry fields (used when vendorId is null)
  vendorName: varchar("vendor_name", { length: 255 }),
  vendorAddress: text("vendor_address"),
  vendorGst: varchar("vendor_gst", { length: 20 }),
  vendorPhone: varchar("vendor_phone", { length: 20 }),
  vendorEmail: varchar("vendor_email", { length: 255 }),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price"), // Price per unit in paise
  totalAmount: integer("total_amount"), // Total amount in paise
  urgency: varchar("urgency", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'),
  requestedBy: varchar("requested_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date", { mode: 'string' }),
  supplier: varchar("supplier", { length: 255 }),
  estimatedCost: integer("estimated_cost"),
  expectedDeliveryDate: timestamp("expected_delivery_date", { mode: 'string' }),
  actualDeliveryDate: timestamp("actual_delivery_date", { mode: 'string' }),
  deliveryAddress: text("delivery_address"),
  paymentTerms: text("payment_terms"),
  transportMode: varchar("transport_mode", { length: 100 }), // Road, Rail, Air, Sea, Courier
  gstApplicable: integer("gst_applicable").default(1), // 1 = GST applicable, 0 = not applicable
  gstRate: integer("gst_rate").default(1800), // GST rate in basis points (1800 = 18%)
  cgstAmount: integer("cgst_amount"), // CGST amount in paise
  sgstAmount: integer("sgst_amount"), // SGST amount in paise
  igstAmount: integer("igst_amount"), // IGST amount in paise
  grandTotal: integer("grand_total"), // Grand total including GST in paise
  signatureImage: text("signature_image"), // Base64 encoded signature image
  includeSignature: integer("include_signature").default(1), // 1 = include, 0 = no signature
  remarks: text("remarks"),
  termsAndConditions: text("terms_and_conditions"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders, {
  // Make quantity optional for multi-item POs (quantities are in line items)
  quantity: z.number().optional().default(0),
  // Make other optional fields properly nullable
  sparePartId: z.string().nullish(),
  vendorId: z.string().nullish(),
  vendorName: z.string().nullish(),
  vendorAddress: z.string().nullish(),
  vendorGst: z.string().nullish(),
  vendorPhone: z.string().nullish(),
  vendorEmail: z.string().nullish(),
  unitPrice: z.number().nullish(),
  totalAmount: z.number().nullish(),
  supplier: z.string().nullish(),
  remarks: z.string().nullish(),
  termsAndConditions: z.string().nullish(),
  deliveryAddress: z.string().nullish(),
  paymentTerms: z.string().nullish(),
  transportMode: z.string().nullish(),
  signatureImage: z.string().nullish(),
}).omit({
  id: true,
  poNumber: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Purchase Order Items - for multi-item purchase orders (raw materials)
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  serialNo: integer("serial_no").notNull(), // Line item number
  rawMaterialId: varchar("raw_material_id").references(() => rawMaterials.id),
  itemName: varchar("item_name", { length: 255 }).notNull(), // Can be manual entry or from raw material
  description: text("description"),
  hsnCode: varchar("hsn_code", { length: 50 }),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  unitName: varchar("unit_name", { length: 50 }), // Fallback if UOM not selected
  unitPrice: integer("unit_price").notNull(), // Price per unit in paise
  gstRate: integer("gst_rate").default(1800), // GST rate in basis points (1800 = 18%)
  amount: integer("amount").notNull(), // Line item amount before GST in paise
  cgstAmount: integer("cgst_amount"), // CGST amount in paise
  sgstAmount: integer("sgst_amount"), // SGST amount in paise
  igstAmount: integer("igst_amount"), // IGST amount in paise
  totalAmount: integer("total_amount"), // Line item total including GST in paise
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems, {
  // Override quantity to accept both string and number, converting to string
  quantity: z.union([z.string(), z.number()]).transform(val => String(val)),
  // Make optional fields properly nullable
  rawMaterialId: z.string().nullish(),
  description: z.string().nullish(),
  hsnCode: z.string().nullish(),
  uomId: z.string().nullish(),
  unitName: z.string().nullish(),
  remarks: z.string().nullish(),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

// Unit of Measurement (UOM) Master
export const uom = pgTable("uom", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertUomSchema = createInsertSchema(uom).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUom = z.infer<typeof insertUomSchema>;
export type Uom = typeof uom.$inferSelect;

// Product Category Master
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order"),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

// Product Type Master
export const productTypes = pgTable("product_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order"),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertProductTypeSchema = createInsertSchema(productTypes).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductType = z.infer<typeof insertProductTypeSchema>;
export type ProductType = typeof productTypes.$inferSelect;

// Product Master
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productCode: varchar("product_code", { length: 100 }).notNull().unique(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  skuCode: varchar("sku_code", { length: 100 }).unique(),
  categoryId: varchar("category_id").references(() => productCategories.id),
  typeId: varchar("type_id").references(() => productTypes.id),
  category: varchar("category", { length: 100 }), // Legacy field (kept for backward compatibility)
  productType: varchar("product_type", { length: 100 }), // Legacy field (kept for backward compatibility)
  description: text("description"),
  
  // Packaging & Conversion Details
  baseUnit: varchar("base_unit", { length: 50 }), // Case / Bottle
  derivedUnit: varchar("derived_unit", { length: 50 }), // Bottle / Case
  conversionMethod: varchar("conversion_method", { length: 50 }), // Direct / Formula-Based
  derivedValuePerBase: numeric("derived_value_per_base", { precision: 10, scale: 2 }), // For Direct method (e.g., 12.50 bottles per case)
  weightPerBase: numeric("weight_per_base", { precision: 10, scale: 2 }), // For Formula-Based (in grams, e.g., 21.5g)
  weightPerDerived: numeric("weight_per_derived", { precision: 10, scale: 2 }), // For Formula-Based (in grams)
  defaultLossPercent: numeric("default_loss_percent", { precision: 5, scale: 2 }).default('0'), // Loss percentage (e.g., 0.5%, 18.5%)
  usableDerivedUnits: numeric("usable_derived_units", { precision: 12, scale: 4 }), // Auto-calculated (can be fractional, e.g., 11.4567)
  netVolume: integer("net_volume"), // In ml (whole numbers)
  
  // Pricing & Tax Information
  basePrice: numeric("base_price", { precision: 12, scale: 2 }), // Price per Base Unit (excluding GST, in paise - allows decimals like 94.5)
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }), // GST percentage (e.g., 18.5%)
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }), // Auto-calculated (including GST, in paise - allows decimals)
  mrp: integer("mrp"), // MRP (Printed Price) in paise
  hsnCode: varchar("hsn_code", { length: 50 }),
  sacCode: varchar("sac_code", { length: 50 }),
  taxType: varchar("tax_type", { length: 50 }),
  minimumStockLevel: numeric("minimum_stock_level", { precision: 10, scale: 2 }),
  
  // Legacy fields (kept for backward compatibility)
  uomId: varchar("uom_id").references(() => uom.id),
  standardCost: integer("standard_cost"),
  
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  productCode: z.string().trim().min(1, "Product code is required"),
  productName: z.string().trim().min(1, "Product name is required"),
  // Numeric fields - accept both strings and numbers
  basePrice: z.coerce.number().optional().nullable(),
  gstPercent: z.coerce.number().optional().nullable(),
  totalPrice: z.coerce.number().optional().nullable(),
  mrp: z.coerce.number().optional().nullable(),
  standardCost: z.coerce.number().optional().nullable(),
  minimumStockLevel: z.coerce.number().optional().nullable(),
  derivedValue: z.coerce.number().optional().nullable(),
  defaultLossPercent: z.coerce.number().optional().nullable(),
  usableDerivedUnits: z.coerce.number().optional().nullable(),
  netVolume: z.coerce.number().optional().nullable(),
  derivedValuePerBase: z.coerce.number().optional().nullable(),
  weightPerBase: z.coerce.number().optional().nullable(),
  weightPerDerived: z.coerce.number().optional().nullable(),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Product BOM Configurations (Multiple BOM variants per product)
export const productBomConfigurations = pgTable("product_bom_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  configName: varchar("config_name", { length: 255 }).notNull(), // e.g., "Standard - 21gm Preform", "Economy - 19.2gm Preform"
  description: text("description"),
  isDefault: integer("is_default").default(0).notNull(), // 0 = No, 1 = Yes (only one default per product)
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => ({
  productIdIdx: index("product_bom_configurations_product_id_idx").on(table.productId),
  isDefaultIdx: index("product_bom_configurations_is_default_idx").on(table.isDefault),
  recordStatusIdx: index("product_bom_configurations_record_status_idx").on(table.recordStatus),
}));

export const insertProductBomConfigurationSchema = createInsertSchema(productBomConfigurations).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductBomConfiguration = z.infer<typeof insertProductBomConfigurationSchema>;
export type ProductBomConfiguration = typeof productBomConfigurations.$inferSelect;

// Product Bill of Materials (BOM)
export const productBom = pgTable("product_bom", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  configurationId: varchar("configuration_id").references(() => productBomConfigurations.id, { onDelete: 'cascade' }), // Links to BOM configuration (null = legacy/default)
  rawMaterialId: varchar("raw_material_id").references(() => rawMaterials.id), // Legacy - nullable for migration
  materialTypeId: varchar("material_type_id").references(() => rawMaterialTypes.id), // New - references material type
  quantityRequired: numeric("quantity_required", { precision: 12, scale: 6 }).notNull(), // Quantity needed (supports fractions)
  uom: varchar("uom", { length: 50 }), // Unit of measure (kg, pcs, etc.)
  notes: text("notes"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => ({
  productIdIdx: index("product_bom_product_id_idx").on(table.productId),
  configurationIdIdx: index("product_bom_configuration_id_idx").on(table.configurationId),
  rawMaterialIdIdx: index("product_bom_raw_material_id_idx").on(table.rawMaterialId),
  materialTypeIdIdx: index("product_bom_material_type_id_idx").on(table.materialTypeId),
  recordStatusIdx: index("product_bom_record_status_idx").on(table.recordStatus),
}));

export const insertProductBomSchema = createInsertSchema(productBom).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductBom = z.infer<typeof insertProductBomSchema>;
export type ProductBom = typeof productBom.$inferSelect;

// Composite form schema for ProductDialog (includes BOM items array)
export const productFormSchema = insertProductSchema.extend({
  bomItems: z.array(
    insertProductBomSchema.pick({
      materialTypeId: true,
      rawMaterialId: true,
      quantityRequired: true,
      uom: true,
      notes: true,
    }).extend({
      materialTypeId: z.string().optional().nullable(), // Allow empty during form edit, validate on submit
      rawMaterialId: z.string().optional().nullable(), // Legacy support
      quantityRequired: z.coerce.number().min(0, "Quantity must be positive"),
      uom: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
  ).default([]),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// Vendors/Customers Master
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorCode: varchar("vendor_code", { length: 100 }).notNull().unique(),
  vendorName: varchar("vendor_name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 20 }),
  gstNumber: varchar("gst_number", { length: 20 }),
  gstStatus: varchar("gst_status", { length: 50 }), // Active, Cancelled, Suspended, Inactive, Unknown
  gstLegalName: varchar("gst_legal_name", { length: 255 }), // Legal name from GST portal
  gstTradeName: varchar("gst_trade_name", { length: 255 }), // Trade name from GST portal
  gstVerifiedAt: timestamp("gst_verified_at", { mode: 'string' }), // Last verification timestamp
  aadhaarNumber: varchar("aadhaar_number", { length: 20 }),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  vendorType: varchar("vendor_type", { length: 50 }),
  isCluster: integer("is_cluster").default(0).notNull(), // 0 = No, 1 = Yes
  isActive: varchar("is_active").default('true'),
  // Default shipping address fields (for auto-filling invoices)
  shipToName: varchar("ship_to_name", { length: 255 }),
  shipToAddress: text("ship_to_address"),
  shipToCity: varchar("ship_to_city", { length: 100 }),
  shipToState: varchar("ship_to_state", { length: 100 }),
  shipToPincode: varchar("ship_to_pincode", { length: 20 }),
  shipToGstin: varchar("ship_to_gstin", { length: 20 }),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors, {
  gstNumber: z.string().optional().nullable(),
  aadhaarNumber: z.string().optional().nullable(),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Vendor Type Master - Classifies vendors by brand they purchase (Kinto, HPPani, Purejal)
export const vendorTypes = pgTable("vendor_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => ({
  codeIdx: index("vendor_types_code_idx").on(table.code),
  isActiveIdx: index("vendor_types_is_active_idx").on(table.isActive),
}));

export const insertVendorTypeSchema = createInsertSchema(vendorTypes).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendorType = z.infer<typeof insertVendorTypeSchema>;
export type VendorType = typeof vendorTypes.$inferSelect;

// Vendor-VendorType Junction Table (Many-to-Many) - Vendors can buy multiple brands
export const vendorVendorTypes = pgTable("vendor_vendor_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => vendors.id, { onDelete: 'cascade' }).notNull(),
  vendorTypeId: varchar("vendor_type_id").references(() => vendorTypes.id, { onDelete: 'cascade' }).notNull(),
  isPrimary: integer("is_primary").default(0).notNull(), // 1 = Primary type for this vendor
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => ({
  vendorIdIdx: index("vendor_vendor_types_vendor_id_idx").on(table.vendorId),
  vendorTypeIdIdx: index("vendor_vendor_types_vendor_type_id_idx").on(table.vendorTypeId),
  uniqueVendorType: uniqueIndex("vendor_vendor_types_unique_idx").on(table.vendorId, table.vendorTypeId),
}));

export const insertVendorVendorTypeSchema = createInsertSchema(vendorVendorTypes).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
});

export type InsertVendorVendorType = z.infer<typeof insertVendorVendorTypeSchema>;
export type VendorVendorType = typeof vendorVendorTypes.$inferSelect;

// Raw Material Type Master - Defines types of raw materials with conversion methods
export const rawMaterialTypes = pgTable("raw_material_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  typeCode: varchar("type_code", { length: 100 }).notNull().unique(), // Auto-generated: RMT-001, RMT-002, etc.
  typeName: varchar("type_name", { length: 255 }).notNull(), // Preform 19.5g, Cap 28mm, etc.
  category: varchar("category", { length: 100 }), // Preform, Cap, Label, Shrink, Adhesive, Other
  
  // Conversion Method: formula-based | direct-value | output-coverage
  conversionMethod: varchar("conversion_method", { length: 50 }),
  
  // Base Unit fields (common to all methods)
  baseUnit: varchar("base_unit", { length: 50 }), // Bag, Kg, Box, Roll, Litre
  baseUnitWeight: real("base_unit_weight"), // Weight of base unit (e.g., 25 for 25kg bag) - supports decimals
  
  // Derived Unit fields (for formula-based and direct-value)
  derivedUnit: varchar("derived_unit", { length: 50 }), // Piece, Bottle, Case
  weightPerDerivedUnit: real("weight_per_derived_unit"), // For formula-based (e.g., 19.5g per preform) - supports decimals
  derivedValuePerBase: real("derived_value_per_base"), // For direct-value (e.g., 7000 pcs per box) - supports decimals
  
  // Output Coverage fields (for output-coverage method)
  outputType: varchar("output_type", { length: 50 }), // Bottle, Case
  outputUnitsCovered: real("output_units_covered"), // How many output units one base unit covers - supports decimals
  
  // Calculated fields
  conversionValue: real("conversion_value"), // Auto-calculated based on method - supports decimals
  lossPercent: real("loss_percent").default(0), // Supports decimal percentages like 12.1%
  usableUnits: real("usable_units"), // Auto-calculated: conversionValue × (1 - loss%) - supports decimals
  
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(), // 1 = Active, 0 = Inactive
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// Base schema with common fields
const baseRawMaterialTypeSchema = createInsertSchema(rawMaterialTypes, {
  typeCode: z.string().optional(),
  typeName: z.string().min(1, "Type name is required"),
  description: z.string().optional(),
  lossPercent: z.number().min(0).max(100).default(0),
  isActive: z.number().default(1),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
  conversionMethod: true,
  baseUnit: true,
  baseUnitWeight: true,
  derivedUnit: true,
  weightPerDerivedUnit: true,
  derivedValuePerBase: true,
  outputType: true,
  outputUnitsCovered: true,
  conversionValue: true,
  usableUnits: true,
});

// Discriminated union for the three conversion methods
export const insertRawMaterialTypeSchema = z.discriminatedUnion("conversionMethod", [
  // Formula-Based: Auto-calculates derived units using formula (baseUnitWeight × 1000) / weightPerDerivedUnit
  baseRawMaterialTypeSchema.extend({
    conversionMethod: z.literal("formula-based"),
    baseUnit: z.string().min(1, "Base unit is required"),
    baseUnitWeight: z.number().positive("Base unit weight must be greater than 0"),
    derivedUnit: z.string().min(1, "Derived unit is required for formula-based conversion"),
    weightPerDerivedUnit: z.number().positive("Weight per derived unit must be greater than 0"),
    derivedValuePerBase: z.number().optional(),
    outputType: z.string().optional(),
    outputUnitsCovered: z.number().optional(),
    conversionValue: z.number().optional(),
    usableUnits: z.number().optional(),
  }),
  
  // Direct-Value: User manually enters derived units per base unit
  baseRawMaterialTypeSchema.extend({
    conversionMethod: z.literal("direct-value"),
    baseUnit: z.string().min(1, "Base unit is required"),
    baseUnitWeight: z.number().positive("Base unit weight must be greater than 0").optional(),
    derivedUnit: z.string().min(1, "Derived unit is required for direct-value conversion"),
    derivedValuePerBase: z.number().positive("Derived value per base must be greater than 0"),
    weightPerDerivedUnit: z.number().optional(),
    outputType: z.string().optional(),
    outputUnitsCovered: z.number().optional(),
    conversionValue: z.number().optional(),
    usableUnits: z.number().optional(),
  }),
  
  // Output-Coverage: Defines how many output units one base unit covers
  baseRawMaterialTypeSchema.extend({
    conversionMethod: z.literal("output-coverage"),
    baseUnit: z.string().min(1, "Base unit is required"),
    baseUnitWeight: z.number().positive("Base unit weight must be greater than 0").optional(),
    outputType: z.string().min(1, "Output type is required for output-coverage"),
    outputUnitsCovered: z.number().positive("Output units covered must be greater than 0"),
    derivedUnit: z.string().optional(),
    weightPerDerivedUnit: z.number().optional(),
    derivedValuePerBase: z.number().optional(),
    conversionValue: z.number().optional(),
    usableUnits: z.number().optional(),
  }),
]);

export type InsertRawMaterialType = z.infer<typeof insertRawMaterialTypeSchema>;
export type RawMaterialType = typeof rawMaterialTypes.$inferSelect;

// Raw Materials/Inventory
export const rawMaterials = pgTable("raw_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialCode: varchar("material_code", { length: 100 }).notNull().unique(),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  baseUnit: varchar("base_unit", { length: 50 }),
  weightPerUnit: integer("weight_per_unit"),
  conversionType: varchar("conversion_type", { length: 50 }),
  conversionValue: integer("conversion_value"),
  weightPerPiece: integer("weight_per_piece"),
  lossPercent: integer("loss_percent").default(0),
  typeId: varchar("type_id").references(() => rawMaterialTypes.id), // Reference to type master (nullable for backward compatibility)
  uomId: varchar("uom_id").references(() => uom.id),
  currentStock: integer("current_stock").default(0),
  reorderLevel: integer("reorder_level"),
  maxStockLevel: integer("max_stock_level"),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }), // Base Price in rupees
  gstRate: integer("gst_rate").default(0), // Percentage (e.g., 18)
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }), // Calculated Unit Cost (Incl. GST)
  totalValuation: numeric("total_valuation", { precision: 14, scale: 2 }), // Calculated Total Valuation (Total Cost * Quantity)
  location: varchar("location", { length: 255 }),
  supplier: varchar("supplier", { length: 255 }),
  isOpeningStockOnly: integer("is_opening_stock_only").default(1), // 1 = Opening Stock Entry Only, 0 = Ongoing Inventory
  openingStock: integer("opening_stock"), // Opening stock in base units
  openingDate: date("opening_date"), // Date of opening stock entry
  closingStock: integer("closing_stock"), // Calculated closing stock in base units
  closingStockUsable: integer("closing_stock_usable"), // Calculated closing stock in usable derived units
  receivedQuantity: integer("received_quantity"), // For ongoing mode: received quantity
  returnedQuantity: integer("returned_quantity"), // For ongoing mode: returned quantity
  adjustments: integer("adjustments"), // For ongoing mode: adjustments (+/-)
  receivedDate: date("received_date"), // Date when material was received (for FIFO tracking)
  batchCode: varchar("batch_code", { length: 50 }), // System-generated lot code (e.g., LOT-20241115)
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id), // Link to PO for traceability
  purchaseOrderItemId: varchar("purchase_order_item_id").references(() => purchaseOrderItems.id), // Link to specific PO line item
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertRawMaterialSchema = createInsertSchema(rawMaterials, {
  materialCode: z.string().optional(), // Auto-generated on backend
  typeId: z.string().min(1, "Material Type is required"), // REQUIRED for new entries
  description: z.string().optional(),
  category: z.string().optional(), // Legacy field, optional
  baseUnit: z.string().optional(), // Legacy field, optional
  supplier: z.string().optional(),
  isOpeningStockOnly: z.number().optional(),
  openingStock: z.number().optional(),
  openingDate: z.string().optional(), // Will be validated as date string
  closingStock: z.number().optional(),
  closingStockUsable: z.number().optional(),
  receivedQuantity: z.number().optional(),
  returnedQuantity: z.number().optional(),
  adjustments: z.number().optional(),
  receivedDate: z.string().optional(), // Date when material was received
  batchCode: z.string().optional(), // Auto-generated lot code
  purchaseOrderId: z.string().optional(), // Link to PO
  purchaseOrderItemId: z.string().optional(), // Link to specific PO line item
  unitCost: z.number().optional(), // Allow decimal prices
  totalCost: z.number().optional(), // Allow decimal prices
  totalValuation: z.number().optional(), // Allow decimal values
  gstRate: z.number().optional(), // GST percentage
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Generate a batch code from a received date
 * Format: LOT-YYYYMMDD (e.g., LOT-20241115)
 * For multiple entries on same date, can append sequence: LOT-20241115-001
 */
export function generateBatchCode(receivedDate: Date | string | null, sequence?: number): string {
  if (!receivedDate) {
    // Fallback to current date if no received date
    receivedDate = new Date();
  }
  
  const date = typeof receivedDate === 'string' ? new Date(receivedDate) : receivedDate;
  
  if (isNaN(date.getTime())) {
    // Invalid date, use current date
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    return sequence ? `LOT-${dateStr}-${String(sequence).padStart(3, '0')}` : `LOT-${dateStr}`;
  }
  
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return sequence ? `LOT-${dateStr}-${String(sequence).padStart(3, '0')}` : `LOT-${dateStr}`;
}

/**
 * Format a batch code for display with received date
 * Returns user-friendly format like "LOT-20241115 (Nov 15, 2024)"
 */
export function formatBatchCodeDisplay(batchCode: string | null, receivedDate: string | null): string {
  if (!batchCode && !receivedDate) return 'Unknown Batch';
  
  // If no batch code, generate from received date
  const code = batchCode || (receivedDate ? generateBatchCode(receivedDate) : 'Unknown');
  
  if (receivedDate) {
    const date = new Date(receivedDate);
    if (!isNaN(date.getTime())) {
      const formatted = date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      return `${code} (${formatted})`;
    }
  }
  
  return code;
}

export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;

// Raw Material Stock Transactions
export const rawMaterialTransactions = pgTable("raw_material_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialId: varchar("material_id").references(() => rawMaterials.id).notNull(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull(),
  reference: varchar("reference", { length: 255 }),
  remarks: text("remarks"),
  performedBy: varchar("performed_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertRawMaterialTransactionSchema = createInsertSchema(rawMaterialTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertRawMaterialTransaction = z.infer<typeof insertRawMaterialTransactionSchema>;
export type RawMaterialTransaction = typeof rawMaterialTransactions.$inferSelect;

// Finished Goods
export const finishedGoods = pgTable("finished_goods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  originalBatchNumber: varchar("original_batch_number", { length: 100 }), // Original batch number for cancelled/reissued goods
  productionDate: timestamp("production_date", { mode: 'string' }).notNull(),
  quantity: integer("quantity").notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  qualityStatus: varchar("quality_status", { length: 50 }).default('pending'),
  machineId: varchar("machine_id").references(() => machines.id),
  operatorId: varchar("operator_id").references(() => users.id),
  inspectedBy: varchar("inspected_by").references(() => users.id),
  inspectionDate: timestamp("inspection_date", { mode: 'string' }),
  storageLocation: varchar("storage_location", { length: 255 }),
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertFinishedGoodSchema = createInsertSchema(finishedGoods, {
  quantity: z.number().min(0, "Quantity cannot be negative"), // Allow 0 for manual entry
  productionDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
  inspectionDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val || (typeof val === 'string' && val.trim() === '')) return undefined;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return val;
  }).optional().nullable(),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFinishedGood = z.infer<typeof insertFinishedGoodSchema>;
export type FinishedGood = typeof finishedGoods.$inferSelect;

// Raw Material Issuance for Production (Header)
export const rawMaterialIssuance = pgTable("raw_material_issuance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issuanceNumber: varchar("issuance_number", { length: 100 }).notNull().unique(),
  issuanceDate: timestamp("issuance_date", { mode: 'string' }).notNull(),
  issuedTo: varchar("issued_to", { length: 255 }),
  productId: varchar("product_id").references(() => products.id), // Product being manufactured
  bomConfigurationId: varchar("bom_configuration_id").references(() => productBomConfigurations.id), // Which BOM configuration was used
  productionReference: varchar("production_reference", { length: 255 }), // Batch ID / FG Name / Shift No
  plannedOutput: numeric("planned_output", { precision: 12, scale: 2 }), // Expected production quantity
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  issuedBy: varchar("issued_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertRawMaterialIssuanceSchema = createInsertSchema(rawMaterialIssuance, {
  issuanceDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
  issuedTo: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  productId: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  bomConfigurationId: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  productionReference: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  remarks: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  plannedOutput: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }),
    z.number()
  ]).refine(val => val === undefined || val > 0, {
    message: "Planned output must be greater than 0 if provided"
  }).optional(),
}).omit({
  id: true,
  issuanceNumber: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRawMaterialIssuance = z.infer<typeof insertRawMaterialIssuanceSchema>;
export type RawMaterialIssuance = typeof rawMaterialIssuance.$inferSelect;

// Raw Material Issuance Items (Detail/Line Items)
export const rawMaterialIssuanceItems = pgTable("raw_material_issuance_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issuanceId: varchar("issuance_id").references(() => rawMaterialIssuance.id).notNull(),
  rawMaterialId: varchar("raw_material_id").references(() => rawMaterials.id).notNull(),
  productId: varchar("product_id").references(() => products.id),
  quantityIssued: numeric("quantity_issued", { precision: 12, scale: 6 }).notNull(), // Changed to numeric for precision
  suggestedQuantity: numeric("suggested_quantity", { precision: 12, scale: 6 }), // Auto-calculated from BOM
  calculationBasis: varchar("calculation_basis", { length: 50 }), // formula-based | direct-value | output-coverage | manual
  uomId: varchar("uom_id").references(() => uom.id),
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertRawMaterialIssuanceItemSchema = createInsertSchema(rawMaterialIssuanceItems, {
  quantityIssued: z.union([
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("Quantity issued must be a valid number");
      return num;
    }),
    z.number()
  ]).refine(val => val > 0, {
    message: "Quantity issued must be greater than 0"
  }),
  suggestedQuantity: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    }),
    z.number(),
    z.null()
  ]).refine(val => val === null || val === undefined || val >= 0, {
    message: "Suggested quantity must be non-negative if provided"
  }).optional(),
  calculationBasis: z.enum(['formula-based', 'direct-value', 'output-coverage', 'manual'], {
    errorMap: () => ({ message: "Calculation basis must be one of: formula-based, direct-value, output-coverage, manual" })
  }).nullable().optional(),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRawMaterialIssuanceItem = z.infer<typeof insertRawMaterialIssuanceItemSchema>;
export type RawMaterialIssuanceItem = typeof rawMaterialIssuanceItems.$inferSelect;

// Production Entries - Track actual production output against raw material issuance
export const productionEntries = pgTable("production_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issuanceId: varchar("issuance_id").references(() => rawMaterialIssuance.id).notNull(), // Link to raw material issuance
  productId: varchar("product_id").references(() => products.id), // Product being manufactured (from linked issuance)
  uomId: varchar("uom_id").references(() => uom.id), // Unit of measure for finished goods (e.g., Case)
  batchNumber: varchar("batch_number", { length: 100 }), // Batch/Lot number for finished goods tracking
  productionDate: timestamp("production_date", { mode: 'string' }).notNull(),
  shift: varchar("shift", { length: 20 }).notNull(), // A, B, or General
  producedQuantity: numeric("produced_quantity", { precision: 12, scale: 2 }).notNull(), // Actual output
  rejectedQuantity: numeric("rejected_quantity", { precision: 12, scale: 2 }).default('0'),
  emptyBottlesOpening: numeric("empty_bottles_opening", { precision: 12, scale: 2 }).default('0'),
  emptyBottlesProduced: numeric("empty_bottles_produced", { precision: 12, scale: 2 }).default('0'),
  emptyBottlesUsed: numeric("empty_bottles_used", { precision: 12, scale: 2 }).default('0'),
  emptyBottlesPending: numeric("empty_bottles_pending", { precision: 12, scale: 2 }).default('0'),
  derivedUnits: numeric("derived_units", { precision: 12, scale: 2 }), // Calculated: producedQuantity × usableDerivedUnits from Product Master
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  // Unique constraint: one production entry per issuance per date per shift
  unique().on(table.issuanceId, table.productionDate, table.shift),
]);

export const insertProductionEntrySchema = createInsertSchema(productionEntries, {
  productionDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
  productId: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  uomId: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  batchNumber: z.string().optional().transform(val => !val || val.trim() === '' ? undefined : val),
  shift: z.enum(['A', 'B', 'General'], {
    errorMap: () => ({ message: "Shift must be one of: A, B, General" })
  }),
  producedQuantity: z.union([
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("Produced quantity must be a valid number");
      return num;
    }),
    z.number()
  ]).refine(val => val > 0, {
    message: "Produced quantity must be greater than 0"
  }),
  rejectedQuantity: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }),
    z.number()
  ]).refine(val => val >= 0, {
    message: "Rejected quantity must be non-negative"
  }).optional(),
  emptyBottlesOpening: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }),
    z.number()
  ]).refine(val => val === undefined || val >= 0, {
    message: "Opening bottles must be non-negative"
  }).optional(),
  emptyBottlesProduced: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }),
    z.number()
  ]).refine(val => val === undefined || val >= 0, {
    message: "Bottles produced must be non-negative"
  }).optional(),
  emptyBottlesUsed: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }),
    z.number()
  ]).refine(val => val === undefined || val >= 0, {
    message: "Bottles used must be non-negative"
  }).optional(),
  emptyBottlesPending: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : Math.max(0, num); // Ensure non-negative
    }),
    z.number().transform(val => Math.max(0, val)) // Ensure non-negative
  ]).optional(),
  derivedUnits: z.union([
    z.string().transform(val => {
      if (!val || val.trim() === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }),
    z.number()
  ]).optional(),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductionEntry = z.infer<typeof insertProductionEntrySchema>;
export type ProductionEntry = typeof productionEntries.$inferSelect;

// ============== DISPATCH MASTER DATA ==============

// Transporters Master
export const transporters = pgTable("transporters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transporterCode: varchar("transporter_code", { length: 50 }).notNull().unique(),
  transporterName: varchar("transporter_name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  gstNumber: varchar("gst_number", { length: 20 }),
  panNumber: varchar("pan_number", { length: 20 }),
  isActive: integer("is_active").default(1).notNull(),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertTransporterSchema = createInsertSchema(transporters).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransporter = z.infer<typeof insertTransporterSchema>;
export type Transporter = typeof transporters.$inferSelect;

// Vehicles Master
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleNumber: varchar("vehicle_number", { length: 20 }).notNull().unique(),
  vehicleType: varchar("vehicle_type", { length: 50 }), // Truck, Tempo, Mini-truck, etc.
  capacity: varchar("capacity", { length: 50 }), // e.g., "10 Ton", "500 cases"
  transporterId: varchar("transporter_id").references(() => transporters.id),
  ownerName: varchar("owner_name", { length: 255 }),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  insuranceExpiry: date("insurance_expiry", { mode: 'string' }),
  fitnessExpiry: date("fitness_expiry", { mode: 'string' }),
  permitExpiry: date("permit_expiry", { mode: 'string' }),
  isActive: integer("is_active").default(1).notNull(),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Drivers Master
export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverCode: varchar("driver_code", { length: 50 }).notNull().unique(),
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  licenseNumber: varchar("license_number", { length: 50 }),
  licenseExpiry: date("license_expiry", { mode: 'string' }),
  address: text("address"),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  isActive: integer("is_active").default(1).notNull(),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

// Gatepasses for Finished Goods Dispatch (Header)
export const gatepasses = pgTable("gatepasses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gatepassNumber: varchar("gatepass_number", { length: 100 }).notNull().unique(),
  gatepassDate: timestamp("gatepass_date", { mode: 'string' }).notNull(),
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(),
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  driverContact: varchar("driver_contact", { length: 50 }),
  transporterName: varchar("transporter_name", { length: 255 }),
  destination: varchar("destination", { length: 255 }),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  customerName: varchar("customer_name", { length: 255 }),
  isCluster: integer("is_cluster").default(0).notNull(), // 0 = No, 1 = Yes (copied from vendor)
  invoiceId: varchar("invoice_id").references(() => invoices.id).unique(), // One-to-one: one gatepass per invoice
  remarks: text("remarks"),
  
  // Master Data References (optional - allows manual entry if not in master)
  transporterId: varchar("transporter_id").references(() => transporters.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  driverId: varchar("driver_id").references(() => drivers.id),
  
  // Additional Dispatch Fields
  casesCount: integer("cases_count"), // Number of cases/boxes
  securitySealNo: varchar("security_seal_no", { length: 100 }), // Security seal number
  
  // Status Tracking & Vehicle Exit/Entry
  status: varchar("status", { length: 50 }).default("generated").notNull(), // generated, vehicle_out, delivered, completed
  outTime: timestamp("out_time", { mode: 'string' }), // When vehicle left the plant
  inTime: timestamp("in_time", { mode: 'string' }), // When vehicle/empty crates returned
  verifiedBy: varchar("verified_by", { length: 255 }), // Security person who verified exit
  
  // Proof of Delivery (POD)
  podReceivedBy: varchar("pod_received_by", { length: 255 }), // Customer name/signature
  podDate: timestamp("pod_date", { mode: 'string' }), // Actual delivery date/time
  podRemarks: text("pod_remarks"), // Delivery issues (breakage, short delivery, etc.)
  podSignature: text("pod_signature"), // Base64 encoded signature image
  
  recordStatus: integer("record_status").default(1).notNull(),
  issuedBy: varchar("issued_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertGatepassSchema = createInsertSchema(gatepasses, {
  gatepassDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
}).omit({
  id: true,
  gatepassNumber: true, // Auto-generated on backend
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGatepass = z.infer<typeof insertGatepassSchema>;
export type Gatepass = typeof gatepasses.$inferSelect;

// Gatepass Items (Detail/Line Items)
export const gatepassItems = pgTable("gatepass_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gatepassId: varchar("gatepass_id").references(() => gatepasses.id).notNull(),
  finishedGoodId: varchar("finished_good_id").references(() => finishedGoods.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantityDispatched: integer("quantity_dispatched").notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertGatepassItemSchema = createInsertSchema(gatepassItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGatepassItem = z.infer<typeof insertGatepassItemSchema>;
export type GatepassItem = typeof gatepassItems.$inferSelect;

// Invoice Templates Master
export const invoiceTemplates = pgTable("invoice_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateName: varchar("template_name", { length: 255 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  
  // Default Seller Details for this template
  defaultSellerName: varchar("default_seller_name", { length: 255 }),
  defaultSellerGstin: varchar("default_seller_gstin", { length: 15 }),
  defaultSellerAddress: text("default_seller_address"),
  defaultSellerState: varchar("default_seller_state", { length: 100 }),
  defaultSellerStateCode: varchar("default_seller_state_code", { length: 2 }),
  defaultSellerPhone: varchar("default_seller_phone", { length: 50 }),
  defaultSellerEmail: varchar("default_seller_email", { length: 255 }),
  
  // Default Bank Details
  defaultBankName: varchar("default_bank_name", { length: 255 }),
  defaultBankAccountNumber: varchar("default_bank_account_number", { length: 50 }),
  defaultBankIfscCode: varchar("default_bank_ifsc_code", { length: 11 }),
  defaultAccountHolderName: varchar("default_account_holder_name", { length: 255 }),
  defaultBranchName: varchar("default_branch_name", { length: 255 }),
  defaultUpiId: varchar("default_upi_id", { length: 100 }),
  
  // Signature 1 (Default/Primary)
  defaultSignatureImage: text("default_signature_image"), // Base64 encoded signature image
  authorizedSignatoryName: varchar("authorized_signatory_name", { length: 255 }),
  
  // Legacy HPCL signature fields (kept for backward compatibility)
  hpclSignatureImage: text("hpcl_signature_image"),
  hpclSignatoryName: varchar("hpcl_signatory_name", { length: 255 }),
  
  // Signature 2 (Alternate)
  alternateSignatureImage: text("alternate_signature_image"), // Base64 encoded alternate signature image
  alternateSignatoryName: varchar("alternate_signatory_name", { length: 255 }),
  
  // Template Settings
  isDefault: integer("is_default").default(0).notNull(), // 1 template can be marked as default
  isActive: integer("is_active").default(1).notNull(),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplates).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoiceTemplate = z.infer<typeof insertInvoiceTemplateSchema>;
export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect;

// Terms & Conditions Master
export const termsConditions = pgTable("terms_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tcName: varchar("tc_name", { length: 255 }).notNull().unique(),
  description: text("description"),
  
  // Terms & Conditions (Array of strings)
  terms: text("terms").array().notNull(), // Array of T&C points
  
  // Settings
  isDefault: integer("is_default").default(0).notNull(),
  isActive: integer("is_active").default(1).notNull(),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertTermsConditionsSchema = createInsertSchema(termsConditions).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTermsConditions = z.infer<typeof insertTermsConditionsSchema>;
export type TermsConditions = typeof termsConditions.$inferSelect;

// Invoices for Sales (GST-Compliant)
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  invoiceDate: timestamp("invoice_date", { mode: 'string' }).notNull(),
  
  // Template and T&C References
  templateId: varchar("template_id").references(() => invoiceTemplates.id),
  termsConditionsId: varchar("terms_conditions_id").references(() => termsConditions.id),
  
  // Seller Details
  sellerGstin: varchar("seller_gstin", { length: 15 }),
  sellerName: varchar("seller_name", { length: 255 }),
  sellerAddress: text("seller_address"),
  sellerState: varchar("seller_state", { length: 100 }),
  sellerStateCode: varchar("seller_state_code", { length: 2 }),
  sellerPhone: varchar("seller_phone", { length: 50 }),
  sellerEmail: varchar("seller_email", { length: 255 }),
  
  // Buyer Details (Bill To)
  buyerGstin: varchar("buyer_gstin", { length: 15 }),
  buyerName: varchar("buyer_name", { length: 255 }).notNull(),
  buyerAddress: text("buyer_address"),
  buyerState: varchar("buyer_state", { length: 100 }),
  buyerStateCode: varchar("buyer_state_code", { length: 2 }),
  buyerContact: varchar("buyer_contact", { length: 50 }),
  isCluster: integer("is_cluster").default(0).notNull(), // 0 = No, 1 = Yes (for mobile app integration)
  
  // Ship To Details (if different from buyer)
  shipToName: varchar("ship_to_name", { length: 255 }),
  shipToAddress: text("ship_to_address"),
  shipToCity: varchar("ship_to_city", { length: 100 }),
  shipToState: varchar("ship_to_state", { length: 100 }),
  shipToPincode: varchar("ship_to_pincode", { length: 10 }),
  
  // Amounts
  subtotal: integer("subtotal").notNull(), // Amount before tax (in paise)
  cgstAmount: integer("cgst_amount").default(0).notNull(), // Central GST (in paise)
  sgstAmount: integer("sgst_amount").default(0).notNull(), // State GST (in paise)
  igstAmount: integer("igst_amount").default(0).notNull(), // Integrated GST (in paise)
  cessAmount: integer("cess_amount").default(0).notNull(), // Cess if any (in paise)
  
  // Transport Charges (calculated AFTER GST, not taxable)
  transportRatePerCase: integer("transport_rate_per_case").default(0).notNull(), // Rate per case in paise (e.g., 100 = Rs.1)
  transportCharges: integer("transport_charges").default(0).notNull(), // Total transport = rate × quantity (in paise)
  
  roundOff: integer("round_off").default(0).notNull(), // Round off adjustment (in paise)
  totalAmount: integer("total_amount").notNull(), // Final total including transport (in paise)
  amountReceived: integer("amount_received").default(0).notNull(), // Amount paid/received (in paise)
  
  // Payment Details
  paymentTerms: varchar("payment_terms", { length: 255 }),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankIfscCode: varchar("bank_ifsc_code", { length: 11 }),
  accountHolderName: varchar("account_holder_name", { length: 255 }),
  branchName: varchar("branch_name", { length: 255 }),
  upiId: varchar("upi_id", { length: 100 }),
  authorizedSignatoryName: varchar("authorized_signatory_name", { length: 255 }),
  
  // Signature Settings
  includeSignature: integer("include_signature").default(1).notNull(), // 1 = include signature, 0 = no signature
  signatureType: varchar("signature_type", { length: 50 }).default('default'), // 'default', 'hpcl', 'alternate'
  
  // Other Details
  placeOfSupply: varchar("place_of_supply", { length: 100 }),
  reverseCharge: integer("reverse_charge").default(0).notNull(),
  transportMode: varchar("transport_mode", { length: 50 }),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  dateOfSupply: timestamp("date_of_supply", { mode: 'string' }),
  
  remarks: text("remarks"),
  
  // Status Tracking (Invoice→Gate Pass→Dispatch→POD Flow)
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, ready_for_gatepass, dispatched, delivered
  dispatchDate: timestamp("dispatch_date", { mode: 'string' }),
  deliveryDate: timestamp("delivery_date", { mode: 'string' }),
  receivedBy: varchar("received_by", { length: 255 }), // POD: Who received the goods
  podRemarks: text("pod_remarks"), // POD: Delivery remarks (breakage, short delivery, etc.)
  
  // Cancel & Reissue Tracking
  originalInvoiceId: varchar("original_invoice_id"), // For reissued invoice: points to the cancelled invoice it replaced
  replacedByInvoiceId: varchar("replaced_by_invoice_id"), // For cancelled invoice: points to the new replacement invoice
  cancelledAt: timestamp("cancelled_at", { mode: 'string' }), // When the invoice was cancelled
  cancelledBy: varchar("cancelled_by").references(() => users.id), // Who cancelled the invoice
  
  recordStatus: integer("record_status").default(1).notNull(),
  generatedBy: varchar("generated_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices, {
  invoiceDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
  dateOfSupply: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val || val === '') return null;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    }
    return val;
  }).optional(),
}).omit({
  id: true,
  invoiceNumber: true, // Auto-generated on backend
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Invoice Items (Line Items with GST Details)
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  hsnCode: varchar("hsn_code", { length: 8 }),
  sacCode: varchar("sac_code", { length: 6 }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  unitPrice: integer("unit_price").notNull(), // Price per unit (in paise)
  discount: integer("discount").default(0).notNull(), // Discount amount (in paise)
  taxableAmount: integer("taxable_amount").notNull(), // Amount after discount (in paise)
  
  // Tax Breakup
  cgstRate: integer("cgst_rate").default(0).notNull(), // CGST rate in basis points (e.g., 900 = 9%)
  cgstAmount: integer("cgst_amount").default(0).notNull(), // CGST amount (in paise)
  sgstRate: integer("sgst_rate").default(0).notNull(), // SGST rate in basis points
  sgstAmount: integer("sgst_amount").default(0).notNull(), // SGST amount (in paise)
  igstRate: integer("igst_rate").default(0).notNull(), // IGST rate in basis points
  igstAmount: integer("igst_amount").default(0).notNull(), // IGST amount (in paise)
  cessRate: integer("cess_rate").default(0).notNull(), // Cess rate in basis points
  cessAmount: integer("cess_amount").default(0).notNull(), // Cess amount (in paise)
  
  // Transport charges (calculated after GST, not taxable)
  transportRatePerCase: integer("transport_rate_per_case").default(0).notNull(), // Transport rate per case (in paise)
  transportCharges: integer("transport_charges").default(0).notNull(), // Total transport for this item (in paise)
  
  totalAmount: integer("total_amount").notNull(), // Total for this line item (in paise)
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// GST Report Types
export interface InvoiceWithItems {
  invoice: Invoice;
  items: InvoiceItem[];
}

export interface HSNSummaryRow {
  hsnCode: string;
  description: string;
  uom: string;
  quantity: number;
  taxableValue: number; // in rupees
  cgstAmount: number; // in rupees
  sgstAmount: number; // in rupees
  igstAmount: number; // in rupees
  cessAmount: number; // in rupees
  taxRate: number; // calculated average rate
}

export interface GSTReportData {
  invoices: InvoiceWithItems[];
  hsnSummary: HSNSummaryRow[];
  metadata: {
    period: string;
    periodType: string;
    startDate: string;
    endDate: string;
    totalInvoices: number;
    totalTaxableValue: number;
    totalTax: number;
  };
}

export const gstReportRequestSchema = z.object({
  periodType: z.enum(['monthly', 'quarterly', 'annual']),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
});

export type GSTReportRequest = z.infer<typeof gstReportRequestSchema>;

// Invoice Payments for tracking partial payments and advances
export const invoicePayments = pgTable("invoice_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  paymentDate: timestamp("payment_date", { mode: 'string' }).notNull(),
  amount: integer("amount").notNull(), // Payment amount (in paise)
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // Cash, Cheque, NEFT, UPI, etc.
  referenceNumber: varchar("reference_number", { length: 100 }), // Transaction ID, Cheque number, etc.
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // Advance, Partial, Full, Write-off
  bankName: varchar("bank_name", { length: 255 }), // Bank name for cheque/transfer
  remarks: text("remarks"),
  
  // Payment Cancellation fields
  cancelledAt: timestamp("cancelled_at", { mode: 'string' }),
  cancellationRemarks: text("cancellation_remarks"),
  cancelledBy: varchar("cancelled_by").references(() => users.id),
  
  recordedBy: varchar("recorded_by").references(() => users.id),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;
export type InvoicePayment = typeof invoicePayments.$inferSelect;

// Payment Evidence - Child records from Payments.xlsx linked to VY- payments and/or invoices
export const paymentEvidence = pgTable("payment_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentPaymentId: varchar("parent_payment_id").references(() => invoicePayments.id),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  
  // Original data from Payments.xlsx
  amount: integer("amount").notNull(), // In paise
  receivedOn: timestamp("received_on", { mode: 'string' }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  paymentMode: varchar("payment_mode", { length: 50 }), // Cash, NEFT, Cheque, UPI, Bank Transfer
  bankName: varchar("bank_name", { length: 255 }),
  
  // Matching metadata
  matchConfidence: integer("match_confidence").default(100), // 0-100%
  matchStatus: varchar("match_status", { length: 20 }).default("matched"), // 'matched', 'partial', 'orphan'
  sourceRow: text("source_row"), // Original Excel row as JSON for audit
  
  // Import tracking
  importBatchId: varchar("import_batch_id", { length: 100 }),
  sourceFile: varchar("source_file", { length: 255 }),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertPaymentEvidenceSchema = createInsertSchema(paymentEvidence).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
});

export type InsertPaymentEvidence = z.infer<typeof insertPaymentEvidenceSchema>;
export type PaymentEvidence = typeof paymentEvidence.$inferSelect;

// Bank Master for managing multiple bank accounts
export const banks = pgTable("banks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountHolderName: varchar("account_holder_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull().unique(),
  ifscCode: varchar("ifsc_code", { length: 11 }).notNull(),
  branchName: varchar("branch_name", { length: 255 }),
  accountType: varchar("account_type", { length: 50 }), // Savings, Current, etc.
  upiId: varchar("upi_id", { length: 100 }),
  isDefault: integer("is_default").default(0).notNull(), // 1 if default account
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertBankSchema = createInsertSchema(banks).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBank = z.infer<typeof insertBankSchema>;
export type Bank = typeof banks.$inferSelect;

// Sales Returns for handling returned goods after delivery
export const salesReturns = pgTable("sales_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  returnNumber: varchar("return_number", { length: 100 }).notNull().unique(),
  returnDate: timestamp("return_date", { mode: 'string' }).notNull(),
  
  // Links to original transaction
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  gatepassId: varchar("gatepass_id").references(() => gatepasses.id),
  
  // Return Details
  returnReason: varchar("return_reason", { length: 50 }).notNull(), // damaged, quality_issue, wrong_item, customer_rejection, excess
  returnType: varchar("return_type", { length: 20 }).notNull(), // full, partial
  
  // Status tracking
  status: varchar("status", { length: 50 }).default("pending_receipt").notNull(), // pending_receipt, received, inspected, completed
  receivedDate: timestamp("received_date", { mode: 'string' }),
  inspectedDate: timestamp("inspection_date", { mode: 'string' }),
  inspectedBy: varchar("inspected_by").references(() => users.id),
  
  // Financial
  creditNoteNumber: varchar("credit_note_number", { length: 100 }),
  creditNoteDate: timestamp("credit_note_date", { mode: 'string' }),
  totalCreditAmount: integer("total_credit_amount").default(0).notNull(), // Credit amount in paise
  
  // Credit note status tracking (for same-month auto vs >1 month manual)
  creditNoteStatus: varchar("credit_note_status", { length: 30 }).default("pending_auto").notNull(), // pending_auto, auto_created, manual_required, manual_linked, not_applicable
  
  // Transport cost for returning goods
  totalReturnTransportCost: integer("total_return_transport_cost").default(0), // Total cost to bring goods back (in paise)
  transporterName: varchar("transporter_name", { length: 255 }),
  
  // Scrap approval workflow
  scrapApprovalStatus: varchar("scrap_approval_status", { length: 30 }).default("not_applicable"), // not_applicable, pending, approved, rejected
  scrapApprovedBy: varchar("scrap_approved_by").references(() => users.id),
  scrapApprovalDate: timestamp("scrap_approval_date", { mode: 'string' }),
  
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertSalesReturnSchema = createInsertSchema(salesReturns, {
  returnDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
  receivedDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val || val === '') return null;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    }
    return val;
  }).optional(),
  inspectedDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val || val === '') return null;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    }
    return val;
  }).optional(),
  creditNoteDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val || val === '') return null;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    }
    return val;
  }).optional(),
}).omit({
  id: true,
  returnNumber: true, // Auto-generated
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalesReturn = z.infer<typeof insertSalesReturnSchema>;
export type SalesReturn = typeof salesReturns.$inferSelect;

// Sales Return Items (Detail/Line Items)
export const salesReturnItems = pgTable("sales_return_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  returnId: varchar("return_id").references(() => salesReturns.id).notNull(),
  
  productId: varchar("product_id").references(() => products.id).notNull(),
  batchNumber: varchar("batch_number", { length: 255 }),
  quantityReturned: integer("quantity_returned").notNull(),
  
  // Original invoice item reference for max quantity validation
  invoiceItemId: varchar("invoice_item_id").references(() => invoiceItems.id),
  originalQuantityInvoiced: integer("original_quantity_invoiced"), // Max returnable quantity
  
  // Condition after inspection
  conditionOnReceipt: varchar("condition_on_receipt", { length: 50 }), // damaged, good, repairable
  
  // Disposition - what to do with returned goods
  disposition: varchar("disposition", { length: 50 }), // scrap, restock, repair, quarantine
  
  // Financial - credit for this item
  unitPrice: integer("unit_price").notNull(), // Price per unit from original invoice (in paise)
  creditAmount: integer("credit_amount").notNull(), // Total credit for this item (in paise)
  
  // Cost tracking for loss calculation
  unitCost: integer("unit_cost"), // Original product cost (from BOM/purchase) in paise
  
  // Damage evidence
  damageReason: varchar("damage_reason", { length: 50 }), // transport, handling, manufacturing_defect, customer_misuse, expired, other
  damageEvidenceUrl: varchar("damage_evidence_url", { length: 500 }), // Photo proof URL
  
  // Transport cost for return
  returnTransportCost: integer("return_transport_cost").default(0), // Cost to bring goods back (in paise)
  
  // Expiry check
  expiryDate: timestamp("expiry_date", { mode: 'string' }),
  isNearExpiry: integer("is_near_expiry").default(0), // 1 if product is near expiry (< 30 days)
  
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertSalesReturnItemSchema = createInsertSchema(salesReturnItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalesReturnItem = z.infer<typeof insertSalesReturnItemSchema>;
export type SalesReturnItem = typeof salesReturnItems.$inferSelect;

// Credit Notes - for invoice adjustments when goods are returned in same month
export const creditNotes = pgTable("credit_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteNumber: varchar("note_number", { length: 100 }).unique().notNull(), // CN-{invoiceNumber}-{seq}
  
  // References - invoiceId optional for imported legacy credit notes
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  vendorId: varchar("vendor_id").references(() => vendors.id), // Required when invoiceId is null (for imports)
  salesReturnId: varchar("sales_return_id").references(() => salesReturns.id),
  
  // Credit details
  creditDate: date("credit_date").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(), // sales_return, pricing_error, damage, discount, other
  status: varchar("status", { length: 50 }).default('draft').notNull(), // draft, issued, cancelled
  
  // Financial totals (in paise)
  subtotal: integer("subtotal").notNull(),
  cgstAmount: integer("cgst_amount").default(0).notNull(),
  sgstAmount: integer("sgst_amount").default(0).notNull(),
  igstAmount: integer("igst_amount").default(0).notNull(),
  grandTotal: integer("grand_total").notNull(),
  
  // Metadata
  issuedBy: varchar("issued_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertCreditNoteSchema = createInsertSchema(creditNotes, {
  creditDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCreditNote = z.infer<typeof insertCreditNoteSchema>;
export type CreditNote = typeof creditNotes.$inferSelect;

// Credit Note Items (Detail/Line Items)
export const creditNoteItems = pgTable("credit_note_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creditNoteId: varchar("credit_note_id").references(() => creditNotes.id).notNull(),
  
  // Product reference
  invoiceItemId: varchar("invoice_item_id").references(() => invoiceItems.id),
  productId: varchar("product_id").references(() => products.id).notNull(),
  description: text("description").notNull(),
  
  // Quantities and pricing (in paise)
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  discountAmount: integer("discount_amount").default(0).notNull(),
  taxableValue: integer("taxable_value").notNull(),
  
  // GST breakdown
  cgstRate: integer("cgst_rate").default(0).notNull(), // Percentage (e.g., 900 = 9%)
  cgstAmount: integer("cgst_amount").default(0).notNull(),
  sgstRate: integer("sgst_rate").default(0).notNull(),
  sgstAmount: integer("sgst_amount").default(0).notNull(),
  igstRate: integer("igst_rate").default(0).notNull(),
  igstAmount: integer("igst_amount").default(0).notNull(),
  
  totalAmount: integer("total_amount").notNull(), // taxableValue + GST amounts
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertCreditNoteItemSchema = createInsertSchema(creditNoteItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCreditNoteItem = z.infer<typeof insertCreditNoteItemSchema>;
export type CreditNoteItem = typeof creditNoteItems.$inferSelect;

// Debit Notes - for invoice adjustments when charging MORE (qty/price increases on old invoices)
export const debitNotes = pgTable("debit_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteNumber: varchar("note_number", { length: 100 }).unique().notNull(), // DN-{invoiceNumber}-{seq}
  
  // References
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  
  // Debit details
  debitDate: date("debit_date").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(), // quantity_increase, price_increase, additional_charges, other
  status: varchar("status", { length: 50 }).default('draft').notNull(), // draft, issued, cancelled
  
  // Financial totals (in paise)
  subtotal: integer("subtotal").notNull(),
  cgstAmount: integer("cgst_amount").default(0).notNull(),
  sgstAmount: integer("sgst_amount").default(0).notNull(),
  igstAmount: integer("igst_amount").default(0).notNull(),
  grandTotal: integer("grand_total").notNull(),
  
  // Metadata
  issuedBy: varchar("issued_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertDebitNoteSchema = createInsertSchema(debitNotes, {
  debitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDebitNote = z.infer<typeof insertDebitNoteSchema>;
export type DebitNote = typeof debitNotes.$inferSelect;

// Debit Note Items (Detail/Line Items)
export const debitNoteItems = pgTable("debit_note_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  debitNoteId: varchar("debit_note_id").references(() => debitNotes.id).notNull(),
  
  // Product reference
  invoiceItemId: varchar("invoice_item_id").references(() => invoiceItems.id),
  productId: varchar("product_id").references(() => products.id).notNull(),
  description: text("description").notNull(),
  
  // Original values from invoice (for reference)
  originalQuantity: integer("original_quantity").notNull(),
  originalUnitPrice: integer("original_unit_price").notNull(),
  
  // Additional/difference values (in paise)
  additionalQuantity: integer("additional_quantity").default(0).notNull(), // Extra quantity being charged
  newUnitPrice: integer("new_unit_price").notNull(), // New price (if price increase)
  priceDifferencePerUnit: integer("price_difference_per_unit").default(0).notNull(), // Price increase per unit
  
  // Calculated totals
  taxableValue: integer("taxable_value").notNull(), // (additionalQty * newPrice) + (origQty * priceDiff)
  
  // GST breakdown
  cgstRate: integer("cgst_rate").default(0).notNull(), // Percentage (e.g., 900 = 9%)
  cgstAmount: integer("cgst_amount").default(0).notNull(),
  sgstRate: integer("sgst_rate").default(0).notNull(),
  sgstAmount: integer("sgst_amount").default(0).notNull(),
  igstRate: integer("igst_rate").default(0).notNull(),
  igstAmount: integer("igst_amount").default(0).notNull(),
  
  totalAmount: integer("total_amount").notNull(), // taxableValue + GST amounts
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertDebitNoteItemSchema = createInsertSchema(debitNoteItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDebitNoteItem = z.infer<typeof insertDebitNoteItemSchema>;
export type DebitNoteItem = typeof debitNoteItems.$inferSelect;

// Manual Credit Note Requests - for tracking >1 month returns requiring manual GST processing
export const manualCreditNoteRequests = pgTable("manual_credit_note_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesReturnId: varchar("sales_return_id").references(() => salesReturns.id).notNull(),
  
  // Request details
  reasonCode: varchar("reason_code", { length: 50 }).notNull(), // old_return, gst_compliance, etc
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
  
  // Processing workflow
  status: varchar("status", { length: 30 }).default("pending").notNull(), // pending, in_progress, completed, rejected
  assignedTo: varchar("assigned_to").references(() => users.id),
  priority: varchar("priority", { length: 20 }).default("normal").notNull(), // low, normal, high, urgent
  
  // Completion tracking
  completedAt: timestamp("completed_at", { mode: 'string' }),
  completedBy: varchar("completed_by").references(() => users.id),
  externalCreditNoteNumber: varchar("external_credit_note_number", { length: 100 }), // Manually created credit note reference
  externalCreditNoteDate: timestamp("external_credit_note_date", { mode: 'string' }),
  
  // Notes and documentation
  notes: text("notes"),
  processingNotes: text("processing_notes"), // Internal notes during processing
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertManualCreditNoteRequestSchema = createInsertSchema(manualCreditNoteRequests).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManualCreditNoteRequest = z.infer<typeof insertManualCreditNoteRequestSchema>;
export type ManualCreditNoteRequest = typeof manualCreditNoteRequests.$inferSelect;

// Machine Startup Reminders - for notifying users to turn on machines before production
export const machineStartupTasks = pgTable("machine_startup_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineId: varchar("machine_id").references(() => machines.id).notNull(),
  assignedUserId: varchar("assigned_user_id").references(() => users.id).notNull(),
  scheduledStartTime: timestamp("scheduled_start_time", { mode: 'string' }).notNull(), // When machine should be started
  reminderBeforeMinutes: integer("reminder_before_minutes").default(30).notNull(), // How many minutes before to send reminder
  status: varchar("status", { length: 50 }).default('pending').notNull(), // pending, notified, completed, cancelled
  notificationSentAt: timestamp("notification_sent_at", { mode: 'string' }),
  machineStartedAt: timestamp("machine_started_at", { mode: 'string' }), // When user marked machine as started
  whatsappEnabled: integer("whatsapp_enabled").default(1).notNull(), // 1 = enabled, 0 = disabled
  emailEnabled: integer("email_enabled").default(1).notNull(), // 1 = enabled, 0 = disabled
  whatsappSent: integer("whatsapp_sent").default(0).notNull(), // 0 = not sent, 1 = sent
  emailSent: integer("email_sent").default(0).notNull(), // 0 = not sent, 1 = sent
  productionDate: date("production_date").notNull(), // Date of production
  shift: varchar("shift", { length: 50 }), // Morning, Evening, Night
  notes: text("notes"),
  taskReferenceId: varchar("task_reference_id", { length: 50 }).unique(), // Unique ref like "MST-12345" for WhatsApp replies
  operatorResponse: text("operator_response"), // WhatsApp reply from operator
  operatorResponseTime: timestamp("operator_response_time", { mode: 'string' }), // When operator replied via WhatsApp
  responseStatus: varchar("response_status", { length: 20 }).default('no_response'), // on_time, late, no_response
  createdBy: varchar("created_by").references(() => users.id),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertMachineStartupTaskSchema = createInsertSchema(machineStartupTasks, {
  productionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  scheduledStartTime: z.string().datetime(),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMachineStartupTask = z.infer<typeof insertMachineStartupTaskSchema>;
export type MachineStartupTask = typeof machineStartupTasks.$inferSelect;

// Notification Configuration - for SendGrid, Office 365 SMTP, and Meta WhatsApp Cloud API settings
export const notificationConfig = pgTable("notification_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Email Settings (SendGrid)
  emailEnabled: integer("email_enabled").default(0).notNull(), // 1 = enabled, 0 = disabled
  senderEmail: varchar("sender_email", { length: 255 }), // Verified sender email in SendGrid
  senderName: varchar("sender_name", { length: 255 }), // Sender name for emails
  // Email Provider Selection (SendGrid or Office365)
  emailProvider: varchar("email_provider", { length: 50 }).default('SendGrid'), // 'SendGrid' or 'Office365'
  // Office 365 SMTP Settings
  smtpHost: varchar("smtp_host", { length: 255 }), // smtp.office365.com
  smtpPort: integer("smtp_port").default(587), // 587 for TLS, 465 for SSL
  smtpUser: varchar("smtp_user", { length: 255 }), // Office 365 email address
  smtpPassword: text("smtp_password"), // App password or account password
  smtpSecure: integer("smtp_secure").default(0).notNull(), // 0 = TLS (587), 1 = SSL (465)
  smtpFromName: varchar("smtp_from_name", { length: 255 }), // Display name for Office 365 emails
  // WhatsApp Settings (Meta Business Cloud API)
  whatsappEnabled: integer("whatsapp_enabled").default(0).notNull(), // 1 = enabled, 0 = disabled
  metaPhoneNumberId: varchar("meta_phone_number_id", { length: 255 }), // Meta WhatsApp Phone Number ID
  metaAccessToken: text("meta_access_token"), // Meta WhatsApp Access Token (long-lived)
  metaVerifyToken: varchar("meta_verify_token", { length: 255 }), // Webhook verification token (required)
  // General Settings
  testMode: integer("test_mode").default(1).notNull(), // 1 = console logging only, 0 = real sending
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertNotificationConfigSchema = createInsertSchema(notificationConfig).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationConfig = z.infer<typeof insertNotificationConfigSchema>;
export type NotificationConfig = typeof notificationConfig.$inferSelect;

// Production Reconciliation - End of day reconciliation linking issuance, production, and actual consumption
export const productionReconciliations = pgTable("production_reconciliations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reconciliationNumber: varchar("reconciliation_number", { length: 100 }).notNull().unique(),
  reconciliationDate: timestamp("reconciliation_date", { mode: 'string' }).notNull(),
  shift: varchar("shift", { length: 20 }).notNull(), // A, B, General
  
  // Links to source documents (FK with cascading rules)
  issuanceId: varchar("issuance_id").references(() => rawMaterialIssuance.id, { onUpdate: "cascade", onDelete: "restrict" }).notNull(),
  productionEntryId: varchar("production_entry_id").references(() => productionEntries.id, { onUpdate: "cascade", onDelete: "restrict" }).notNull(),
  productId: varchar("product_id").references(() => products.id), // Auto-populated from production entry
  
  // Finished goods summary (auto-populated from production)
  producedCases: integer("produced_cases").notNull(), // From production entry
  rejectedCases: integer("rejected_cases").default(0).notNull(), // From production entry
  
  // Empty bottle tracking
  emptyBottlesProduced: integer("empty_bottles_produced").default(0).notNull(),
  emptyBottlesUsed: integer("empty_bottles_used").default(0).notNull(),
  emptyBottlesPending: integer("empty_bottles_pending").default(0).notNull(),
  
  // Edit tracking for role-based limits
  editCount: integer("edit_count").default(0).notNull(), // Track number of edits
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  lastEditedAt: timestamp("last_edited_at", { mode: 'string' }),
  
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  // Composite unique index: prevent duplicate reconciliations for same issuance + shift
  uniqueIndex("production_reconciliations_issuance_shift_idx").on(table.issuanceId, table.shift),
  // Multi-column indexes for dashboard queries
  index("production_reconciliations_date_shift_status_idx").on(table.reconciliationDate, table.shift, table.recordStatus),
  index("production_reconciliations_issuance_status_idx").on(table.issuanceId, table.recordStatus),
]);

export const insertProductionReconciliationSchema = createInsertSchema(productionReconciliations, {
  reconciliationDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
}).omit({
  id: true,
  reconciliationNumber: true,  // Auto-generated on backend
  productId: true,             // Auto-populated from production entry
  editCount: true,             // Managed by backend
  lastEditedBy: true,          // Managed by backend
  lastEditedAt: true,          // Managed by backend
  createdBy: true,             // Set from session
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductionReconciliation = z.infer<typeof insertProductionReconciliationSchema>;
export type ProductionReconciliation = typeof productionReconciliations.$inferSelect;

// Production Reconciliation Items - Material-level reconciliation details
export const productionReconciliationItems = pgTable("production_reconciliation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reconciliationId: varchar("reconciliation_id").references(() => productionReconciliations.id).notNull(),
  
  // Material reference
  rawMaterialId: varchar("raw_material_id").references(() => rawMaterials.id).notNull(),
  issuanceItemId: varchar("issuance_item_id").references(() => rawMaterialIssuanceItems.id), // Link to original issuance item
  
  // Quantities (in pieces - supports decimals for partial bags calculation)
  quantityIssued: numeric("quantity_issued", { precision: 12, scale: 2 }).notNull(), // Auto from issuance
  quantityUsed: numeric("quantity_used", { precision: 12, scale: 2 }).notNull(), // Manual entry
  quantityReturned: numeric("quantity_returned", { precision: 12, scale: 2 }).default('0').notNull(), // Manual entry - goes back to inventory
  quantityPending: numeric("quantity_pending", { precision: 12, scale: 2 }).default('0').notNull(), // Manual entry - in hopper (supports decimal bags)
  // Note: netConsumed = quantityUsed - quantityReturned - quantityPending (calculated dynamically, not stored)
  
  // Unit of measure
  uomId: varchar("uom_id").references(() => uom.id),
  
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertProductionReconciliationItemSchema = createInsertSchema(productionReconciliationItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductionReconciliationItem = z.infer<typeof insertProductionReconciliationItemSchema>;
export type ProductionReconciliationItem = typeof productionReconciliationItems.$inferSelect;

// ==================== DOCUMENT MANAGEMENT ====================

// Document Categories - Types of documents that can be stored
export const documentCategories = pgTable("document_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertDocumentCategorySchema = createInsertSchema(documentCategories).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocumentCategory = z.infer<typeof insertDocumentCategorySchema>;
export type DocumentCategory = typeof documentCategories.$inferSelect;

// Documents - Main document metadata table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => documentCategories.id),
  
  // File information
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }), // MIME type
  fileSize: integer("file_size"), // in bytes
  filePath: text("file_path").notNull(), // Storage path
  
  // Related entity linking (polymorphic - can link to vendor, invoice, etc.)
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // 'vendor', 'invoice', 'purchase_order', etc.
  relatedEntityId: varchar("related_entity_id"),
  
  // Document validity tracking
  documentDate: date("document_date", { mode: 'string' }),
  expiryDate: date("expiry_date", { mode: 'string' }),
  
  // Expiry alert tracking
  expiryAlertSent: integer("expiry_alert_sent").default(0), // 0 = not sent, 1 = sent
  expiryAlertSentAt: timestamp("expiry_alert_sent_at", { mode: 'string' }),
  
  // Version control
  versionNumber: integer("version_number").default(1).notNull(),
  parentDocumentId: varchar("parent_document_id"), // For version tracking
  
  tags: text("tags").array(), // Searchable tags
  remarks: text("remarks"),
  
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("documents_category_idx").on(table.categoryId),
  index("documents_related_entity_idx").on(table.relatedEntityType, table.relatedEntityId),
  index("documents_expiry_idx").on(table.expiryDate),
]);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// ==================== EXPENSE TRACKING & VOUCHERS ====================

// Expense Categories - Categories for expense classification
export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  parentId: varchar("parent_id"), // For subcategories
  gstApplicable: integer("gst_applicable").default(0).notNull(), // 0 = No, 1 = Yes
  defaultGstRate: numeric("default_gst_rate", { precision: 5, scale: 2 }).default('0'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

// Expense Vouchers - Header table for expense vouchers
export const expenseVouchers = pgTable("expense_vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherNumber: varchar("voucher_number", { length: 50 }).notNull().unique(),
  voucherDate: date("voucher_date", { mode: 'string' }).notNull(),
  
  // Payee information
  payeeType: varchar("payee_type", { length: 20 }).notNull(), // 'employee', 'vendor', 'other'
  payeeId: varchar("payee_id"), // Reference to user or vendor
  payeeName: varchar("payee_name", { length: 255 }).notNull(), // Stored for display
  
  // Payment details
  paymentMode: varchar("payment_mode", { length: 50 }).notNull(), // 'cash', 'bank_transfer', 'upi', 'cheque'
  bankName: varchar("bank_name", { length: 100 }),
  chequeNumber: varchar("cheque_number", { length: 50 }),
  transactionReference: varchar("transaction_reference", { length: 100 }),
  
  // Amount summary (in paise for precision)
  subtotal: integer("subtotal").default(0).notNull(),
  gstAmount: integer("gst_amount").default(0).notNull(),
  totalAmount: integer("total_amount").default(0).notNull(),
  
  // Workflow
  status: varchar("status", { length: 20 }).default('draft').notNull(), // 'draft', 'submitted', 'approved', 'rejected', 'paid'
  
  purpose: text("purpose"),
  remarks: text("remarks"),
  
  // Audit trail
  preparedBy: varchar("prepared_by").references(() => users.id).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { mode: 'string' }),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("expense_vouchers_date_idx").on(table.voucherDate),
  index("expense_vouchers_status_idx").on(table.status),
  index("expense_vouchers_payee_idx").on(table.payeeType, table.payeeId),
]);

export const insertExpenseVoucherSchema = createInsertSchema(expenseVouchers).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExpenseVoucher = z.infer<typeof insertExpenseVoucherSchema>;
export type ExpenseVoucher = typeof expenseVouchers.$inferSelect;

// Expense Items - Line items for each voucher
export const expenseItems = pgTable("expense_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherId: varchar("voucher_id").references(() => expenseVouchers.id, { onDelete: 'cascade' }).notNull(),
  categoryId: varchar("category_id").references(() => expenseCategories.id),
  
  description: text("description").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").default(0).notNull(), // in paise
  amount: integer("amount").default(0).notNull(), // in paise (quantity * unitPrice)
  
  // GST details
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default('0'),
  gstAmount: integer("gst_amount").default(0).notNull(), // in paise
  
  // Optional reference to purchase invoice
  referenceInvoiceNumber: varchar("reference_invoice_number", { length: 100 }),
  referenceInvoiceDate: date("reference_invoice_date", { mode: 'string' }),
  
  costCenter: varchar("cost_center", { length: 100 }),
  remarks: text("remarks"),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertExpenseItemSchema = createInsertSchema(expenseItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExpenseItem = z.infer<typeof insertExpenseItemSchema>;
export type ExpenseItem = typeof expenseItems.$inferSelect;

// Expense Attachments - Receipts and supporting documents
export const expenseAttachments = pgTable("expense_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherId: varchar("voucher_id").references(() => expenseVouchers.id, { onDelete: 'cascade' }).notNull(),
  
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  filePath: text("file_path").notNull(),
  
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertExpenseAttachmentSchema = createInsertSchema(expenseAttachments).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
});

export type InsertExpenseAttachment = z.infer<typeof insertExpenseAttachmentSchema>;
export type ExpenseAttachment = typeof expenseAttachments.$inferSelect;

// ==================== DAILY CASH REGISTER ====================

// Cash Register Days - Daily cash tracking per salesperson
export const cashRegisterDays = pgTable("cash_register_days", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  registerDate: date("register_date", { mode: 'string' }).notNull(),
  
  // Salesperson/Staff
  salespersonId: varchar("salesperson_id").references(() => users.id),
  salespersonName: varchar("salesperson_name", { length: 100 }).notNull(), // Stored for display (e.g., "TARAK", "SAI")
  
  // Balances (in paise for precision)
  openingBalance: integer("opening_balance").default(0).notNull(),
  closingBalance: integer("closing_balance").default(0).notNull(),
  
  // Aggregated totals (in paise)
  totalDeposits: integer("total_deposits").default(0).notNull(),
  totalCashReceived: integer("total_cash_received").default(0).notNull(),
  totalExpenses: integer("total_expenses").default(0).notNull(),
  totalTransfers: integer("total_transfers").default(0).notNull(),
  
  // Reconciliation
  status: varchar("status", { length: 20 }).default('open').notNull(), // 'open', 'closed', 'locked'
  actualClosingBalance: integer("actual_closing_balance"), // Actual cash on hand when closing
  reconciledBy: varchar("reconciled_by").references(() => users.id),
  reconciledAt: timestamp("reconciled_at", { mode: 'string' }),
  varianceAmount: integer("variance_amount").default(0), // Difference between expected and actual
  varianceNotes: text("variance_notes"), // Explanation for any variance
  
  notes: text("notes"),
  
  // Discrepancy tracking - JSON with validation issues
  hasDiscrepancy: integer("has_discrepancy").default(0).notNull(), // 1 = has issues
  discrepancyDetails: jsonb("discrepancy_details"), // { items_mismatch: true, balance_mismatch: true, details: [...] }
  
  // Import tracking
  importedFromFile: varchar("imported_from_file", { length: 500 }),
  importedAt: timestamp("imported_at", { mode: 'string' }),
  
  createdBy: varchar("created_by").references(() => users.id),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  index("cash_register_days_date_idx").on(table.registerDate),
  index("cash_register_days_salesperson_idx").on(table.salespersonId),
  index("cash_register_days_status_idx").on(table.status),
]);

export const insertCashRegisterDaySchema = createInsertSchema(cashRegisterDays).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCashRegisterDay = z.infer<typeof insertCashRegisterDaySchema>;
export type CashRegisterDay = typeof cashRegisterDays.$inferSelect;

// Cash Register Transactions - Individual transactions within a day
export const cashRegisterTransactions = pgTable("cash_register_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dayId: varchar("day_id").references(() => cashRegisterDays.id, { onDelete: 'cascade' }).notNull(),
  
  // Transaction type: 'deposit', 'cash_received', 'expense', 'transfer', 'adjustment'
  transactionType: varchar("transaction_type", { length: 30 }).notNull(),
  
  // Amount (in paise, positive for credits, stored as absolute value)
  amount: integer("amount").default(0).notNull(),
  
  // Reference/Description
  reference: varchar("reference", { length: 255 }),
  description: text("description"),
  
  // Source type for cash_received: 'secondary_sale', 'sale_cash', 'upi', 'bank_transfer', 'other'
  sourceType: varchar("source_type", { length: 50 }),
  
  // For transfers
  transferTo: varchar("transfer_to", { length: 100 }), // e.g., "TULASI"
  
  // Document attachment
  documentPath: varchar("document_path", { length: 500 }),
  documentName: varchar("document_name", { length: 255 }),
  
  // Voucher conversion tracking
  convertedToVoucherId: varchar("converted_to_voucher_id").references(() => expenseVouchers.id),
  convertedAt: timestamp("converted_at", { mode: 'string' }),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertCashRegisterTransactionSchema = createInsertSchema(cashRegisterTransactions).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
});

export type InsertCashRegisterTransaction = z.infer<typeof insertCashRegisterTransactionSchema>;
export type CashRegisterTransaction = typeof cashRegisterTransactions.$inferSelect;

// Cash Register Expense Items - Parsed expense line items from "Item Details"
export const cashRegisterExpenseItems = pgTable("cash_register_expense_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").references(() => cashRegisterTransactions.id, { onDelete: 'cascade' }).notNull(),
  
  // Parsed item details
  itemLabel: varchar("item_label", { length: 255 }).notNull(), // e.g., "DIESEL", "PETROL", "RO FILTERS"
  amount: integer("amount").default(0).notNull(), // in paise
  
  // Category mapping (optional)
  expenseCategoryId: varchar("expense_category_id").references(() => expenseCategories.id),
  
  // Original raw text
  rawText: varchar("raw_text", { length: 500 }),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertCashRegisterExpenseItemSchema = createInsertSchema(cashRegisterExpenseItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
});

export type InsertCashRegisterExpenseItem = z.infer<typeof insertCashRegisterExpenseItemSchema>;
export type CashRegisterExpenseItem = typeof cashRegisterExpenseItems.$inferSelect;

// Salesperson Mapping - Maps Excel SO values to system users
export const salespersonMappings = pgTable("salesperson_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  excelName: varchar("excel_name", { length: 100 }).notNull().unique(), // e.g., "TARAK", "SAI"
  userId: varchar("user_id").references(() => users.id),
  displayName: varchar("display_name", { length: 100 }),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertSalespersonMappingSchema = createInsertSchema(salespersonMappings).omit({
  id: true,
  createdAt: true,
});

export type InsertSalespersonMapping = z.infer<typeof insertSalespersonMappingSchema>;
export type SalespersonMapping = typeof salespersonMappings.$inferSelect;

// ==================== PAGINATION SCHEMAS ====================
// Shared pagination request/response schemas for consistent API contracts

export const paginationRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaginationRequest = z.infer<typeof paginationRequestSchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// Generic paginated response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ==================== SYSTEM ALERTS ====================
// Lightweight alerting system for oversell detection and other system warnings

export const systemAlerts = pgTable("system_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // 'oversell', 'low_stock', etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'product', 'raw_material', etc.
  entityId: varchar("entity_id").notNull(), // ID of the affected entity
  entityName: varchar("entity_name", { length: 255 }), // Display name for quick reference
  severity: varchar("severity", { length: 20 }).default('warning').notNull(), // 'info', 'warning', 'error', 'critical'
  message: text("message").notNull(),
  details: jsonb("details"), // Snapshot data: { physicalStock, reservedStock, difference }
  status: varchar("status", { length: 20 }).default('active').notNull(), // 'active', 'resolved', 'acknowledged'
  detectedAt: timestamp("detected_at", { mode: 'string' }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  createdByInvoiceId: varchar("created_by_invoice_id"), // Invoice that triggered the alert
}, (table) => [
  index("idx_system_alerts_type_status").on(table.alertType, table.status),
  index("idx_system_alerts_entity").on(table.entityType, table.entityId, table.status),
]);

export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  detectedAt: true,
  resolvedAt: true,
});

export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlert = typeof systemAlerts.$inferSelect;

// ==================== VENDOR DEBIT NOTES ====================
// Manual debit notes against vendors for claims (defective goods, short receipts, quality issues, etc.)

export const vendorDebitNotes = pgTable("vendor_debit_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteNumber: varchar("note_number", { length: 100 }).unique().notNull(), // VDN-YYYYMMDD-{seq}
  
  // Vendor reference
  vendorId: varchar("vendor_id").references(() => vendors.id).notNull(),
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id), // Optional PO reference
  
  // Debit details
  debitDate: date("debit_date").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(), // defective_goods, short_receipt, quality_rejection, price_dispute, other
  status: varchar("status", { length: 50 }).default('draft').notNull(), // draft, issued, acknowledged, settled, cancelled
  
  // Financial totals (in paise)
  subtotal: integer("subtotal").notNull(),
  cgstAmount: integer("cgst_amount").default(0).notNull(),
  sgstAmount: integer("sgst_amount").default(0).notNull(),
  igstAmount: integer("igst_amount").default(0).notNull(),
  grandTotal: integer("grand_total").notNull(),
  
  // Settlement tracking
  settledAmount: integer("settled_amount").default(0).notNull(), // Amount recovered from vendor
  settlementDate: date("settlement_date"),
  settlementReference: varchar("settlement_reference", { length: 255 }), // Bank reference/cheque no
  
  // Metadata
  issuedBy: varchar("issued_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertVendorDebitNoteSchema = createInsertSchema(vendorDebitNotes, {
  debitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
}).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendorDebitNote = z.infer<typeof insertVendorDebitNoteSchema>;
export type VendorDebitNote = typeof vendorDebitNotes.$inferSelect;

// Vendor Debit Note Items (Detail/Line Items)
export const vendorDebitNoteItems = pgTable("vendor_debit_note_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorDebitNoteId: varchar("vendor_debit_note_id").references(() => vendorDebitNotes.id).notNull(),
  
  // Material reference (optional - can be for raw materials or services)
  rawMaterialId: varchar("raw_material_id").references(() => rawMaterials.id),
  description: text("description").notNull(),
  hsnCode: varchar("hsn_code", { length: 20 }),
  
  // Quantities and pricing (in paise)
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 20 }).default('units').notNull(),
  unitPrice: integer("unit_price").notNull(),
  taxableValue: integer("taxable_value").notNull(),
  
  // GST breakdown
  cgstRate: integer("cgst_rate").default(0).notNull(), // Percentage (e.g., 900 = 9%)
  cgstAmount: integer("cgst_amount").default(0).notNull(),
  sgstRate: integer("sgst_rate").default(0).notNull(),
  sgstAmount: integer("sgst_amount").default(0).notNull(),
  igstRate: integer("igst_rate").default(0).notNull(),
  igstAmount: integer("igst_amount").default(0).notNull(),
  
  totalAmount: integer("total_amount").notNull(), // taxableValue + GST amounts
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertVendorDebitNoteItemSchema = createInsertSchema(vendorDebitNoteItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendorDebitNoteItem = z.infer<typeof insertVendorDebitNoteItemSchema>;
export type VendorDebitNoteItem = typeof vendorDebitNoteItems.$inferSelect;

// Vendor Debit Note Adjustments - links debit notes to invoices/POs for settlement
export const vendorDebitNoteAdjustments = pgTable("vendor_debit_note_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorDebitNoteId: varchar("vendor_debit_note_id").references(() => vendorDebitNotes.id).notNull(),
  
  // Reference type and ID (invoice or purchase_order)
  referenceType: varchar("reference_type", { length: 20 }).notNull(), // 'invoice' or 'purchase_order'
  invoiceId: varchar("invoice_id").references(() => invoices.id), // For sales invoice adjustments
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id), // For PO adjustments
  
  // Adjustment amount (in paise)
  adjustmentAmount: integer("adjustment_amount").notNull(),
  adjustmentDate: date("adjustment_date").notNull(),
  
  // Metadata
  remarks: text("remarks"),
  adjustedBy: varchar("adjusted_by").references(() => users.id),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const insertVendorDebitNoteAdjustmentSchema = createInsertSchema(vendorDebitNoteAdjustments).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
});

export type InsertVendorDebitNoteAdjustment = z.infer<typeof insertVendorDebitNoteAdjustmentSchema>;
export type VendorDebitNoteAdjustment = typeof vendorDebitNoteAdjustments.$inferSelect;

// Scrap Inventory - tracks damaged/scrapped goods from sales returns for loss calculation
export const scrapInventory = pgTable("scrap_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scrapNumber: varchar("scrap_number", { length: 100 }).notNull().unique(), // SCRAP-YYYYMMDD-XXX
  scrapDate: timestamp("scrap_date", { mode: 'string' }).notNull(),
  
  // Source reference
  salesReturnId: varchar("sales_return_id").references(() => salesReturns.id),
  salesReturnItemId: varchar("sales_return_item_id").references(() => salesReturnItems.id),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  
  // Product details
  productId: varchar("product_id").references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(), // Snapshot for reporting
  batchNumber: varchar("batch_number", { length: 100 }),
  quantity: integer("quantity").notNull(),
  
  // Cost tracking (all amounts in paise)
  unitCost: integer("unit_cost").notNull(), // Original cost of product (from BOM or purchase)
  sellingPrice: integer("selling_price").notNull(), // Price at which it was sold
  totalCostValue: integer("total_cost_value").notNull(), // quantity * unitCost
  totalSellingValue: integer("total_selling_value").notNull(), // quantity * sellingPrice
  lossAmount: integer("loss_amount").notNull(), // totalCostValue (actual loss to business)
  
  // Damage details
  damageReason: varchar("damage_reason", { length: 50 }).notNull(), // transport, handling, manufacturing_defect, customer_misuse, expired, other
  conditionDescription: text("condition_description"),
  damageEvidenceUrl: varchar("damage_evidence_url", { length: 500 }), // Photo proof URL
  
  // Approval workflow
  approvalStatus: varchar("approval_status", { length: 30 }).default('pending').notNull(), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvalDate: timestamp("approval_date", { mode: 'string' }),
  approvalRemarks: text("approval_remarks"),
  
  // Processing
  processedStatus: varchar("processed_status", { length: 30 }).default('pending').notNull(), // pending, processed, disposed
  processedDate: timestamp("processed_date", { mode: 'string' }),
  disposalMethod: varchar("disposal_method", { length: 50 }), // recycled, disposed, sold_as_scrap, repaired
  disposalValue: integer("disposal_value").default(0), // Any recovery value from disposal (in paise)
  
  // GST implications
  gstReversal: integer("gst_reversal").default(0), // GST amount to be reversed (in paise)
  gstReversalStatus: varchar("gst_reversal_status", { length: 30 }).default('pending'), // pending, reversed, not_applicable
  
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const insertScrapInventorySchema = createInsertSchema(scrapInventory, {
  scrapDate: z.union([z.string(), z.date()]).transform(val => {
    if (!val) return new Date();
    if (typeof val === 'string') {
      if (val.trim() === '') return new Date();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return val;
  }),
  approvalDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val || val === '') return null;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    }
    return val;
  }).optional(),
  processedDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val || val === '') return null;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    }
    return val;
  }).optional(),
}).omit({
  id: true,
  scrapNumber: true, // Auto-generated
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScrapInventory = z.infer<typeof insertScrapInventorySchema>;
export type ScrapInventory = typeof scrapInventory.$inferSelect;

// Customer Advances - Track advance payments received before invoicing
export const customerAdvances = pgTable("customer_advances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advanceNumber: varchar("advance_number", { length: 100 }).unique().notNull(), // ADV-YYYYMMDD-{seq}
  
  // Customer reference (vendor = customer in this context)
  vendorId: varchar("vendor_id").references(() => vendors.id).notNull(),
  
  // Receipt details
  receiptDate: date("receipt_date").notNull(),
  amount: integer("amount").notNull(), // Amount received (in paise)
  usedAmount: integer("used_amount").default(0).notNull(), // Amount applied to invoices (in paise)
  
  // Payment details
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // Cash, Cheque, NEFT, UPI, etc.
  referenceNumber: varchar("reference_number", { length: 100 }), // Transaction ID, Cheque number, etc.
  bankName: varchar("bank_name", { length: 255 }), // Bank name for cheque/transfer
  
  // Status tracking
  status: varchar("status", { length: 50 }).default('active').notNull(), // active, fully_used, cancelled
  
  // Metadata
  purpose: text("purpose"), // What the advance is for (general, specific order, etc.)
  remarks: text("remarks"),
  receivedBy: varchar("received_by").references(() => users.id),
  
  // Cancellation fields
  cancelledAt: timestamp("cancelled_at", { mode: 'string' }),
  cancellationRemarks: text("cancellation_remarks"),
  cancelledBy: varchar("cancelled_by").references(() => users.id),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => ({
  vendorIdx: index("customer_advances_vendor_idx").on(table.vendorId),
  statusIdx: index("customer_advances_status_idx").on(table.status),
}));

export const insertCustomerAdvanceSchema = createInsertSchema(customerAdvances, {
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  amount: z.number().int().positive("Amount must be a positive integer"),
  purpose: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  status: z.string().optional(),
}).omit({
  id: true,
  advanceNumber: true, // Auto-generated
  usedAmount: true, // Managed by system
  cancelledAt: true, // Managed by system
  cancellationRemarks: true, // Managed by system
  cancelledBy: true, // Managed by system
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomerAdvance = z.infer<typeof insertCustomerAdvanceSchema>;
export type CustomerAdvance = typeof customerAdvances.$inferSelect;

// Advance Applications - Track how advances are applied to invoices
export const advanceApplications = pgTable("advance_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // References
  advanceId: varchar("advance_id").references(() => customerAdvances.id).notNull(),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  invoicePaymentId: varchar("invoice_payment_id").references(() => invoicePayments.id), // Link to the payment record created
  
  // Application details
  appliedAmount: integer("applied_amount").notNull(), // Amount applied (in paise)
  applicationDate: date("application_date").notNull(),
  
  // Metadata
  appliedBy: varchar("applied_by").references(() => users.id),
  remarks: text("remarks"),
  
  // Reversal tracking
  reversedAt: timestamp("reversed_at", { mode: 'string' }),
  reversalRemarks: text("reversal_remarks"),
  reversedBy: varchar("reversed_by").references(() => users.id),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => ({
  advanceIdx: index("advance_applications_advance_idx").on(table.advanceId),
  invoiceIdx: index("advance_applications_invoice_idx").on(table.invoiceId),
}));

export const insertAdvanceApplicationSchema = createInsertSchema(advanceApplications, {
  appliedAmount: z.number().int().positive("Applied amount must be a positive integer"),
  remarks: z.string().optional().nullable(),
}).omit({
  id: true,
  invoicePaymentId: true, // Set by system
  reversedAt: true, // Managed by system
  reversalRemarks: true, // Managed by system
  reversedBy: true, // Managed by system
  recordStatus: true,
  createdAt: true,
});

export type InsertAdvanceApplication = z.infer<typeof insertAdvanceApplicationSchema>;
export type AdvanceApplication = typeof advanceApplications.$inferSelect;
