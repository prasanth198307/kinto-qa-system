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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  resetTokenExpiry: timestamp("reset_token_expiry"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  status: varchar("status", { length: 50 }).default('active'),
  warmupTimeMinutes: integer("warmup_time_minutes").default(0),
  installationDate: timestamp("installation_date"),
  lastMaintenance: timestamp("last_maintenance"),
  nextPmDue: timestamp("next_pm_due"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
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
  dueDateTime: timestamp("due_date_time"),
  status: varchar("status", { length: 50 }).default('pending'),
  submissionId: varchar("submission_id").references(() => checklistSubmissions.id),
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
  notes: text("notes"),
  missedNotificationSent: integer("missed_notification_sent").default(0).notNull(),
  missedNotificationSentAt: timestamp("missed_notification_sent_at"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Checklist submissions
export const checklistSubmissions = pgTable("checklist_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => checklistTemplates.id),
  machineId: varchar("machine_id").references(() => machines.id),
  operatorId: varchar("operator_id").references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  managerId: varchar("manager_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default('pending'),
  date: timestamp("date").notNull(),
  shift: varchar("shift", { length: 50 }),
  supervisorName: varchar("supervisor_name", { length: 255 }),
  generalRemarks: text("general_remarks"),
  signatureData: text("signature_data"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export type SubmissionTask = typeof submissionTasks.$inferSelect;

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  spareItem: varchar("spare_item", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  urgency: varchar("urgency", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
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
  nextDueDate: timestamp("next_due_date"),
  taskListTemplateId: varchar("task_list_template_id").references(() => pmTaskListTemplates.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  completedAt: timestamp("completed_at").notNull(),
  status: varchar("status", { length: 50 }).default('completed'),
  overallResult: varchar("overall_result", { length: 50 }),
  remarks: text("remarks"),
  downtimeHours: integer("downtime_hours"),
  sparePartsUsed: text("spare_parts_used"),
  createdAt: timestamp("created_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
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
  performedDate: timestamp("performed_date").notNull(),
  performedBy: varchar("performed_by").references(() => users.id),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description"),
  sparePartsUsed: text("spare_parts_used"),
  downtimeHours: integer("downtime_hours"),
  cost: integer("cost"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MaintenanceHistory = typeof maintenanceHistory.$inferSelect;

// User assignments (operator-reviewer-manager relationships)
export const userAssignments = pgTable("user_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  managerId: varchar("manager_id").references(() => users.id),
  machineIds: text("machine_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserAssignment = typeof userAssignments.$inferSelect;

// Machine types configuration
export const machineTypes = pgTable("machine_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  isActive: varchar("is_active", { length: 10 }).default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
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
  sparePartId: varchar("spare_part_id").references(() => sparePartsCatalog.id),
  quantity: integer("quantity").notNull(),
  urgency: varchar("urgency", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default('pending'),
  requestedBy: varchar("requested_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  supplier: varchar("supplier", { length: 255 }),
  estimatedCost: integer("estimated_cost"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  poNumber: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Unit of Measurement (UOM) Master
export const uom = pgTable("uom", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUomSchema = createInsertSchema(uom).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUom = z.infer<typeof insertUomSchema>;
export type Uom = typeof uom.$inferSelect;

// Product Master
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productCode: varchar("product_code", { length: 100 }).notNull().unique(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  uomId: varchar("uom_id").references(() => uom.id),
  standardCost: integer("standard_cost"),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

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
  aadhaarNumber: varchar("aadhaar_number", { length: 20 }),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  vendorType: varchar("vendor_type", { length: 50 }),
  isCluster: integer("is_cluster").default(0).notNull(), // 0 = No, 1 = Yes
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Raw Materials/Inventory
export const rawMaterials = pgTable("raw_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialCode: varchar("material_code", { length: 100 }).notNull().unique(),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  uomId: varchar("uom_id").references(() => uom.id),
  currentStock: integer("current_stock").default(0),
  reorderLevel: integer("reorder_level"),
  maxStockLevel: integer("max_stock_level"),
  unitCost: integer("unit_cost"),
  location: varchar("location", { length: 255 }),
  supplier: varchar("supplier", { length: 255 }),
  isActive: varchar("is_active").default('true'),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

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
  createdAt: timestamp("created_at").defaultNow(),
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
  productionDate: timestamp("production_date").notNull(),
  quantity: integer("quantity").notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  qualityStatus: varchar("quality_status", { length: 50 }).default('pending'),
  machineId: varchar("machine_id").references(() => machines.id),
  operatorId: varchar("operator_id").references(() => users.id),
  inspectedBy: varchar("inspected_by").references(() => users.id),
  inspectionDate: timestamp("inspection_date"),
  storageLocation: varchar("storage_location", { length: 255 }),
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFinishedGoodSchema = createInsertSchema(finishedGoods, {
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
  issuanceDate: timestamp("issuance_date").notNull(),
  issuedTo: varchar("issued_to", { length: 255 }),
  productId: varchar("product_id").references(() => products.id), // Product being manufactured
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  issuedBy: varchar("issued_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
}).omit({
  id: true,
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
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantityIssued: integer("quantity_issued").notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRawMaterialIssuanceItemSchema = createInsertSchema(rawMaterialIssuanceItems).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRawMaterialIssuanceItem = z.infer<typeof insertRawMaterialIssuanceItemSchema>;
export type RawMaterialIssuanceItem = typeof rawMaterialIssuanceItems.$inferSelect;

// Gatepasses for Finished Goods Dispatch (Header)
export const gatepasses = pgTable("gatepasses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gatepassNumber: varchar("gatepass_number", { length: 100 }).notNull().unique(),
  gatepassDate: timestamp("gatepass_date").notNull(),
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
  recordStatus: integer("record_status").default(1).notNull(),
  issuedBy: varchar("issued_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  logoUrl: varchar("logo_url", { length: 500 }),
  
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
  
  // Template Settings
  isDefault: integer("is_default").default(0).notNull(), // 1 template can be marked as default
  isActive: integer("is_active").default(1).notNull(),
  
  recordStatus: integer("record_status").default(1).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  invoiceDate: timestamp("invoice_date").notNull(),
  
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
  roundOff: integer("round_off").default(0).notNull(), // Round off adjustment (in paise)
  totalAmount: integer("total_amount").notNull(), // Final total (in paise)
  amountReceived: integer("amount_received").default(0).notNull(), // Amount paid/received (in paise)
  
  // Payment Details
  paymentTerms: varchar("payment_terms", { length: 255 }),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankIfscCode: varchar("bank_ifsc_code", { length: 11 }),
  accountHolderName: varchar("account_holder_name", { length: 255 }),
  branchName: varchar("branch_name", { length: 255 }),
  upiId: varchar("upi_id", { length: 100 }),
  
  // Other Details
  placeOfSupply: varchar("place_of_supply", { length: 100 }),
  reverseCharge: integer("reverse_charge").default(0).notNull(),
  transportMode: varchar("transport_mode", { length: 50 }),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  dateOfSupply: timestamp("date_of_supply"),
  
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  generatedBy: varchar("generated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  
  totalAmount: integer("total_amount").notNull(), // Total for this line item (in paise)
  remarks: text("remarks"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  paymentDate: timestamp("payment_date").notNull(),
  amount: integer("amount").notNull(), // Payment amount (in paise)
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // Cash, Cheque, NEFT, UPI, etc.
  referenceNumber: varchar("reference_number", { length: 100 }), // Transaction ID, Cheque number, etc.
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // Advance, Partial, Full
  bankName: varchar("bank_name", { length: 255 }), // Bank name for cheque/transfer
  remarks: text("remarks"),
  recordedBy: varchar("recorded_by").references(() => users.id),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;
export type InvoicePayment = typeof invoicePayments.$inferSelect;

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBankSchema = createInsertSchema(banks).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBank = z.infer<typeof insertBankSchema>;
export type Bank = typeof banks.$inferSelect;

// Machine Startup Reminders - for notifying users to turn on machines before production
export const machineStartupTasks = pgTable("machine_startup_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineId: varchar("machine_id").references(() => machines.id).notNull(),
  assignedUserId: varchar("assigned_user_id").references(() => users.id).notNull(),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(), // When machine should be started
  reminderBeforeMinutes: integer("reminder_before_minutes").default(30).notNull(), // How many minutes before to send reminder
  status: varchar("status", { length: 50 }).default('pending').notNull(), // pending, notified, completed, cancelled
  notificationSentAt: timestamp("notification_sent_at"),
  machineStartedAt: timestamp("machine_started_at"), // When user marked machine as started
  whatsappEnabled: integer("whatsapp_enabled").default(1).notNull(), // 1 = enabled, 0 = disabled
  emailEnabled: integer("email_enabled").default(1).notNull(), // 1 = enabled, 0 = disabled
  whatsappSent: integer("whatsapp_sent").default(0).notNull(), // 0 = not sent, 1 = sent
  emailSent: integer("email_sent").default(0).notNull(), // 0 = not sent, 1 = sent
  productionDate: date("production_date").notNull(), // Date of production
  shift: varchar("shift", { length: 50 }), // Morning, Evening, Night
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Notification Configuration - for SendGrid and Twilio settings
export const notificationConfig = pgTable("notification_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Email Settings (SendGrid)
  emailEnabled: integer("email_enabled").default(0).notNull(), // 1 = enabled, 0 = disabled
  senderEmail: varchar("sender_email", { length: 255 }), // Verified sender email in SendGrid
  senderName: varchar("sender_name", { length: 255 }), // Sender name for emails
  // WhatsApp Settings (Twilio)
  whatsappEnabled: integer("whatsapp_enabled").default(0).notNull(), // 1 = enabled, 0 = disabled
  twilioPhoneNumber: varchar("twilio_phone_number", { length: 50 }), // Twilio WhatsApp number (e.g., whatsapp:+14155238886)
  // General Settings
  testMode: integer("test_mode").default(1).notNull(), // 1 = console logging only, 0 = real sending
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationConfigSchema = createInsertSchema(notificationConfig).omit({
  id: true,
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationConfig = z.infer<typeof insertNotificationConfigSchema>;
export type NotificationConfig = typeof notificationConfig.$inferSelect;
