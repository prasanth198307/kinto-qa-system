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
  rawMaterials,
  rawMaterialTransactions,
  finishedGoods,
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
  type RawMaterial,
  type InsertRawMaterial,
  type RawMaterialTransaction,
  type InsertRawMaterialTransaction,
  type FinishedGood,
  type InsertFinishedGood,
  type Role,
  type InsertRole,
  type RolePermission,
  type InsertRolePermission,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  resetPassword(userId: string, hashedPassword: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  sessionStore: session.Store;
  
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
  
  createSparePart(sparePart: { partName: string; partNumber?: string; category?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }): Promise<SparePartCatalog>;
  getAllSpareParts(): Promise<SparePartCatalog[]>;
  getSparePart(id: string): Promise<SparePartCatalog | undefined>;
  updateSparePart(id: string, sparePart: Partial<{ partName: string; partNumber?: string; category?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }>): Promise<SparePartCatalog | undefined>;
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
      .where(and(eq(users.username, username), eq(users.recordStatus, 1)));
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.recordStatus, 1));
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
    
    if (tasks.length > 0) {
      await db.insert(templateTasks).values(
        tasks.map(task => ({
          ...task,
          templateId: created.id,
        }))
      );
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

  async createSparePart(sparePart: { partName: string; partNumber?: string; category?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }): Promise<SparePartCatalog> {
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

  async updateSparePart(id: string, sparePart: Partial<{ partName: string; partNumber?: string; category?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }>): Promise<SparePartCatalog | undefined> {
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
    const [created] = await db.insert(purchaseOrders).values(purchaseOrder).returning();
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
}

export const storage = new DatabaseStorage();
