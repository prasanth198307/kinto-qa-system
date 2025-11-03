import {
  users,
  machines,
  checklistTemplates,
  templateTasks,
  sparePartsCatalog,
  type User,
  type UpsertUser,
  type Machine,
  type InsertMachine,
  type ChecklistTemplate,
  type TemplateTask,
  type SparePartCatalog,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createMachine(machine: InsertMachine): Promise<Machine> {
    const [created] = await db.insert(machines).values(machine).returning();
    return created;
  }

  async getAllMachines(): Promise<Machine[]> {
    return await db.select().from(machines);
  }

  async getMachine(id: string): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.id, id));
    return machine;
  }

  async updateMachine(id: string, machine: Partial<InsertMachine>): Promise<Machine | undefined> {
    const [updated] = await db
      .update(machines)
      .set({ ...machine, updatedAt: new Date() })
      .where(eq(machines.id, id))
      .returning();
    return updated;
  }

  async deleteMachine(id: string): Promise<void> {
    await db.delete(machines).where(eq(machines.id, id));
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
    return await db.select().from(checklistTemplates);
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id));
    return template;
  }

  async getTemplateTasks(templateId: string): Promise<TemplateTask[]> {
    return await db.select().from(templateTasks).where(eq(templateTasks.templateId, templateId));
  }

  async deleteChecklistTemplate(id: string): Promise<void> {
    await db.delete(templateTasks).where(eq(templateTasks.templateId, id));
    await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
  }

  async createSparePart(sparePart: { partName: string; partNumber?: string; category?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }): Promise<SparePartCatalog> {
    const [created] = await db.insert(sparePartsCatalog).values(sparePart).returning();
    return created;
  }

  async getAllSpareParts(): Promise<SparePartCatalog[]> {
    return await db.select().from(sparePartsCatalog);
  }

  async getSparePart(id: string): Promise<SparePartCatalog | undefined> {
    const [spare] = await db.select().from(sparePartsCatalog).where(eq(sparePartsCatalog.id, id));
    return spare;
  }

  async updateSparePart(id: string, sparePart: Partial<{ partName: string; partNumber?: string; category?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }>): Promise<SparePartCatalog | undefined> {
    const [updated] = await db
      .update(sparePartsCatalog)
      .set({ ...sparePart, updatedAt: new Date() })
      .where(eq(sparePartsCatalog.id, id))
      .returning();
    return updated;
  }

  async deleteSparePart(id: string): Promise<void> {
    await db.delete(sparePartsCatalog).where(eq(sparePartsCatalog.id, id));
  }
}

export const storage = new DatabaseStorage();
