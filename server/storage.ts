import {
  roles,
  rolePermissions,
  users,
  machines,
  checklistTemplates,
  templateTasks,
  sparePartsCatalog,
  machineTypes,
  machineSpares,
  purchaseOrders,
  maintenancePlans,
  pmTaskListTemplates,
  pmTemplateTasks,
  pmExecutions,
  pmExecutionTasks,
  uom,
  products,
  vendors,
  rawMaterials,
  rawMaterialTransactions,
  finishedGoods,
  rawMaterialIssuance,
  rawMaterialIssuanceItems,
  gatepasses,
  gatepassItems,
  invoices,
  invoiceItems,
  invoicePayments,
  invoiceTemplates,
  termsConditions,
  banks,
  checklistAssignments,
  checklistSubmissions,
  submissionTasks,
  machineStartupTasks,
  notificationConfig,
  type User,
  type UpsertUser,
  type InsertUser,
  type Machine,
  type InsertMachine,
  type ChecklistTemplate,
  type TemplateTask,
  type SparePartCatalog,
  type MachineType,
  type InsertMachineType,
  type MachineSpare,
  type InsertMachineSpare,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type MaintenancePlan,
  type InsertMaintenancePlan,
  type PMTaskListTemplate,
  type InsertPMTaskListTemplate,
  type PMTemplateTask,
  type InsertPMTemplateTask,
  type PMExecution,
  type InsertPMExecution,
  type PMExecutionTask,
  type InsertPMExecutionTask,
  type Uom,
  type InsertUom,
  type Product,
  type InsertProduct,
  type Vendor,
  type InsertVendor,
  type RawMaterial,
  type InsertRawMaterial,
  type RawMaterialTransaction,
  type InsertRawMaterialTransaction,
  type FinishedGood,
  type InsertFinishedGood,
  type RawMaterialIssuance,
  type InsertRawMaterialIssuance,
  type RawMaterialIssuanceItem,
  type InsertRawMaterialIssuanceItem,
  type Gatepass,
  type InsertGatepass,
  type GatepassItem,
  type InsertGatepassItem,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type InvoicePayment,
  type InsertInvoicePayment,
  type InvoiceTemplate,
  type InsertInvoiceTemplate,
  type TermsConditions,
  type InsertTermsConditions,
  type Bank,
  type InsertBank,
  type Role,
  type InsertRole,
  type RolePermission,
  type InsertRolePermission,
  type ChecklistAssignment,
  type InsertChecklistAssignment,
  type ChecklistSubmission,
  type SubmissionTask,
  type MachineStartupTask,
  type InsertMachineStartupTask,
  type NotificationConfig,
  type InsertNotificationConfig,
  type InvoiceWithItems,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNotNull, notInArray, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserRole(roleId: string): Promise<{ id: string; name: string } | undefined>;
  getRoleByName(roleName: string): Promise<{ id: string; name: string } | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, roleId: string): Promise<User | undefined>;
  updateUser(id: string, data: { firstName?: string; lastName?: string; email?: string; password?: string }): Promise<User | undefined>;
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  resetPassword(userId: string, hashedPassword: string): Promise<void>;
  getAllUsers(): Promise<any[]>;
  deleteUser(id: string): Promise<void>;
  sessionStore: session.Store;
  clearAllSessions(): Promise<void>;
  
  createMachine(machine: InsertMachine): Promise<Machine>;
  getAllMachines(): Promise<Machine[]>;
  getMachine(id: string): Promise<Machine | undefined>;
  updateMachine(id: string, machine: Partial<InsertMachine>): Promise<Machine | undefined>;
  deleteMachine(id: string): Promise<void>;
  
  createChecklistTemplate(template: { name: string; machineId?: string; shiftTypes?: string[]; createdBy?: string }, tasks: { taskName: string; verificationCriteria?: string; orderIndex: number }[]): Promise<ChecklistTemplate>;
  getAllChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined>;
  getTemplateTasks(templateId: string): Promise<TemplateTask[]>;
  deleteChecklistTemplate(id: string): Promise<void>;
  
  createSparePart(sparePart: { partName: string; partNumber?: string; category?: string; machineId?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }): Promise<SparePartCatalog>;
  getAllSpareParts(): Promise<SparePartCatalog[]>;
  getSparePart(id: string): Promise<SparePartCatalog | undefined>;
  updateSparePart(id: string, sparePart: Partial<{ partName: string; partNumber?: string; category?: string; machineId?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }>): Promise<SparePartCatalog | undefined>;
  deleteSparePart(id: string): Promise<void>;
  
  createMachineType(machineType: InsertMachineType): Promise<MachineType>;
  getAllMachineTypes(): Promise<MachineType[]>;
  getMachineType(id: string): Promise<MachineType | undefined>;
  updateMachineType(id: string, machineType: Partial<InsertMachineType>): Promise<MachineType | undefined>;
  deleteMachineType(id: string): Promise<void>;
  
  createMachineSpare(machineSpare: InsertMachineSpare): Promise<MachineSpare>;
  getMachineSpares(machineId: string): Promise<MachineSpare[]>;
  getSparePartMachines(sparePartId: string): Promise<MachineSpare[]>;
  getMachineSpareParts(machineId: string): Promise<SparePartCatalog[]>;
  deleteMachineSpare(id: string): Promise<void>;
  
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  updatePurchaseOrder(id: string, purchaseOrder: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string): Promise<void>;
  
  createMaintenancePlan(plan: InsertMaintenancePlan): Promise<MaintenancePlan>;
  getAllMaintenancePlans(): Promise<MaintenancePlan[]>;
  getMaintenancePlan(id: string): Promise<MaintenancePlan | undefined>;
  updateMaintenancePlan(id: string, plan: Partial<InsertMaintenancePlan>): Promise<MaintenancePlan | undefined>;
  deleteMaintenancePlan(id: string): Promise<void>;
  
  createPMTaskListTemplate(template: InsertPMTaskListTemplate, tasks: InsertPMTemplateTask[]): Promise<PMTaskListTemplate>;
  getAllPMTaskListTemplates(): Promise<PMTaskListTemplate[]>;
  getPMTaskListTemplate(id: string): Promise<PMTaskListTemplate | undefined>;
  getPMTemplateTasks(templateId: string): Promise<PMTemplateTask[]>;
  updatePMTaskListTemplate(id: string, template: Partial<InsertPMTaskListTemplate>): Promise<PMTaskListTemplate | undefined>;
  deletePMTaskListTemplate(id: string): Promise<void>;
  
  createPMExecution(execution: InsertPMExecution, tasks: InsertPMExecutionTask[]): Promise<PMExecution>;
  getAllPMExecutions(): Promise<PMExecution[]>;
  getPMExecution(id: string): Promise<PMExecution | undefined>;
  getPMExecutionTasks(executionId: string): Promise<PMExecutionTask[]>;
  getPMExecutionsByPlan(planId: string): Promise<PMExecution[]>;
  
  // UOM Management
  createUom(uom: InsertUom): Promise<Uom>;
  getAllUoms(): Promise<Uom[]>;
  getUom(id: string): Promise<Uom | undefined>;
  updateUom(id: string, uom: Partial<InsertUom>): Promise<Uom | undefined>;
  deleteUom(id: string): Promise<void>;
  
  // Product Master
  createProduct(product: InsertProduct): Promise<Product>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  
  // Vendor Master
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getAllVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;
  
  // Raw Materials/Inventory
  createRawMaterial(material: InsertRawMaterial): Promise<RawMaterial>;
  getAllRawMaterials(): Promise<RawMaterial[]>;
  getRawMaterial(id: string): Promise<RawMaterial | undefined>;
  updateRawMaterial(id: string, material: Partial<InsertRawMaterial>): Promise<RawMaterial | undefined>;
  deleteRawMaterial(id: string): Promise<void>;
  
  // Raw Material Transactions
  createRawMaterialTransaction(transaction: InsertRawMaterialTransaction): Promise<RawMaterialTransaction>;
  getRawMaterialTransactions(materialId: string): Promise<RawMaterialTransaction[]>;
  
  // Finished Goods
  createFinishedGood(finishedGood: InsertFinishedGood): Promise<FinishedGood>;
  getAllFinishedGoods(): Promise<FinishedGood[]>;
  getFinishedGood(id: string): Promise<FinishedGood | undefined>;
  updateFinishedGood(id: string, finishedGood: Partial<InsertFinishedGood>): Promise<FinishedGood | undefined>;
  deleteFinishedGood(id: string): Promise<void>;
  getFinishedGoodsByProduct(productId: string): Promise<FinishedGood[]>;
  
  // Raw Material Issuance
  createRawMaterialIssuance(issuance: InsertRawMaterialIssuance): Promise<RawMaterialIssuance>;
  getAllRawMaterialIssuances(): Promise<RawMaterialIssuance[]>;
  getRawMaterialIssuance(id: string): Promise<RawMaterialIssuance | undefined>;
  updateRawMaterialIssuance(id: string, updates: Partial<InsertRawMaterialIssuance>): Promise<RawMaterialIssuance | undefined>;
  deleteRawMaterialIssuance(id: string): Promise<void>;
  getRawMaterialIssuancesByDate(date: Date): Promise<RawMaterialIssuance[]>;
  
  // Raw Material Issuance Items
  createRawMaterialIssuanceItem(item: InsertRawMaterialIssuanceItem): Promise<RawMaterialIssuanceItem>;
  getIssuanceItems(issuanceId: string): Promise<RawMaterialIssuanceItem[]>;
  updateRawMaterialIssuanceItem(id: string, updates: Partial<InsertRawMaterialIssuanceItem>): Promise<RawMaterialIssuanceItem | undefined>;
  deleteRawMaterialIssuanceItem(id: string): Promise<void>;
  
  // Gatepasses
  createGatepass(gatepass: InsertGatepass): Promise<Gatepass>;
  getAllGatepasses(): Promise<Gatepass[]>;
  getGatepass(id: string): Promise<Gatepass | undefined>;
  updateGatepass(id: string, updates: Partial<InsertGatepass>): Promise<Gatepass | undefined>;
  deleteGatepass(id: string): Promise<void>;
  getGatepassesByDate(date: Date): Promise<Gatepass[]>;
  getGatepassByNumber(gatepassNumber: string): Promise<Gatepass | undefined>;
  
  // Gatepass Items
  createGatepassItem(item: InsertGatepassItem): Promise<GatepassItem>;
  getGatepassItems(gatepassId: string): Promise<GatepassItem[]>;
  updateGatepassItem(id: string, updates: Partial<InsertGatepassItem>): Promise<GatepassItem | undefined>;
  deleteGatepassItem(id: string): Promise<void>;
  
  // Invoice Templates
  createInvoiceTemplate(template: InsertInvoiceTemplate): Promise<InvoiceTemplate>;
  getAllInvoiceTemplates(): Promise<InvoiceTemplate[]>;
  getActiveInvoiceTemplates(): Promise<InvoiceTemplate[]>;
  getDefaultInvoiceTemplate(): Promise<InvoiceTemplate | undefined>;
  getInvoiceTemplate(id: string): Promise<InvoiceTemplate | undefined>;
  updateInvoiceTemplate(id: string, updates: Partial<InsertInvoiceTemplate>): Promise<InvoiceTemplate | undefined>;
  deleteInvoiceTemplate(id: string): Promise<void>;
  setDefaultInvoiceTemplate(id: string): Promise<void>;
  
  // Terms & Conditions
  createTermsConditions(tc: InsertTermsConditions): Promise<TermsConditions>;
  getAllTermsConditions(): Promise<TermsConditions[]>;
  getActiveTermsConditions(): Promise<TermsConditions[]>;
  getDefaultTermsConditions(): Promise<TermsConditions | undefined>;
  getTermsConditions(id: string): Promise<TermsConditions | undefined>;
  updateTermsConditions(id: string, updates: Partial<InsertTermsConditions>): Promise<TermsConditions | undefined>;
  deleteTermsConditions(id: string): Promise<void>;
  setDefaultTermsConditions(id: string): Promise<void>;
  
  // Invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getAllInvoices(): Promise<Invoice[]>;
  getAvailableInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<void>;
  getInvoicesByDate(date: Date): Promise<Invoice[]>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  
  // Invoice Items
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  updateInvoiceItem(id: string, updates: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<void>;
  
  // GST Reports
  getInvoicesWithItemsByPeriod(startDate: Date, endDate: Date): Promise<InvoiceWithItems[]>;
  
  // Bank Master
  createBank(bank: InsertBank): Promise<Bank>;
  getAllBanks(): Promise<Bank[]>;
  getBank(id: string): Promise<Bank | undefined>;
  updateBank(id: string, updates: Partial<InsertBank>): Promise<Bank | undefined>;
  deleteBank(id: string): Promise<void>;
  getDefaultBank(): Promise<Bank | undefined>;
  setDefaultBank(id: string): Promise<void>;
  
  // Invoice Payments
  createPayment(payment: InsertInvoicePayment): Promise<InvoicePayment>;
  getAllPayments(): Promise<InvoicePayment[]>;
  getPayment(id: string): Promise<InvoicePayment | undefined>;
  getPaymentsByInvoice(invoiceId: string): Promise<InvoicePayment[]>;
  deletePayment(id: string): Promise<void>;
  
  // Checklist Assignments
  createChecklistAssignment(assignment: InsertChecklistAssignment): Promise<ChecklistAssignment>;
  getAllChecklistAssignments(): Promise<ChecklistAssignment[]>;
  getChecklistAssignment(id: string): Promise<ChecklistAssignment | undefined>;
  getChecklistAssignmentsByOperator(operatorId: string): Promise<ChecklistAssignment[]>;
  getChecklistAssignmentsByDate(date: string): Promise<ChecklistAssignment[]>;
  updateChecklistAssignment(id: string, updates: Partial<InsertChecklistAssignment>): Promise<ChecklistAssignment | undefined>;
  deleteChecklistAssignment(id: string): Promise<void>;
  
  // Checklist Submissions
  getAllChecklistSubmissions(): Promise<ChecklistSubmission[]>;
  getChecklistSubmission(id: string): Promise<ChecklistSubmission | undefined>;
  getChecklistSubmissionsByReviewer(reviewerId: string): Promise<ChecklistSubmission[]>;
  updateChecklistSubmission(id: string, updates: Partial<ChecklistSubmission>): Promise<ChecklistSubmission | undefined>;
  getSubmissionTasks(submissionId: string): Promise<SubmissionTask[]>;
  
  // Role Management
  createRole(role: InsertRole): Promise<Role>;
  getAllRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<void>;
  
  // Role Permissions Management
  createRolePermission(permission: InsertRolePermission): Promise<RolePermission>;
  getRolePermissions(roleId: string): Promise<RolePermission[]>;
  getAllRolePermissions(): Promise<RolePermission[]>;
  updateRolePermission(id: string, permission: Partial<InsertRolePermission>): Promise<RolePermission | undefined>;
  deleteRolePermission(id: string): Promise<void>;
  upsertRolePermissions(roleId: string, permissions: InsertRolePermission[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: (db as any)._.session.client,
      createTableIfMissing: true,
      errorLog: (error) => {
        if (error.message?.includes('already exists')) {
          return;
        }
        console.error('Session store error:', error);
      },
    });
  }

  async clearAllSessions(): Promise<void> {
    try {
      const pool = (db as any)._.session.client;
      await pool.query('DELETE FROM session');
      console.log('✅ All sessions cleared on server startup');
    } catch (error) {
      console.error('❌ Failed to clear sessions:', error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        roleId: users.roleId,
        role: roles.name,
        resetToken: users.resetToken,
        resetTokenExpiry: users.resetTokenExpiry,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, id), eq(users.recordStatus, 1)));
    return result as any;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        roleId: users.roleId,
        role: roles.name,
        resetToken: users.resetToken,
        resetTokenExpiry: users.resetTokenExpiry,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(or(eq(users.username, username), eq(users.email, username)), eq(users.recordStatus, 1)));
    
    return result as any;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, roleId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ roleId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUser(id: string, data: { firstName?: string; lastName?: string; email?: string; password?: string }): Promise<User | undefined> {
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<any[]> {
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        roleId: users.roleId,
        roleName: roles.name,
        recordStatus: users.recordStatus,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.recordStatus, 1));
    return results.map(r => ({
      ...r,
      role: r.roleName || 'operator'
    }));
  }

  async deleteUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.recordStatus, 1)));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.resetToken, token), eq(users.recordStatus, 1)));
    return user;
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ resetToken: token, resetTokenExpiry: expiry, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        resetToken: null, 
        resetTokenExpiry: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async getUserRole(roleId: string): Promise<{ id: string; name: string } | undefined> {
    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.recordStatus, 1)));
    return role;
  }

  async getRoleByName(roleName: string): Promise<{ id: string; name: string } | undefined> {
    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(and(eq(roles.name, roleName), eq(roles.recordStatus, 1)));
    return role;
  }

  async createMachine(machine: InsertMachine): Promise<Machine> {
    const [created] = await db.insert(machines).values(machine).returning();
    return created;
  }

  async getAllMachines(): Promise<Machine[]> {
    return await db.select().from(machines).where(eq(machines.recordStatus, 1));
  }

  async getMachine(id: string): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(and(eq(machines.id, id), eq(machines.recordStatus, 1)));
    return machine;
  }

  async updateMachine(id: string, machine: Partial<InsertMachine>): Promise<Machine | undefined> {
    const [updated] = await db
      .update(machines)
      .set({ ...machine, updatedAt: new Date() })
      .where(and(eq(machines.id, id), eq(machines.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteMachine(id: string): Promise<void> {
    await db
      .update(machines)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(machines.id, id));
  }

  async createChecklistTemplate(
    template: { name: string; machineId?: string; shiftTypes?: string[]; createdBy?: string },
    tasks: { taskName: string; verificationCriteria?: string; orderIndex: number }[]
  ): Promise<ChecklistTemplate> {
    const [created] = await db.insert(checklistTemplates).values(template).returning();
    console.log(`Created checklist template ${created.id} with ${tasks.length} tasks`);
    
    if (tasks.length > 0) {
      const tasksToInsert = tasks.map(task => ({
        ...task,
        templateId: created.id,
      }));
      console.log("Inserting template tasks:", JSON.stringify(tasksToInsert, null, 2));
      
      try {
        const insertedTasks = await db.insert(templateTasks).values(tasksToInsert).returning();
        console.log(`Successfully inserted ${insertedTasks.length} template tasks`);
      } catch (error) {
        console.error("Failed to insert template tasks:", error);
        throw new Error(`Failed to insert template tasks: ${(error as Error).message}`);
      }
    }
    
    return created;
  }

  async getAllChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return await db.select().from(checklistTemplates).where(eq(checklistTemplates.recordStatus, 1));
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db.select().from(checklistTemplates).where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.recordStatus, 1)));
    return template;
  }

  async getTemplateTasks(templateId: string): Promise<TemplateTask[]> {
    return await db.select().from(templateTasks).where(eq(templateTasks.templateId, templateId));
  }

  async deleteChecklistTemplate(id: string): Promise<void> {
    await db
      .update(checklistTemplates)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(checklistTemplates.id, id));
  }

  async createSparePart(sparePart: { partName: string; partNumber?: string; category?: string; machineId?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }): Promise<SparePartCatalog> {
    const [created] = await db.insert(sparePartsCatalog).values(sparePart).returning();
    return created;
  }

  async getAllSpareParts(): Promise<SparePartCatalog[]> {
    return await db.select().from(sparePartsCatalog).where(eq(sparePartsCatalog.recordStatus, 1));
  }

  async getSparePart(id: string): Promise<SparePartCatalog | undefined> {
    const [spare] = await db.select().from(sparePartsCatalog).where(and(eq(sparePartsCatalog.id, id), eq(sparePartsCatalog.recordStatus, 1)));
    return spare;
  }

  async updateSparePart(id: string, sparePart: Partial<{ partName: string; partNumber?: string; category?: string; machineId?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }>): Promise<SparePartCatalog | undefined> {
    const [updated] = await db
      .update(sparePartsCatalog)
      .set({ ...sparePart, updatedAt: new Date() })
      .where(and(eq(sparePartsCatalog.id, id), eq(sparePartsCatalog.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteSparePart(id: string): Promise<void> {
    await db
      .update(sparePartsCatalog)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(sparePartsCatalog.id, id));
  }

  async createMachineType(machineType: InsertMachineType): Promise<MachineType> {
    const [created] = await db.insert(machineTypes).values(machineType).returning();
    return created;
  }

  async getAllMachineTypes(): Promise<MachineType[]> {
    return await db.select().from(machineTypes).where(eq(machineTypes.recordStatus, 1));
  }

  async getMachineType(id: string): Promise<MachineType | undefined> {
    const [type] = await db.select().from(machineTypes).where(and(eq(machineTypes.id, id), eq(machineTypes.recordStatus, 1)));
    return type;
  }

  async updateMachineType(id: string, machineType: Partial<InsertMachineType>): Promise<MachineType | undefined> {
    const [updated] = await db
      .update(machineTypes)
      .set({ ...machineType, updatedAt: new Date() })
      .where(and(eq(machineTypes.id, id), eq(machineTypes.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteMachineType(id: string): Promise<void> {
    await db
      .update(machineTypes)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(machineTypes.id, id));
  }

  async createMachineSpare(machineSpare: InsertMachineSpare): Promise<MachineSpare> {
    const [created] = await db.insert(machineSpares).values(machineSpare).returning();
    return created;
  }

  async getMachineSpares(machineId: string): Promise<MachineSpare[]> {
    return await db.select().from(machineSpares).where(eq(machineSpares.machineId, machineId));
  }

  async getSparePartMachines(sparePartId: string): Promise<MachineSpare[]> {
    return await db.select().from(machineSpares).where(eq(machineSpares.sparePartId, sparePartId));
  }

  async getMachineSpareParts(machineId: string): Promise<SparePartCatalog[]> {
    const result = await db
      .select({
        id: sparePartsCatalog.id,
        partName: sparePartsCatalog.partName,
        partNumber: sparePartsCatalog.partNumber,
        category: sparePartsCatalog.category,
        unitPrice: sparePartsCatalog.unitPrice,
        reorderThreshold: sparePartsCatalog.reorderThreshold,
        currentStock: sparePartsCatalog.currentStock,
        recordStatus: sparePartsCatalog.recordStatus,
        machineId: sparePartsCatalog.machineId,
        createdAt: sparePartsCatalog.createdAt,
        updatedAt: sparePartsCatalog.updatedAt,
      })
      .from(machineSpares)
      .innerJoin(sparePartsCatalog, eq(machineSpares.sparePartId, sparePartsCatalog.id))
      .where(and(eq(machineSpares.machineId, machineId), eq(sparePartsCatalog.recordStatus, 1)));
    return result;
  }

  async deleteMachineSpare(id: string): Promise<void> {
    await db.delete(machineSpares).where(eq(machineSpares.id, id));
  }

  async createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    // Generate unique PO number based on timestamp
    const poNumber = `PO-${Date.now()}`;
    const [created] = await db.insert(purchaseOrders).values({
      ...purchaseOrder,
      poNumber
    }).returning();
    return created;
  }

  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders).where(eq(purchaseOrders.recordStatus, 1));
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.recordStatus, 1)));
    return po;
  }

  async updatePurchaseOrder(id: string, purchaseOrder: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [updated] = await db
      .update(purchaseOrders)
      .set({ ...purchaseOrder, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db
      .update(purchaseOrders)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id));
  }

  async createMaintenancePlan(plan: InsertMaintenancePlan): Promise<MaintenancePlan> {
    const [created] = await db.insert(maintenancePlans).values(plan).returning();
    return created;
  }

  async getAllMaintenancePlans(): Promise<MaintenancePlan[]> {
    return await db.select().from(maintenancePlans).where(eq(maintenancePlans.recordStatus, 1));
  }

  async getMaintenancePlan(id: string): Promise<MaintenancePlan | undefined> {
    const [plan] = await db.select().from(maintenancePlans).where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.recordStatus, 1)));
    return plan;
  }

  async updateMaintenancePlan(id: string, plan: Partial<InsertMaintenancePlan>): Promise<MaintenancePlan | undefined> {
    const [updated] = await db
      .update(maintenancePlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteMaintenancePlan(id: string): Promise<void> {
    await db
      .update(maintenancePlans)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(maintenancePlans.id, id));
  }

  async createPMTaskListTemplate(template: InsertPMTaskListTemplate, tasks: InsertPMTemplateTask[]): Promise<PMTaskListTemplate> {
    const [created] = await db.insert(pmTaskListTemplates).values(template).returning();
    
    if (tasks.length > 0) {
      await db.insert(pmTemplateTasks).values(
        tasks.map(task => ({
          ...task,
          templateId: created.id,
        }))
      );
    }
    
    return created;
  }

  async getAllPMTaskListTemplates(): Promise<PMTaskListTemplate[]> {
    return await db.select().from(pmTaskListTemplates).where(eq(pmTaskListTemplates.recordStatus, 1));
  }

  async getPMTaskListTemplate(id: string): Promise<PMTaskListTemplate | undefined> {
    const [template] = await db.select().from(pmTaskListTemplates).where(and(eq(pmTaskListTemplates.id, id), eq(pmTaskListTemplates.recordStatus, 1)));
    return template;
  }

  async getPMTemplateTasks(templateId: string): Promise<PMTemplateTask[]> {
    return await db.select().from(pmTemplateTasks).where(eq(pmTemplateTasks.templateId, templateId));
  }

  async updatePMTaskListTemplate(id: string, template: Partial<InsertPMTaskListTemplate>): Promise<PMTaskListTemplate | undefined> {
    const [updated] = await db
      .update(pmTaskListTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(pmTaskListTemplates.id, id), eq(pmTaskListTemplates.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deletePMTaskListTemplate(id: string): Promise<void> {
    await db
      .update(pmTaskListTemplates)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(pmTaskListTemplates.id, id));
  }

  async createPMExecution(execution: InsertPMExecution, tasks: InsertPMExecutionTask[]): Promise<PMExecution> {
    const [created] = await db.insert(pmExecutions).values(execution).returning();
    
    if (tasks.length > 0) {
      await db.insert(pmExecutionTasks).values(
        tasks.map(task => ({
          ...task,
          executionId: created.id,
        }))
      );
    }
    
    return created;
  }

  async getAllPMExecutions(): Promise<PMExecution[]> {
    return await db.select().from(pmExecutions);
  }

  async getPMExecution(id: string): Promise<PMExecution | undefined> {
    const [execution] = await db.select().from(pmExecutions).where(eq(pmExecutions.id, id));
    return execution;
  }

  async getPMExecutionTasks(executionId: string): Promise<PMExecutionTask[]> {
    return await db.select().from(pmExecutionTasks).where(eq(pmExecutionTasks.executionId, executionId));
  }

  async getPMExecutionsByPlan(planId: string): Promise<PMExecution[]> {
    return await db.select().from(pmExecutions).where(eq(pmExecutions.maintenancePlanId, planId));
  }

  // UOM Management
  async createUom(uomData: InsertUom): Promise<Uom> {
    const [created] = await db.insert(uom).values(uomData).returning();
    return created;
  }

  async getAllUoms(): Promise<Uom[]> {
    return await db.select().from(uom).where(eq(uom.recordStatus, 1));
  }

  async getUom(id: string): Promise<Uom | undefined> {
    const [result] = await db.select().from(uom).where(and(eq(uom.id, id), eq(uom.recordStatus, 1)));
    return result;
  }

  async updateUom(id: string, uomData: Partial<InsertUom>): Promise<Uom | undefined> {
    const [updated] = await db
      .update(uom)
      .set({ ...uomData, updatedAt: new Date() })
      .where(and(eq(uom.id, id), eq(uom.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteUom(id: string): Promise<void> {
    await db
      .update(uom)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(uom.id, id));
  }

  // Product Master
  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.recordStatus, 1));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.recordStatus, 1)));
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db
      .update(products)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  // Vendor Master
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(vendor).returning();
    return created;
  }

  async getAllVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.recordStatus, 1));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(and(eq(vendors.id, id), eq(vendors.recordStatus, 1)));
    return vendor;
  }

  async updateVendor(id: string, vendorData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db
      .update(vendors)
      .set({ ...vendorData, updatedAt: new Date() })
      .where(and(eq(vendors.id, id), eq(vendors.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteVendor(id: string): Promise<void> {
    await db
      .update(vendors)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(vendors.id, id));
  }

  // Raw Materials/Inventory
  async createRawMaterial(material: InsertRawMaterial): Promise<RawMaterial> {
    const [created] = await db.insert(rawMaterials).values(material).returning();
    return created;
  }

  async getAllRawMaterials(): Promise<RawMaterial[]> {
    return await db.select().from(rawMaterials).where(eq(rawMaterials.recordStatus, 1));
  }

  async getRawMaterial(id: string): Promise<RawMaterial | undefined> {
    const [material] = await db.select().from(rawMaterials).where(and(eq(rawMaterials.id, id), eq(rawMaterials.recordStatus, 1)));
    return material;
  }

  async updateRawMaterial(id: string, materialData: Partial<InsertRawMaterial>): Promise<RawMaterial | undefined> {
    const [updated] = await db
      .update(rawMaterials)
      .set({ ...materialData, updatedAt: new Date() })
      .where(and(eq(rawMaterials.id, id), eq(rawMaterials.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRawMaterial(id: string): Promise<void> {
    await db
      .update(rawMaterials)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(rawMaterials.id, id));
  }

  // Raw Material Transactions
  async createRawMaterialTransaction(transaction: InsertRawMaterialTransaction): Promise<RawMaterialTransaction> {
    const [created] = await db.insert(rawMaterialTransactions).values(transaction).returning();
    
    // Update the material's current stock
    const material = await this.getRawMaterial(transaction.materialId);
    if (material) {
      const stockChange = transaction.transactionType === 'receipt' ? transaction.quantity : -transaction.quantity;
      await db
        .update(rawMaterials)
        .set({ currentStock: (material.currentStock || 0) + stockChange })
        .where(eq(rawMaterials.id, transaction.materialId));
    }
    
    return created;
  }

  async getRawMaterialTransactions(materialId: string): Promise<RawMaterialTransaction[]> {
    return await db.select().from(rawMaterialTransactions).where(eq(rawMaterialTransactions.materialId, materialId));
  }

  // Finished Goods
  async createFinishedGood(finishedGood: InsertFinishedGood): Promise<FinishedGood> {
    const [created] = await db.insert(finishedGoods).values(finishedGood).returning();
    return created;
  }

  async getAllFinishedGoods(): Promise<FinishedGood[]> {
    return await db.select().from(finishedGoods).where(eq(finishedGoods.recordStatus, 1));
  }

  async getFinishedGood(id: string): Promise<FinishedGood | undefined> {
    const [good] = await db.select().from(finishedGoods).where(and(eq(finishedGoods.id, id), eq(finishedGoods.recordStatus, 1)));
    return good;
  }

  async updateFinishedGood(id: string, finishedGoodData: Partial<InsertFinishedGood>): Promise<FinishedGood | undefined> {
    const [updated] = await db
      .update(finishedGoods)
      .set({ ...finishedGoodData, updatedAt: new Date() })
      .where(and(eq(finishedGoods.id, id), eq(finishedGoods.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteFinishedGood(id: string): Promise<void> {
    await db
      .update(finishedGoods)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(finishedGoods.id, id));
  }

  async getFinishedGoodsByProduct(productId: string): Promise<FinishedGood[]> {
    return await db.select().from(finishedGoods).where(and(eq(finishedGoods.productId, productId), eq(finishedGoods.recordStatus, 1)));
  }

  // Raw Material Issuance
  async createRawMaterialIssuance(issuance: InsertRawMaterialIssuance): Promise<RawMaterialIssuance> {
    const [created] = await db.insert(rawMaterialIssuance).values(issuance).returning();
    return created;
  }

  async getAllRawMaterialIssuances(): Promise<RawMaterialIssuance[]> {
    return await db.select().from(rawMaterialIssuance).where(eq(rawMaterialIssuance.recordStatus, 1));
  }

  async getRawMaterialIssuance(id: string): Promise<RawMaterialIssuance | undefined> {
    const [result] = await db.select().from(rawMaterialIssuance).where(and(eq(rawMaterialIssuance.id, id), eq(rawMaterialIssuance.recordStatus, 1)));
    return result;
  }

  async updateRawMaterialIssuance(id: string, updates: Partial<InsertRawMaterialIssuance>): Promise<RawMaterialIssuance | undefined> {
    const [updated] = await db.update(rawMaterialIssuance).set(updates).where(and(eq(rawMaterialIssuance.id, id), eq(rawMaterialIssuance.recordStatus, 1))).returning();
    return updated;
  }

  async deleteRawMaterialIssuance(id: string): Promise<void> {
    await db.update(rawMaterialIssuance).set({ recordStatus: 0 }).where(eq(rawMaterialIssuance.id, id));
  }

  async getRawMaterialIssuancesByDate(date: Date): Promise<RawMaterialIssuance[]> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    return await db.select().from(rawMaterialIssuance).where(
      and(
        eq(rawMaterialIssuance.recordStatus, 1)
      )
    );
  }

  // Gatepasses
  async createGatepass(gatepass: InsertGatepass): Promise<Gatepass> {
    const [created] = await db.insert(gatepasses).values(gatepass).returning();
    return created;
  }

  async getAllGatepasses(): Promise<Gatepass[]> {
    return await db.select().from(gatepasses).where(eq(gatepasses.recordStatus, 1));
  }

  async getGatepass(id: string): Promise<Gatepass | undefined> {
    const [result] = await db.select().from(gatepasses).where(and(eq(gatepasses.id, id), eq(gatepasses.recordStatus, 1)));
    return result;
  }

  async updateGatepass(id: string, updates: Partial<InsertGatepass>): Promise<Gatepass | undefined> {
    const [updated] = await db.update(gatepasses).set(updates).where(and(eq(gatepasses.id, id), eq(gatepasses.recordStatus, 1))).returning();
    return updated;
  }

  async deleteGatepass(id: string): Promise<void> {
    await db.update(gatepasses).set({ recordStatus: 0 }).where(eq(gatepasses.id, id));
  }

  async getGatepassesByDate(date: Date): Promise<Gatepass[]> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    return await db.select().from(gatepasses).where(
      and(
        eq(gatepasses.recordStatus, 1)
      )
    );
  }

  async getGatepassByNumber(gatepassNumber: string): Promise<Gatepass | undefined> {
    const [result] = await db.select().from(gatepasses).where(and(eq(gatepasses.gatepassNumber, gatepassNumber), eq(gatepasses.recordStatus, 1)));
    return result;
  }

  // Raw Material Issuance Items
  async createRawMaterialIssuanceItem(item: InsertRawMaterialIssuanceItem): Promise<RawMaterialIssuanceItem> {
    const [created] = await db.insert(rawMaterialIssuanceItems).values(item).returning();
    return created;
  }

  async getIssuanceItems(issuanceId: string): Promise<RawMaterialIssuanceItem[]> {
    return await db.select().from(rawMaterialIssuanceItems).where(
      and(
        eq(rawMaterialIssuanceItems.issuanceId, issuanceId),
        eq(rawMaterialIssuanceItems.recordStatus, 1)
      )
    );
  }

  async updateRawMaterialIssuanceItem(id: string, updates: Partial<InsertRawMaterialIssuanceItem>): Promise<RawMaterialIssuanceItem | undefined> {
    const [updated] = await db
      .update(rawMaterialIssuanceItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(rawMaterialIssuanceItems.id, id), eq(rawMaterialIssuanceItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRawMaterialIssuanceItem(id: string): Promise<void> {
    await db.update(rawMaterialIssuanceItems).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(rawMaterialIssuanceItems.id, id));
  }

  // Gatepass Items
  async createGatepassItem(item: InsertGatepassItem): Promise<GatepassItem> {
    const [created] = await db.insert(gatepassItems).values(item).returning();
    return created;
  }

  async getGatepassItems(gatepassId: string): Promise<GatepassItem[]> {
    return await db.select().from(gatepassItems).where(
      and(
        eq(gatepassItems.gatepassId, gatepassId),
        eq(gatepassItems.recordStatus, 1)
      )
    );
  }

  async updateGatepassItem(id: string, updates: Partial<InsertGatepassItem>): Promise<GatepassItem | undefined> {
    const [updated] = await db
      .update(gatepassItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(gatepassItems.id, id), eq(gatepassItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteGatepassItem(id: string): Promise<void> {
    await db.update(gatepassItems).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(gatepassItems.id, id));
  }

  // Invoice Templates
  async createInvoiceTemplate(template: InsertInvoiceTemplate): Promise<InvoiceTemplate> {
    const [newTemplate] = await db.insert(invoiceTemplates).values(template).returning();
    return newTemplate;
  }

  async getAllInvoiceTemplates(): Promise<InvoiceTemplate[]> {
    return await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.recordStatus, 1));
  }

  async getActiveInvoiceTemplates(): Promise<InvoiceTemplate[]> {
    return await db.select().from(invoiceTemplates).where(
      and(eq(invoiceTemplates.recordStatus, 1), eq(invoiceTemplates.isActive, 1))
    );
  }

  async getDefaultInvoiceTemplate(): Promise<InvoiceTemplate | undefined> {
    const [template] = await db.select().from(invoiceTemplates).where(
      and(
        eq(invoiceTemplates.recordStatus, 1),
        eq(invoiceTemplates.isDefault, 1),
        eq(invoiceTemplates.isActive, 1)
      )
    );
    return template;
  }

  async getInvoiceTemplate(id: string): Promise<InvoiceTemplate | undefined> {
    const [template] = await db.select().from(invoiceTemplates).where(
      and(eq(invoiceTemplates.id, id), eq(invoiceTemplates.recordStatus, 1))
    );
    return template;
  }

  async updateInvoiceTemplate(id: string, updates: Partial<InsertInvoiceTemplate>): Promise<InvoiceTemplate | undefined> {
    const [updated] = await db.update(invoiceTemplates).set({ ...updates, updatedAt: new Date() }).where(eq(invoiceTemplates.id, id)).returning();
    return updated;
  }

  async deleteInvoiceTemplate(id: string): Promise<void> {
    await db.update(invoiceTemplates).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(invoiceTemplates.id, id));
  }

  async setDefaultInvoiceTemplate(id: string): Promise<void> {
    // First, unset all defaults
    await db.update(invoiceTemplates).set({ isDefault: 0, updatedAt: new Date() });
    // Then set the new default
    await db.update(invoiceTemplates).set({ isDefault: 1, updatedAt: new Date() }).where(eq(invoiceTemplates.id, id));
  }

  // Terms & Conditions
  async createTermsConditions(tc: InsertTermsConditions): Promise<TermsConditions> {
    const [newTC] = await db.insert(termsConditions).values(tc).returning();
    return newTC;
  }

  async getAllTermsConditions(): Promise<TermsConditions[]> {
    return await db.select().from(termsConditions).where(eq(termsConditions.recordStatus, 1));
  }

  async getActiveTermsConditions(): Promise<TermsConditions[]> {
    return await db.select().from(termsConditions).where(
      and(eq(termsConditions.recordStatus, 1), eq(termsConditions.isActive, 1))
    );
  }

  async getDefaultTermsConditions(): Promise<TermsConditions | undefined> {
    const [tc] = await db.select().from(termsConditions).where(
      and(
        eq(termsConditions.recordStatus, 1),
        eq(termsConditions.isDefault, 1),
        eq(termsConditions.isActive, 1)
      )
    );
    return tc;
  }

  async getTermsConditions(id: string): Promise<TermsConditions | undefined> {
    const [tc] = await db.select().from(termsConditions).where(
      and(eq(termsConditions.id, id), eq(termsConditions.recordStatus, 1))
    );
    return tc;
  }

  async updateTermsConditions(id: string, updates: Partial<InsertTermsConditions>): Promise<TermsConditions | undefined> {
    const [updated] = await db.update(termsConditions).set({ ...updates, updatedAt: new Date() }).where(eq(termsConditions.id, id)).returning();
    return updated;
  }

  async deleteTermsConditions(id: string): Promise<void> {
    await db.update(termsConditions).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(termsConditions.id, id));
  }

  async setDefaultTermsConditions(id: string): Promise<void> {
    // First, unset all defaults
    await db.update(termsConditions).set({ isDefault: 0, updatedAt: new Date() });
    // Then set the new default
    await db.update(termsConditions).set({ isDefault: 1, updatedAt: new Date() }).where(eq(termsConditions.id, id));
  }

  // Invoices
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.recordStatus, 1));
  }

  async getAvailableInvoices(): Promise<Invoice[]> {
    // Get invoices that are not linked to any ACTIVE gatepass (recordStatus = 1)
    // Invoices linked to deleted gatepasses (recordStatus = 0) are available for reuse
    const usedInvoiceIds = await db
      .select({ invoiceId: gatepasses.invoiceId })
      .from(gatepasses)
      .where(
        and(
          eq(gatepasses.recordStatus, 1), // Only active gatepasses
          isNotNull(gatepasses.invoiceId)
        )
      );
    
    const usedIds = usedInvoiceIds.map(row => row.invoiceId).filter((id): id is string => id !== null);
    
    if (usedIds.length === 0) {
      // No active gatepasses using any invoices - all invoices are available
      return await db.select().from(invoices).where(eq(invoices.recordStatus, 1));
    }
    
    return await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.recordStatus, 1),
          notInArray(invoices.id, usedIds)
        )
      );
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.recordStatus, 1)));
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ ...updates, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.update(invoices).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(invoices.id, id));
  }

  async getInvoicesByDate(date: Date): Promise<Invoice[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.select().from(invoices).where(
      and(
        eq(invoices.recordStatus, 1),
        eq(invoices.invoiceDate, date)
      )
    );
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.invoiceNumber, invoiceNumber), eq(invoices.recordStatus, 1)));
    return invoice;
  }


  // Invoice Items
  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(and(eq(invoiceItems.invoiceId, invoiceId), eq(invoiceItems.recordStatus, 1)));
  }

  async updateInvoiceItem(id: string, updates: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const [updated] = await db.update(invoiceItems).set({ ...updates, updatedAt: new Date() }).where(eq(invoiceItems.id, id)).returning();
    return updated;
  }

  async deleteInvoiceItem(id: string): Promise<void> {
    await db.update(invoiceItems).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(invoiceItems.id, id));
  }

  // GST Reports
  async getInvoicesWithItemsByPeriod(startDate: Date, endDate: Date): Promise<InvoiceWithItems[]> {
    // Fetch all active invoices in the period
    const invoicesInPeriod = await db.select().from(invoices).where(
      and(
        eq(invoices.recordStatus, 1),
        gte(invoices.invoiceDate, startDate),
        lte(invoices.invoiceDate, endDate)
      )
    );
    
    // Fetch items for each invoice
    const invoicesWithItems: InvoiceWithItems[] = [];
    for (const invoice of invoicesInPeriod) {
      const items = await this.getInvoiceItems(invoice.id);
      invoicesWithItems.push({
        invoice,
        items,
      });
    }
    
    return invoicesWithItems;
  }

  // Bank Master
  async createBank(bank: InsertBank): Promise<Bank> {
    const [newBank] = await db.insert(banks).values(bank).returning();
    return newBank;
  }

  async getAllBanks(): Promise<Bank[]> {
    return await db.select().from(banks).where(eq(banks.recordStatus, 1));
  }

  async getBank(id: string): Promise<Bank | undefined> {
    const [bank] = await db.select().from(banks).where(and(eq(banks.id, id), eq(banks.recordStatus, 1)));
    return bank;
  }

  async updateBank(id: string, updates: Partial<InsertBank>): Promise<Bank | undefined> {
    const [updated] = await db.update(banks).set({ ...updates, updatedAt: new Date() }).where(eq(banks.id, id)).returning();
    return updated;
  }

  async deleteBank(id: string): Promise<void> {
    await db.update(banks).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(banks.id, id));
  }

  async getDefaultBank(): Promise<Bank | undefined> {
    const [bank] = await db.select().from(banks).where(and(eq(banks.isDefault, 1), eq(banks.recordStatus, 1)));
    return bank;
  }

  async setDefaultBank(id: string): Promise<void> {
    // Reset all banks to non-default
    await db.update(banks).set({ isDefault: 0, updatedAt: new Date() }).where(eq(banks.recordStatus, 1));
    // Set the selected bank as default
    await db.update(banks).set({ isDefault: 1, updatedAt: new Date() }).where(eq(banks.id, id));
  }

  // Invoice Payments
  async createPayment(payment: InsertInvoicePayment): Promise<InvoicePayment> {
    const [newPayment] = await db.insert(invoicePayments).values(payment).returning();
    return newPayment;
  }

  async getAllPayments(): Promise<InvoicePayment[]> {
    return await db.select().from(invoicePayments).where(eq(invoicePayments.recordStatus, 1));
  }

  async getPayment(id: string): Promise<InvoicePayment | undefined> {
    const [payment] = await db.select().from(invoicePayments).where(and(eq(invoicePayments.id, id), eq(invoicePayments.recordStatus, 1)));
    return payment;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<any[]> {
    const results = await db
      .select({
        id: invoicePayments.id,
        invoiceId: invoicePayments.invoiceId,
        paymentDate: invoicePayments.paymentDate,
        amount: invoicePayments.amount,
        paymentMethod: invoicePayments.paymentMethod,
        referenceNumber: invoicePayments.referenceNumber,
        paymentType: invoicePayments.paymentType,
        bankName: invoicePayments.bankName,
        remarks: invoicePayments.remarks,
        recordedBy: invoicePayments.recordedBy,
        recordedByName: users.firstName,
        recordedByLastName: users.lastName,
        recordStatus: invoicePayments.recordStatus,
        createdAt: invoicePayments.createdAt,
        updatedAt: invoicePayments.updatedAt,
      })
      .from(invoicePayments)
      .leftJoin(users, eq(invoicePayments.recordedBy, users.id))
      .where(and(eq(invoicePayments.invoiceId, invoiceId), eq(invoicePayments.recordStatus, 1)));
    
    return results.map(r => ({
      ...r,
      recordedByFullName: r.recordedByName && r.recordedByLastName 
        ? `${r.recordedByName} ${r.recordedByLastName}`
        : 'System',
    }));
  }

  async deletePayment(id: string): Promise<void> {
    await db.update(invoicePayments).set({ recordStatus: 0, updatedAt: new Date() }).where(eq(invoicePayments.id, id));
  }

  // Role Management
  async createRole(roleData: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(roleData).returning();
    return created;
  }

  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.recordStatus, 1));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(and(eq(roles.id, id), eq(roles.recordStatus, 1)));
    return role;
  }

  async updateRole(id: string, roleData: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db
      .update(roles)
      .set({ ...roleData, updatedAt: new Date() })
      .where(and(eq(roles.id, id), eq(roles.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    await db
      .update(roles)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(roles.id, id));
  }

  // Role Permissions Management
  async createRolePermission(permissionData: InsertRolePermission): Promise<RolePermission> {
    const [created] = await db.insert(rolePermissions).values(permissionData).returning();
    return created;
  }

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.recordStatus, 1)));
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).where(eq(rolePermissions.recordStatus, 1));
  }

  async updateRolePermission(id: string, permissionData: Partial<InsertRolePermission>): Promise<RolePermission | undefined> {
    const [updated] = await db
      .update(rolePermissions)
      .set({ ...permissionData, updatedAt: new Date() })
      .where(and(eq(rolePermissions.id, id), eq(rolePermissions.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRolePermission(id: string): Promise<void> {
    await db
      .update(rolePermissions)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(rolePermissions.id, id));
  }

  async upsertRolePermissions(roleId: string, permissions: InsertRolePermission[]): Promise<void> {
    // Soft delete existing permissions for this role
    await db
      .update(rolePermissions)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(rolePermissions.roleId, roleId));
    
    // Insert new permissions
    if (permissions.length > 0) {
      await db.insert(rolePermissions).values(permissions.map(p => ({ ...p, roleId })));
    }
  }

  // Checklist Assignments
  async createChecklistAssignment(assignmentData: InsertChecklistAssignment): Promise<ChecklistAssignment> {
    const [created] = await db.insert(checklistAssignments).values(assignmentData).returning();
    return created;
  }

  async getAllChecklistAssignments(): Promise<ChecklistAssignment[]> {
    return await db.select().from(checklistAssignments).where(eq(checklistAssignments.recordStatus, 1));
  }

  async getChecklistAssignment(id: string): Promise<ChecklistAssignment | undefined> {
    const [assignment] = await db.select().from(checklistAssignments).where(and(eq(checklistAssignments.id, id), eq(checklistAssignments.recordStatus, 1)));
    return assignment;
  }

  async getChecklistAssignmentsByOperator(operatorId: string): Promise<ChecklistAssignment[]> {
    return await db.select().from(checklistAssignments)
      .where(and(eq(checklistAssignments.operatorId, operatorId), eq(checklistAssignments.recordStatus, 1)));
  }

  async getChecklistAssignmentsByDate(date: string): Promise<ChecklistAssignment[]> {
    return await db.select().from(checklistAssignments)
      .where(and(eq(checklistAssignments.assignedDate, date), eq(checklistAssignments.recordStatus, 1)));
  }

  async updateChecklistAssignment(id: string, updates: Partial<InsertChecklistAssignment>): Promise<ChecklistAssignment | undefined> {
    const [updated] = await db
      .update(checklistAssignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(checklistAssignments.id, id), eq(checklistAssignments.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteChecklistAssignment(id: string): Promise<void> {
    await db
      .update(checklistAssignments)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(checklistAssignments.id, id));
  }

  // Checklist Submissions
  async getAllChecklistSubmissions(): Promise<ChecklistSubmission[]> {
    return await db.select().from(checklistSubmissions);
  }

  async getChecklistSubmission(id: string): Promise<ChecklistSubmission | undefined> {
    const [submission] = await db.select().from(checklistSubmissions).where(eq(checklistSubmissions.id, id));
    return submission;
  }

  async getChecklistSubmissionsByReviewer(reviewerId: string): Promise<ChecklistSubmission[]> {
    return await db.select().from(checklistSubmissions)
      .where(eq(checklistSubmissions.reviewerId, reviewerId));
  }

  async updateChecklistSubmission(id: string, updates: Partial<ChecklistSubmission>): Promise<ChecklistSubmission | undefined> {
    const [updated] = await db
      .update(checklistSubmissions)
      .set(updates)
      .where(eq(checklistSubmissions.id, id))
      .returning();
    return updated;
  }

  async getSubmissionTasks(submissionId: string): Promise<SubmissionTask[]> {
    return await db.select().from(submissionTasks).where(eq(submissionTasks.submissionId, submissionId));
  }

  async getMissedChecklistAssignments(): Promise<ChecklistAssignment[]> {
    const now = new Date();
    const assignments = await db.select().from(checklistAssignments)
      .where(and(
        eq(checklistAssignments.status, 'pending'),
        eq(checklistAssignments.missedNotificationSent, 0),
        eq(checklistAssignments.recordStatus, 1)
      ));
    
    // Filter assignments where dueDateTime is in the past
    return assignments.filter(a => a.dueDateTime && new Date(a.dueDateTime) < now);
  }

  async getUsersByRole(roleName: string): Promise<User[]> {
    const role = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
    if (!role || role.length === 0) {
      return [];
    }
    const roleId = role[0].id;
    return await db.select().from(users).where(and(
      eq(users.roleId, roleId),
      eq(users.recordStatus, 1)
    ));
  }

  // Machine Startup Tasks
  async createMachineStartupTask(task: InsertMachineStartupTask): Promise<MachineStartupTask> {
    const [created] = await db.insert(machineStartupTasks).values(task).returning();
    return created;
  }

  async getAllMachineStartupTasks(): Promise<MachineStartupTask[]> {
    return await db.select().from(machineStartupTasks).where(eq(machineStartupTasks.recordStatus, 1));
  }

  async getMachineStartupTask(id: string): Promise<MachineStartupTask | undefined> {
    const [task] = await db.select().from(machineStartupTasks).where(and(eq(machineStartupTasks.id, id), eq(machineStartupTasks.recordStatus, 1)));
    return task;
  }

  async getMachineStartupTaskByReference(taskReferenceId: string): Promise<MachineStartupTask | undefined> {
    const [task] = await db.select().from(machineStartupTasks)
      .where(and(
        eq(machineStartupTasks.taskReferenceId, taskReferenceId),
        eq(machineStartupTasks.recordStatus, 1)
      ));
    return task;
  }

  async getPendingStartupTasks(): Promise<MachineStartupTask[]> {
    return await db.select().from(machineStartupTasks)
      .where(and(
        eq(machineStartupTasks.status, 'pending'),
        eq(machineStartupTasks.recordStatus, 1)
      ));
  }

  async getStartupTasksByDate(date: string): Promise<MachineStartupTask[]> {
    return await db.select().from(machineStartupTasks)
      .where(and(
        eq(machineStartupTasks.productionDate, date),
        eq(machineStartupTasks.recordStatus, 1)
      ));
  }

  async getStartupTasksByUser(userId: string): Promise<MachineStartupTask[]> {
    return await db.select().from(machineStartupTasks)
      .where(and(
        eq(machineStartupTasks.assignedUserId, userId),
        eq(machineStartupTasks.recordStatus, 1)
      ));
  }

  async updateMachineStartupTask(id: string, updates: Partial<InsertMachineStartupTask> & { 
    status?: string; 
    notificationSentAt?: Date; 
    machineStartedAt?: Date;
    whatsappSent?: number;
    emailSent?: number;
    operatorResponse?: string;
    operatorResponseTime?: Date;
    responseStatus?: 'on_time' | 'late' | 'early' | 'no_response';
  }, onlyIfNotCompletedOrCancelled?: boolean): Promise<MachineStartupTask | undefined> {
    const conditions = [eq(machineStartupTasks.id, id), eq(machineStartupTasks.recordStatus, 1)];
    
    // Add condition to prevent overwriting completed/cancelled tasks
    if (onlyIfNotCompletedOrCancelled) {
      conditions.push(
        sql`${machineStartupTasks.status} NOT IN ('completed', 'cancelled')`
      );
    }

    const [updated] = await db
      .update(machineStartupTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return updated;
  }

  async deleteMachineStartupTask(id: string): Promise<void> {
    await db
      .update(machineStartupTasks)
      .set({ recordStatus: 0, updatedAt: new Date() })
      .where(eq(machineStartupTasks.id, id));
  }

  // Notification Configuration Methods
  async getNotificationConfig(): Promise<NotificationConfig | undefined> {
    // Return the first (and should be only) active config
    const [config] = await db.select().from(notificationConfig).where(eq(notificationConfig.recordStatus, 1)).limit(1);
    return config;
  }

  async createNotificationConfig(configData: InsertNotificationConfig): Promise<NotificationConfig> {
    const [created] = await db.insert(notificationConfig).values(configData).returning();
    return created;
  }

  async updateNotificationConfig(id: string, updates: Partial<InsertNotificationConfig>): Promise<NotificationConfig | undefined> {
    const [updated] = await db
      .update(notificationConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(notificationConfig.id, id), eq(notificationConfig.recordStatus, 1)))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
