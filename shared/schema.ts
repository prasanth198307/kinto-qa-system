import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
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

// Raw Material Issuance for Production
export const rawMaterialIssuance = pgTable("raw_material_issuance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issuanceDate: timestamp("issuance_date").notNull(),
  materialId: varchar("material_id").references(() => rawMaterials.id).notNull(),
  quantityIssued: integer("quantity_issued").notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  productId: varchar("product_id").references(() => products.id),
  batchNumber: varchar("batch_number", { length: 100 }),
  issuedTo: varchar("issued_to", { length: 255 }),
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

// Gatepasses for Finished Goods Dispatch
export const gatepasses = pgTable("gatepasses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gatepassNumber: varchar("gatepass_number", { length: 100 }).notNull().unique(),
  gatepassDate: timestamp("gatepass_date").notNull(),
  finishedGoodId: varchar("finished_good_id").references(() => finishedGoods.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantityDispatched: integer("quantity_dispatched").notNull(),
  uomId: varchar("uom_id").references(() => uom.id),
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(),
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  driverContact: varchar("driver_contact", { length: 50 }),
  transporterName: varchar("transporter_name", { length: 255 }),
  destination: varchar("destination", { length: 255 }),
  customerName: varchar("customer_name", { length: 255 }),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
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
  recordStatus: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGatepass = z.infer<typeof insertGatepassSchema>;
export type Gatepass = typeof gatepasses.$inferSelect;
