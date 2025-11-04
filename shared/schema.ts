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

// User storage table - Required for Replit Auth with role field added
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMachineSchema = createInsertSchema(machines).omit({
  id: true,
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
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
  unitPrice: integer("unit_price"),
  reorderThreshold: integer("reorder_threshold"),
  currentStock: integer("current_stock").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSparePartSchema = createInsertSchema(sparePartsCatalog).omit({
  id: true,
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

// Maintenance plans
export const maintenancePlans = pgTable("maintenance_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  machineId: varchar("machine_id").references(() => machines.id),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  planType: varchar("plan_type", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  nextDueDate: timestamp("next_due_date"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isActive: varchar("is_active").default('true'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMaintenancePlanSchema = createInsertSchema(maintenancePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenancePlan = z.infer<typeof insertMaintenancePlanSchema>;
export type MaintenancePlan = typeof maintenancePlans.$inferSelect;

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMachineTypeSchema = createInsertSchema(machineTypes).omit({
  id: true,
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
