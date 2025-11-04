import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMachineSchema, insertSparePartSchema, insertChecklistTemplateSchema, insertTemplateTaskSchema, insertMachineTypeSchema, insertMachineSpareSchema, insertPurchaseOrderSchema, insertMaintenancePlanSchema, insertPMTaskListTemplateSchema, insertPMTemplateTaskSchema, insertPMExecutionSchema, insertPMExecutionTaskSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/set-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!['admin', 'operator', 'reviewer', 'manager'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Users API
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'operator', 'reviewer', 'manager'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Machines API
  app.get('/api/machines', isAuthenticated, async (req: any, res) => {
    try {
      const machines = await storage.getAllMachines();
      res.json(machines);
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ message: "Failed to fetch machines" });
    }
  });

  app.post('/api/machines', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(validatedData);
      res.json(machine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating machine:", error);
      res.status(500).json({ message: "Failed to create machine" });
    }
  });

  app.get('/api/machines/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const machine = await storage.getMachine(id);
      if (!machine) {
        return res.status(404).json({ message: "Machine not found" });
      }
      res.json(machine);
    } catch (error) {
      console.error("Error fetching machine:", error);
      res.status(500).json({ message: "Failed to fetch machine" });
    }
  });

  app.patch('/api/machines/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMachineSchema.partial().parse(req.body);
      const machine = await storage.updateMachine(id, validatedData);
      if (!machine) {
        return res.status(404).json({ message: "Machine not found" });
      }
      res.json(machine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating machine:", error);
      res.status(500).json({ message: "Failed to update machine" });
    }
  });

  app.delete('/api/machines/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMachine(id);
      res.json({ message: "Machine deleted successfully" });
    } catch (error) {
      console.error("Error deleting machine:", error);
      res.status(500).json({ message: "Failed to delete machine" });
    }
  });

  // Checklist Templates API
  app.get('/api/checklist-templates', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getAllChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching checklist templates:", error);
      res.status(500).json({ message: "Failed to fetch checklist templates" });
    }
  });

  app.post('/api/checklist-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, machineId, shiftTypes, tasks } = req.body;
      
      const validatedTemplate = insertChecklistTemplateSchema.partial({ shiftTypes: true, isActive: true }).parse({
        name,
        machineId: machineId === 'none' ? undefined : machineId,
        shiftTypes: shiftTypes || undefined,
        createdBy: userId
      });
      
      const validatedTasks = tasks ? z.array(insertTemplateTaskSchema.omit({ templateId: true })).parse(tasks) : [];
      
      const cleanTemplate = {
        ...validatedTemplate,
        machineId: validatedTemplate.machineId ?? undefined,
        shiftTypes: validatedTemplate.shiftTypes ?? undefined,
        isActive: validatedTemplate.isActive ?? undefined,
        createdBy: validatedTemplate.createdBy ?? undefined
      };
      
      const cleanTasks = validatedTasks.map(task => ({
        taskName: task.taskName,
        verificationCriteria: task.verificationCriteria ?? undefined,
        orderIndex: task.orderIndex ?? 0
      }));
      
      const template = await storage.createChecklistTemplate(
        cleanTemplate,
        cleanTasks
      );
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating checklist template:", error);
      res.status(500).json({ message: "Failed to create checklist template" });
    }
  });

  app.get('/api/checklist-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getChecklistTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Checklist template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching checklist template:", error);
      res.status(500).json({ message: "Failed to fetch checklist template" });
    }
  });

  app.get('/api/checklist-templates/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tasks = await storage.getTemplateTasks(id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching template tasks:", error);
      res.status(500).json({ message: "Failed to fetch template tasks" });
    }
  });

  app.delete('/api/checklist-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChecklistTemplate(id);
      res.json({ message: "Checklist template deleted successfully" });
    } catch (error) {
      console.error("Error deleting checklist template:", error);
      res.status(500).json({ message: "Failed to delete checklist template" });
    }
  });

  // Spare Parts API
  app.get('/api/spare-parts', isAuthenticated, async (req: any, res) => {
    try {
      const spareParts = await storage.getAllSpareParts();
      res.json(spareParts);
    } catch (error) {
      console.error("Error fetching spare parts:", error);
      res.status(500).json({ message: "Failed to fetch spare parts" });
    }
  });

  app.post('/api/spare-parts', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertSparePartSchema.parse(req.body);
      const cleanData = {
        ...validatedData,
        partNumber: validatedData.partNumber ?? undefined,
        category: validatedData.category ?? undefined,
        unitPrice: validatedData.unitPrice ?? undefined,
        reorderThreshold: validatedData.reorderThreshold ?? undefined,
        currentStock: validatedData.currentStock ?? undefined
      };
      const sparePart = await storage.createSparePart(cleanData);
      res.json(sparePart);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating spare part:", error);
      res.status(500).json({ message: "Failed to create spare part" });
    }
  });

  app.get('/api/spare-parts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const sparePart = await storage.getSparePart(id);
      if (!sparePart) {
        return res.status(404).json({ message: "Spare part not found" });
      }
      res.json(sparePart);
    } catch (error) {
      console.error("Error fetching spare part:", error);
      res.status(500).json({ message: "Failed to fetch spare part" });
    }
  });

  app.patch('/api/spare-parts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSparePartSchema.partial().parse(req.body);
      const cleanData = {
        ...validatedData,
        partNumber: validatedData.partNumber ?? undefined,
        category: validatedData.category ?? undefined,
        unitPrice: validatedData.unitPrice ?? undefined,
        reorderThreshold: validatedData.reorderThreshold ?? undefined,
        currentStock: validatedData.currentStock ?? undefined
      };
      const sparePart = await storage.updateSparePart(id, cleanData);
      if (!sparePart) {
        return res.status(404).json({ message: "Spare part not found" });
      }
      res.json(sparePart);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating spare part:", error);
      res.status(500).json({ message: "Failed to update spare part" });
    }
  });

  app.delete('/api/spare-parts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSparePart(id);
      res.json({ message: "Spare part deleted successfully" });
    } catch (error) {
      console.error("Error deleting spare part:", error);
      res.status(500).json({ message: "Failed to delete spare part" });
    }
  });

  // Machine Types API
  app.get('/api/machine-types', isAuthenticated, async (req: any, res) => {
    try {
      const machineTypes = await storage.getAllMachineTypes();
      res.json(machineTypes);
    } catch (error) {
      console.error("Error fetching machine types:", error);
      res.status(500).json({ message: "Failed to fetch machine types" });
    }
  });

  app.post('/api/machine-types', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMachineTypeSchema.parse(req.body);
      const machineType = await storage.createMachineType(validatedData);
      res.json(machineType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating machine type:", error);
      res.status(500).json({ message: "Failed to create machine type" });
    }
  });

  app.patch('/api/machine-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMachineTypeSchema.partial().parse(req.body);
      const machineType = await storage.updateMachineType(id, validatedData);
      if (!machineType) {
        return res.status(404).json({ message: "Machine type not found" });
      }
      res.json(machineType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating machine type:", error);
      res.status(500).json({ message: "Failed to update machine type" });
    }
  });

  app.delete('/api/machine-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMachineType(id);
      res.json({ message: "Machine type deleted successfully" });
    } catch (error) {
      console.error("Error deleting machine type:", error);
      res.status(500).json({ message: "Failed to delete machine type" });
    }
  });

  // Machine-Spare Parts Relationships API
  app.get('/api/machines/:machineId/spares', isAuthenticated, async (req: any, res) => {
    try {
      const { machineId } = req.params;
      const machineSpares = await storage.getMachineSpares(machineId);
      res.json(machineSpares);
    } catch (error) {
      console.error("Error fetching machine spares:", error);
      res.status(500).json({ message: "Failed to fetch machine spares" });
    }
  });

  app.post('/api/machines/:machineId/spares', isAuthenticated, async (req: any, res) => {
    try {
      const { machineId } = req.params;
      const validatedData = insertMachineSpareSchema.parse({
        ...req.body,
        machineId
      });
      const machineSpare = await storage.createMachineSpare(validatedData);
      res.json(machineSpare);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating machine spare:", error);
      res.status(500).json({ message: "Failed to create machine spare" });
    }
  });

  app.post('/api/machine-spares', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMachineSpareSchema.parse(req.body);
      const machineSpare = await storage.createMachineSpare(validatedData);
      res.json(machineSpare);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating machine spare:", error);
      res.status(500).json({ message: "Failed to create machine spare" });
    }
  });

  app.get('/api/spare-parts/:sparePartId/machines', isAuthenticated, async (req: any, res) => {
    try {
      const { sparePartId } = req.params;
      const machineSpares = await storage.getSparePartMachines(sparePartId);
      res.json(machineSpares);
    } catch (error) {
      console.error("Error fetching spare part machines:", error);
      res.status(500).json({ message: "Failed to fetch spare part machines" });
    }
  });

  app.get('/api/machines/:machineId/spare-parts', isAuthenticated, async (req: any, res) => {
    try {
      const { machineId } = req.params;
      const spareParts = await storage.getMachineSpareParts(machineId);
      res.json(spareParts);
    } catch (error) {
      console.error("Error fetching machine spare parts:", error);
      res.status(500).json({ message: "Failed to fetch machine spare parts" });
    }
  });

  app.delete('/api/machine-spares/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMachineSpare(id);
      res.json({ message: "Machine spare relationship deleted successfully" });
    } catch (error) {
      console.error("Error deleting machine spare:", error);
      res.status(500).json({ message: "Failed to delete machine spare" });
    }
  });

  // Purchase Orders API
  app.get('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const purchaseOrders = await storage.getAllPurchaseOrders();
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.post('/api/purchase-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPurchaseOrderSchema.partial({ requestedBy: true, approvedBy: true }).parse({
        ...req.body,
        requestedBy: userId
      });
      const purchaseOrder = await storage.createPurchaseOrder(validatedData);
      res.json(purchaseOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const purchaseOrder = await storage.getPurchaseOrder(id);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(purchaseOrder);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.patch('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPurchaseOrderSchema.partial().parse(req.body);
      const purchaseOrder = await storage.updatePurchaseOrder(id, validatedData);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(purchaseOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating purchase order:", error);
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete('/api/purchase-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePurchaseOrder(id);
      res.json({ message: "Purchase order deleted successfully" });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Maintenance Plans API
  app.get('/api/maintenance-plans', isAuthenticated, async (req: any, res) => {
    try {
      const plans = await storage.getAllMaintenancePlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching maintenance plans:", error);
      res.status(500).json({ message: "Failed to fetch maintenance plans" });
    }
  });

  app.post('/api/maintenance-plans', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMaintenancePlanSchema.parse(req.body);
      const plan = await storage.createMaintenancePlan(validatedData);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating maintenance plan:", error);
      res.status(500).json({ message: "Failed to create maintenance plan" });
    }
  });

  app.get('/api/maintenance-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const plan = await storage.getMaintenancePlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Maintenance plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching maintenance plan:", error);
      res.status(500).json({ message: "Failed to fetch maintenance plan" });
    }
  });

  app.patch('/api/maintenance-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMaintenancePlanSchema.partial().parse(req.body);
      const plan = await storage.updateMaintenancePlan(id, validatedData);
      if (!plan) {
        return res.status(404).json({ message: "Maintenance plan not found" });
      }
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating maintenance plan:", error);
      res.status(500).json({ message: "Failed to update maintenance plan" });
    }
  });

  app.delete('/api/maintenance-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMaintenancePlan(id);
      res.json({ message: "Maintenance plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting maintenance plan:", error);
      res.status(500).json({ message: "Failed to delete maintenance plan" });
    }
  });

  // PM Task List Templates API
  app.get('/api/pm-task-list-templates', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getAllPMTaskListTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching PM task list templates:", error);
      res.status(500).json({ message: "Failed to fetch PM task list templates" });
    }
  });

  app.post('/api/pm-task-list-templates', isAuthenticated, async (req: any, res) => {
    try {
      const { template, tasks } = req.body;
      const validatedTemplate = insertPMTaskListTemplateSchema.parse(template);
      const validatedTasks = z.array(insertPMTemplateTaskSchema).parse(tasks);
      const created = await storage.createPMTaskListTemplate(validatedTemplate, validatedTasks);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating PM task list template:", error);
      res.status(500).json({ message: "Failed to create PM task list template" });
    }
  });

  app.get('/api/pm-task-list-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getPMTaskListTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "PM task list template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching PM task list template:", error);
      res.status(500).json({ message: "Failed to fetch PM task list template" });
    }
  });

  app.get('/api/pm-task-list-templates/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tasks = await storage.getPMTemplateTasks(id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching PM template tasks:", error);
      res.status(500).json({ message: "Failed to fetch PM template tasks" });
    }
  });

  app.patch('/api/pm-task-list-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPMTaskListTemplateSchema.partial().parse(req.body);
      const template = await storage.updatePMTaskListTemplate(id, validatedData);
      if (!template) {
        return res.status(404).json({ message: "PM task list template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating PM task list template:", error);
      res.status(500).json({ message: "Failed to update PM task list template" });
    }
  });

  app.delete('/api/pm-task-list-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePMTaskListTemplate(id);
      res.json({ message: "PM task list template deleted successfully" });
    } catch (error) {
      console.error("Error deleting PM task list template:", error);
      res.status(500).json({ message: "Failed to delete PM task list template" });
    }
  });

  // PM Executions API
  app.get('/api/pm-executions', isAuthenticated, async (req: any, res) => {
    try {
      const executions = await storage.getAllPMExecutions();
      res.json(executions);
    } catch (error) {
      console.error("Error fetching PM executions:", error);
      res.status(500).json({ message: "Failed to fetch PM executions" });
    }
  });

  app.post('/api/pm-executions', isAuthenticated, async (req: any, res) => {
    try {
      const { execution, tasks } = req.body;
      const validatedExecution = insertPMExecutionSchema.parse(execution);
      const validatedTasks = z.array(insertPMExecutionTaskSchema).parse(tasks);
      const created = await storage.createPMExecution(validatedExecution, validatedTasks);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating PM execution:", error);
      res.status(500).json({ message: "Failed to create PM execution" });
    }
  });

  app.get('/api/pm-executions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const execution = await storage.getPMExecution(id);
      if (!execution) {
        return res.status(404).json({ message: "PM execution not found" });
      }
      res.json(execution);
    } catch (error) {
      console.error("Error fetching PM execution:", error);
      res.status(500).json({ message: "Failed to fetch PM execution" });
    }
  });

  app.get('/api/pm-executions/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tasks = await storage.getPMExecutionTasks(id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching PM execution tasks:", error);
      res.status(500).json({ message: "Failed to fetch PM execution tasks" });
    }
  });

  app.get('/api/pm-executions/plan/:planId', isAuthenticated, async (req: any, res) => {
    try {
      const { planId } = req.params;
      const executions = await storage.getPMExecutionsByPlan(planId);
      res.json(executions);
    } catch (error) {
      console.error("Error fetching PM executions by plan:", error);
      res.status(500).json({ message: "Failed to fetch PM executions by plan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
