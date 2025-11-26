import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertMachineSchema, insertSparePartSchema, insertChecklistTemplateSchema, insertTemplateTaskSchema, insertMachineTypeSchema, insertMachineSpareSchema, insertPurchaseOrderSchema, insertMaintenancePlanSchema, insertPMTaskListTemplateSchema, insertPMTemplateTaskSchema, insertPMExecutionSchema, insertPMExecutionTaskSchema, insertUomSchema, insertProductCategorySchema, insertProductTypeSchema, insertProductSchema, insertProductBomSchema, insertRawMaterialTypeSchema, insertRawMaterialSchema, insertRawMaterialTransactionSchema, insertFinishedGoodSchema, insertRawMaterialIssuanceSchema, insertRawMaterialIssuanceItemSchema, insertProductionEntrySchema, insertProductionReconciliationSchema, insertProductionReconciliationItemSchema, insertGatepassSchema, insertGatepassItemSchema, insertInvoiceSchema, insertInvoiceItemSchema, insertInvoicePaymentSchema, insertBankSchema, insertUserSchema, insertChecklistAssignmentSchema, insertNotificationConfigSchema, insertSalesReturnSchema, insertSalesReturnItemSchema, insertVendorTypeSchema, rawMaterialTypes, rawMaterials, rawMaterialIssuance, rawMaterialIssuanceItems, productionEntries, productionReconciliations, productionReconciliationItems, rawMaterialTransactions, finishedGoods, gatepasses, gatepassItems, invoices, invoiceItems, invoicePayments, salesReturns, salesReturnItems, creditNotes, creditNoteItems, manualCreditNoteRequests, products, productBom, whatsappConversationSessions, vendorTypes, vendorVendorTypes, insertDocumentCategorySchema, insertDocumentSchema, insertExpenseCategorySchema, insertExpenseVoucherSchema, insertExpenseItemSchema, insertExpenseAttachmentSchema } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";
import path from "path";
import fs from "fs";
import multer from "multer";
import XLSX from "xlsx";
import { db } from "./db";
import { whatsappService } from "./whatsappService";
import { whatsappWebhookRouter } from "./whatsappWebhook";
import { whatsappConversationService } from "./whatsappConversationService";
import { calculateBOMSuggestions } from "@shared/calculations";
import { importVyapaarData, clearImportedData } from "./vyapaar-import";
import { parseExcelFile, commitImport } from "./cashRegisterImport";
import { importCashRegisterFromExcel } from "./importCashRegisterFromExcel";
import { insertCashRegisterDaySchema, insertCashRegisterTransactionSchema, insertCashRegisterExpenseItemSchema, insertSalespersonMappingSchema, cashRegisterDays, cashRegisterTransactions, cashRegisterExpenseItems, expenseVouchers, expenseItems } from "@shared/schema";
import { sql } from "drizzle-orm";

// Simple audit logging function
async function logAudit(userId: string | undefined, action: string, table: string, recordId: string, description: string) {
  console.log(`[AUDIT] User: ${userId}, Action: ${action}, Table: ${table}, Record: ${recordId}, Description: ${description}`);
}

// Recalculate discrepancy for a cash register day
async function recalculateDayDiscrepancy(dayId: string) {
  try {
    const day = await storage.getCashRegisterDay(dayId);
    if (!day) return;
    
    // Get all expense transactions for this day
    const transactions = await storage.getCashRegisterTransactions(dayId);
    const expenseTransactions = transactions.filter(tx => tx.transactionType === 'expense');
    
    // Calculate items total
    let itemsTotal = 0;
    for (const tx of expenseTransactions) {
      const items = await storage.getCashRegisterExpenseItems(tx.id);
      itemsTotal += items.reduce((sum, item) => sum + item.amount, 0);
    }
    
    // Calculate expected closing
    const expectedClosing = day.openingBalance + day.totalDeposits + day.totalCashReceived - day.totalExpenses - day.totalTransfers;
    
    // Check for discrepancies
    const balanceMismatch = day.closingBalance !== expectedClosing;
    const itemsMismatch = day.totalExpenses !== itemsTotal;
    const hasDiscrepancy = balanceMismatch || itemsMismatch;
    
    // Update the day with discrepancy info
    await storage.updateCashRegisterDay(dayId, {
      hasDiscrepancy: hasDiscrepancy ? 1 : 0,
      discrepancyDetails: {
        balance_mismatch: balanceMismatch,
        items_mismatch: itemsMismatch,
        expected_closing: expectedClosing / 100,
        actual_closing: day.closingBalance / 100,
        closing_difference: (day.closingBalance - expectedClosing) / 100,
        total_expenses: day.totalExpenses / 100,
        items_total: itemsTotal / 100,
        items_difference: (day.totalExpenses - itemsTotal) / 100,
      },
    } as any);
    
    console.log(`[CASH_REGISTER] Recalculated discrepancy for day ${dayId}: hasDiscrepancy=${hasDiscrepancy}`);
  } catch (error) {
    console.error('[CASH_REGISTER] Error recalculating discrepancy:', error);
  }
}

import { eq, and, ne, gte, lte, gt, desc, inArray, isNotNull } from "drizzle-orm";

// Custom error class for database conflicts (used in transactions)
class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Role-based authorization middleware
function requireRole(...allowedRoles: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      console.log(`[AUDIT] Unauthorized access attempt to ${req.path}`);
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Validate user ID exists in session
      if (!req.user || !req.user.id) {
        console.error(`[AUDIT] Missing user.id in session for ${req.path}`);
        return res.status(401).json({ message: "Unauthorized: Invalid session" });
      }

      // Fetch fresh user data from database (don't trust session completely)
      const user = await storage.getUser(req.user.id);
      if (!user) {
        console.error(`[AUDIT] User ${req.user.id} not found in database for ${req.path}`);
        return res.status(401).json({ message: "Unauthorized: User not found" });
      }

      if (!user.roleId) {
        console.log(`[AUDIT] User ${user.id} has no role assigned, denying access to ${req.path}`);
        return res.status(403).json({ message: "Forbidden: No role assigned" });
      }

      // Get the user's role name from database
      const role = await storage.getUserRole(user.roleId);
      if (!role) {
        console.error(`[AUDIT] Invalid roleId ${user.roleId} for user ${user.id}`);
        return res.status(403).json({ message: "Forbidden: Invalid role" });
      }

      // Case-insensitive role comparison
      const userRoleLower = role.name.toLowerCase();
      const hasAccess = allowedRoles.some(r => r.toLowerCase() === userRoleLower);
      
      if (!hasAccess) {
        console.log(`[AUDIT] User ${user.id} with role ${role.name} denied access to ${req.path} (requires: ${allowedRoles.join(', ')})`);
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      // Store validated role in request for downstream use
      req.userRole = role.name;
      next();
    } catch (error) {
      console.error(`[AUDIT] Role check error for ${req.path}:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

// Helper function to auto-calculate product fields
function calculateProductFields(data: any) {
  const result = { ...data };
  
  // Auto-calculate usableDerivedUnits based on conversion method
  if (data.conversionMethod && data.baseUnit && data.derivedUnit) {
    const lossPercent = Number(data.defaultLossPercent) || 0;
    const lossFactor = 1 - (lossPercent / 100);
    
    if (data.conversionMethod === 'Direct' && data.derivedValuePerBase) {
      // Direct method: e.g., 12 bottles per case
      const derivedValue = Number(data.derivedValuePerBase);
      result.usableDerivedUnits = String((derivedValue * lossFactor).toFixed(4));
    } else if (data.conversionMethod === 'Formula-Based' && data.weightPerBase && data.weightPerDerived) {
      // Formula-Based: (BaseWeight / DerivedWeight) × (1 - Loss%)
      const weightBase = Number(data.weightPerBase);
      const weightDerived = Number(data.weightPerDerived);
      result.usableDerivedUnits = String(((weightBase / weightDerived) * lossFactor).toFixed(4));
    }
  }
  
  // Auto-calculate totalPrice based on basePrice and GST
  if (data.basePrice !== undefined && data.gstPercent !== undefined) {
    const basePrice = Number(data.basePrice) || 0;
    const gstPercent = Number(data.gstPercent) || 0;
    result.totalPrice = Math.round(basePrice * (1 + gstPercent / 100));
  }
  
  return result;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Sessions are preserved across restarts and expire naturally based on TTL (7 days)
  // This prevents users from being logged out during development or after deployments
  console.log('✅ Session persistence enabled - sessions expire after 7 days of inactivity');

  // Serve deployment guide files
  app.get('/download.html', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'download.html');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/KINTO_QA_Deployment_Guide.pdf', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'KINTO_QA_Deployment_Guide.pdf');
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/KINTO_QA_Deployment_Guide.docx', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'KINTO_QA_Deployment_Guide.docx');
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/KINTO_QA_Mobile_App_Guide.pdf', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'KINTO_QA_Mobile_App_Guide.pdf');
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  app.get('/download-project.html', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'download-project.html');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  setupAuth(app);

  // Secure WhatsApp photo download route (validates files before serving)
  app.get('/whatsapp-photos/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;

      // Security: validate filename format (no path traversal)
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(403).json({ message: 'Invalid filename' });
      }

      // Security: validate file extension (images only)
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const ext = path.extname(filename).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return res.status(403).json({ message: 'File type not allowed' });
      }

      // Build full file path
      const uploadsDir = path.join(process.cwd(), 'uploads', 'whatsapp-photos');
      const filePath = path.join(uploadsDir, filename);

      // Security: verify file exists and is within allowed directory
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Security: ensure resolved path is still within uploads directory (prevent symlink attacks)
      const resolvedPath = fs.realpathSync(filePath);
      const resolvedUploadsDir = fs.realpathSync(uploadsDir);
      if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Set appropriate content type
      const contentTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      fileStream.on('error', (err) => {
        console.error('[WHATSAPP] Error streaming photo:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file' });
        }
      });
    } catch (error) {
      console.error('[WHATSAPP] Error serving photo:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Test endpoint to start WhatsApp conversation (for testing only - no auth required)
  app.post('/api/whatsapp/test-start-conversation', async (req, res) => {
    try {
      const { phoneNumber, templateId, machineId, operatorId, assignmentId } = req.body;
      
      // Validate required fields
      if (!phoneNumber || !templateId || !machineId || !operatorId) {
        return res.status(400).json({ 
          message: 'Missing required fields: phoneNumber, templateId, machineId, operatorId' 
        });
      }

      console.log('[WHATSAPP TEST] Starting conversation:', { phoneNumber, templateId, machineId, operatorId });

      // Start the interactive conversation
      const sessionId = await whatsappConversationService.startConversation({
        phoneNumber,
        assignmentId: assignmentId || null,
        templateId,
        machineId,
        operatorId,
      });

      res.json({ 
        success: true, 
        sessionId,
        message: `WhatsApp conversation started! First question sent to ${phoneNumber}` 
      });
    } catch (error) {
      console.error('[WHATSAPP TEST ERROR]:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to start conversation' 
      });
    }
  });

  // Register WhatsApp webhook routes (must be before authentication)
  app.use('/api/whatsapp', whatsappWebhookRouter);

  // Auth routes are handled by setupAuth() in auth.ts
  // /api/register, /api/login, /api/logout, /api/user are automatically set up

  app.post('/api/auth/set-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { role } = req.body;
      
      // Only allow non-privileged roles for self-assignment
      // Admin and Manager roles can only be assigned by another admin via /api/users/:id/role
      if (!['operator', 'reviewer'].includes(role)) {
        console.log(`[AUDIT] User ${userId} attempted to self-assign privileged role: ${role}`);
        return res.status(403).json({ message: "Cannot self-assign admin or manager roles. Contact your administrator." });
      }

      // Check if user already has a role (prevent role changes through this endpoint)
      const currentUser = await storage.getUser(userId);
      if (currentUser?.roleId) {
        console.log(`[AUDIT] User ${userId} attempted to change existing role ${currentUser.roleId} to ${role}`);
        return res.status(403).json({ message: "Role already assigned. Contact administrator to change roles." });
      }

      // Validate role exists in database and get the roleId
      const validRole = await storage.getRoleByName(role);
      if (!validRole) {
        return res.status(400).json({ message: "Invalid role" });
      }

      console.log(`[AUDIT] User ${userId} performing initial role assignment: ${role}`);
      const user = await storage.updateUserRole(userId, validRole.id);
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

  app.post('/api/users', requireRole('admin'), async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, role, mobileNumber } = req.body;

      // Validate required fields
      if (!email || !password || !mobileNumber) {
        return res.status(400).json({ message: "Email, password, and mobile number are required" });
      }
      
      // Validate mobile number format
      if (!/^[0-9]{10}$/.test(mobileNumber)) {
        return res.status(400).json({ message: "Mobile number must be 10 digits" });
      }

      // Validate role
      if (!['admin', 'operator', 'reviewer', 'manager'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Get role ID from database
      const validRole = await storage.getRoleByName(role);
      if (!validRole) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Generate username from email (part before @) with random 2-digit suffix
      const emailPrefix = email.split('@')[0];
      const randomDigits = Math.floor(10 + Math.random() * 90); // Generates 10-99
      const username = `${emailPrefix}${randomDigits}`;

      // Check if username already exists (very unlikely with random suffix)
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        // Extremely rare case - generate new random digits
        const newRandomDigits = Math.floor(10 + Math.random() * 90);
        const newUsername = `${emailPrefix}${newRandomDigits}`;
        return res.status(400).json({ 
          message: `Username conflict detected. Please try creating the user again. Suggested username: ${newUsername}` 
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with hashed password and role
      const userData = {
        username,
        email,
        password: hashedPassword,
        mobileNumber,
        firstName: firstName || null,
        lastName: lastName || null,
        roleId: validRole.id,
      };

      const user = await storage.createUser(userData);

      // Audit log
      console.log(`[AUDIT] Admin ${req.user.id} created new user ${user.id} with role ${role}`);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, password, role } = req.body;

      const updateData: any = {};
      
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      
      // Hash password if provided
      if (password) {
        updateData.password = await hashPassword(password);
      }

      // Update role if provided
      if (role) {
        const validRole = await storage.getRoleByName(role);
        if (!validRole) {
          return res.status(400).json({ message: "Invalid role" });
        }
        await storage.updateUserRole(id, validRole.id);
      }

      // Update other fields
      if (Object.keys(updateData).length > 0) {
        await storage.updateUser(id, updateData);
      }

      // Audit log
      console.log(`[AUDIT] Admin ${req.user.id} updated user ${id}`);

      // Fetch updated user
      const users = await storage.getAllUsers();
      const updatedUser = users.find(u => u.id === id);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch('/api/users/:id/role', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'operator', 'reviewer', 'manager'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Validate role exists in database and get the roleId
      const validRole = await storage.getRoleByName(role);
      if (!validRole) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Audit log
      console.log(`[AUDIT] Admin ${req.user.id} changing role for user ${id} to ${role} (${validRole.id})`);

      const user = await storage.updateUserRole(id, validRole.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/users/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Audit log
      console.log(`[AUDIT] Admin ${req.user.id} deleting user ${id}`);
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  app.post('/api/machines', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.patch('/api/machines/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.delete('/api/machines/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/checklist-templates', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.delete('/api/checklist-templates/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/spare-parts', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertSparePartSchema.parse(req.body);
      const cleanData = {
        ...validatedData,
        partNumber: validatedData.partNumber ?? undefined,
        category: validatedData.category ?? undefined,
        machineId: validatedData.machineId ?? undefined,
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

  app.patch('/api/spare-parts/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSparePartSchema.partial().parse(req.body);
      const cleanData = {
        ...validatedData,
        partNumber: validatedData.partNumber ?? undefined,
        category: validatedData.category ?? undefined,
        machineId: validatedData.machineId ?? undefined,
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

  app.delete('/api/spare-parts/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/machine-types', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.patch('/api/machine-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.delete('/api/machine-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/machines/:machineId/spares', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/machine-spares', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.delete('/api/machine-spares/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/purchase-orders', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.patch('/api/purchase-orders/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.delete('/api/purchase-orders/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/maintenance-plans', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.patch('/api/maintenance-plans/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.delete('/api/maintenance-plans/:id', requireRole('admin', 'manager'), async (req: any, res) => {
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

  app.post('/api/pm-task-list-templates', requireRole('admin', 'manager'), async (req: any, res) => {
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
      const userId = req.user.id;
      const executionWithUser = {
        ...execution,
        completedBy: userId,
        completedAt: new Date(),
      };
      const validatedExecution = insertPMExecutionSchema.parse(executionWithUser);
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

  // UOM (Unit of Measurement) API
  app.get('/api/uom', isAuthenticated, async (req: any, res) => {
    try {
      const uoms = await storage.getAllUoms();
      res.json(uoms);
    } catch (error) {
      console.error("Error fetching UOMs:", error);
      res.status(500).json({ message: "Failed to fetch UOMs" });
    }
  });

  app.post('/api/uom', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertUomSchema.parse(req.body);
      const created = await storage.createUom(validatedData);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating UOM:", error);
      res.status(500).json({ message: "Failed to create UOM" });
    }
  });

  app.get('/api/uom/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const uom = await storage.getUom(id);
      if (!uom) {
        return res.status(404).json({ message: "UOM not found" });
      }
      res.json(uom);
    } catch (error) {
      console.error("Error fetching UOM:", error);
      res.status(500).json({ message: "Failed to fetch UOM" });
    }
  });

  app.patch('/api/uom/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertUomSchema.partial().parse(req.body);
      const updated = await storage.updateUom(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "UOM not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating UOM:", error);
      res.status(500).json({ message: "Failed to update UOM" });
    }
  });

  app.delete('/api/uom/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUom(id);
      res.json({ message: "UOM deleted successfully" });
    } catch (error) {
      console.error("Error deleting UOM:", error);
      res.status(500).json({ message: "Failed to delete UOM" });
    }
  });

  // Product Category API
  app.get('/api/product-categories', isAuthenticated, async (req: any, res) => {
    try {
      const categories = await storage.getAllProductCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  app.post('/api/product-categories', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertProductCategorySchema.parse(req.body);
      const created = await storage.createProductCategory(validatedData);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating product category:", error);
      res.status(500).json({ message: "Failed to create product category" });
    }
  });

  app.get('/api/product-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const category = await storage.getProductCategory(id);
      if (!category) {
        return res.status(404).json({ message: "Product category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching product category:", error);
      res.status(500).json({ message: "Failed to fetch product category" });
    }
  });

  app.patch('/api/product-categories/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProductCategorySchema.partial().parse(req.body);
      const updated = await storage.updateProductCategory(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "Product category not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating product category:", error);
      res.status(500).json({ message: "Failed to update product category" });
    }
  });

  app.delete('/api/product-categories/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProductCategory(id);
      res.json({ message: "Product category deleted successfully" });
    } catch (error) {
      console.error("Error deleting product category:", error);
      res.status(500).json({ message: "Failed to delete product category" });
    }
  });

  // Product Type API
  app.get('/api/product-types', isAuthenticated, async (req: any, res) => {
    try {
      const types = await storage.getAllProductTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching product types:", error);
      res.status(500).json({ message: "Failed to fetch product types" });
    }
  });

  app.post('/api/product-types', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertProductTypeSchema.parse(req.body);
      const created = await storage.createProductType(validatedData);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating product type:", error);
      res.status(500).json({ message: "Failed to create product type" });
    }
  });

  app.get('/api/product-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const type = await storage.getProductType(id);
      if (!type) {
        return res.status(404).json({ message: "Product type not found" });
      }
      res.json(type);
    } catch (error) {
      console.error("Error fetching product type:", error);
      res.status(500).json({ message: "Failed to fetch product type" });
    }
  });

  app.patch('/api/product-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProductTypeSchema.partial().parse(req.body);
      const updated = await storage.updateProductType(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "Product type not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating product type:", error);
      res.status(500).json({ message: "Failed to update product type" });
    }
  });

  app.delete('/api/product-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProductType(id);
      res.json({ message: "Product type deleted successfully" });
    } catch (error) {
      console.error("Error deleting product type:", error);
      res.status(500).json({ message: "Failed to delete product type" });
    }
  });

  // Vendor Type API
  app.get('/api/vendor-types', isAuthenticated, async (req: any, res) => {
    try {
      const types = await storage.getAllVendorTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching vendor types:", error);
      res.status(500).json({ message: "Failed to fetch vendor types" });
    }
  });

  app.post('/api/vendor-types', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertVendorTypeSchema.parse(req.body);
      const created = await storage.createVendorType(validatedData);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vendor type:", error);
      res.status(500).json({ message: "Failed to create vendor type" });
    }
  });

  app.get('/api/vendor-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const type = await storage.getVendorType(id);
      if (!type) {
        return res.status(404).json({ message: "Vendor type not found" });
      }
      res.json(type);
    } catch (error) {
      console.error("Error fetching vendor type:", error);
      res.status(500).json({ message: "Failed to fetch vendor type" });
    }
  });

  app.patch('/api/vendor-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertVendorTypeSchema.partial().parse(req.body);
      const updated = await storage.updateVendorType(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "Vendor type not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating vendor type:", error);
      res.status(500).json({ message: "Failed to update vendor type" });
    }
  });

  app.delete('/api/vendor-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVendorType(id);
      res.json({ message: "Vendor type deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor type:", error);
      res.status(500).json({ message: "Failed to delete vendor type" });
    }
  });

  // Vendor-VendorType Assignment API
  
  // Batch endpoint to get all vendor-type assignments (avoids N+1 queries)
  app.get('/api/vendor-vendor-types/batch', isAuthenticated, async (req: any, res) => {
    try {
      const rawAssignments = await db
        .select({
          id: vendorVendorTypes.id,
          vendorId: vendorVendorTypes.vendorId,
          vendorTypeId: vendorVendorTypes.vendorTypeId,
          isPrimary: vendorVendorTypes.isPrimary,
          vendorTypeCode: vendorTypes.code,
          vendorTypeName: vendorTypes.name,
          vendorTypeDescription: vendorTypes.description,
          vendorTypeIsActive: vendorTypes.isActive,
        })
        .from(vendorVendorTypes)
        .innerJoin(vendorTypes, eq(vendorVendorTypes.vendorTypeId, vendorTypes.id))
        .where(eq(vendorTypes.isActive, 1));
      
      // Transform to match expected frontend structure
      const assignments = rawAssignments.map(a => ({
        id: a.id,
        vendorId: a.vendorId,
        vendorTypeId: a.vendorTypeId,
        isPrimary: a.isPrimary,
        vendorType: {
          id: a.vendorTypeId,
          code: a.vendorTypeCode,
          name: a.vendorTypeName,
          description: a.vendorTypeDescription,
          isActive: a.vendorTypeIsActive,
        }
      }));
      
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching vendor-type batch:", error);
      res.status(500).json({ message: "Failed to fetch vendor types" });
    }
  });
  
  // Batch sync vendor types - efficient single-transaction operation
  app.post('/api/vendors/:vendorId/types/sync', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      const { vendorTypeIds, primaryVendorTypeId } = req.body;
      
      if (!Array.isArray(vendorTypeIds)) {
        return res.status(400).json({ message: "vendorTypeIds must be an array" });
      }
      
      // Use transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // 1. Delete all existing vendor type assignments
        await tx.delete(vendorVendorTypes).where(eq(vendorVendorTypes.vendorId, vendorId));
        
        // 2. Insert new assignments
        if (vendorTypeIds.length > 0) {
          const assignments = vendorTypeIds.map((typeId: string) => ({
            vendorId,
            vendorTypeId: typeId,
            isPrimary: typeId === primaryVendorTypeId ? 1 : 0,
          }));
          
          await tx.insert(vendorVendorTypes).values(assignments);
        }
      });
      
      res.json({ success: true, message: "Vendor types synced successfully" });
    } catch (error) {
      console.error("Error syncing vendor types:", error);
      res.status(500).json({ message: "Failed to sync vendor types" });
    }
  });

  app.post('/api/vendors/:vendorId/types/:vendorTypeId', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { vendorId, vendorTypeId } = req.params;
      const { isPrimary = false } = req.body;
      const assignment = await storage.assignVendorType(vendorId, vendorTypeId, isPrimary);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning vendor type:", error);
      res.status(500).json({ message: "Failed to assign vendor type" });
    }
  });

  app.get('/api/vendors/:vendorId/types', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      const types = await storage.getVendorTypes(vendorId);
      res.json(types);
    } catch (error) {
      console.error("Error fetching vendor types:", error);
      res.status(500).json({ message: "Failed to fetch vendor types" });
    }
  });

  app.delete('/api/vendors/:vendorId/types/:vendorTypeId', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { vendorId, vendorTypeId } = req.params;
      await storage.removeVendorType(vendorId, vendorTypeId);
      res.json({ message: "Vendor type removed successfully" });
    } catch (error) {
      console.error("Error removing vendor type:", error);
      res.status(500).json({ message: "Failed to remove vendor type" });
    }
  });

  // Products API
  app.get('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const { page, pageSize, searchQuery, category, type, activeStatus } = req.query;
      
      // TODO: Optimize with database-level pagination (LIMIT/OFFSET) and WHERE clauses for better scalability
      // Get all products once (loads all data into memory)
      const allProductsUnfiltered = await storage.getAllProducts();
      
      // Compute filter metadata from unfiltered list (for dropdowns)
      const uniqueCategories = Array.from(new Set(allProductsUnfiltered.filter(p => p.productCategoryId).map(p => p.productCategoryId!))).sort();
      const uniqueTypes = Array.from(new Set(allProductsUnfiltered.filter(p => p.productTypeId).map(p => p.productTypeId!))).sort();
      
      // Apply filters to create filtered list
      let allProducts = allProductsUnfiltered;
      
      if (searchQuery) {
        const query = (searchQuery as string).toLowerCase();
        allProducts = allProducts.filter(p =>
          p.productName.toLowerCase().includes(query) ||
          p.productCode.toLowerCase().includes(query) ||
          (p.hsn && p.hsn.toLowerCase().includes(query))
        );
      }
      
      if (category && category !== 'all') {
        allProducts = allProducts.filter(p => p.productCategoryId === category);
      }
      
      if (type && type !== 'all') {
        allProducts = allProducts.filter(p => p.productTypeId === type);
      }
      
      if (activeStatus && activeStatus !== 'all') {
        const isActive = activeStatus === 'active' ? 1 : 0;
        allProducts = allProducts.filter(p => p.isActive === isActive);
      }
      
      // If pagination params exist, paginate the results
      if (page !== undefined && pageSize !== undefined) {
        const { paginationRequestSchema } = await import('@shared/schema');
        const paginationParams = paginationRequestSchema.parse({ page, pageSize });
        
        const totalItems = allProducts.length;
        const totalPages = Math.ceil(totalItems / paginationParams.pageSize);
        const startIndex = (paginationParams.page - 1) * paginationParams.pageSize;
        const endIndex = startIndex + paginationParams.pageSize;
        const paginatedProducts = allProducts.slice(startIndex, endIndex);
        
        return res.json({
          data: paginatedProducts,
          meta: {
            page: paginationParams.page,
            pageSize: paginationParams.pageSize,
            totalItems,
            totalPages,
            hasNextPage: paginationParams.page < totalPages,
            hasPreviousPage: paginationParams.page > 1,
            filters: {
              categories: uniqueCategories,
              types: uniqueTypes,
            },
          },
        });
      }
      
      // Backward compatibility: return plain array if no pagination params
      res.json(allProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const productData = { ...req.body, createdBy: userId };
      const validatedData = insertProductSchema.parse(productData);
      
      // Auto-calculate fields
      const dataWithCalculations = calculateProductFields(validatedData);
      
      const created = await storage.createProduct(dataWithCalculations);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.patch('/api/products/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProductSchema.partial().parse(req.body);
      
      // Get existing product to merge with updates before calculating
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Merge existing data with updates, then calculate
      const mergedData = { ...existingProduct, ...validatedData };
      const dataWithCalculations = calculateProductFields(mergedData);
      
      const updated = await storage.updateProduct(id, dataWithCalculations);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Product BOM (Bill of Materials) API
  app.get('/api/products/:productId/bom', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const bomItems = await storage.getProductBom(productId);
      res.json(bomItems);
    } catch (error) {
      console.error("Error fetching product BOM:", error);
      res.status(500).json({ message: "Failed to fetch product BOM" });
    }
  });

  // Product BOM with Type Conversion Data (for Raw Material Issuance)
  app.get('/api/products/:productId/bom-with-types', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      
      // Validate productId format (must be valid UUID)
      const uuidSchema = z.string().uuid({ message: "Invalid product ID format - must be a valid UUID" });
      const validationResult = uuidSchema.safeParse(productId);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid product ID", 
          errors: validationResult.error.errors 
        });
      }

      const bomData = await storage.getProductBomWithTypes(productId);
      res.json(bomData);
    } catch (error) {
      if (error instanceof Error && error.message === 'Product not found') {
        return res.status(404).json({ message: "Product not found" });
      }
      console.error("Error fetching product BOM with types:", error);
      res.status(500).json({ message: "Failed to fetch product BOM with conversion data" });
    }
  });

  app.post('/api/products/:productId/bom', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { productId } = req.params;
      
      // Check if body is an array (bulk replace) or single item
      if (Array.isArray(req.body)) {
        // Bulk replace: Atomically replace all BOM items using transaction
        console.log(`[BOM] Bulk replacing BOM for product ${productId} with ${req.body.length} items`);
        
        // Validate all items BEFORE any database operations
        const bomItemSchema = insertProductBomSchema.omit({ productId: true });
        const validatedItems = req.body.map((item: any, index: any) => {
          try {
            return bomItemSchema.parse(item);
          } catch (error) {
            if (error instanceof z.ZodError) {
              throw new Error(`Invalid BOM item at index ${index}: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
            }
            throw error;
          }
        });
        
        // Atomic replace using transaction
        const createdItems = await storage.replaceProductBom(productId, validatedItems);
        
        console.log(`[BOM] Successfully replaced BOM with ${createdItems.length} items`);
        return res.json({ message: "BOM replaced successfully", items: createdItems });
      } else {
        // Single item creation
        const bomData = { ...req.body, productId };
        const validatedData = insertProductBomSchema.parse(bomData);
        const created = await storage.createProductBomItem(validatedData);
        res.json(created);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating BOM item:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create BOM item" });
    }
  });

  app.patch('/api/products/:productId/bom/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProductBomSchema.partial().parse(req.body);
      const updated = await storage.updateProductBomItem(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "BOM item not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating BOM item:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update BOM item" });
    }
  });

  app.delete('/api/products/:productId/bom/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProductBomItem(id);
      res.json({ message: "BOM item deleted successfully" });
    } catch (error) {
      console.error("Error deleting BOM item:", error);
      res.status(500).json({ message: "Failed to delete BOM item" });
    }
  });

  // Vendor Master API
  app.get('/api/vendors', isAuthenticated, async (req: any, res) => {
    try {
      const { page, pageSize, searchQuery, city, state, activeStatus } = req.query;
      
      // TODO: Optimize with database-level pagination (LIMIT/OFFSET) and WHERE clauses for better scalability
      // Get all vendors once (loads all data into memory)
      const allVendorsUnfiltered = await storage.getAllVendors();
      
      // Compute filter metadata from unfiltered list (for dropdowns)
      const uniqueCities = Array.from(new Set(allVendorsUnfiltered.filter(v => v.city).map(v => v.city!))).sort();
      const uniqueStates = Array.from(new Set(allVendorsUnfiltered.filter(v => v.state).map(v => v.state!))).sort();
      
      // Apply filters to create filtered list
      let allVendors = allVendorsUnfiltered;
      
      if (searchQuery) {
        const query = (searchQuery as string).toLowerCase();
        allVendors = allVendors.filter(v =>
          v.vendorName.toLowerCase().includes(query) ||
          v.vendorCode.toLowerCase().includes(query) ||
          (v.gstNumber && v.gstNumber.toLowerCase().includes(query)) ||
          (v.aadhaarNumber && v.aadhaarNumber.toLowerCase().includes(query)) ||
          (v.mobileNumber && v.mobileNumber.includes(query))
        );
      }
      
      if (city && city !== 'all') {
        allVendors = allVendors.filter(v => v.city === city);
      }
      
      if (state && state !== 'all') {
        allVendors = allVendors.filter(v => v.state === state);
      }
      
      if (activeStatus && activeStatus !== 'all') {
        const isActive = activeStatus === 'active' ? 1 : 0;
        allVendors = allVendors.filter(v => v.isActive === isActive);
      }
      
      // If pagination params exist, paginate the results
      if (page !== undefined && pageSize !== undefined) {
        const { paginationRequestSchema } = await import('@shared/schema');
        const paginationParams = paginationRequestSchema.parse({ page, pageSize });
        
        const totalItems = allVendors.length;
        const totalPages = Math.ceil(totalItems / paginationParams.pageSize);
        const startIndex = (paginationParams.page - 1) * paginationParams.pageSize;
        const endIndex = startIndex + paginationParams.pageSize;
        const paginatedData = allVendors.slice(startIndex, endIndex);
        
        return res.json({
          data: paginatedData,
          meta: {
            page: paginationParams.page,
            pageSize: paginationParams.pageSize,
            totalItems,
            totalPages,
            hasNextPage: paginationParams.page < totalPages,
            hasPreviousPage: paginationParams.page > 1,
            filters: {
              cities: uniqueCities,
              states: uniqueStates,
            },
          },
        });
      }
      
      // No pagination - return all vendors (backward compatible)
      res.json(allVendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get('/api/vendors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const vendor = await storage.getVendor(id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post('/api/vendors', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const vendor = await storage.createVendor({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch('/api/vendors/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const vendor = await storage.updateVendor(id, req.body);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete('/api/vendors/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVendor(id);
      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Raw Material Type Master API
  app.get('/api/raw-material-types', isAuthenticated, async (req: any, res) => {
    try {
      const types = await storage.getAllRawMaterialTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching raw material types:", error);
      res.status(500).json({ message: "Failed to fetch raw material types" });
    }
  });

  app.post('/api/raw-material-types', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Auto-generate Type Code if not provided
      let typeCode = req.body.typeCode;
      if (!typeCode) {
        const allTypes = await storage.getAllRawMaterialTypes();
        const existingCodes = allTypes
          .map(t => t.typeCode)
          .filter(code => code.startsWith('RMT-'))
          .map(code => parseInt(code.replace('RMT-', '')) || 0);
        
        const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
        typeCode = `RMT-${nextNumber.toString().padStart(3, '0')}`;
      }
      
      // VALIDATE FIRST with discriminated union schema - this ensures method-specific fields are present
      const validatedInput = insertRawMaterialTypeSchema.parse({ ...req.body, typeCode });
      
      // NOW calculate conversion value and usable units based on validated data
      let conversionValue = 0;
      let usableUnits = 0;
      const lossPercent = validatedInput.lossPercent || 0;
      
      if (validatedInput.conversionMethod === 'formula-based') {
        // Formula: (baseUnitWeight × 1000) / weightPerDerivedUnit
        conversionValue = Math.round((validatedInput.baseUnitWeight * 1000) / validatedInput.weightPerDerivedUnit);
      } else if (validatedInput.conversionMethod === 'direct-value') {
        // Direct value entered by user
        conversionValue = validatedInput.derivedValuePerBase;
      } else if (validatedInput.conversionMethod === 'output-coverage') {
        // Output units covered
        conversionValue = validatedInput.outputUnitsCovered;
      }
      
      // Calculate usable units after applying loss percentage
      usableUnits = Math.round(conversionValue * (1 - (lossPercent / 100)));
      
      // Create final data object with calculated fields
      const typeData = { 
        ...validatedInput,
        conversionValue,
        usableUnits,
        createdBy: userId 
      };
      
      const created = await storage.createRawMaterialType(typeData);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating raw material type:", error);
      res.status(500).json({ message: "Failed to create raw material type" });
    }
  });

  app.get('/api/raw-material-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const type = await storage.getRawMaterialType(id);
      if (!type) {
        return res.status(404).json({ message: "Raw material type not found" });
      }
      res.json(type);
    } catch (error) {
      console.error("Error fetching raw material type:", error);
      res.status(500).json({ message: "Failed to fetch raw material type" });
    }
  });

  app.patch('/api/raw-material-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get existing type to merge with updates
      const existing = await storage.getRawMaterialType(id);
      if (!existing) {
        return res.status(404).json({ message: "Raw material type not found" });
      }
      
      // Merge existing data with updates
      const merged = { ...existing, ...req.body };
      
      // Strip null values to prevent validation errors (Zod .optional() accepts undefined, not null)
      const sanitized = Object.fromEntries(
        Object.entries(merged).filter(([_, value]) => value !== null)
      );
      
      // VALIDATE the merged data with discriminated union schema
      const validatedMerged = insertRawMaterialTypeSchema.parse(sanitized);
      
      // Recalculate conversion value and usable units based on validated data
      let conversionValue = 0;
      let usableUnits = 0;
      const lossPercent = validatedMerged.lossPercent || 0;
      
      if (validatedMerged.conversionMethod === 'formula-based') {
        conversionValue = Math.round((validatedMerged.baseUnitWeight * 1000) / validatedMerged.weightPerDerivedUnit);
      } else if (validatedMerged.conversionMethod === 'direct-value') {
        conversionValue = validatedMerged.derivedValuePerBase;
      } else if (validatedMerged.conversionMethod === 'output-coverage') {
        conversionValue = validatedMerged.outputUnitsCovered;
      }
      
      usableUnits = Math.round(conversionValue * (1 - (lossPercent / 100)));
      
      // Create final update object from validated data (not req.body) to prevent null values from being persisted
      const updates = {
        ...validatedMerged,
        conversionValue,
        usableUnits,
      };
      
      const updated = await storage.updateRawMaterialType(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Raw material type not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating raw material type:", error);
      res.status(500).json({ message: "Failed to update raw material type" });
    }
  });

  app.delete('/api/raw-material-types/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRawMaterialType(id);
      res.json({ message: "Raw material type deleted successfully" });
    } catch (error) {
      console.error("Error deleting raw material type:", error);
      res.status(500).json({ message: "Failed to delete raw material type" });
    }
  });

  // Raw Materials API
  app.get('/api/raw-materials', isAuthenticated, async (req: any, res) => {
    try {
      const materials = await storage.getAllRawMaterials();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      res.status(500).json({ message: "Failed to fetch raw materials" });
    }
  });

  app.post('/api/raw-materials', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Auto-generate Material Code if not provided
      let materialCode = req.body.materialCode;
      if (!materialCode) {
        const allMaterials = await storage.getAllRawMaterials();
        const existingCodes = allMaterials
          .map(m => m.materialCode)
          .filter(code => code.startsWith('RM-'))
          .map(code => parseInt(code.replace('RM-', '')) || 0);
        
        const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
        materialCode = `RM-${nextNumber.toString().padStart(4, '0')}`;
      }
      
      // Fetch Type Master details if typeId is provided
      let typeDetails = null;
      if (req.body.typeId) {
        typeDetails = await storage.getRawMaterialType(req.body.typeId);
        if (!typeDetails) {
          return res.status(400).json({ message: "Invalid Material Type ID" });
        }
      }
      
      // Auto-calculate closing stock based on stock management mode
      let closingStock = null;
      let closingStockUsable = null;
      let currentStock = null;
      
      if (typeDetails) {
        // Default isOpeningStockOnly to 1 if not provided, normalize to number for comparison
        const isOpeningMode = req.body.isOpeningStockOnly === undefined ? 1 : Number(req.body.isOpeningStockOnly);
        const openingStockValue = req.body.openingStock != null ? Number(req.body.openingStock) : 0;
        
        if (isOpeningMode === 1) {
          // Opening Stock Entry Only mode (calculate even for zero quantities)
          closingStock = openingStockValue;
          closingStockUsable = Math.round(openingStockValue * (typeDetails.usableUnits || 0));
          currentStock = openingStockValue; // Set currentStock = openingStock in Opening Stock Only mode
        } else if (isOpeningMode === 0) {
          // Ongoing Inventory mode: closingStock = openingStock + received - returned + adjustments
          const received = Number(req.body.receivedQuantity || 0);
          const returned = Number(req.body.returnedQuantity || 0);
          const adjustments = Number(req.body.adjustments || 0);
          closingStock = openingStockValue + received - returned + adjustments;
          closingStockUsable = Math.round(closingStock * (typeDetails.usableUnits || 0));
          currentStock = closingStock; // Set currentStock = closingStock in Ongoing Inventory mode
        }
      }
      
      const materialData = { 
        ...req.body, 
        materialCode,
        closingStock,
        closingStockUsable,
        currentStock,
        createdBy: userId 
      };
      const validatedData = insertRawMaterialSchema.parse(materialData);
      const created = await storage.createRawMaterial(validatedData);
      
      // Return created material with type details
      res.json({ ...created, typeDetails });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating raw material:", error);
      res.status(500).json({ message: "Failed to create raw material" });
    }
  });

  app.get('/api/raw-materials/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const material = await storage.getRawMaterial(id);
      if (!material) {
        return res.status(404).json({ message: "Raw material not found" });
      }
      
      // Fetch Type Master details if typeId exists
      let typeDetails = null;
      if (material.typeId) {
        typeDetails = await storage.getRawMaterialType(material.typeId);
      }
      
      res.json({ ...material, typeDetails });
    } catch (error) {
      console.error("Error fetching raw material:", error);
      res.status(500).json({ message: "Failed to fetch raw material" });
    }
  });

  app.patch('/api/raw-materials/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Fetch existing material for merging
      const existing = await storage.getRawMaterial(id);
      if (!existing) {
        return res.status(404).json({ message: "Raw material not found" });
      }
      
      // Strip null values (Zod .optional() expects undefined, not null)
      const sanitized = Object.fromEntries(
        Object.entries(req.body).filter(([_, v]) => v !== null)
      );
      
      // Merge with existing data
      const merged = { ...existing, ...sanitized };
      
      // Fetch Type Master details if typeId exists
      let typeDetails = null;
      if (merged.typeId) {
        typeDetails = await storage.getRawMaterialType(merged.typeId);
        if (!typeDetails && req.body.typeId) {
          return res.status(400).json({ message: "Invalid Material Type ID" });
        }
      }
      
      // Recalculate closing stock if type details exist and stock fields changed
      let updates: any = { ...sanitized };
      if (typeDetails && (sanitized.isOpeningStockOnly !== undefined || sanitized.openingStock !== undefined || sanitized.receivedQuantity !== undefined || sanitized.returnedQuantity !== undefined || sanitized.adjustments !== undefined)) {
        // Default isOpeningStockOnly to 1 if not provided, normalize to number for comparison
        const isOpeningMode = merged.isOpeningStockOnly === undefined ? 1 : Number(merged.isOpeningStockOnly);
        const openingStockValue = merged.openingStock != null ? Number(merged.openingStock) : 0;
        
        if (isOpeningMode === 1) {
          // Opening Stock Entry Only mode (calculate even for zero quantities)
          updates.closingStock = openingStockValue;
          updates.closingStockUsable = Math.round(openingStockValue * (typeDetails.usableUnits || 0));
        } else if (isOpeningMode === 0) {
          // Ongoing Inventory mode: closingStock = openingStock + received - returned + adjustments
          const received = Number(merged.receivedQuantity || 0);
          const returned = Number(merged.returnedQuantity || 0);
          const adjustments = Number(merged.adjustments || 0);
          const closingStockValue = openingStockValue + received - returned + adjustments;
          updates.closingStock = closingStockValue;
          updates.closingStockUsable = Math.round(closingStockValue * (typeDetails.usableUnits || 0));
        }
      }
      
      const validatedData = insertRawMaterialSchema.partial().parse(updates);
      const updated = await storage.updateRawMaterial(id, validatedData);
      
      // Return updated material with type details
      res.json({ ...updated, typeDetails });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating raw material:", error);
      res.status(500).json({ message: "Failed to update raw material" });
    }
  });

  app.delete('/api/raw-materials/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRawMaterial(id);
      res.json({ message: "Raw material deleted successfully" });
    } catch (error) {
      console.error("Error deleting raw material:", error);
      res.status(500).json({ message: "Failed to delete raw material" });
    }
  });

  // Raw Material Transactions API
  app.post('/api/raw-material-transactions', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const transactionData = { ...req.body, performedBy: userId };
      const validatedData = insertRawMaterialTransactionSchema.parse(transactionData);
      const created = await storage.createRawMaterialTransaction(validatedData);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating raw material transaction:", error);
      res.status(500).json({ message: "Failed to create raw material transaction" });
    }
  });

  app.get('/api/raw-material-transactions/:materialId', isAuthenticated, async (req: any, res) => {
    try {
      const { materialId } = req.params;
      const transactions = await storage.getRawMaterialTransactions(materialId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching raw material transactions:", error);
      res.status(500).json({ message: "Failed to fetch raw material transactions" });
    }
  });

  // Finished Goods API
  app.get('/api/finished-goods', isAuthenticated, async (req: any, res) => {
    try {
      const goods = await storage.getAllFinishedGoods();
      res.json(goods);
    } catch (error) {
      console.error("Error fetching finished goods:", error);
      res.status(500).json({ message: "Failed to fetch finished goods" });
    }
  });

  app.post('/api/finished-goods', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const goodData = { ...req.body, createdBy: userId };
      const validatedData = insertFinishedGoodSchema.parse(goodData);
      const created = await storage.createFinishedGood(validatedData);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating finished good:", error);
      res.status(500).json({ message: "Failed to create finished good" });
    }
  });

  app.get('/api/finished-goods/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const good = await storage.getFinishedGood(id);
      if (!good) {
        return res.status(404).json({ message: "Finished good not found" });
      }
      res.json(good);
    } catch (error) {
      console.error("Error fetching finished good:", error);
      res.status(500).json({ message: "Failed to fetch finished good" });
    }
  });

  app.patch('/api/finished-goods/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertFinishedGoodSchema.partial().parse(req.body);
      const updated = await storage.updateFinishedGood(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "Finished good not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating finished good:", error);
      res.status(500).json({ message: "Failed to update finished good" });
    }
  });

  app.delete('/api/finished-goods/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFinishedGood(id);
      res.json({ message: "Finished good deleted successfully" });
    } catch (error) {
      console.error("Error deleting finished good:", error);
      res.status(500).json({ message: "Failed to delete finished good" });
    }
  });

  // Raw Material Issuance Routes
  app.get('/api/raw-material-issuances', isAuthenticated, async (req: any, res) => {
    try {
      const issuances = await storage.getAllRawMaterialIssuances();
      res.json(issuances);
    } catch (error) {
      console.error("Error fetching raw material issuances:", error);
      res.status(500).json({ message: "Failed to fetch raw material issuances" });
    }
  });

  app.post('/api/raw-material-issuances', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const { header, items } = req.body;
      
      // Validate header
      const validatedHeader = insertRawMaterialIssuanceSchema.parse(header);
      
      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one issuance item is required" });
      }
      
      // Create issuance header with auto-generated issuance number
      const issuanceNumber = `ISS-${Date.now()}`;
      const issuanceData = {
        ...validatedHeader,
        issuanceDate: validatedHeader.issuanceDate ? new Date(validatedHeader.issuanceDate).toISOString() : new Date().toISOString(),
        issuanceNumber,
        issuedBy: req.user?.id,
        plannedOutput: validatedHeader.plannedOutput?.toString(),
      };
      
      // Wrap everything in a transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Create issuance header
        const [issuance] = await tx.insert(rawMaterialIssuance).values([issuanceData]).returning();
        
        // Create items and deduct inventory for each
        for (const item of items) {
          // Clean empty string product IDs to null
          const cleanedItem = {
            ...item,
            productId: item.productId === '' ? null : item.productId,
            issuanceId: issuance.id
          };
          
          // Validate item with issuanceId included - keep as number for calculations
          const validatedItem = insertRawMaterialIssuanceItemSchema.parse(cleanedItem);
          
          // Get current material stock with row lock to prevent race conditions
          const [material] = await tx.select().from(rawMaterials)
            .where(and(eq(rawMaterials.id, validatedItem.rawMaterialId), eq(rawMaterials.recordStatus, 1)))
            .for('update');
          
          if (!material) {
            throw new Error(`Raw material ${validatedItem.rawMaterialId} not found`);
          }
          
          // Create issuance item - convert quantity to string for DB
          await tx.insert(rawMaterialIssuanceItems).values([{
            ...validatedItem,
            quantityIssued: validatedItem.quantityIssued.toString()
          }]);
          
          // Only deduct stock if material is in Ongoing Inventory mode (isOpeningStockOnly = 0 or false)
          // Handle both integer (0/1) and boolean (false/true) representations
          const isOngoingInventory = !material.isOpeningStockOnly || material.isOpeningStockOnly === 0;
          
          if (isOngoingInventory) {
            const newQuantity = (material.currentStock || 0) - validatedItem.quantityIssued;
            if (newQuantity < 0) {
              throw new Error(`Insufficient stock for material ${material.materialName}. Available: ${material.currentStock}, Required: ${validatedItem.quantityIssued}`);
            }
            
            // Deduct from inventory
            await tx.update(rawMaterials)
              .set({ currentStock: newQuantity, updatedAt: new Date().toISOString() })
              .where(eq(rawMaterials.id, validatedItem.rawMaterialId));
            
            // Create transaction record for audit trail
            await tx.insert(rawMaterialTransactions).values({
              materialId: validatedItem.rawMaterialId,
              transactionType: 'issue',
              quantity: -validatedItem.quantityIssued,
              reference: `Issuance ${issuanceNumber}`,
              remarks: validatedItem.remarks,
              performedBy: req.user?.id,
            });
            
            console.log(`[INVENTORY] Deducted ${validatedItem.quantityIssued} units from ${material.materialName}. New stock: ${newQuantity}`);
          } else {
            console.log(`[INVENTORY] Material ${material.materialName} is in Opening Stock Only mode - stock not deducted`);
          }
        }
        
        return issuance;
      });
      
      res.json({ issuance: result, message: "Issuance created successfully with items" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating raw material issuance:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create raw material issuance" });
    }
  });

  app.get('/api/raw-material-issuances/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const issuance = await storage.getRawMaterialIssuance(id);
      if (!issuance) {
        return res.status(404).json({ message: "Raw material issuance not found" });
      }
      
      // Fetch items for this issuance
      const items = await storage.getIssuanceItems(id);
      
      res.json({ ...issuance, items });
    } catch (error) {
      console.error("Error fetching raw material issuance:", error);
      res.status(500).json({ message: "Failed to fetch raw material issuance" });
    }
  });

  app.patch('/api/raw-material-issuances/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertRawMaterialIssuanceSchema.partial().parse(req.body);
      const issuance = await storage.updateRawMaterialIssuance(id, validatedData);
      if (!issuance) {
        return res.status(404).json({ message: "Raw material issuance not found" });
      }
      res.json(issuance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating raw material issuance:", error);
      res.status(500).json({ message: "Failed to update raw material issuance" });
    }
  });

  app.delete('/api/raw-material-issuances/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id} = req.params;
      await storage.deleteRawMaterialIssuance(id);
      res.json({ message: "Raw material issuance deleted successfully" });
    } catch (error) {
      console.error("Error deleting raw material issuance:", error);
      res.status(500).json({ message: "Failed to delete raw material issuance" });
    }
  });

  // Get issuance summary with product and BOM data
  app.get('/api/raw-material-issuances/:id/summary', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Fetch issuance with items
      const issuance = await storage.getRawMaterialIssuance(id);
      if (!issuance) {
        return res.status(404).json({ message: "Raw material issuance not found" });
      }
      
      const items = await storage.getIssuanceItems(id);
      
      // Fetch product details if linked
      let product = null;
      let bomItems = [];
      if (issuance.productId) {
        product = await storage.getProduct(issuance.productId);
        if (product) {
          // Fetch BOM with enriched type data
          const bom = await storage.getProductBom(issuance.productId);
          
          // Enrich BOM with raw material type details for conversion calculations
          bomItems = await Promise.all(
            bom.map(async (bomItem) => {
              const material = await storage.getRawMaterial(bomItem.rawMaterialId);
              let typeDetails = null;
              if (material?.typeId) {
                typeDetails = await storage.getRawMaterialType(material.typeId);
              }
              return {
                ...bomItem,
                material,
                typeDetails
              };
            })
          );
        }
      }
      
      res.json({
        issuance: { ...issuance, items },
        product,
        bomItems
      });
    } catch (error) {
      console.error("Error fetching issuance summary:", error);
      res.status(500).json({ message: "Failed to fetch issuance summary" });
    }
  });

  // Production Entry Routes
  app.get('/api/production-entries', isAuthenticated, async (req: any, res) => {
    try {
      const entries = await storage.getAllProductionEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching production entries:", error);
      res.status(500).json({ message: "Failed to fetch production entries" });
    }
  });

  app.post('/api/production-entries', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const entryData = req.body;
      
      // Validate entry data
      const validatedEntry = insertProductionEntrySchema.parse(entryData);
      
      // Fetch linked issuance to get product details for derivedUnits calculation
      const issuance = await storage.getRawMaterialIssuance(validatedEntry.issuanceId);
      if (!issuance) {
        return res.status(404).json({ message: "Linked raw material issuance not found" });
      }
      
      // Calculate derivedUnits if product is linked
      let derivedUnits = null;
      if (issuance.productId) {
        const product = await storage.getProduct(issuance.productId);
        if (product && product.usableDerivedUnits) {
          // derivedUnits = producedQuantity × usableDerivedUnits from Product Master
          derivedUnits = Number(validatedEntry.producedQuantity) * Number(product.usableDerivedUnits);
        }
      }
      
      // Create production entry with calculated derivedUnits
      const productionEntry = await storage.createProductionEntry({
        ...validatedEntry,
        derivedUnits: derivedUnits !== null ? derivedUnits : undefined,
        createdBy: req.user?.id,
      });
      
      // Automatically add produced goods to Finished Goods inventory
      if (issuance.productId && validatedEntry.producedQuantity > 0) {
        try {
          // Generate batch number: IssuanceNumber-Date-Shift
          const dateStr = new Date(validatedEntry.productionDate).toISOString().split('T')[0];
          const batchNumber = `${issuance.issuanceNumber}-${dateStr}-${validatedEntry.shift}`;
          
          // Create finished good record
          await storage.createFinishedGood({
            productId: issuance.productId,
            batchNumber,
            productionDate: validatedEntry.productionDate,
            quantity: Math.floor(Number(validatedEntry.producedQuantity)), // Convert to integer
            qualityStatus: 'pending', // Needs inspection/approval
            operatorId: req.user?.id,
            storageLocation: issuance.productionReference || null,
            remarks: `Auto-generated from Production Entry ${productionEntry.id}. Shift: ${validatedEntry.shift}`,
            createdBy: req.user?.id,
          });
          
          console.log(`[INVENTORY] Auto-added ${validatedEntry.producedQuantity} units of product ${issuance.productId} to Finished Goods (Batch: ${batchNumber})`);
        } catch (inventoryError) {
          console.error("[INVENTORY WARNING] Failed to auto-update Finished Goods:", inventoryError);
          // Don't fail the production entry creation if inventory update fails
        }
      }
      
      res.json({ entry: productionEntry, message: "Production entry created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      // Handle unique constraint violation (duplicate issuance/date/shift)
      if (error instanceof Error && error.message.includes('unique constraint')) {
        return res.status(409).json({ 
          message: "A production entry already exists for this issuance, date, and shift combination" 
        });
      }
      console.error("Error creating production entry:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create production entry" });
    }
  });

  // Production Reconciliation Routes
  app.get('/api/production-reconciliations', isAuthenticated, async (req: any, res) => {
    try {
      const reconciliations = await storage.getAllProductionReconciliations();
      res.json(reconciliations);
    } catch (error) {
      console.error("Error fetching production reconciliations:", error);
      res.status(500).json({ message: "Failed to fetch production reconciliations" });
    }
  });

  app.post('/api/production-reconciliations', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const { header, items } = req.body;
      
      // Validate header
      const validatedHeader = insertProductionReconciliationSchema.parse(header);
      
      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one reconciliation item is required" });
      }
      
      // Verify issuance exists
      const issuance = await storage.getRawMaterialIssuance(validatedHeader.issuanceId);
      if (!issuance) {
        return res.status(404).json({ message: "Raw material issuance not found" });
      }
      
      // Verify production entry exists if linked
      if (validatedHeader.productionEntryId) {
        const production = await storage.getProductionEntry(validatedHeader.productionEntryId);
        if (!production) {
          return res.status(404).json({ message: "Production entry not found" });
        }
      }
      
      // Check for duplicate reconciliation (issuance + shift)
      const existingReconciliations = await storage.getReconciliationsByIssuance(validatedHeader.issuanceId);
      const duplicate = existingReconciliations.find(r => r.shift === validatedHeader.shift);
      if (duplicate) {
        return res.status(409).json({ 
          message: `A reconciliation already exists for this issuance and shift (${validatedHeader.shift})` 
        });
      }
      
      // Generate reconciliation number
      const reconciliationNumber = `REC-${Date.now()}`;
      
      // Wrap everything in a transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Create reconciliation header
        const [reconciliation] = await tx.insert(productionReconciliations).values([{
          ...validatedHeader,
          reconciliationDate: validatedHeader.reconciliationDate ? new Date(validatedHeader.reconciliationDate).toISOString() : new Date().toISOString(),
          reconciliationNumber,
          editCount: 0,
          createdBy: req.user?.id,
        }]).returning();
        
        // Create items and update raw material inventory for returned materials
        for (const item of items) {
          const validatedItem = insertProductionReconciliationItemSchema.parse({
            ...item,
            reconciliationId: reconciliation.id
          });
          
          // Create reconciliation item
          await tx.insert(productionReconciliationItems).values(validatedItem);
          
          // If material was RETURNED, add it back to raw material inventory
          if (validatedItem.quantityReturned && Number(validatedItem.quantityReturned) > 0) {
            const [material] = await tx.select().from(rawMaterials)
              .where(and(eq(rawMaterials.id, validatedItem.rawMaterialId), eq(rawMaterials.recordStatus, 1)))
              .for('update');
            
            if (material) {
              const newStock = (material.currentStock || 0) + Number(validatedItem.quantityReturned);
              await tx.update(rawMaterials)
                .set({ currentStock: newStock, updatedAt: new Date().toISOString() })
                .where(eq(rawMaterials.id, validatedItem.rawMaterialId));
              
              // Create transaction record for audit trail
              await tx.insert(rawMaterialTransactions).values({
                materialId: validatedItem.rawMaterialId,
                transactionType: 'return',
                quantity: Number(validatedItem.quantityReturned),
                reference: `Reconciliation ${reconciliationNumber}`,
                remarks: validatedItem.remarks || `Returned from shift ${validatedHeader.shift}`,
                performedBy: req.user?.id,
              });
              
              console.log(`[INVENTORY] Returned ${validatedItem.quantityReturned} units of material ${validatedItem.rawMaterialId} to stock`);
            }
          }
        }
        
        return reconciliation;
      });
      
      res.json({ reconciliation: result, message: "Production reconciliation created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating production reconciliation:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create production reconciliation" });
    }
  });

  app.get('/api/production-reconciliations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const reconciliation = await storage.getProductionReconciliation(id);
      if (!reconciliation) {
        return res.status(404).json({ message: "Production reconciliation not found" });
      }
      
      // Fetch items for this reconciliation
      const items = await storage.getReconciliationItems(id);
      
      res.json({ ...reconciliation, items });
    } catch (error) {
      console.error("Error fetching production reconciliation:", error);
      res.status(500).json({ message: "Failed to fetch production reconciliation" });
    }
  });

  app.patch('/api/production-reconciliations/:id', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { header, items } = req.body;
      
      // Fetch existing reconciliation
      const existing = await storage.getProductionReconciliation(id);
      if (!existing) {
        return res.status(404).json({ message: "Production reconciliation not found" });
      }
      
      // Enforce edit limits: admin = unlimited, others = max 3 edits
      const isAdmin = req.user?.roleId === 'admin';
      const currentEditCount = existing.editCount || 0;
      const maxEdits = 3;
      
      if (!isAdmin && currentEditCount >= maxEdits) {
        return res.status(403).json({ 
          message: `Edit limit reached. Non-admin users can only edit this reconciliation ${maxEdits} times. Contact an administrator for further changes.` 
        });
      }
      
      // Increment edit count
      const newEditCount = currentEditCount + 1;
      
      // Wrap everything in transaction
      const result = await db.transaction(async (tx) => {
        // Update header if provided
        if (header) {
          const validatedHeader = insertProductionReconciliationSchema.partial().parse(header);
          const updateData: any = {
            ...validatedHeader,
            editCount: newEditCount,
            updatedAt: new Date().toISOString(),
          };
          // Convert reconciliationDate to ISO string if present
          if (validatedHeader.reconciliationDate) {
            updateData.reconciliationDate = new Date(validatedHeader.reconciliationDate).toISOString();
          }
          await tx.update(productionReconciliations)
            .set(updateData)
            .where(eq(productionReconciliations.id, id));
        }
        
        // Update items if provided
        if (items && Array.isArray(items)) {
          // Get existing items to detect quantity changes
          const existingItems = await storage.getReconciliationItems(id);
          
          for (const item of items) {
            if (item.id) {
              // Update existing item
              const validatedItem = insertProductionReconciliationItemSchema.partial().parse(item);
              const oldItem = existingItems.find(i => i.id === item.id);
              
              // If quantityReturned changed, adjust inventory
              if (oldItem && validatedItem.quantityReturned !== undefined) {
                const oldReturned = Number(oldItem.quantityReturned) || 0;
                const newReturned = Number(validatedItem.quantityReturned) || 0;
                const delta = newReturned - oldReturned;
                
                if (delta !== 0) {
                  const [material] = await tx.select().from(rawMaterials)
                    .where(and(eq(rawMaterials.id, oldItem.rawMaterialId), eq(rawMaterials.recordStatus, 1)))
                    .for('update');
                  
                  if (material) {
                    const newStock = (material.currentStock || 0) + delta;
                    await tx.update(rawMaterials)
                      .set({ currentStock: newStock, updatedAt: new Date().toISOString() })
                      .where(eq(rawMaterials.id, oldItem.rawMaterialId));
                    
                    // Create transaction record
                    await tx.insert(rawMaterialTransactions).values({
                      materialId: oldItem.rawMaterialId,
                      transactionType: delta > 0 ? 'return' : 'adjustment',
                      quantity: delta,
                      reference: `Reconciliation Edit ${existing.reconciliationNumber}`,
                      remarks: `Adjustment: ${oldReturned} → ${newReturned}`,
                      performedBy: req.user?.id,
                    });
                    
                    console.log(`[INVENTORY] Adjusted material ${oldItem.rawMaterialId} by ${delta} units`);
                  }
                }
              }
              
              await tx.update(productionReconciliationItems)
                .set({ ...validatedItem, updatedAt: new Date().toISOString() })
                .where(eq(productionReconciliationItems.id, item.id));
            }
          }
        }
        
        // Return updated reconciliation
        const [updated] = await tx.select().from(productionReconciliations)
          .where(eq(productionReconciliations.id, id));
        return updated;
      });
      
      res.json({ 
        reconciliation: result, 
        message: `Reconciliation updated successfully (Edit ${newEditCount}/${isAdmin ? '∞' : maxEdits})` 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating production reconciliation:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update production reconciliation" });
    }
  });

  app.delete('/api/production-reconciliations/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProductionReconciliation(id);
      res.json({ message: "Production reconciliation deleted successfully" });
    } catch (error) {
      console.error("Error deleting production reconciliation:", error);
      res.status(500).json({ message: "Failed to delete production reconciliation" });
    }
  });

  // Production Reconciliation Report
  app.get('/api/reports/production-reconciliation', isAuthenticated, async (req: any, res) => {
    try {
      const { dateFrom, dateTo, productId, batchId, shift } = req.query;

      // Build where conditions
      const conditions = [eq(productionReconciliations.recordStatus, 1)];
      
      if (dateFrom) {
        conditions.push(gte(productionReconciliations.reconciliationDate, new Date(dateFrom as string).toISOString()));
      }
      if (dateTo) {
        conditions.push(lte(productionReconciliations.reconciliationDate, new Date(dateTo as string).toISOString()));
      }
      if (shift && shift !== 'all') {
        conditions.push(eq(productionReconciliations.shift, shift as string));
      }

      // Fetch reconciliations with joins
      const reconciliations = await db
        .select({
          reconciliation: productionReconciliations,
          issuance: rawMaterialIssuance,
          production: productionEntries,
        })
        .from(productionReconciliations)
        .leftJoin(rawMaterialIssuance, eq(productionReconciliations.issuanceId, rawMaterialIssuance.id))
        .leftJoin(productionEntries, eq(productionReconciliations.productionEntryId, productionEntries.id))
        .where(and(...conditions))
        .orderBy(desc(productionReconciliations.reconciliationDate));

      // Apply product/batch filters
      let filteredReconciliations = reconciliations;
      if (productId) {
        filteredReconciliations = filteredReconciliations.filter(r => 
          r.issuance?.productId === productId
        );
      }
      if (batchId) {
        filteredReconciliations = filteredReconciliations.filter(r => 
          r.production?.id === batchId
        );
      }

      // Fetch detailed data for each reconciliation
      const reportData = await Promise.all(
        filteredReconciliations.map(async (r) => {
          // Fetch reconciliation items
          const items = await db
            .select({
              item: productionReconciliationItems,
              rawMaterial: rawMaterials,
              rawMaterialType: rawMaterialTypes,
            })
            .from(productionReconciliationItems)
            .leftJoin(rawMaterials, eq(productionReconciliationItems.rawMaterialId, rawMaterials.id))
            .leftJoin(rawMaterialTypes, eq(rawMaterials.typeId, rawMaterialTypes.id))
            .where(eq(productionReconciliationItems.reconciliationId, r.reconciliation.id));

          // Fetch product and BOM data
          let product = null;
          let bomItems: any[] = [];
          if (r.issuance?.productId) {
            [product] = await db.select().from(products).where(eq(products.id, r.issuance.productId));
            
            if (product) {
              bomItems = await db
                .select({
                  bom: productBom,
                  rawMaterial: rawMaterials,
                  rawMaterialType: rawMaterialTypes,
                })
                .from(productBom)
                .leftJoin(rawMaterials, eq(productBom.rawMaterialId, rawMaterials.id))
                .leftJoin(rawMaterialTypes, eq(rawMaterials.typeId, rawMaterialTypes.id))
                .where(eq(productBom.productId, product.id));
            }
          }

          // Calculate metrics for each material
          const materialDetails = items.map(i => {
            const netConsumed = (i.item.quantityUsed || 0) - (i.item.quantityReturned || 0) - (i.item.quantityPending || 0);
            
            // Find expected quantity from BOM
            const bomItem = bomItems.find(b => b.rawMaterial?.id === i.rawMaterial?.id);
            const expectedPerCase = bomItem?.bom?.quantityRequired || 0;
            
            // Calculate expected based on production quantity
            const producedCases = r.production?.producedQuantity ? parseInt(r.production.producedQuantity) : 0;
            const expectedTotal = expectedPerCase * producedCases;
            
            // Calculate variance
            const variance = netConsumed - expectedTotal;
            const variancePercent = expectedTotal > 0 ? (variance / expectedTotal) * 100 : 0;

            return {
              rawMaterialId: i.rawMaterial?.id,
              materialName: i.rawMaterial?.materialName || 'Unknown',
              materialType: i.rawMaterialType?.typeName || 'Unknown',
              baseUnit: i.rawMaterialType?.baseUnit || '',
              quantityIssued: i.item.quantityIssued,
              quantityUsed: i.item.quantityUsed,
              quantityReturned: i.item.quantityReturned,
              quantityPending: i.item.quantityPending,
              netConsumed,
              expectedTotal,
              variance,
              variancePercent,
            };
          });

          // Calculate overall efficiency
          const totalNetConsumed = materialDetails.reduce((sum, m) => sum + m.netConsumed, 0);
          const totalExpected = materialDetails.reduce((sum, m) => sum + m.expectedTotal, 0);
          const efficiency = totalExpected > 0 ? (totalExpected / totalNetConsumed) * 100 : 0;

          // Calculate yield percentage
          const producedCases = r.production?.producedQuantity ? parseInt(r.production.producedQuantity) : 0;
          const derivedPerBase = product?.derivedValuePerBase ? parseFloat(product.derivedValuePerBase) : 12;
          const producedBottles = producedCases * derivedPerBase;
          const expectedCases = r.issuance?.plannedOutput ? parseFloat(r.issuance.plannedOutput) : 0;
          const yieldPercent = expectedCases > 0 ? (producedCases / expectedCases) * 100 : 0;

          return {
            reconciliationNumber: r.reconciliation.reconciliationNumber,
            reconciliationDate: r.reconciliation.reconciliationDate,
            shift: r.reconciliation.shift,
            issuanceNumber: r.issuance?.issuanceNumber || '',
            productionId: r.production?.id || '',
            productId: product?.id || '',
            productName: product?.productName || '',
            producedCases,
            producedBottles,
            yieldPercent,
            efficiency,
            materials: materialDetails,
          };
        })
      );

      res.json({ reportData });
    } catch (error) {
      console.error("Error generating production reconciliation report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Production Variance Analytics - Aggregate variance trends by time period
  app.get('/api/analytics/variance', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { period = 'monthly', year } = req.query;
      const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

      // Fetch all reconciliations for the year
      const yearReconciliations = await db
        .select({
          reconciliation: productionReconciliations,
          issuance: rawMaterialIssuance,
          production: productionEntries,
        })
        .from(productionReconciliations)
        .leftJoin(rawMaterialIssuance, eq(productionReconciliations.issuanceId, rawMaterialIssuance.id))
        .leftJoin(productionEntries, eq(productionReconciliations.productionEntryId, productionEntries.id))
        .where(
          and(
            eq(productionReconciliations.recordStatus, 1),
            gte(productionReconciliations.reconciliationDate, new Date(currentYear, 0, 1).toISOString()),
            lte(productionReconciliations.reconciliationDate, new Date(currentYear, 11, 31, 23, 59, 59).toISOString())
          )
        )
        .orderBy(productionReconciliations.reconciliationDate);

      // Fetch all reconciliation items for variance analysis (scoped to year's reconciliations)
      const reconciliationIds = yearReconciliations.map(r => r.reconciliation.id);
      const allItems = reconciliationIds.length > 0 ? await db
        .select({
          item: productionReconciliationItems,
          rawMaterial: rawMaterials,
        })
        .from(productionReconciliationItems)
        .leftJoin(rawMaterials, eq(productionReconciliationItems.rawMaterialId, rawMaterials.id))
        .where(
          and(
            eq(productionReconciliationItems.recordStatus, 1),
            inArray(productionReconciliationItems.reconciliationId, reconciliationIds)
          )
        ) : [];

      // Helper function to get period key and index from date
      const getPeriodInfo = (date: Date, periodType: string) => {
        const month = date.getMonth() + 1; // 1-12
        const isoWeek = getISOWeek(date);
        
        if (periodType === 'weekly') {
          return { key: `Week ${isoWeek} ${currentYear}`, index: isoWeek };
        } else if (periodType === 'monthly') {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return { key: `${monthNames[month-1]} ${currentYear}`, index: month };
        } else if (periodType === 'quarterly') {
          const quarter = Math.ceil(month / 3);
          return { key: `Q${quarter} ${currentYear}`, index: quarter };
        } else { // yearly
          return { key: `${currentYear}`, index: 1 };
        }
      };

      // Helper function to get ISO week number
      const getISOWeek = (date: Date) => {
        const target = new Date(date.valueOf());
        const dayNr = (date.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const jan4 = new Date(target.getFullYear(), 0, 4);
        const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
        return 1 + Math.ceil(dayDiff / 7);
      };

      // Aggregate data by period
      const periodData: Record<string, {
        totalVariance: number;
        totalEfficiency: number;
        totalYield: number;
        reconciliationCount: number;
        goodCount: number;
        warningCount: number;
        criticalCount: number;
        index: number;
        materials: Record<string, { variance: number; count: number; name: string }>;
      }> = {};

      yearReconciliations.forEach(r => {
        const periodInfo = getPeriodInfo(new Date(r.reconciliation.reconciliationDate), period as string);
        
        if (!periodData[periodInfo.key]) {
          periodData[periodInfo.key] = {
            totalVariance: 0,
            totalEfficiency: 0,
            totalYield: 0,
            reconciliationCount: 0,
            goodCount: 0,
            warningCount: 0,
            criticalCount: 0,
            index: periodInfo.index,
            materials: {},
          };
        }

        const data = periodData[periodInfo.key];
        data.reconciliationCount += 1;
        // Note: efficiency and yieldPercent are calculated values, not stored in reconciliation table
        // These would need to be calculated from related production data if needed

        // Get items for this reconciliation and calculate variance
        const reconciliationItems = allItems.filter(i => i.item.reconciliationId === r.reconciliation.id);
        let maxVariancePercent = 0;

        reconciliationItems.forEach(i => {
          // Note: variancePercent and variance are calculated values, not stored in reconciliation_items table
          // Calculate variance: (quantityUsed - quantityIssued) / quantityIssued * 100
          const quantityIssued = i.item.quantityIssued || 0;
          const quantityUsed = i.item.quantityUsed || 0;
          const variance = quantityUsed - quantityIssued;
          const variancePercent = quantityIssued > 0 ? (variance / quantityIssued) * 100 : 0;
          const absVariancePercent = Math.abs(variancePercent);
          
          if (absVariancePercent > maxVariancePercent) {
            maxVariancePercent = absVariancePercent;
          }

          // Track material-specific variance
          const materialId = i.item.rawMaterialId;
          if (materialId) {
            if (!data.materials[materialId]) {
              data.materials[materialId] = {
                variance: 0,
                count: 0,
                name: i.rawMaterial?.materialName || 'Unknown',
              };
            }
            data.materials[materialId].variance += Math.abs(variance);
            data.materials[materialId].count += 1;
          }
        });

        // Categorize by status
        if (maxVariancePercent <= 2) {
          data.goodCount += 1;
        } else if (maxVariancePercent <= 5) {
          data.warningCount += 1;
        } else {
          data.criticalCount += 1;
        }

        data.totalVariance += maxVariancePercent;
      });

      // Convert to array and calculate averages
      const analytics = Object.entries(periodData).map(([period, data]) => ({
        period,
        avgVariance: data.reconciliationCount > 0 ? data.totalVariance / data.reconciliationCount : 0,
        avgEfficiency: data.reconciliationCount > 0 ? data.totalEfficiency / data.reconciliationCount : 0,
        avgYield: data.reconciliationCount > 0 ? data.totalYield / data.reconciliationCount : 0,
        reconciliationCount: data.reconciliationCount,
        goodCount: data.goodCount,
        warningCount: data.warningCount,
        criticalCount: data.criticalCount,
        periodIndex: data.index,
        materials: data.materials,
      })).sort((a, b) => a.periodIndex - b.periodIndex);

      // Calculate totals and top materials
      const totals = {
        totalReconciliations: analytics.reduce((sum, p) => sum + p.reconciliationCount, 0),
        avgVariance: analytics.length > 0 ? analytics.reduce((sum, p) => sum + p.avgVariance, 0) / analytics.length : 0,
        avgEfficiency: analytics.length > 0 ? analytics.reduce((sum, p) => sum + p.avgEfficiency, 0) / analytics.length : 0,
        avgYield: analytics.length > 0 ? analytics.reduce((sum, p) => sum + p.avgYield, 0) / analytics.length : 0,
        totalGood: analytics.reduce((sum, p) => sum + p.goodCount, 0),
        totalWarning: analytics.reduce((sum, p) => sum + p.warningCount, 0),
        totalCritical: analytics.reduce((sum, p) => sum + p.criticalCount, 0),
      };

      // Aggregate material variance across all periods
      const materialVarianceMap: Record<string, { variance: number; count: number; name: string }> = {};
      analytics.forEach(a => {
        Object.entries(a.materials).forEach(([materialId, material]) => {
          if (!materialVarianceMap[materialId]) {
            materialVarianceMap[materialId] = { variance: 0, count: 0, name: material.name };
          }
          materialVarianceMap[materialId].variance += material.variance;
          materialVarianceMap[materialId].count += material.count;
        });
      });

      // Get top 10 materials with highest variance
      const topMaterials = Object.entries(materialVarianceMap)
        .map(([materialId, data]) => ({
          materialId,
          materialName: data.name,
          avgVariance: data.count > 0 ? data.variance / data.count : 0,
          totalVariance: data.variance,
          occurrences: data.count,
        }))
        .sort((a, b) => b.avgVariance - a.avgVariance)
        .slice(0, 10);

      res.json({ analytics, totals, topMaterials, year: currentYear, period });
    } catch (error) {
      console.error("Error generating variance analytics:", error);
      res.status(500).json({ message: "Failed to generate variance analytics" });
    }
  });

  // Gatepass Routes
  app.get('/api/gatepasses', isAuthenticated, async (req: any, res) => {
    try {
      const { page, pageSize, searchQuery, status, dateFrom, dateTo } = req.query;
      
      const allGatepasses = await storage.getAllGatepasses();
      
      // Get unique statuses for filter dropdown (from all data for consistency)
      const uniqueStatuses = Array.from(new Set(allGatepasses.map(gp => gp.status))).filter(Boolean);
      
      // Parse pagination parameters with defaults (always paginate)
      const parsedPage = page ? parseInt(page as string) : 1;
      const parsedPageSize = pageSize ? parseInt(pageSize as string) : 25;
      
      // Apply filters
      let filteredGatepasses = [...allGatepasses];
      
      // Search filter (gatepassNumber, vehicleNumber, driverName, customerName)
      if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredGatepasses = filteredGatepasses.filter(gp =>
          gp.gatepassNumber.toLowerCase().includes(query) ||
          (gp.vehicleNumber && gp.vehicleNumber.toLowerCase().includes(query)) ||
          (gp.driverName && gp.driverName.toLowerCase().includes(query)) ||
          (gp.customerName && gp.customerName.toLowerCase().includes(query))
        );
      }
      
      // Status filter
      if (status && status !== 'all') {
        filteredGatepasses = filteredGatepasses.filter(gp => gp.status === status);
      }
      
      // Date range filter
      if (dateFrom && dateTo) {
        const from = new Date(dateFrom as string);
        const to = new Date(dateTo as string);
        filteredGatepasses = filteredGatepasses.filter(gp => {
          const gpDate = new Date(gp.gatepassDate);
          return gpDate >= from && gpDate <= to;
        });
      }
      
      // Calculate pagination
      const totalItems = filteredGatepasses.length;
      const totalPages = Math.ceil(totalItems / parsedPageSize);
      const startIndex = (parsedPage - 1) * parsedPageSize;
      const endIndex = startIndex + parsedPageSize;
      
      // Slice data for current page
      const paginatedData = filteredGatepasses.slice(startIndex, endIndex);
      
      // ALWAYS return paginated response with metadata
      res.json({
        data: paginatedData,
        meta: {
          page: parsedPage,
          pageSize: parsedPageSize,
          totalItems,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPreviousPage: parsedPage > 1,
          filters: {
            statuses: uniqueStatuses
          }
        }
      });
    } catch (error) {
      console.error("Error fetching gatepasses:", error);
      res.status(500).json({ message: "Failed to fetch gatepasses" });
    }
  });

  app.post('/api/gatepasses', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const { header, items } = req.body;
      
      // Validate header
      const validatedHeader = insertGatepassSchema.parse(header);
      
      // *** ENFORCE INVOICE-FIRST WORKFLOW: Invoice is REQUIRED ***
      if (!validatedHeader.invoiceId) {
        return res.status(400).json({ 
          message: "Invoice is required. Gate passes can only be created from existing invoices (Invoice-First workflow)" 
        });
      }
      
      // Verify invoice exists
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, validatedHeader.invoiceId),
            eq(invoices.recordStatus, 1)
          )
        )
        .limit(1);
      
      if (!invoice) {
        return res.status(404).json({ 
          message: "Invoice not found or has been deleted" 
        });
      }
      
      // Check if invoice is already linked to another gatepass (one-to-one relationship)
      const existingGatepass = await db
        .select()
        .from(gatepasses)
        .where(
          and(
            eq(gatepasses.invoiceId, validatedHeader.invoiceId),
            eq(gatepasses.recordStatus, 1)
          )
        )
        .limit(1);
      
      if (existingGatepass.length > 0) {
        return res.status(400).json({ 
          message: "This invoice is already linked to another gatepass. Each invoice can only have one gatepass (one-to-one relationship)" 
        });
      }
      
      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one gatepass item is required" });
      }
      
      // Create gatepass header with auto-generated gatepass number
      const gatepassNumber = `GP-${Date.now()}`;
      const gatepassData = {
        ...validatedHeader,
        gatepassDate: validatedHeader.gatepassDate ? new Date(validatedHeader.gatepassDate).toISOString() : new Date().toISOString(),
        gatepassNumber,
        issuedBy: req.user?.id,
      };
      
      // Wrap everything in a transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Create gatepass header
        const [gatepass] = await tx.insert(gatepasses).values([gatepassData]).returning();
        
        // If gatepass is linked to an invoice, update invoice status to "dispatched"
        if (gatepass.invoiceId) {
          await tx.update(invoices)
            .set({ status: 'dispatched' })
            .where(eq(invoices.id, gatepass.invoiceId));
        }
        
        // Create items and deduct inventory for each
        for (const item of items) {
          // Validate item with gatepassId included
          const validatedItem = insertGatepassItemSchema.parse({
            ...item,
            gatepassId: gatepass.id
          });
          
          // Get current finished good stock with row lock to prevent race conditions
          const [finishedGood] = await tx.select().from(finishedGoods)
            .where(and(eq(finishedGoods.id, validatedItem.finishedGoodId), eq(finishedGoods.recordStatus, 1)))
            .for('update');
          
          if (!finishedGood) {
            throw new Error(`Finished good ${validatedItem.finishedGoodId} not found`);
          }
          
          const newQuantity = finishedGood.quantity - validatedItem.quantityDispatched;
          if (newQuantity < 0) {
            throw new Error(`Insufficient finished goods quantity. Available: ${finishedGood.quantity}, Required: ${validatedItem.quantityDispatched}`);
          }
          
          // Create gatepass item
          await tx.insert(gatepassItems).values(validatedItem);
          
          // Deduct from inventory
          await tx.update(finishedGoods)
            .set({ quantity: newQuantity, updatedAt: new Date().toISOString() })
            .where(eq(finishedGoods.id, validatedItem.finishedGoodId));
        }
        
        return gatepass;
      });
      
      res.json({ gatepass: result, message: "Gatepass created successfully with items" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating gatepass:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create gatepass" });
    }
  });

  app.get('/api/gatepasses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const gatepass = await storage.getGatepass(id);
      if (!gatepass) {
        return res.status(404).json({ message: "Gatepass not found" });
      }
      
      // Fetch items for this gatepass
      const items = await storage.getGatepassItems(id);
      
      res.json({ ...gatepass, items });
    } catch (error) {
      console.error("Error fetching gatepass:", error);
      res.status(500).json({ message: "Failed to fetch gatepass" });
    }
  });

  app.patch('/api/gatepasses/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertGatepassSchema.partial().parse(req.body);
      
      // Check if invoice is already linked to another gatepass (not this one)
      if (validatedData.invoiceId) {
        const existingGatepass = await db
          .select()
          .from(gatepasses)
          .where(
            and(
              eq(gatepasses.invoiceId, validatedData.invoiceId),
              eq(gatepasses.recordStatus, 1),
              ne(gatepasses.id, id) // Exclude the current gatepass being edited
            )
          )
          .limit(1);
        
        if (existingGatepass.length > 0) {
          return res.status(400).json({ 
            message: "This invoice is already linked to another gatepass and cannot be reused" 
          });
        }
      }
      
      const gatepass = await storage.updateGatepass(id, validatedData);
      if (!gatepass) {
        return res.status(404).json({ message: "Gatepass not found" });
      }
      res.json(gatepass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating gatepass:", error);
      res.status(500).json({ message: "Failed to update gatepass" });
    }
  });

  app.delete('/api/gatepasses/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // First, get all items from this gatepass to return inventory
      const gatepassItems = await storage.getGatepassItems(id);
      
      // Return inventory back to finished goods for each item
      for (const item of gatepassItems) {
        if (item.finishedGoodId) {
          const [finishedGood] = await db
            .select()
            .from(finishedGoods)
            .where(and(
              eq(finishedGoods.id, item.finishedGoodId),
              eq(finishedGoods.recordStatus, 1)
            ))
            .limit(1);
          
          if (finishedGood) {
            // Return the quantity back to finished goods inventory
            await db.update(finishedGoods)
              .set({ 
                quantity: (finishedGood.quantity || 0) + (item.quantityDispatched || 0),
                updatedAt: new Date().toISOString()
              })
              .where(eq(finishedGoods.id, item.finishedGoodId));
          }
        }
      }
      
      // Now delete the gatepass (soft delete)
      await storage.deleteGatepass(id);
      
      res.json({ 
        message: "Gatepass cancelled and inventory returned to finished goods successfully",
        itemsReturned: gatepassItems.length
      });
    } catch (error) {
      console.error("Error deleting gatepass:", error);
      res.status(500).json({ message: "Failed to delete gatepass" });
    }
  });

  // Record vehicle exit (Security gate operation)
  app.patch('/api/gatepasses/:id/vehicle-exit', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    const { id } = req.params;
    const { outTime, verifiedBy } = req.body;
    
    try {
      // === STEP 1: VALIDATE ALL INPUTS ===
      if (!outTime || !verifiedBy) {
        return res.status(400).json({ message: "outTime and verifiedBy are required" });
      }
      
      // === STEP 2: VALIDATE GATEPASS EXISTS AND STATUS ===
      const [existing] = await db.select().from(gatepasses).where(eq(gatepasses.id, id));
      if (!existing) {
        return res.status(404).json({ message: "Gatepass not found" });
      }
      
      if (existing.status !== 'generated') {
        return res.status(400).json({ 
          message: `Cannot record vehicle exit. Gatepass status must be 'generated' but is '${existing.status}'. Vehicle exit may have already been recorded.` 
        });
      }
      
      // === STEP 3: VALIDATE INVOICE STATUS (CRITICAL GUARD) ===
      // This prevents duplicate vehicle exits - invoice must be in "ready_for_gatepass" status
      if (existing.invoiceId) {
        const [linkedInvoice] = await db.select().from(invoices).where(eq(invoices.id, existing.invoiceId));
        if (!linkedInvoice) {
          return res.status(404).json({ message: "Linked invoice not found" });
        }
        
        if (linkedInvoice.status !== 'ready_for_gatepass') {
          return res.status(400).json({ 
            message: `Cannot record vehicle exit. Invoice status must be 'ready_for_gatepass' but is '${linkedInvoice.status}'. Vehicle exit may have already been recorded.` 
          });
        }
      }
      
      // === STEP 4: ALL VALIDATIONS PASSED - PERFORM TRANSACTIONAL UPDATE ===
      // CRITICAL: Use database transaction to prevent TOCTOU race conditions
      // Both gatepass and invoice updates succeed together or fail together (atomic)
      let updated;
      
      try {
        updated = await db.transaction(async (tx) => {
          // Update gatepass ONLY if status is still "generated"
          const updatedGatepasses = await tx.update(gatepasses)
            .set({
              outTime: new Date(outTime).toISOString(),
              verifiedBy,
              status: 'vehicle_out'
            })
            .where(
              and(
                eq(gatepasses.id, id),
                eq(gatepasses.status, 'generated')  // Atomic status guard
              )
            )
            .returning();
          
          // If 0 rows updated, gatepass status changed (race condition detected)
          if (updatedGatepasses.length === 0) {
            throw new ConflictError("Vehicle exit already recorded. Gatepass status is no longer 'generated'.");
          }
          
          const gatepass = updatedGatepasses[0];
          
          // Update linked invoice ONLY if status is still "ready_for_gatepass"
          if (gatepass.invoiceId) {
            const updatedInvoices = await tx.update(invoices)
              .set({
                status: 'dispatched',
                dispatchDate: new Date(outTime).toISOString(),
                vehicleNumber: gatepass.vehicleNumber,
                transportMode: 'Road'
              })
              .where(
                and(
                  eq(invoices.id, gatepass.invoiceId),
                  eq(invoices.status, 'ready_for_gatepass')  // Atomic status guard
                )
              )
              .returning();
            
            // If 0 rows updated, invoice status changed (race condition detected)
            if (updatedInvoices.length === 0) {
              throw new ConflictError("Vehicle exit already recorded. Invoice status is no longer 'ready_for_gatepass'.");
            }
          }
          
          // Both updates succeeded - return gatepass
          return gatepass;
        });
      } catch (error: any) {
        // Handle ConflictError (thrown from transaction) or its wrapped version
        // Drizzle wraps errors in TransactionRollbackError with originalError or cause property
        const conflictError = (error instanceof ConflictError) 
          ? error 
          : (error.originalError instanceof ConflictError ? error.originalError 
            : (error.cause instanceof ConflictError ? error.cause : null));
        
        if (conflictError) {
          return res.status(409).json({ 
            message: conflictError.message
          });
        }
        
        // Unexpected error - let it propagate to outer catch block
        throw error;
      }
      
      return res.json({ gatepass: updated, message: "Vehicle exit recorded successfully" });
    } catch (error) {
      console.error("Error recording vehicle exit:", error);
      return res.status(500).json({ message: "Failed to record vehicle exit" });
    }
  });

  // Capture Proof of Delivery (POD)
  app.patch('/api/gatepasses/:id/pod', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { podReceivedBy, podDate, podRemarks, podSignature } = req.body;
      
      if (!podReceivedBy || !podDate) {
        return res.status(400).json({ message: "podReceivedBy and podDate are required" });
      }
      
      // Signature is optional, but if provided, validate it
      if (podSignature) {
        if (typeof podSignature !== 'string' || !podSignature.startsWith('data:image/')) {
          return res.status(400).json({ message: "podSignature must be a valid base64 image" });
        }
        
        // Ensure signature has actual content (not just header)
        // A valid signature should be at least 100 characters (header + base64 data)
        if (podSignature.length < 100) {
          return res.status(400).json({ message: "podSignature must contain actual signature data" });
        }
        
        // Verify base64 portion exists and is not empty
        const base64Match = podSignature.match(/^data:image\/[a-z]+;base64,(.+)$/i);
        if (!base64Match || !base64Match[1] || base64Match[1].length < 50) {
          return res.status(400).json({ message: "podSignature must contain valid base64 encoded signature data" });
        }
      }
      
      // Verify gatepass is in "vehicle_out" status
      const [existing] = await db.select().from(gatepasses).where(eq(gatepasses.id, id));
      if (!existing) {
        return res.status(404).json({ message: "Gatepass not found" });
      }
      
      if (existing.status !== 'vehicle_out') {
        return res.status(400).json({ 
          message: `Cannot capture POD. Gatepass status must be 'vehicle_out' but is '${existing.status}'` 
        });
      }
      
      // Update gatepass with POD details
      const [updated] = await db.update(gatepasses)
        .set({
          podReceivedBy,
          podDate: new Date(podDate).toISOString(),
          podRemarks: podRemarks || null,
          podSignature: podSignature || null,
          status: 'delivered'
        })
        .where(eq(gatepasses.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Gatepass not found" });
      }
      
      // If gatepass has a linked invoice, update invoice status to "delivered"
      // Guard: Only update if invoice is currently in "dispatched" status (prevent out-of-order transitions)
      if (updated.invoiceId) {
        const [linkedInvoice] = await db.select().from(invoices).where(eq(invoices.id, updated.invoiceId));
        if (!linkedInvoice) {
          return res.status(404).json({ message: "Linked invoice not found" });
        }
        
        if (linkedInvoice.status !== 'dispatched') {
          return res.status(400).json({ 
            message: `Cannot capture POD. Invoice status must be 'dispatched' but is '${linkedInvoice.status}'. Please ensure vehicle exit was recorded first.` 
          });
        }
        
        await db.update(invoices)
          .set({
            status: 'delivered',
            deliveryDate: new Date(podDate).toISOString(),
            receivedBy: podReceivedBy,
            podRemarks: podRemarks || null
          })
          .where(eq(invoices.id, updated.invoiceId));
      }
      
      res.json({ gatepass: updated, message: "Proof of delivery captured successfully" });
    } catch (error) {
      console.error("Error capturing POD:", error);
      res.status(500).json({ message: "Failed to capture proof of delivery" });
    }
  });

  // Get gatepass items for a specific gatepass
  app.get('/api/gatepass-items/:gatepassId', isAuthenticated, async (req: any, res) => {
    try {
      const { gatepassId } = req.params;
      const items = await storage.getGatepassItems(gatepassId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching gatepass items:", error);
      res.status(500).json({ message: "Failed to fetch gatepass items" });
    }
  });

  // ==================== INVOICE TEMPLATE MANAGEMENT ====================
  
  // Get all invoice templates
  app.get('/api/invoice-templates', requireRole('admin'), async (req: any, res) => {
    try {
      const templates = await storage.getAllInvoiceTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching invoice templates:", error);
      res.status(500).json({ message: "Failed to fetch invoice templates" });
    }
  });

  // Get active invoice templates
  app.get('/api/invoice-templates/active', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getActiveInvoiceTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching active invoice templates:", error);
      res.status(500).json({ message: "Failed to fetch active invoice templates" });
    }
  });

  // Get default invoice template
  app.get('/api/invoice-templates/default', isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getDefaultInvoiceTemplate();
      res.json(template);
    } catch (error) {
      console.error("Error fetching default invoice template:", error);
      res.status(500).json({ message: "Failed to fetch default invoice template" });
    }
  });

  // Get single invoice template
  app.get('/api/invoice-templates/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getInvoiceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Invoice template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching invoice template:", error);
      res.status(500).json({ message: "Failed to fetch invoice template" });
    }
  });

  // Create invoice template
  app.post('/api/invoice-templates', requireRole('admin'), async (req: any, res) => {
    try {
      const template = await storage.createInvoiceTemplate(req.body);
      res.json({ template, message: "Invoice template created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating invoice template:", error);
      res.status(500).json({ message: "Failed to create invoice template" });
    }
  });

  // Update invoice template
  app.patch('/api/invoice-templates/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateInvoiceTemplate(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Invoice template not found" });
      }
      res.json({ template: updated, message: "Invoice template updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating invoice template:", error);
      res.status(500).json({ message: "Failed to update invoice template" });
    }
  });

  // Delete invoice template
  app.delete('/api/invoice-templates/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInvoiceTemplate(id);
      res.json({ message: "Invoice template deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice template:", error);
      res.status(500).json({ message: "Failed to delete invoice template" });
    }
  });

  // Set default invoice template
  app.post('/api/invoice-templates/:id/set-default', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.setDefaultInvoiceTemplate(id);
      res.json({ message: "Default invoice template set successfully" });
    } catch (error) {
      console.error("Error setting default invoice template:", error);
      res.status(500).json({ message: "Failed to set default invoice template" });
    }
  });

  // ==================== TERMS & CONDITIONS MANAGEMENT ====================
  
  // Get all terms & conditions
  app.get('/api/terms-conditions', requireRole('admin'), async (req: any, res) => {
    try {
      const tcs = await storage.getAllTermsConditions();
      res.json(tcs);
    } catch (error) {
      console.error("Error fetching terms & conditions:", error);
      res.status(500).json({ message: "Failed to fetch terms & conditions" });
    }
  });

  // Get active terms & conditions
  app.get('/api/terms-conditions/active', isAuthenticated, async (req: any, res) => {
    try {
      const tcs = await storage.getActiveTermsConditions();
      res.json(tcs);
    } catch (error) {
      console.error("Error fetching active terms & conditions:", error);
      res.status(500).json({ message: "Failed to fetch active terms & conditions" });
    }
  });

  // Get default terms & conditions
  app.get('/api/terms-conditions/default', isAuthenticated, async (req: any, res) => {
    try {
      const tc = await storage.getDefaultTermsConditions();
      res.json(tc);
    } catch (error) {
      console.error("Error fetching default terms & conditions:", error);
      res.status(500).json({ message: "Failed to fetch default terms & conditions" });
    }
  });

  // Get single terms & conditions
  app.get('/api/terms-conditions/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const tc = await storage.getTermsConditions(id);
      if (!tc) {
        return res.status(404).json({ message: "Terms & conditions not found" });
      }
      res.json(tc);
    } catch (error) {
      console.error("Error fetching terms & conditions:", error);
      res.status(500).json({ message: "Failed to fetch terms & conditions" });
    }
  });

  // Create terms & conditions
  app.post('/api/terms-conditions', requireRole('admin'), async (req: any, res) => {
    try {
      const tc = await storage.createTermsConditions(req.body);
      res.json({ tc, message: "Terms & conditions created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating terms & conditions:", error);
      res.status(500).json({ message: "Failed to create terms & conditions" });
    }
  });

  // Update terms & conditions
  app.patch('/api/terms-conditions/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateTermsConditions(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Terms & conditions not found" });
      }
      res.json({ tc: updated, message: "Terms & conditions updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating terms & conditions:", error);
      res.status(500).json({ message: "Failed to update terms & conditions" });
    }
  });

  // Delete terms & conditions
  app.delete('/api/terms-conditions/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTermsConditions(id);
      res.json({ message: "Terms & conditions deleted successfully" });
    } catch (error) {
      console.error("Error deleting terms & conditions:", error);
      res.status(500).json({ message: "Failed to delete terms & conditions" });
    }
  });

  // Set default terms & conditions
  app.post('/api/terms-conditions/:id/set-default', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.setDefaultTermsConditions(id);
      res.json({ message: "Default terms & conditions set successfully" });
    } catch (error) {
      console.error("Error setting default terms & conditions:", error);
      res.status(500).json({ message: "Failed to set default terms & conditions" });
    }
  });

  // ==================== INVOICE MANAGEMENT ====================
  
  // Get all invoices
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const { page, pageSize, sortBy, sortOrder, ...filters } = req.query;
      
      // If pagination params exist, use paginated endpoint
      if (page !== undefined && pageSize !== undefined) {
        const { paginationRequestSchema } = await import('@shared/schema');
        const paginationParams = paginationRequestSchema.parse({ page, pageSize, sortBy, sortOrder });
        
        // TODO: Optimize with database-level LIMIT/OFFSET for better scalability
        // Get all invoices first (loads all data into memory)
        let allInvoices = await storage.getAllInvoices();
        
        // Apply filters if any
        if (filters.status) {
          allInvoices = allInvoices.filter(inv => inv.status === filters.status);
        }
        if (filters.buyerName) {
          allInvoices = allInvoices.filter(inv => 
            inv.buyerName.toLowerCase().includes((filters.buyerName as string).toLowerCase())
          );
        }
        
        // Calculate pagination metadata
        const totalItems = allInvoices.length;
        const totalPages = Math.ceil(totalItems / paginationParams.pageSize);
        const startIndex = (paginationParams.page - 1) * paginationParams.pageSize;
        const endIndex = startIndex + paginationParams.pageSize;
        
        // Slice data for current page
        const paginatedData = allInvoices.slice(startIndex, endIndex);
        
        // Calculate aggregate statistics across ALL invoices (not just current page)
        const aggregateStats = {
          draft: allInvoices.filter(i => i.status === 'draft').length,
          ready_for_gatepass: allInvoices.filter(i => i.status === 'ready_for_gatepass').length,
          dispatched: allInvoices.filter(i => i.status === 'dispatched').length,
          delivered: allInvoices.filter(i => i.status === 'delivered').length,
        };
        
        return res.json({
          data: paginatedData,
          meta: {
            page: paginationParams.page,
            pageSize: paginationParams.pageSize,
            totalItems,
            totalPages,
            hasNextPage: paginationParams.page < totalPages,
            hasPreviousPage: paginationParams.page > 1,
            aggregateStats, // Include aggregate statistics for dashboard cards
          },
        });
      }
      
      // No pagination - return all invoices (for backwards compatibility)
      const allInvoices = await storage.getAllInvoices();
      res.json(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get available invoices (not yet linked to any gatepass)
  app.get('/api/invoices/available', isAuthenticated, async (req: any, res) => {
    try {
      const availableInvoices = await storage.getAvailableInvoices();
      res.json(availableInvoices);
    } catch (error) {
      console.error("Error fetching available invoices:", error);
      res.status(500).json({ message: "Failed to fetch available invoices" });
    }
  });

  // Get cancelled invoices report (for audit trail) - MUST be before :id route
  app.get('/api/invoices/cancelled', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { page = 1, pageSize = 20, dateFrom, dateTo, buyerName } = req.query;
      
      // Fetch all cancelled invoices (record_status = 0)
      let cancelledInvoices = await db.select()
        .from(invoices)
        .where(eq(invoices.recordStatus, 0))
        .orderBy(desc(invoices.updatedAt)); // Most recently cancelled first
      
      // Apply filters - use updatedAt as cancellation date since that's when record_status was set to 0
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        cancelledInvoices = cancelledInvoices.filter(inv => 
          new Date(inv.updatedAt!) >= fromDate
        );
      }
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        toDate.setHours(23, 59, 59, 999);
        cancelledInvoices = cancelledInvoices.filter(inv => 
          new Date(inv.updatedAt!) <= toDate
        );
      }
      if (buyerName) {
        cancelledInvoices = cancelledInvoices.filter(inv => 
          inv.buyerName.toLowerCase().includes((buyerName as string).toLowerCase())
        );
      }
      
      // For each cancelled invoice, try to find a replacement invoice
      // (same buyer, created after cancellation, with similar amount)
      const invoicesWithReplacements = await Promise.all(
        cancelledInvoices.map(async (cancelled) => {
          // Look for a replacement invoice created after this one was cancelled
          const possibleReplacements = await db.select()
            .from(invoices)
            .where(
              and(
                eq(invoices.buyerName, cancelled.buyerName),
                eq(invoices.recordStatus, 1),
                gt(invoices.createdAt, cancelled.updatedAt!) // Created after cancellation
              )
            )
            .orderBy(invoices.createdAt)
            .limit(1);
          
          const replacement = possibleReplacements.length > 0 ? possibleReplacements[0] : null;
          
          return {
            ...cancelled,
            replacementInvoiceId: replacement?.id || null,
            replacementInvoiceNumber: replacement?.invoiceNumber || null,
            cancellationDate: cancelled.updatedAt, // updatedAt reflects when it was cancelled
          };
        })
      );
      
      // Pagination
      const totalItems = invoicesWithReplacements.length;
      const totalPages = Math.ceil(totalItems / Number(pageSize));
      const startIndex = (Number(page) - 1) * Number(pageSize);
      const endIndex = startIndex + Number(pageSize);
      const paginatedData = invoicesWithReplacements.slice(startIndex, endIndex);
      
      res.json({
        data: paginatedData,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          totalItems,
          totalPages,
          hasNextPage: Number(page) < totalPages,
          hasPreviousPage: Number(page) > 1,
        }
      });
    } catch (error) {
      console.error("Error fetching cancelled invoices:", error);
      res.status(500).json({ message: "Failed to fetch cancelled invoices" });
    }
  });

  // Create invoice with items
  app.post('/api/invoices', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { header, items } = req.body;
      
      // Validate header
      const validatedHeader = insertInvoiceSchema.parse(header);
      
      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one invoice item is required" });
      }
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceData = {
        ...validatedHeader,
        invoiceDate: validatedHeader.invoiceDate ? new Date(validatedHeader.invoiceDate).toISOString() : new Date().toISOString(),
        dateOfSupply: validatedHeader.dateOfSupply ? new Date(validatedHeader.dateOfSupply).toISOString() : null,
        invoiceNumber,
        generatedBy: req.user?.id,
      };
      
      // Wrap in transaction
      const result = await db.transaction(async (tx) => {
        // Create invoice header
        const [invoice] = await tx.insert(invoices).values([invoiceData]).returning();
        
        // Create invoice items
        for (const item of items) {
          const validatedItem = insertInvoiceItemSchema.parse({
            ...item,
            invoiceId: invoice.id
          });
          
          await tx.insert(invoiceItems).values(validatedItem);
        }
        
        return invoice;
      });
      
      res.json({ invoice: result, message: "Invoice created successfully with items" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create invoice" });
    }
  });

  // Get single invoice with items
  app.get('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Fetch items for this invoice
      const items = await storage.getInvoiceItems(id);
      
      res.json({ ...invoice, items });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Update invoice
  app.patch('/api/invoices/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(id, validatedData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Delete invoice
  app.delete('/api/invoices/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if invoice has an associated gatepass
      const existingGatepass = await db
        .select()
        .from(gatepasses)
        .where(
          and(
            eq(gatepasses.invoiceId, id),
            eq(gatepasses.recordStatus, 1)
          )
        )
        .limit(1);
      
      if (existingGatepass.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete invoice. A gatepass has been created for this invoice. Please cancel the gatepass first.",
          gatepassNumber: existingGatepass[0].gatepassNumber
        });
      }
      
      await storage.deleteInvoice(id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Cancel & Reissue invoice (for current month corrections)
  app.post('/api/invoices/:id/cancel-and-reissue', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Fetch the invoice
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if invoice is in current month
      const now = new Date();
      const invoiceDate = new Date(invoice.invoiceDate);
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const invoiceMonth = invoiceDate.getMonth();
      const invoiceYear = invoiceDate.getFullYear();
      
      if (invoiceMonth !== currentMonth || invoiceYear !== currentYear) {
        return res.status(400).json({ 
          message: "Can only cancel & reissue invoices from the current month. For older invoices, use Credit Notes instead.",
          invoiceMonth: invoiceDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          currentMonth: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        });
      }
      
      // Check if invoice has an associated gatepass and cancel it too
      const existingGatepasses = await db
        .select()
        .from(gatepasses)
        .where(
          and(
            eq(gatepasses.invoiceId, id),
            eq(gatepasses.recordStatus, 1)
          )
        );
      
      // Fetch invoice items BEFORE cancellation
      const items = await storage.getInvoiceItems(id);
      
      // Use a transaction for atomicity
      await db.transaction(async (tx) => {
        // Track which gatepass numbers were cancelled for audit trail
        const cancelledGatepassNumbers: string[] = [];
        
        // Cancel any associated gatepasses
        for (const gatepass of existingGatepasses) {
          await tx.update(gatepasses)
            .set({ recordStatus: 0 })
            .where(eq(gatepasses.id, gatepass.id));
          
          cancelledGatepassNumbers.push(gatepass.gatepassNumber);
          console.log(`[CANCEL_REISSUE] Cancelled gatepass ${gatepass.gatepassNumber}`);
        }
        
        // Return finished goods inventory ONCE per invoice item (outside gatepass loop)
        // This prevents duplicate inventory returns if multiple gatepasses exist
        if (existingGatepasses.length > 0) {
          for (const item of items) {
            if (item.productId && item.quantity > 0) {
              const batchNumber = `CANCEL-${invoice.invoiceNumber}-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
              
              await tx.insert(finishedGoods).values({
                productId: item.productId,
                batchNumber,
                productionDate: new Date().toISOString(),
                quantity: item.quantity,
                qualityStatus: 'approved',
                remarks: `Inventory returned - Invoice ${invoice.invoiceNumber} cancelled & reissued. Gatepass(es): ${cancelledGatepassNumbers.join(', ')}`,
                createdBy: req.user?.id,
              });
              
              console.log(`[INVENTORY] Returned ${item.quantity} units of product ${item.productId} to inventory (Cancel & Reissue)`);
            }
          }
        }
        
        // Cancel the invoice (soft delete)
        await tx.update(invoices)
          .set({ recordStatus: 0 })
          .where(eq(invoices.id, id));
      });
      
      // Deep clean invoice data - remove ALL identifying fields to ensure fresh insert
      const { 
        id: invoiceId, 
        invoiceNumber, 
        gatepassId,
        createdAt, 
        updatedAt, 
        recordStatus,
        templateId,
        termsConditionsId,
        ...cleanInvoice 
      } = invoice;
      
      // Clean invoice items - remove all IDs and references
      const cleanItems = items.map(item => {
        const {
          id: itemId,
          invoiceId: itemInvoiceId,
          createdAt: itemCreatedAt,
          updatedAt: itemUpdatedAt,
          recordStatus: itemRecordStatus,
          ...cleanItem
        } = item;
        return cleanItem;
      });
      
      // Return invoice data for pre-filling the form with explicit reissue flag
      res.json({ 
        message: "Invoice cancelled successfully. Redirecting to create new invoice...",
        invoiceData: {
          ...cleanInvoice,
          items: cleanItems
        },
        isReissue: true  // Explicit flag to differentiate from edit mode
      });
    } catch (error) {
      console.error("Error in cancel & reissue:", error);
      res.status(500).json({ message: "Failed to cancel & reissue invoice" });
    }
  });

  // Update invoice status (for dispatch workflow)
  app.patch('/api/invoices/:id/status', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, dispatchDate, deliveryDate, receivedBy, podRemarks } = req.body;
      
      // Validate status
      const validStatuses = ['draft', 'ready_for_gatepass', 'dispatched', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      
      // Prepare update data
      const updateData: any = { status };
      if (dispatchDate) updateData.dispatchDate = new Date(dispatchDate);
      if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate);
      if (receivedBy) updateData.receivedBy = receivedBy;
      if (podRemarks) updateData.podRemarks = podRemarks;
      
      // Update invoice
      const [updated] = await db.update(invoices)
        .set(updateData)
        .where(eq(invoices.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json({ invoice: updated, message: `Invoice status updated to ${status}` });
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  // Get invoice items
  app.get('/api/invoice-items/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      const items = await storage.getInvoiceItems(invoiceId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ message: "Failed to fetch invoice items" });
    }
  });

  // GST Reports - Get invoices with items and HSN summary for a period
  app.post('/api/gst-reports', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { periodType, month, year } = req.body;
      
      // Validate input
      if (!periodType || !month || !year) {
        return res.status(400).json({ message: "periodType, month, and year are required" });
      }
      
      if (!['monthly', 'quarterly', 'annual'].includes(periodType)) {
        return res.status(400).json({ message: "periodType must be monthly, quarterly, or annual" });
      }
      
      // Calculate date range based on period type
      let startDate: Date;
      let endDate: Date;
      
      if (periodType === 'monthly') {
        startDate = new Date(year, month - 1, 1); // month is 1-indexed
        endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
      } else if (periodType === 'quarterly') {
        // month represents end of quarter (3, 6, 9, 12)
        const quarterStartMonth = month - 2;
        startDate = new Date(year, quarterStartMonth, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        // Annual
        startDate = new Date(year, 0, 1); // Jan 1
        endDate = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31
      }
      
      // Fetch invoices with items
      const invoicesWithItems = await storage.getInvoicesWithItemsByPeriod(startDate, endDate);
      
      // Fetch credit notes for the period (both auto and manual)
      const allCreditNotes = await db.select().from(creditNotes)
        .where(
          and(
            eq(creditNotes.recordStatus, 1),
            eq(creditNotes.status, 'issued'),
            gte(creditNotes.creditDate, startDate.toISOString().split('T')[0]),
            lte(creditNotes.creditDate, endDate.toISOString().split('T')[0])
          )
        );
      
      // Get related invoice data for each credit note
      const creditNotesWithInvoice = await Promise.all(
        allCreditNotes.map(async (cn) => {
          const invoice = await storage.getInvoice(cn.invoiceId);
          const items = await storage.getInvoiceItems(cn.invoiceId);
          return {
            creditNote: cn,
            invoice: invoice!,
            items
          };
        })
      );
      
      // Aggregate HSN summary
      const hsnMap = new Map<string, any>();
      let totalTaxableValue = 0;
      let totalTax = 0;
      
      for (const { invoice, items } of invoicesWithItems) {
        for (const item of items) {
          const hsnCode = item.hsnCode || 'UNCLASSIFIED';
          const qty = item.quantity || 0;
          const taxableAmt = (item.taxableAmount || 0) / 100; // Convert paise to rupees
          const cgst = (item.cgstAmount || 0) / 100;
          const sgst = (item.sgstAmount || 0) / 100;
          const igst = (item.igstAmount || 0) / 100;
          const cess = (item.cessAmount || 0) / 100;
          
          // Get UOM (you may need to fetch this from the UOM table if uomId is present)
          const uom = 'NOS'; // Default, could be fetched from database if needed
          
          if (!hsnMap.has(hsnCode)) {
            hsnMap.set(hsnCode, {
              hsnCode,
              description: item.description || '',
              uom,
              quantity: 0,
              taxableValue: 0,
              cgstAmount: 0,
              sgstAmount: 0,
              igstAmount: 0,
              cessAmount: 0,
              taxRate: 0,
            });
          }
          
          const hsnEntry = hsnMap.get(hsnCode);
          hsnEntry.quantity += qty;
          hsnEntry.taxableValue += taxableAmt;
          hsnEntry.cgstAmount += cgst;
          hsnEntry.sgstAmount += sgst;
          hsnEntry.igstAmount += igst;
          hsnEntry.cessAmount += cess;
          
          totalTaxableValue += taxableAmt;
          totalTax += cgst + sgst + igst + cess;
        }
      }
      
      // Calculate average tax rate for each HSN
      const hsnSummary = Array.from(hsnMap.values()).map(hsn => {
        const totalHsnTax = hsn.cgstAmount + hsn.sgstAmount + hsn.igstAmount;
        hsn.taxRate = hsn.taxableValue > 0 
          ? Number(((totalHsnTax / hsn.taxableValue) * 100).toFixed(2))
          : 0;
        return hsn;
      });
      
      // Build response
      const response = {
        invoices: invoicesWithItems,
        creditNotes: creditNotesWithInvoice,
        hsnSummary,
        metadata: {
          period: `${month.toString().padStart(2, '0')}${year}`,
          periodType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalInvoices: invoicesWithItems.length,
          totalCreditNotes: creditNotesWithInvoice.length,
          totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
          totalTax: Number(totalTax.toFixed(2)),
        },
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error generating GST report:", error);
      res.status(500).json({ message: "Failed to generate GST report" });
    }
  });

  // Invoice Payment Tracking API
  // Get pending payments (invoices with outstanding balance) - with pagination
  // TODO: Optimize with database-level pagination (LIMIT/OFFSET) and JOIN queries for better scalability
  // Current implementation loads all invoices/payments into memory then filters/slices
  app.get('/api/pending-payments', isAuthenticated, async (req: any, res) => {
    try {
      const { page, pageSize, customer } = req.query;
      
      // Get all invoices and payments (NOTE: Not scalable for very large datasets)
      const allInvoices = await storage.getAllInvoices();
      const allPayments = await storage.getAllPayments();
      
      // Calculate outstanding balance for each invoice
      const invoicesWithBalance = allInvoices.map(invoice => {
        const payments = allPayments.filter(p => p.invoiceId === invoice.id);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const outstandingBalance = Math.max(0, invoice.totalAmount - totalPaid);
        
        return {
          ...invoice,
          totalPaid,
          outstandingBalance,
          isOverpaid: (invoice.totalAmount - totalPaid) < 0,
        };
      });
      
      // Filter to only pending invoices (outstanding > 0)
      let pendingInvoices = invoicesWithBalance.filter(inv => inv.outstandingBalance > 0);
      
      // Apply customer filter if provided
      if (customer) {
        pendingInvoices = pendingInvoices.filter(inv => inv.buyerName === customer);
      }
      
      // Sort by invoice date (oldest first)
      pendingInvoices.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
      
      // Calculate aggregate statistics
      const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0);
      const totalCount = pendingInvoices.length;
      
      // Parse pagination params or use defaults to always return consistent format
      const { paginationRequestSchema } = await import('@shared/schema');
      const paginationParams = paginationRequestSchema.parse({ 
        page: page || 1, 
        pageSize: pageSize || 1000 
      });
      
      const totalPages = Math.ceil(totalCount / paginationParams.pageSize);
      const startIndex = (paginationParams.page - 1) * paginationParams.pageSize;
      const endIndex = startIndex + paginationParams.pageSize;
      const paginatedData = pendingInvoices.slice(startIndex, endIndex);
      
      res.json({
        data: paginatedData,
        meta: {
          page: paginationParams.page,
          pageSize: paginationParams.pageSize,
          totalItems: totalCount,
          totalPages,
          hasNextPage: paginationParams.page < totalPages,
          hasPreviousPage: paginationParams.page > 1,
          aggregateStats: {
            totalOutstanding,
            totalCount,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      res.status(500).json({ message: "Failed to fetch pending payments" });
    }
  });
  
  // Get all payments (optionally filtered by invoice)
  app.get('/api/invoice-payments', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.query;
      if (invoiceId) {
        const payments = await storage.getPaymentsByInvoice(invoiceId as string);
        res.json(payments);
      } else {
        const allPayments = await storage.getAllPayments();
        res.json(allPayments);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Get payments for a specific invoice
  app.get('/api/invoice-payments/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      const payments = await storage.getPaymentsByInvoice(invoiceId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching invoice payments:", error);
      res.status(500).json({ message: "Failed to fetch invoice payments" });
    }
  });

  // Record a payment
  app.post('/api/invoice-payments', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertInvoicePaymentSchema.parse({
        ...req.body,
        recordedBy: req.user?.id,
      });

      // Check outstanding balance to prevent overpayments
      const invoice = await storage.getInvoice(validatedData.invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const existingPayments = await storage.getPaymentsByInvoice(validatedData.invoiceId);
      const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstandingBalance = invoice.totalAmount - totalPaid;

      if (validatedData.amount > outstandingBalance) {
        return res.status(400).json({ 
          message: `Payment amount (₹${(validatedData.amount / 100).toFixed(2)}) exceeds outstanding balance (₹${(outstandingBalance / 100).toFixed(2)})` 
        });
      }

      const payment = await storage.createPayment(validatedData);
      await logAudit(req.user?.id, 'CREATE', 'invoice_payments', payment.id, `Recorded payment of ₹${(payment.amount / 100).toFixed(2)} for invoice ${payment.invoiceId}`);
      res.json({ payment, message: "Payment recorded successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error recording payment:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  // Write off outstanding balance for an invoice
  app.post('/api/invoice-payments/write-off', requireRole('admin'), async (req: any, res) => {
    try {
      // Validate input
      const schema = z.object({
        invoiceId: z.string().min(1, 'Invoice ID is required'),
        remarks: z.string().optional(),
      });

      const validatedData = schema.parse(req.body);
      const { invoiceId, remarks } = validatedData;

      // Use transaction to prevent race conditions
      const result = await db.transaction(async (tx) => {
        // Get invoice with lock to prevent concurrent write-offs
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, invoiceId))
          .for('update');

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Calculate outstanding balance within transaction
        const existingPayments = await tx
          .select()
          .from(invoicePayments)
          .where(and(
            eq(invoicePayments.invoiceId, invoiceId),
            eq(invoicePayments.recordStatus, 1)
          ));

        const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
        const outstandingBalance = invoice.totalAmount - totalPaid;

        if (outstandingBalance <= 0) {
          throw new Error('No outstanding balance to write off');
        }

        // Create write-off payment
        const [writeOffPayment] = await tx.insert(invoicePayments).values({
          invoiceId,
          paymentDate: new Date().toISOString(),
          amount: outstandingBalance,
          paymentMethod: 'Write-off',
          paymentType: 'Write-off',
          referenceNumber: null,
          bankName: null,
          remarks: remarks || 'Outstanding balance written off',
          recordedBy: req.user?.id,
        }).returning();

        return { writeOffPayment, invoice, outstandingBalance };
      });

      await logAudit(
        req.user?.id,
        'CREATE',
        'invoice_payments',
        result.writeOffPayment.id,
        `Wrote off outstanding balance of ₹${(result.outstandingBalance / 100).toFixed(2)} for invoice ${result.invoice.invoiceNumber}`
      );

      res.json({ 
        payment: result.writeOffPayment, 
        message: `Successfully wrote off ₹${(result.outstandingBalance / 100).toFixed(2)}` 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('No outstanding'))) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error writing off payment:", error);
      res.status(500).json({ message: "Failed to write off payment" });
    }
  });

  // Delete a payment
  app.delete('/api/invoice-payments/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePayment(id);
      await logAudit(req.user?.id, 'DELETE', 'invoice_payments', id, 'Deleted payment record');
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  // Sales Returns API
  // Get all sales returns
  app.get('/api/sales-returns', isAuthenticated, async (req: any, res) => {
    try {
      const returns = await storage.getAllSalesReturns();
      res.json(returns);
    } catch (error) {
      console.error("Error fetching sales returns:", error);
      res.status(500).json({ message: "Failed to fetch sales returns" });
    }
  });

  // Create new sales return
  app.post('/api/sales-returns', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { header, items } = req.body;
      
      // Validate header
      const validatedHeader = insertSalesReturnSchema.parse({
        ...header,
        createdBy: req.user?.id,
      });
      
      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one return item is required" });
      }
      
      // Create return header using storage
      const salesReturn = await storage.createSalesReturn(validatedHeader);
      
      // Create return items using storage
      for (const item of items) {
        const validatedItem = insertSalesReturnItemSchema.parse({
          ...item,
          returnId: salesReturn.id,
        });
        await storage.createSalesReturnItem(validatedItem);
      }
      
      await logAudit(req.user?.id, 'CREATE', 'sales_returns', salesReturn.id, `Created sales return ${salesReturn.returnNumber}`);
      res.json({ salesReturn, message: "Sales return created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating sales return:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create sales return" });
    }
  });

  // Get specific sales return with items
  app.get('/api/sales-returns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const salesReturn = await storage.getSalesReturn(id);
      if (!salesReturn) {
        return res.status(404).json({ message: "Sales return not found" });
      }
      
      const items = await storage.getSalesReturnItems(id);
      res.json({ ...salesReturn, items });
    } catch (error) {
      console.error("Error fetching sales return:", error);
      res.status(500).json({ message: "Failed to fetch sales return" });
    }
  });

  // Mark return as received
  app.patch('/api/sales-returns/:id/receive', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { receivedDate } = req.body;
      
      const updated = await storage.updateSalesReturn(id, {
        status: 'received',
        receivedDate: new Date(receivedDate || Date.now()),
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Sales return not found" });
      }
      
      await logAudit(req.user?.id, 'UPDATE', 'sales_returns', id, 'Marked return as received');
      res.json({ salesReturn: updated, message: "Return marked as received" });
    } catch (error) {
      console.error("Error receiving sales return:", error);
      res.status(500).json({ message: "Failed to receive sales return" });
    }
  });

  // Inspect return and update inventory
  app.patch('/api/sales-returns/:id/inspect', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { inspections } = req.body; // Array of {itemId, condition, disposition}
      
      if (!inspections || !Array.isArray(inspections)) {
        return res.status(400).json({ message: "Inspection data required" });
      }
      
      // Get the sales return and invoice to check dates
      const salesReturn = await storage.getSalesReturn(id);
      if (!salesReturn) {
        return res.status(404).json({ message: "Sales return not found" });
      }
      
      const invoice = await storage.getInvoice(salesReturn.invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if return is within 1 month of invoice (30 days)
      // GST Compliance: Credit notes for same tax period can be auto-generated.
      // Returns >1 month old require manual GST-compliant processing.
      const invoiceDate = new Date(invoice.invoiceDate);
      const inspectionDate = new Date(); // Current date = when inspection is being recorded
      
      // Calculate days between invoice and inspection
      const daysDifference = Math.floor((inspectionDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      const isWithinOneMonth = daysDifference <= 30;
      
      const isSameMonth = 
        invoiceDate.getFullYear() === inspectionDate.getFullYear() &&
        invoiceDate.getMonth() === inspectionDate.getMonth();
      
      let creditNoteCreated = false;
      let creditNoteNumber = '';
      let manualProcessingRequired = false;
      
      await db.transaction(async (tx) => {
        // Update each return item with inspection results
        for (const inspection of inspections) {
          await tx.update(salesReturnItems)
            .set({
              conditionOnReceipt: inspection.condition,
              disposition: inspection.disposition,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(salesReturnItems.id, inspection.itemId));
          
          // Get the return item details
          const [item] = await tx.select().from(salesReturnItems)
            .where(eq(salesReturnItems.id, inspection.itemId));
          
          if (!item) continue;
          
          // Update inventory based on disposition
          if (inspection.disposition === 'restock' && inspection.condition === 'good') {
            // Return good items to finished goods inventory
            const [product] = await tx.select().from(products)
              .where(eq(products.id, item.productId));
            
            if (product) {
              // Create new finished good record for returned items
              await tx.insert(finishedGoods).values([{
                productId: item.productId,
                batchNumber: `${item.batchNumber}-RETURNED`,
                quantity: item.quantityReturned,
                qualityStatus: 'approved',
                remarks: `Returned goods from sales return - Good condition`,
                createdBy: req.user?.id,
              }]);
            }
          } else if (inspection.disposition === 'scrap' || inspection.condition === 'damaged') {
            // Create damaged inventory record
            await tx.insert(finishedGoods).values([{
              productId: item.productId,
              batchNumber: `${item.batchNumber}-DAMAGED`,
              quantity: item.quantityReturned,
              qualityStatus: 'rejected',
              remarks: `Returned goods - Damaged/Scrapped`,
              createdBy: req.user?.id,
            }]);
          }
        }
        
        // Determine credit note handling: BOTH same month AND within 30 days required for auto
        const shouldAutoGenerateCreditNote = isSameMonth && isWithinOneMonth;
        const requiresManualProcessing = !shouldAutoGenerateCreditNote;
        
        // Update return status with appropriate credit note status
        await tx.update(salesReturns)
          .set({
            status: 'inspected',
            inspectedDate: new Date().toISOString(),
            inspectedBy: req.user?.id,
            creditNoteStatus: shouldAutoGenerateCreditNote ? 'auto_created' : 'manual_required',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(salesReturns.id, id));
        
        // Auto-create credit note ONLY if same month AND within 30 days
        if (shouldAutoGenerateCreditNote) {
          // Get all return items to calculate credit amounts
          const returnItems = await tx.select().from(salesReturnItems)
            .where(and(
              eq(salesReturnItems.returnId, id),
              eq(salesReturnItems.recordStatus, 1)
            ));
          
          // Get existing credit notes for this invoice to generate sequence number
          const existingCreditNotes = await tx.select().from(creditNotes)
            .where(and(
              eq(creditNotes.invoiceId, salesReturn.invoiceId),
              eq(creditNotes.recordStatus, 1)
            ));
          
          const seq = existingCreditNotes.length + 1;
          creditNoteNumber = `CN-${invoice.invoiceNumber}-${seq}`;
          
          // Calculate totals
          let subtotal = 0;
          let cgstAmount = 0;
          let sgstAmount = 0;
          let igstAmount = 0;
          
          // Create credit note items and calculate totals
          const creditNoteItems_data = [];
          for (const returnItem of returnItems) {
            const itemSubtotal = returnItem.unitPrice * returnItem.quantityReturned;
            subtotal += itemSubtotal;
            
            // Calculate GST based on invoice item rates
            const [invoiceItem] = await tx.select().from(invoiceItems)
              .where(and(
                eq(invoiceItems.invoiceId, salesReturn.invoiceId),
                eq(invoiceItems.productId, returnItem.productId)
              )).limit(1);
            
            if (invoiceItem) {
              const itemCgst = Math.round(itemSubtotal * invoiceItem.cgstRate / 10000); // cgstRate is in basis points
              const itemSgst = Math.round(itemSubtotal * invoiceItem.sgstRate / 10000); // sgstRate is in basis points
              
              cgstAmount += itemCgst;
              sgstAmount += itemSgst;
              
              creditNoteItems_data.push({
                productId: returnItem.productId,
                invoiceItemId: invoiceItem.id,
                description: invoiceItem.description || '',
                quantity: returnItem.quantityReturned,
                unitPrice: returnItem.unitPrice,
                discountAmount: 0,
                taxableValue: itemSubtotal,
                cgstRate: invoiceItem.cgstRate,
                cgstAmount: itemCgst,
                sgstRate: invoiceItem.sgstRate,
                sgstAmount: itemSgst,
                igstRate: invoiceItem.igstRate || 0,
                igstAmount: 0,
                totalAmount: itemSubtotal + itemCgst + itemSgst,
              });
            }
          }
          
          const grandTotal = subtotal + cgstAmount + sgstAmount + igstAmount;
          
          // Create credit note
          const [creditNote] = await tx.insert(creditNotes).values({
            noteNumber: creditNoteNumber,
            invoiceId: salesReturn.invoiceId,
            salesReturnId: id,
            creditDate: format(new Date(), 'yyyy-MM-dd'),
            reason: 'sales_return',
            status: 'issued',
            subtotal,
            cgstAmount,
            sgstAmount,
            igstAmount,
            grandTotal,
            issuedBy: req.user?.id,
            notes: `Auto-generated credit note for sales return ${salesReturn.returnNumber}`,
          }).returning();
          
          // Create credit note items
          for (const itemData of creditNoteItems_data) {
            await tx.insert(creditNoteItems).values({
              creditNoteId: creditNote.id,
              ...itemData,
            });
          }
          
          creditNoteCreated = true;
        } else {
          // Create manual credit note request for ANY return that can't be auto-processed
          // This includes: different month (even if <30 days) OR >30 days old
          const reason = !isSameMonth 
            ? `Return is in different month than invoice (${daysDifference} days old). GST compliance requires manual processing.`
            : `Return is ${daysDifference} days old (>30 days). Requires manual GST-compliant credit note processing.`;
            
          await tx.insert(manualCreditNoteRequests).values({
            salesReturnId: id,
            reasonCode: !isSameMonth ? 'different_month' : 'old_return',
            requestedBy: req.user?.id,
            notes: reason,
            priority: daysDifference > 90 ? 'urgent' : 'normal',
          });
          
          manualProcessingRequired = true;
        }
      });
      
      await logAudit(req.user?.id, 'UPDATE', 'sales_returns', id, `Inspected return and updated inventory${creditNoteCreated ? `, created credit note ${creditNoteNumber}` : ''}${manualProcessingRequired ? `, flagged for manual credit note processing` : ''}`);
      
      let message = "Return inspected and inventory updated successfully";
      if (creditNoteCreated) {
        message = `Return inspected, inventory updated, and credit note ${creditNoteNumber} created automatically`;
      } else if (manualProcessingRequired) {
        message = `Return inspected and inventory updated. MANUAL CREDIT NOTE REQUIRED - Return is ${daysDifference} days old (>30 days from invoice). Please process credit note manually for GST compliance.`;
      } else if (!isWithinOneMonth) {
        message = "Return inspected and inventory updated (no credit note - outside same month)";
      }
      
      res.json({ 
        message,
        creditNoteCreated,
        creditNoteNumber: creditNoteCreated ? creditNoteNumber : null,
        manualProcessingRequired,
        daysSinceInvoice: daysDifference,
      });
    } catch (error) {
      console.error("Error inspecting sales return:", error);
      res.status(500).json({ message: "Failed to inspect sales return" });
    }
  });

  // Credit Notes API
  // Get all credit notes
  app.get('/api/credit-notes', isAuthenticated, async (req: any, res) => {
    try {
      const creditNotes_list = await storage.getAllCreditNotes();
      res.json(creditNotes_list);
    } catch (error) {
      console.error("Error fetching credit notes:", error);
      res.status(500).json({ message: "Failed to fetch credit notes" });
    }
  });

  // Get credit notes for a specific invoice
  app.get('/api/credit-notes/invoice/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      const creditNotes_list = await storage.getCreditNotesByInvoice(invoiceId);
      res.json(creditNotes_list);
    } catch (error) {
      console.error("Error fetching invoice credit notes:", error);
      res.status(500).json({ message: "Failed to fetch invoice credit notes" });
    }
  });

  // Get specific credit note with items
  app.get('/api/credit-notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const creditNote = await storage.getCreditNote(id);
      if (!creditNote) {
        return res.status(404).json({ message: "Credit note not found" });
      }
      
      const items = await storage.getCreditNoteItems(id);
      res.json({ ...creditNote, items });
    } catch (error) {
      console.error("Error fetching credit note:", error);
      res.status(500).json({ message: "Failed to fetch credit note" });
    }
  });

  // Create manual credit note (for pricing errors, discounts, etc.)
  app.post('/api/credit-notes/manual', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      // Zod schema for validation
      const manualCreditNoteSchema = z.object({
        invoiceId: z.string().min(1, "Invoice ID is required"),
        reason: z.enum(['pricing_error', 'discount', 'damage', 'other'], { 
          required_error: "Reason is required" 
        }),
        customReason: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          invoiceItemId: z.string().min(1),
          quantity: z.number().min(1, "Quantity must be at least 1"),
          adjustedUnitPrice: z.number().min(0, "Price must be non-negative"),
        })).min(1, "At least one item is required"),
      });

      const validationResult = manualCreditNoteSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }

      const { invoiceId, reason, customReason, items, notes } = validationResult.data;

      // Fetch invoice with outstanding balance
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Fetch invoice items - authoritative source for prices and quantities
      const invoiceItems_list = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems_list || invoiceItems_list.length === 0) {
        return res.status(404).json({ message: "Invoice has no items" });
      }

      // Generate credit note number
      const existingCreditNotes = await db.select()
        .from(creditNotes)
        .where(eq(creditNotes.invoiceId, invoiceId));
      const sequence = existingCreditNotes.length + 1;
      const creditNoteNumber = `CN-${invoice.invoiceNumber}-${sequence.toString().padStart(2, '0')}`;

      // Calculate existing credit notes total to prevent over-crediting
      const existingCreditTotal = existingCreditNotes
        .filter(cn => cn.status === 'issued')
        .reduce((sum, cn) => sum + cn.grandTotal, 0);

      // Validate and calculate totals using AUTHORITATIVE invoice data
      let subtotal = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      const validatedItems = [];
      for (const item of items) {
        // Find matching invoice item - this is the authoritative source
        const invoiceItem = invoiceItems_list.find(ii => ii.id === item.invoiceItemId);
        if (!invoiceItem) {
          return res.status(400).json({ 
            message: `Invalid invoice item ID: ${item.invoiceItemId}` 
          });
        }

        // STRICT VALIDATION: Quantity cannot exceed invoiced amount
        if (item.quantity > invoiceItem.quantity) {
          return res.status(400).json({ 
            message: `Credit quantity (${item.quantity}) cannot exceed invoiced quantity (${invoiceItem.quantity}) for ${invoiceItem.productName}` 
          });
        }

        // SECURITY: Use adjusted price but validate it doesn't exceed invoice price
        // For pricing_error corrections, the adjusted price should be <= original
        if (reason === 'pricing_error' && item.adjustedUnitPrice > invoiceItem.unitPrice) {
          return res.status(400).json({ 
            message: `Adjusted price (₹${item.adjustedUnitPrice/100}) cannot exceed invoice price (₹${invoiceItem.unitPrice/100}) for pricing error corrections on ${invoiceItem.productName}` 
          });
        }

        // Calculate using AUTHORITATIVE GST rates from invoice
        const itemSubtotal = item.adjustedUnitPrice * item.quantity;
        const itemCgst = Math.round(itemSubtotal * invoiceItem.cgstRate / 10000);
        const itemSgst = Math.round(itemSubtotal * invoiceItem.sgstRate / 10000);
        const itemIgst = Math.round(itemSubtotal * (invoiceItem.igstRate || 0) / 10000);
        const itemTotal = itemSubtotal + itemCgst + itemSgst + itemIgst;

        subtotal += itemSubtotal;
        cgstAmount += itemCgst;
        sgstAmount += itemSgst;
        igstAmount += itemIgst;

        validatedItems.push({
          productId: invoiceItem.productId,
          invoiceItemId: item.invoiceItemId,
          description: invoiceItem.description || invoiceItem.productName,
          quantity: item.quantity,
          unitPrice: item.adjustedUnitPrice, // Store adjusted price
          discountAmount: 0,
          taxableValue: itemSubtotal,
          cgstRate: invoiceItem.cgstRate, // Authoritative from invoice
          cgstAmount: itemCgst,
          sgstRate: invoiceItem.sgstRate, // Authoritative from invoice
          sgstAmount: itemSgst,
          igstRate: invoiceItem.igstRate || 0, // Authoritative from invoice
          igstAmount: itemIgst,
          totalAmount: itemTotal,
        });
      }

      const grandTotal = subtotal + cgstAmount + sgstAmount + igstAmount;

      // CRITICAL VALIDATION: Credit note cannot exceed remaining invoice balance
      const remainingBalance = invoice.totalAmount - (invoice.amountReceived || 0) - existingCreditTotal;
      if (grandTotal > remainingBalance) {
        return res.status(400).json({ 
          message: `Credit note total (₹${(grandTotal/100).toFixed(2)}) exceeds remaining invoice balance (₹${(remainingBalance/100).toFixed(2)})` 
        });
      }

      // Create credit note and items in transaction
      await db.transaction(async (tx) => {
        // Create credit note
        const [creditNote] = await tx.insert(creditNotes).values({
          noteNumber: creditNoteNumber,
          invoiceId,
          salesReturnId: null, // Not linked to sales return
          creditDate: format(new Date(), 'yyyy-MM-dd'),
          reason: reason === 'other' ? (customReason || 'Other') : reason,
          status: 'issued',
          subtotal,
          cgstAmount,
          sgstAmount,
          igstAmount,
          grandTotal,
          issuedBy: req.user?.id,
          notes: notes || `Manual credit note for ${reason}`,
        }).returning();

        // Create credit note items
        for (const itemData of validatedItems) {
          await tx.insert(creditNoteItems).values({
            creditNoteId: creditNote.id,
            ...itemData,
          });
        }

        await logAudit(
          req.user?.id,
          'CREATE',
          'credit_notes',
          creditNote.id,
          `Manual credit note ${creditNoteNumber} created for invoice ${invoice.invoiceNumber}. Reason: ${reason}. Amount: ₹${(grandTotal / 100).toFixed(2)}`
        );
      });

      res.json({
        message: `Credit note ${creditNoteNumber} created successfully`,
        creditNoteNumber,
      });
    } catch (error) {
      console.error("Error creating manual credit note:", error);
      res.status(500).json({ message: "Failed to create credit note" });
    }
  });

  // Correct & Credit - Auto-calculate credit note from corrected values
  app.post('/api/credit-notes/correct-and-credit', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const correctAndCreditSchema = z.object({
        invoiceId: z.string().min(1, "Invoice ID is required"),
        reason: z.enum(['pricing_error', 'quantity_error', 'discount', 'other'], { 
          required_error: "Reason is required" 
        }),
        customReason: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          invoiceItemId: z.string().min(1),
          originalQuantity: z.number().min(0),
          originalUnitPrice: z.number().min(0),
          correctedQuantity: z.number().min(0),
          correctedUnitPrice: z.number().min(0),
        })).min(1, "At least one item is required"),
      });

      const validationResult = correctAndCreditSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }

      const { invoiceId, reason, customReason, items, notes } = validationResult.data;

      // Fetch invoice
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Fetch invoice items
      const invoiceItems_list = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems_list || invoiceItems_list.length === 0) {
        return res.status(404).json({ message: "Invoice has no items" });
      }

      // Calculate differences and create credit items
      let subtotal = 0;
      const creditItems: Array<{
        invoiceItemId: string;
        productId: string;
        description: string;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        taxableValue: number;
        cgstRate: number;
        cgstAmount: number;
        sgstRate: number;
        sgstAmount: number;
        igstRate: number;
        igstAmount: number;
        cessRate: number;
        cessAmount: number;
        totalAmount: number;
        qtyReturned: number; // Track actual quantity being returned for inventory
      }> = [];

      for (const item of items) {
        const originalAmount = item.originalQuantity * item.originalUnitPrice;
        const correctedAmount = item.correctedQuantity * item.correctedUnitPrice;
        const difference = originalAmount - correctedAmount;

        if (difference > 0) {
          // Find the original invoice item for GST rates and product details
          const invoiceItem = invoiceItems_list.find(i => i.id === item.invoiceItemId);
          if (!invoiceItem) continue;

          // Determine credit quantity and unit price
          const qtyDiff = item.originalQuantity - item.correctedQuantity;
          const priceDiff = item.originalUnitPrice - item.correctedUnitPrice;

          let creditQty: number;
          let creditPrice: number;

          if (qtyDiff > 0 && priceDiff === 0) {
            // Pure quantity reduction
            creditQty = qtyDiff;
            creditPrice = item.originalUnitPrice;
          } else if (qtyDiff === 0 && priceDiff > 0) {
            // Pure price reduction
            creditQty = item.originalQuantity;
            creditPrice = priceDiff;
          } else {
            // Mixed - use difference approach
            creditQty = item.originalQuantity;
            creditPrice = Math.round(difference / item.originalQuantity);
          }

          const taxableValue = creditQty * creditPrice;
          const cgstAmountCalc = Math.round(taxableValue * invoiceItem.cgstRate / 10000);
          const sgstAmountCalc = Math.round(taxableValue * invoiceItem.sgstRate / 10000);
          const igstAmountCalc = Math.round(taxableValue * invoiceItem.igstRate / 10000);
          const cessAmountCalc = Math.round(taxableValue * (invoiceItem.cessRate || 0) / 10000);

          creditItems.push({
            invoiceItemId: item.invoiceItemId,
            productId: invoiceItem.productId,
            description: invoiceItem.description,
            quantity: creditQty,
            unitPrice: creditPrice,
            discountAmount: 0,
            taxableValue: taxableValue,
            cgstRate: invoiceItem.cgstRate,
            cgstAmount: cgstAmountCalc,
            sgstRate: invoiceItem.sgstRate,
            sgstAmount: sgstAmountCalc,
            igstRate: invoiceItem.igstRate,
            igstAmount: igstAmountCalc,
            cessRate: invoiceItem.cessRate || 0,
            cessAmount: cessAmountCalc,
            totalAmount: taxableValue + cgstAmountCalc + sgstAmountCalc + igstAmountCalc + cessAmountCalc,
            qtyReturned: qtyDiff > 0 ? qtyDiff : 0, // Only return inventory for quantity reductions
          });

          subtotal += difference;
        }
      }

      if (creditItems.length === 0 || subtotal === 0) {
        return res.status(400).json({ message: "No credit amount calculated. Please adjust quantities or prices." });
      }

      // Check for existing credit notes to prevent over-crediting
      const existingCreditNotes = await db.select()
        .from(creditNotes)
        .where(eq(creditNotes.invoiceId, invoiceId));
      
      const existingCreditTotal = existingCreditNotes
        .filter(cn => cn.status === 'issued')
        .reduce((sum, cn) => sum + cn.grandTotal, 0);

      // Calculate GST amounts (use invoice-level rates)
      const cgstAmount = Math.round(subtotal * invoice.cgstRate / 10000);
      const sgstAmount = Math.round(subtotal * invoice.sgstRate / 10000);
      const igstAmount = Math.round(subtotal * invoice.igstRate / 10000);
      const grandTotal = subtotal + cgstAmount + sgstAmount + igstAmount;

      // Check if new credit would exceed invoice amount
      if (existingCreditTotal + grandTotal > invoice.totalAmount) {
        return res.status(400).json({ 
          message: `Credit amount (₹${(grandTotal / 100).toFixed(2)}) would exceed remaining creditable amount (₹${((invoice.totalAmount - existingCreditTotal) / 100).toFixed(2)})` 
        });
      }

      // Generate credit note number
      const sequence = existingCreditNotes.length + 1;
      const creditNoteNumber = `CN-${invoice.invoiceNumber}-${sequence.toString().padStart(2, '0')}`;

      // Create credit note in transaction
      await db.transaction(async (tx) => {
        const [creditNote] = await tx.insert(creditNotes).values({
          noteNumber: creditNoteNumber,
          invoiceId,
          salesReturnId: null,
          creditDate: format(new Date(), 'yyyy-MM-dd'),
          reason: reason === 'other' ? (customReason || 'Correction') : `Correct & Credit: ${reason}`,
          status: 'issued',
          subtotal,
          cgstAmount,
          sgstAmount,
          igstAmount,
          grandTotal,
          issuedBy: req.user?.id,
          notes: notes || `Auto-generated credit note for invoice correction`,
        }).returning();

        // Create credit note items and return inventory for quantity reductions
        let totalQtyReturned = 0;
        for (const itemData of creditItems) {
          await tx.insert(creditNoteItems).values({
            creditNoteId: creditNote.id,
            invoiceItemId: itemData.invoiceItemId,
            productId: itemData.productId,
            description: itemData.description,
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
            discountAmount: itemData.discountAmount,
            taxableValue: itemData.taxableValue,
            cgstRate: itemData.cgstRate,
            cgstAmount: itemData.cgstAmount,
            sgstRate: itemData.sgstRate,
            sgstAmount: itemData.sgstAmount,
            igstRate: itemData.igstRate,
            igstAmount: itemData.igstAmount,
            cessRate: itemData.cessRate,
            cessAmount: itemData.cessAmount,
            totalAmount: itemData.totalAmount,
          });
          
          // Return finished goods inventory for quantity reductions only
          if (itemData.productId && itemData.qtyReturned > 0) {
            const batchNumber = `CORRECT-${invoice.invoiceNumber}-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
            
            await tx.insert(finishedGoods).values({
              productId: itemData.productId,
              batchNumber,
              productionDate: new Date().toISOString(),
              quantity: itemData.qtyReturned,
              qualityStatus: 'approved',
              remarks: `Inventory returned - Correct & Credit note ${creditNoteNumber} for invoice ${invoice.invoiceNumber}. Qty reduced by ${itemData.qtyReturned}`,
              createdBy: req.user?.id,
            });
            
            totalQtyReturned += itemData.qtyReturned;
            console.log(`[INVENTORY] Returned ${itemData.qtyReturned} units of product ${itemData.productId} to inventory (Correct & Credit)`);
          }
        }

        await logAudit(
          req.user?.id,
          'CREATE',
          'credit_notes',
          creditNote.id,
          `Correct & Credit note ${creditNoteNumber} created for invoice ${invoice.invoiceNumber}. Reason: ${reason}. Amount: ₹${(grandTotal / 100).toFixed(2)}${totalQtyReturned > 0 ? `. Inventory returned: ${totalQtyReturned} units` : ''}`
        );
      });

      res.json({
        message: `Credit note ${creditNoteNumber} created successfully`,
        creditNoteNumber,
        grandTotal,
      });
    } catch (error) {
      console.error("Error creating correct & credit note:", error);
      res.status(500).json({ message: "Failed to create credit note" });
    }
  });

  // Quick Full Credit - One-click credit for entire invoice
  app.post('/api/credit-notes/quick-full-credit', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const quickCreditSchema = z.object({
        invoiceId: z.string().min(1, "Invoice ID is required"),
      });

      const validationResult = quickCreditSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors 
        });
      }

      const { invoiceId } = validationResult.data;

      // Fetch invoice
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Fetch invoice items
      const invoiceItems_list = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems_list || invoiceItems_list.length === 0) {
        return res.status(404).json({ message: "Invoice has no items" });
      }

      // Check for existing credit notes
      const existingCreditNotes = await db.select()
        .from(creditNotes)
        .where(eq(creditNotes.invoiceId, invoiceId));
      
      const existingCreditTotal = existingCreditNotes
        .filter(cn => cn.status === 'issued')
        .reduce((sum, cn) => sum + cn.grandTotal, 0);

      // Calculate remaining creditable amount
      const remainingCreditableAmount = invoice.totalAmount - existingCreditTotal;
      
      if (remainingCreditableAmount <= 0) {
        return res.status(400).json({ 
          message: "Invoice has already been fully credited" 
        });
      }

      // Credit the remaining amount (which should be the full amount if no prior credits)
      const subtotal = invoice.subtotal - existingCreditNotes
        .filter(cn => cn.status === 'issued')
        .reduce((sum, cn) => sum + cn.subtotal, 0);
      
      const cgstAmount = Math.round(subtotal * invoice.cgstRate / 10000);
      const sgstAmount = Math.round(subtotal * invoice.sgstRate / 10000);
      const igstAmount = Math.round(subtotal * invoice.igstRate / 10000);
      const grandTotal = subtotal + cgstAmount + sgstAmount + igstAmount;

      // Generate credit note number
      const sequence = existingCreditNotes.length + 1;
      const creditNoteNumber = `CN-${invoice.invoiceNumber}-${sequence.toString().padStart(2, '0')}`;

      // Create credit note in transaction
      await db.transaction(async (tx) => {
        const [creditNote] = await tx.insert(creditNotes).values({
          noteNumber: creditNoteNumber,
          invoiceId,
          salesReturnId: null,
          creditDate: format(new Date(), 'yyyy-MM-dd'),
          reason: 'Full Invoice Credit',
          status: 'issued',
          subtotal,
          cgstAmount,
          sgstAmount,
          igstAmount,
          grandTotal,
          issuedBy: req.user?.id,
          notes: `Quick full credit for invoice ${invoice.invoiceNumber}`,
        }).returning();

        // Create credit note items for all invoice items
        for (const invoiceItem of invoiceItems_list) {
          const lineTotal = invoiceItem.quantity * invoiceItem.unitPrice;
          const discountAmount = invoiceItem.discount || 0;
          const taxableValue = lineTotal - discountAmount;
          
          await tx.insert(creditNoteItems).values({
            creditNoteId: creditNote.id,
            invoiceItemId: invoiceItem.id,
            productId: invoiceItem.productId,
            description: invoiceItem.description,
            quantity: invoiceItem.quantity,
            unitPrice: invoiceItem.unitPrice,
            discountAmount: discountAmount,
            taxableValue: taxableValue,
            cgstRate: invoiceItem.cgstRate,
            cgstAmount: invoiceItem.cgstAmount,
            sgstRate: invoiceItem.sgstRate,
            sgstAmount: invoiceItem.sgstAmount,
            igstRate: invoiceItem.igstRate,
            igstAmount: invoiceItem.igstAmount,
            cessRate: invoiceItem.cessRate || 0,
            cessAmount: invoiceItem.cessAmount || 0,
            totalAmount: invoiceItem.totalAmount,
          });
          
          // Return finished goods inventory for this item (full credit means goods returned)
          if (invoiceItem.productId && invoiceItem.quantity > 0) {
            const batchNumber = `CREDIT-${invoice.invoiceNumber}-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
            
            await tx.insert(finishedGoods).values({
              productId: invoiceItem.productId,
              batchNumber,
              productionDate: new Date().toISOString(),
              quantity: invoiceItem.quantity,
              qualityStatus: 'approved',
              remarks: `Inventory returned - Full credit note ${creditNoteNumber} for invoice ${invoice.invoiceNumber}`,
              createdBy: req.user?.id,
            });
            
            console.log(`[INVENTORY] Returned ${invoiceItem.quantity} units of product ${invoiceItem.productId} to inventory (Quick Full Credit)`);
          }
        }

        await logAudit(
          req.user?.id,
          'CREATE',
          'credit_notes',
          creditNote.id,
          `Quick full credit note ${creditNoteNumber} created for invoice ${invoice.invoiceNumber}. Full amount: ₹${(grandTotal / 100).toFixed(2)}. Inventory returned.`
        );
      });

      res.json({
        message: `Credit note ${creditNoteNumber} created for full invoice amount`,
        creditNoteNumber,
        grandTotal,
      });
    } catch (error) {
      console.error("Error creating quick full credit:", error);
      res.status(500).json({ message: "Failed to create credit note" });
    }
  });

  // Sales Analytics - Get aggregated sales data by time period
  app.get('/api/sales-analytics', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { period = 'monthly', year, dateFrom, dateTo } = req.query;
      
      // Fetch all invoices
      const allInvoices = await storage.getAllInvoices();
      
      // Filter invoices based on period type
      let yearInvoices;
      let currentYear: number;
      
      if (period === 'custom' && dateFrom && dateTo) {
        // Custom date range
        const fromDate = new Date(dateFrom as string);
        const toDate = new Date(dateTo as string);
        toDate.setHours(23, 59, 59, 999); // Include full end date
        
        yearInvoices = allInvoices.filter(inv => {
          const invDate = new Date(inv.invoiceDate);
          return invDate >= fromDate && invDate <= toDate && inv.recordStatus === 1;
        });
        currentYear = fromDate.getFullYear(); // Use start year for display
      } else {
        // Year-based periods (monthly, quarterly, half-yearly, yearly)
        currentYear = year ? parseInt(year as string) : new Date().getFullYear();
        
        yearInvoices = allInvoices.filter(inv => {
          const invYear = new Date(inv.invoiceDate).getFullYear();
          return invYear === currentYear && inv.recordStatus === 1;
        });
      }

      // Fetch all invoice items in bulk to avoid N+1 queries
      const invoiceIds = new Set(yearInvoices.map(inv => inv.id));
      const allItems = await db.select().from(invoiceItems).where(eq(invoiceItems.recordStatus, 1));
      const allInvoiceItems = allItems.filter(item => invoiceIds.has(item.invoiceId));

      // Helper function to get period key and index from date
      const getPeriodInfo = (date: Date, periodType: string) => {
        const month = date.getMonth() + 1; // 1-12
        const invoiceYear = date.getFullYear();
        
        if (periodType === 'custom') {
          // For custom range, group by date
          return { 
            key: date.toISOString().split('T')[0], // YYYY-MM-DD
            index: date.getTime() 
          };
        } else if (periodType === 'monthly') {
          return { key: `${invoiceYear}-${month.toString().padStart(2, '0')}`, index: month };
        } else if (periodType === 'quarterly') {
          const quarter = Math.ceil(month / 3);
          return { key: `Q${quarter} ${invoiceYear}`, index: quarter };
        } else if (periodType === 'half-yearly') {
          const half = month <= 6 ? 1 : 2;
          return { key: `${half === 1 ? 'H1' : 'H2'} ${invoiceYear}`, index: half };
        } else { // yearly
          return { key: `${invoiceYear}`, index: 1 };
        }
      };

      // Aggregate data by period with numeric index for proper sorting
      const periodData: Record<string, { revenue: number; quantity: number; invoiceCount: number; index: number }> = {};

      yearInvoices.forEach(invoice => {
        const periodInfo = getPeriodInfo(new Date(invoice.invoiceDate), period as string);
        
        if (!periodData[periodInfo.key]) {
          periodData[periodInfo.key] = { revenue: 0, quantity: 0, invoiceCount: 0, index: periodInfo.index };
        }

        periodData[periodInfo.key].revenue += invoice.totalAmount;
        periodData[periodInfo.key].invoiceCount += 1;
      });

      // Add quantities from invoice items
      allInvoiceItems.forEach(item => {
        const invoice = yearInvoices.find(inv => inv.id === item.invoiceId);
        if (invoice) {
          const periodInfo = getPeriodInfo(new Date(invoice.invoiceDate), period as string);
          if (periodData[periodInfo.key]) {
            periodData[periodInfo.key].quantity += item.quantity;
          }
        }
      });

      // Convert to array and sort by numeric index
      const analytics = Object.entries(periodData).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        quantity: data.quantity,
        invoiceCount: data.invoiceCount,
        avgOrderValue: data.invoiceCount > 0 ? data.revenue / data.invoiceCount : 0,
        periodIndex: data.index,
      })).sort((a, b) => a.periodIndex - b.periodIndex);

      // Calculate totals
      const totals = {
        totalRevenue: analytics.reduce((sum, p) => sum + p.revenue, 0),
        totalQuantity: analytics.reduce((sum, p) => sum + p.quantity, 0),
        totalInvoices: analytics.reduce((sum, p) => sum + p.invoiceCount, 0),
        avgOrderValue: analytics.length > 0 ? analytics.reduce((sum, p) => sum + p.revenue, 0) / analytics.reduce((sum, p) => sum + p.invoiceCount, 0) : 0,
      };

      // Calculate vendor type breakdown (same logic as vendor-analytics)
      // Get all vendors and vendor types
      const allVendors = await storage.getAllVendors();
      const allVendorTypes = await storage.getAllVendorTypes();
      const vendorTypeLinks = await db.select().from(vendorVendorTypes).where(eq(vendorVendorTypes.recordStatus, 1));

      // Build vendor type breakdown by primary type only
      const typeBreakdown: Record<string, { count: Set<string>; revenue: number }> = {};
      
      yearInvoices.forEach(invoice => {
        // Find the vendor for this invoice
        const vendor = allVendors.find(v => v.vendorName === invoice.buyerName && v.recordStatus === 1);
        if (vendor) {
          // Get vendor's primary type
          const primaryTypeLink = vendorTypeLinks.find(link => 
            link.vendorId === vendor.id && link.isPrimary === 1 && link.recordStatus === 1
          );
          
          if (primaryTypeLink) {
            const primaryType = allVendorTypes.find(vt => vt.id === primaryTypeLink.vendorTypeId);
            
            if (primaryType) {
              if (!typeBreakdown[primaryType.name]) {
                typeBreakdown[primaryType.name] = { count: new Set(), revenue: 0 };
              }
              typeBreakdown[primaryType.name].count.add(vendor.id);
              typeBreakdown[primaryType.name].revenue += invoice.totalAmount;
            }
          }
        }
      });

      res.json({ 
        analytics, 
        totals, 
        year: currentYear, 
        period,
        typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
          type,
          count: data.count.size,
          revenue: data.revenue,
        }))
      });
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ message: "Failed to fetch sales analytics" });
    }
  });

  // Vendor Analytics - Get aggregated vendor sales and payment data
  app.get('/api/vendor-analytics', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { page, pageSize, searchQuery, sortBy } = req.query;
      
      // Fetch all vendors, invoices, invoice items, payments, and vendor types
      const allVendors = await storage.getAllVendors();
      const allInvoices = await storage.getAllInvoices();
      const allPayments = await db.select().from(invoicePayments).where(eq(invoicePayments.recordStatus, 1));
      const allVendorTypes = await storage.getAllVendorTypes();
      const vendorTypeLinks = await db.select().from(vendorVendorTypes).where(eq(vendorVendorTypes.recordStatus, 1));

      // Get all invoice items for quantity calculations
      const allItems = await db.select().from(invoiceItems).where(eq(invoiceItems.recordStatus, 1));

      // Calculate analytics for each vendor
      const vendorAnalytics = await Promise.all(allVendors.map(async (vendor) => {
        // Find invoices for this vendor (where buyerName matches vendorName)
        const vendorInvoices = allInvoices.filter(inv => 
          inv.buyerName === vendor.vendorName && inv.recordStatus === 1
        );

        // Calculate total revenue, quantity, and orders
        const totalRevenue = vendorInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalOrders = vendorInvoices.length;

        // Calculate total quantity from invoice items
        const invoiceIds = new Set(vendorInvoices.map(inv => inv.id));
        const vendorItems = allItems.filter(item => invoiceIds.has(item.invoiceId));
        const totalQuantity = vendorItems.reduce((sum, item) => sum + item.quantity, 0);

        // Calculate payments and outstanding balance
        const vendorPayments = allPayments.filter(payment => 
          vendorInvoices.some(inv => inv.id === payment.invoiceId)
        );
        const totalPaid = vendorPayments.reduce((sum, p) => sum + p.amount, 0);
        const outstandingBalance = totalRevenue - totalPaid;

        // Get vendor types for this vendor
        const vendorTypeIds = vendorTypeLinks
          .filter(link => link.vendorId === vendor.id)
          .map(link => link.vendorTypeId);
        const types = allVendorTypes.filter(type => vendorTypeIds.includes(type.id));
        const primaryType = types.find(type => 
          vendorTypeLinks.find(link => link.vendorId === vendor.id && link.vendorTypeId === type.id)?.isPrimary === 1
        );

        return {
          vendorId: vendor.id,
          vendorCode: vendor.vendorCode,
          vendorName: vendor.vendorName,
          city: vendor.city,
          state: vendor.state,
          mobileNumber: vendor.mobileNumber,
          primaryType: primaryType?.name || null,
          allTypes: types.map(t => t.name),
          totalRevenue,
          totalQuantity,
          totalOrders,
          totalPaid,
          outstandingBalance,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        };
      }));

      // Calculate summary statistics (from full dataset)
      const summary = {
        totalVendors: vendorAnalytics.length,
        activeVendors: vendorAnalytics.filter(v => v.totalOrders > 0).length,
        totalRevenue: vendorAnalytics.reduce((sum, v) => sum + v.totalRevenue, 0),
        totalOutstanding: vendorAnalytics.reduce((sum, v) => sum + v.outstandingBalance, 0),
        totalOrders: vendorAnalytics.reduce((sum, v) => sum + v.totalOrders, 0),
      };

      // Vendor type breakdown - count vendors by primary type to avoid revenue double-counting
      const typeBreakdown: Record<string, { count: Set<string>; revenue: number }> = {};
      vendorAnalytics.forEach(vendor => {
        // Only count revenue for the primary type to avoid double-counting
        if (vendor.primaryType) {
          if (!typeBreakdown[vendor.primaryType]) {
            typeBreakdown[vendor.primaryType] = { count: new Set(), revenue: 0 };
          }
          typeBreakdown[vendor.primaryType].count.add(vendor.vendorId);
          typeBreakdown[vendor.primaryType].revenue += vendor.totalRevenue;
        }
      });

      // Apply filters
      let filteredVendors = [...vendorAnalytics];
      
      // Search filter (vendorCode, vendorName, city, state)
      if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredVendors = filteredVendors.filter(v =>
          v.vendorCode.toLowerCase().includes(query) ||
          v.vendorName.toLowerCase().includes(query) ||
          (v.city && v.city.toLowerCase().includes(query)) ||
          (v.state && v.state.toLowerCase().includes(query))
        );
      }
      
      // Sort by specified field (default: outstanding balance descending)
      const sortField = (sortBy as string) || 'outstandingBalance';
      filteredVendors.sort((a, b) => {
        switch (sortField) {
          case 'revenue':
            return b.totalRevenue - a.totalRevenue;
          case 'orders':
            return b.totalOrders - a.totalOrders;
          case 'outstandingBalance':
          default:
            return b.outstandingBalance - a.outstandingBalance;
        }
      });

      // Parse pagination parameters with defaults (always paginate)
      const parsedPage = page ? parseInt(page as string) : 1;
      const parsedPageSize = pageSize ? parseInt(pageSize as string) : 25;
      
      // Calculate pagination
      const totalItems = filteredVendors.length;
      const totalPages = Math.ceil(totalItems / parsedPageSize);
      const startIndex = (parsedPage - 1) * parsedPageSize;
      const endIndex = startIndex + parsedPageSize;
      
      // Slice data for current page
      const paginatedData = filteredVendors.slice(startIndex, endIndex);

      // ALWAYS return paginated response with metadata
      res.json({
        data: paginatedData,
        meta: {
          page: parsedPage,
          pageSize: parsedPageSize,
          totalItems,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPreviousPage: parsedPage > 1,
        },
        summary,
        typeBreakdown: Object.entries(typeBreakdown).map(([type, data]) => ({
          type,
          count: data.count.size, // Convert Set to count
          revenue: data.revenue,
        })),
      });
    } catch (error) {
      console.error("Error fetching vendor analytics:", error);
      res.status(500).json({ message: "Failed to fetch vendor analytics" });
    }
  });

  // FIFO Payment Allocation - Allocate one payment across multiple outstanding invoices
  app.post('/api/invoice-payments/allocate-fifo', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { vendorId, amount, paymentDate, paymentMethod, referenceNumber, bankName, remarks } = req.body;

      if (!vendorId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Vendor ID and valid payment amount are required" });
      }

      // Get the vendor to verify it exists and get the vendor name
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Get all outstanding invoices for this vendor, ordered by invoice date (FIFO)
      const allInvoices = await storage.getAllInvoices();
      const vendorInvoices = allInvoices.filter(inv => inv.buyerName === vendor.vendorName);

      if (vendorInvoices.length === 0) {
        return res.status(404).json({ message: "No invoices found for this vendor" });
      }

      // Calculate outstanding balance for each invoice
      const invoicesWithBalance = await Promise.all(
        vendorInvoices.map(async (invoice) => {
          const payments = await storage.getPaymentsByInvoice(invoice.id);
          const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
          const outstanding = invoice.totalAmount - totalPaid;
          return { ...invoice, outstanding };
        })
      );

      // Filter only invoices with outstanding balance and sort by invoice date (FIFO)
      const outstandingInvoices = invoicesWithBalance
        .filter(inv => inv.outstanding > 0)
        .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

      if (outstandingInvoices.length === 0) {
        return res.status(400).json({ message: "No outstanding invoices for this vendor" });
      }

      // Allocate payment using FIFO logic
      let remainingAmount = amount;
      const allocations = [];

      for (const invoice of outstandingInvoices) {
        if (remainingAmount <= 0) break;

        const allocationAmount = Math.min(remainingAmount, invoice.outstanding);
        
        // Create payment record for this invoice
        const payment = await storage.createPayment({
          invoiceId: invoice.id,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: allocationAmount,
          paymentMethod: paymentMethod || 'Cash',
          referenceNumber,
          paymentType: allocationAmount === invoice.outstanding ? 'Full' : 'Partial',
          bankName,
          remarks: remarks || `FIFO allocation from bulk payment`,
          recordedBy: req.user?.id,
        });

        allocations.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          outstanding: invoice.outstanding,
          allocated: allocationAmount,
          paymentId: payment.id,
        });

        remainingAmount -= allocationAmount;

        await logAudit(
          req.user?.id, 
          'CREATE', 
          'invoice_payments', 
          payment.id, 
          `FIFO allocation: ₹${(allocationAmount / 100).toFixed(2)} to invoice ${invoice.invoiceNumber}`
        );
      }

      res.json({
        message: "Payment allocated successfully using FIFO",
        totalAmount: amount,
        allocated: amount - remainingAmount,
        remaining: remainingAmount,
        allocations,
      });
    } catch (error) {
      console.error("Error allocating payment:", error);
      res.status(500).json({ message: "Failed to allocate payment" });
    }
  });

  // Payment History - Get all payments with linked invoice and vendor details
  app.get('/api/invoice-payments/history', isAuthenticated, async (req: any, res) => {
    try {
      const payments = await db.select({
        id: invoicePayments.id,
        invoiceId: invoicePayments.invoiceId,
        paymentDate: invoicePayments.paymentDate,
        amount: invoicePayments.amount,
        paymentMethod: invoicePayments.paymentMethod,
        referenceNumber: invoicePayments.referenceNumber,
        paymentType: invoicePayments.paymentType,
        bankName: invoicePayments.bankName,
        remarks: invoicePayments.remarks,
        cancelledAt: invoicePayments.cancelledAt,
        cancellationRemarks: invoicePayments.cancellationRemarks,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        vendorId: vendors.id,
        vendorName: vendors.vendorName,
      })
      .from(invoicePayments)
      .leftJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .leftJoin(vendors, eq(invoices.buyerName, vendors.vendorName))
      .where(eq(invoicePayments.recordStatus, 1))
      .orderBy(sql`${invoicePayments.paymentDate} DESC`);

      res.json(payments);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Cancel Payment - Reverse payment allocation and restore invoice outstanding balance
  app.patch('/api/invoice-payments/:id/cancel', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { cancellationRemarks } = req.body;

      if (!cancellationRemarks || !cancellationRemarks.trim()) {
        return res.status(400).json({ message: "Cancellation remarks are required" });
      }

      // Get the payment to verify it exists and is not already cancelled
      const [payment] = await db.select().from(invoicePayments).where(eq(invoicePayments.id, id));
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.cancelledAt) {
        return res.status(400).json({ message: "Payment is already cancelled" });
      }

      // Don't allow cancelling write-offs
      if (payment.paymentType === 'Write-off') {
        return res.status(400).json({ message: "Write-off payments cannot be cancelled. Please contact admin." });
      }

      // Get the linked invoice
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId));
      
      if (!invoice) {
        return res.status(404).json({ message: "Linked invoice not found" });
      }

      // Mark payment as cancelled
      await db.update(invoicePayments)
        .set({
          cancelledAt: new Date().toISOString(),
          cancellationRemarks: cancellationRemarks.trim(),
          cancelledBy: req.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(invoicePayments.id, id));

      // Recalculate invoice amountReceived (excluding cancelled payments)
      const activePayments = await db.select()
        .from(invoicePayments)
        .where(
          and(
            eq(invoicePayments.invoiceId, payment.invoiceId),
            eq(invoicePayments.recordStatus, 1),
            sql`${invoicePayments.cancelledAt} IS NULL`
          )
        );

      const newAmountReceived = activePayments.reduce((sum, p) => sum + p.amount, 0);

      await db.update(invoices)
        .set({
          amountReceived: newAmountReceived,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(invoices.id, payment.invoiceId));

      await logAudit(
        req.user?.id,
        'UPDATE',
        'invoice_payments',
        id,
        `Payment cancelled: ₹${(payment.amount / 100).toFixed(2)} for invoice ${invoice.invoiceNumber}. Reason: ${cancellationRemarks}`
      );

      res.json({ 
        message: "Payment cancelled successfully",
        payment: {
          ...payment,
          cancelledAt: new Date().toISOString(),
          cancellationRemarks,
          cancelledBy: req.user?.id,
        },
      });
    } catch (error) {
      console.error("Error cancelling payment:", error);
      res.status(500).json({ message: "Failed to cancel payment" });
    }
  });

  // Dashboard stats for today
  app.get('/api/stats/today', isAuthenticated, async (req: any, res) => {
    try {
      const today = new Date();
      const rawMaterialIssuances = await storage.getRawMaterialIssuancesByDate(today);
      const gatepasses = await storage.getGatepassesByDate(today);
      
      res.json({
        rawMaterialIssuancesCount: rawMaterialIssuances.length,
        gatepassesCount: gatepasses.length,
        rawMaterialIssuances,
        gatepasses
      });
    } catch (error) {
      console.error("Error fetching today's stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/finished-goods/product/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const goods = await storage.getFinishedGoodsByProduct(productId);
      res.json(goods);
    } catch (error) {
      console.error("Error fetching finished goods by product:", error);
      res.status(500).json({ message: "Failed to fetch finished goods by product" });
    }
  });

  // Bank Master API
  app.get('/api/banks', isAuthenticated, async (req: any, res) => {
    try {
      const allBanks = await storage.getAllBanks();
      res.json(allBanks);
    } catch (error) {
      console.error("Error fetching banks:", error);
      res.status(500).json({ message: "Failed to fetch banks" });
    }
  });

  app.post('/api/banks', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertBankSchema.parse(req.body);
      const bank = await storage.createBank(validatedData);
      await logAudit(req.user?.id, 'CREATE', 'banks', bank.id, 'Created bank');
      res.json(bank);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating bank:", error);
      res.status(500).json({ message: "Failed to create bank" });
    }
  });

  app.get('/api/banks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const bank = await storage.getBank(id);
      if (!bank) {
        return res.status(404).json({ message: "Bank not found" });
      }
      res.json(bank);
    } catch (error) {
      console.error("Error fetching bank:", error);
      res.status(500).json({ message: "Failed to fetch bank" });
    }
  });

  app.patch('/api/banks/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBankSchema.partial().parse(req.body);
      const bank = await storage.updateBank(id, validatedData);
      if (!bank) {
        return res.status(404).json({ message: "Bank not found" });
      }
      await logAudit(req.user?.id, 'UPDATE', 'banks', id, 'Updated bank');
      res.json(bank);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating bank:", error);
      res.status(500).json({ message: "Failed to update bank" });
    }
  });

  app.delete('/api/banks/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBank(id);
      await logAudit(req.user?.id, 'DELETE', 'banks', id, 'Deleted bank');
      res.json({ message: "Bank deleted successfully" });
    } catch (error) {
      console.error("Error deleting bank:", error);
      res.status(500).json({ message: "Failed to delete bank" });
    }
  });

  app.get('/api/banks/default/get', isAuthenticated, async (req: any, res) => {
    try {
      const defaultBank = await storage.getDefaultBank();
      if (!defaultBank) {
        return res.status(404).json({ message: "No default bank found" });
      }
      res.json(defaultBank);
    } catch (error) {
      console.error("Error fetching default bank:", error);
      res.status(500).json({ message: "Failed to fetch default bank" });
    }
  });

  app.post('/api/banks/:id/set-default', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.setDefaultBank(id);
      await logAudit(req.user?.id, 'UPDATE', 'banks', id, 'Set as default bank');
      res.json({ message: "Default bank set successfully" });
    } catch (error) {
      console.error("Error setting default bank:", error);
      res.status(500).json({ message: "Failed to set default bank" });
    }
  });

  // Role Management API
  app.get('/api/roles', requireRole('admin'), async (req: any, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get('/api/roles/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const role = await storage.getRole(id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      console.error("Error fetching role:", error);
      res.status(500).json({ message: "Failed to fetch role" });
    }
  });

  app.post('/api/roles', requireRole('admin'), async (req: any, res) => {
    try {
      const { name, description, permissions } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Role name is required" });
      }

      console.log(`[AUDIT] Admin ${req.user.id} creating new role: ${name}`);
      
      const roleData = {
        name,
        description,
        permissions: permissions || [],
      };
      
      const created = await storage.createRole(roleData);
      res.json(created);
    } catch (error: any) {
      if (error?.code === '23505') { // Unique constraint violation
        return res.status(400).json({ message: "Role with this name already exists" });
      }
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.patch('/api/roles/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissions } = req.body;

      // Check if this is a default role
      const existingRole = await storage.getRole(id);
      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      const DEFAULT_ROLES = ['admin', 'manager', 'operator', 'reviewer'];
      
      // Prevent renaming default roles
      if (DEFAULT_ROLES.includes(existingRole.name) && name !== undefined && name !== existingRole.name) {
        console.log(`[AUDIT] Admin ${req.user.id} attempted to rename default role ${existingRole.name} - BLOCKED`);
        return res.status(403).json({ message: "Cannot rename default system roles" });
      }

      console.log(`[AUDIT] Admin ${req.user.id} updating role: ${id}`);

      const roleData: any = {};
      if (name !== undefined) roleData.name = name;
      if (description !== undefined) roleData.description = description;
      if (permissions !== undefined) roleData.permissions = permissions;

      const updated = await storage.updateRole(id, roleData);
      if (!updated) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(updated);
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(400).json({ message: "Role with this name already exists" });
      }
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete('/api/roles/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;

      // Don't allow deleting default roles
      const role = await storage.getRole(id);
      if (role && ['admin', 'manager', 'operator', 'reviewer'].includes(role.name)) {
        return res.status(400).json({ message: "Cannot delete default system roles" });
      }

      console.log(`[AUDIT] Admin ${req.user.id} deleting role: ${id}`);

      await storage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // Role Permissions API
  app.get('/api/role-permissions', requireRole('admin'), async (req: any, res) => {
    try {
      const permissions = await storage.getAllRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.get('/api/role-permissions/:roleId', requireRole('admin'), async (req: any, res) => {
    try {
      const { roleId } = req.params;
      const permissions = await storage.getRolePermissions(roleId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.post('/api/role-permissions', requireRole('admin'), async (req: any, res) => {
    try {
      const { roleId, screenKey, canView, canCreate, canEdit, canDelete } = req.body;

      if (!roleId || !screenKey) {
        return res.status(400).json({ message: "Role ID and screen key are required" });
      }

      console.log(`[AUDIT] Admin ${req.user.id} creating permission for role ${roleId}, screen ${screenKey}`);

      const permissionData = {
        roleId,
        screenKey,
        canView: canView ? 1 : 0,
        canCreate: canCreate ? 1 : 0,
        canEdit: canEdit ? 1 : 0,
        canDelete: canDelete ? 1 : 0,
      };

      const created = await storage.createRolePermission(permissionData);
      res.json(created);
    } catch (error) {
      console.error("Error creating role permission:", error);
      res.status(500).json({ message: "Failed to create role permission" });
    }
  });

  app.patch('/api/role-permissions/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { canView, canCreate, canEdit, canDelete } = req.body;

      console.log(`[AUDIT] Admin ${req.user.id} updating permission: ${id}`);

      const permissionData: any = {};
      if (canView !== undefined) permissionData.canView = canView ? 1 : 0;
      if (canCreate !== undefined) permissionData.canCreate = canCreate ? 1 : 0;
      if (canEdit !== undefined) permissionData.canEdit = canEdit ? 1 : 0;
      if (canDelete !== undefined) permissionData.canDelete = canDelete ? 1 : 0;

      const updated = await storage.updateRolePermission(id, permissionData);
      if (!updated) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating role permission:", error);
      res.status(500).json({ message: "Failed to update role permission" });
    }
  });

  app.delete('/api/role-permissions/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;

      console.log(`[AUDIT] Admin ${req.user.id} deleting permission: ${id}`);

      await storage.deleteRolePermission(id);
      res.json({ message: "Permission deleted successfully" });
    } catch (error) {
      console.error("Error deleting role permission:", error);
      res.status(500).json({ message: "Failed to delete role permission" });
    }
  });

  // Batch update role permissions (for easier bulk updates)
  app.put('/api/roles/:roleId/permissions', requireRole('admin'), async (req: any, res) => {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body; // Array of { screenKey, canView, canCreate, canEdit, canDelete }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }

      console.log(`[AUDIT] Admin ${req.user.id} batch updating permissions for role ${roleId}`);

      // Get existing permissions for this role
      const existing = await storage.getRolePermissions(roleId);
      const existingMap = new Map(existing.map(p => [p.screenKey, p]));

      const results = [];

      // Process each permission
      for (const perm of permissions) {
        const { screenKey, canView, canCreate, canEdit, canDelete } = perm;
        
        if (!screenKey) continue;

        const permData = {
          canView: canView ? 1 : 0,
          canCreate: canCreate ? 1 : 0,
          canEdit: canEdit ? 1 : 0,
          canDelete: canDelete ? 1 : 0,
        };

        const existingPerm = existingMap.get(screenKey);

        if (existingPerm) {
          // Update existing permission
          const updated = await storage.updateRolePermission(existingPerm.id, permData);
          results.push(updated);
        } else {
          // Create new permission
          const created = await storage.createRolePermission({
            roleId,
            screenKey,
            ...permData,
          });
          results.push(created);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error batch updating role permissions:", error);
      res.status(500).json({ message: "Failed to batch update role permissions" });
    }
  });

  // Checklist Assignment Routes
  app.post('/api/checklist-assignments', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      // Validate request body with Zod schema
      const validationResult = insertChecklistAssignmentSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid assignment data", 
          errors: validationResult.error.issues 
        });
      }

      // SECURITY: Override assignedBy with authenticated user ID (prevent forgery)
      const assignmentData = {
        ...validationResult.data,
        assignedBy: req.user.id, // Server-side override for audit integrity
      };

      const assignment = await storage.createChecklistAssignment(assignmentData);
      console.log(`[AUDIT] Manager ${req.user.id} (${req.user.username}) created checklist assignment ${assignment.id} for operator ${assignment.operatorId}`);
      res.json(assignment);
    } catch (error) {
      console.error("Error creating checklist assignment:", error);
      res.status(500).json({ message: "Failed to create checklist assignment" });
    }
  });

  app.get('/api/checklist-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const assignments = await storage.getAllChecklistAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching checklist assignments:", error);
      res.status(500).json({ message: "Failed to fetch checklist assignments" });
    }
  });

  app.get('/api/checklist-assignments/operator/:operatorId', isAuthenticated, async (req: any, res) => {
    try {
      const { operatorId } = req.params;
      const assignments = await storage.getChecklistAssignmentsByOperator(operatorId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching operator assignments:", error);
      res.status(500).json({ message: "Failed to fetch operator assignments" });
    }
  });

  app.get('/api/checklist-assignments/date/:date', isAuthenticated, async (req: any, res) => {
    try {
      const { date } = req.params;
      const assignments = await storage.getChecklistAssignmentsByDate(date);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments by date:", error);
      res.status(500).json({ message: "Failed to fetch assignments by date" });
    }
  });

  app.patch('/api/checklist-assignments/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Validate partial update data
      const validationResult = insertChecklistAssignmentSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid update data", 
          errors: validationResult.error.issues 
        });
      }

      // SECURITY: Remove assignedBy from updates to prevent modification
      const { assignedBy, ...updateData } = validationResult.data;
      
      const updated = await storage.updateChecklistAssignment(id, updateData);
      console.log(`[AUDIT] Manager ${req.user.id} (${req.user.username}) updated checklist assignment ${id}`);
      res.json(updated);
    } catch (error) {
      console.error("Error updating checklist assignment:", error);
      res.status(500).json({ message: "Failed to update checklist assignment" });
    }
  });

  app.delete('/api/checklist-assignments/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChecklistAssignment(id);
      console.log(`[AUDIT] User ${req.user.id} deleted checklist assignment ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist assignment:", error);
      res.status(500).json({ message: "Failed to delete checklist assignment" });
    }
  });

  app.get('/api/checklist-assignments/:id/partial-answers', requireRole('reviewer', 'admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get the assignment to check authorization
      const assignment = await storage.getChecklistAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // If there's a submission linked, verify reviewer access
      if (assignment.submissionId) {
        const submission = await storage.getChecklistSubmission(assignment.submissionId);
        if (!submission) {
          return res.status(404).json({ message: "Submission not found" });
        }

        // Get user role
        const user = await storage.getUser(req.user.id);
        if (!user || !user.roleId) {
          return res.status(401).json({ message: "User not found" });
        }
        const userRoleData = await storage.getUserRole(user.roleId);
        const userRole = userRoleData?.name || '';

        // SECURITY: Only assigned reviewer can view (unless admin/manager)
        if (userRole === 'reviewer' && submission.reviewerId !== req.user.id) {
          console.log(`[AUDIT] Reviewer ${req.user.id} attempted to access assignment ${id} not assigned to them`);
          return res.status(403).json({ message: "You can only view submissions assigned to you" });
        }
      }

      const answers = await storage.getPartialTaskAnswers(id);
      res.json(answers);
    } catch (error) {
      console.error("Error fetching partial task answers:", error);
      res.status(500).json({ message: "Failed to fetch partial task answers" });
    }
  });

  // Checklist Submissions Routes
  app.get('/api/checklist-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const { reviewerId } = req.query;
      let submissions;
      
      if (reviewerId) {
        submissions = await storage.getChecklistSubmissionsByReviewer(reviewerId);
      } else {
        submissions = await storage.getAllChecklistSubmissions();
      }
      
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching checklist submissions:", error);
      res.status(500).json({ message: "Failed to fetch checklist submissions" });
    }
  });

  app.get('/api/checklist-submissions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getChecklistSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: "Checklist submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error fetching checklist submission:", error);
      res.status(500).json({ message: "Failed to fetch checklist submission" });
    }
  });

  app.get('/api/checklist-submissions/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tasks = await storage.getSubmissionTasks(id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching submission tasks:", error);
      res.status(500).json({ message: "Failed to fetch submission tasks" });
    }
  });

  app.patch('/api/checklist-submissions/:id', requireRole('reviewer', 'admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, reviewedAt, approvedAt } = req.body;
      
      // Validate status
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'pending', 'approved', or 'rejected'" });
      }
      
      // Get the submission to check authorization
      const submission = await storage.getChecklistSubmission(id);
      if (!submission) {
        return res.status(404).json({ message: "Checklist submission not found" });
      }
      
      // SECURITY: Only assigned reviewer can approve/reject (unless admin/manager)
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      const userRoleData = await storage.getUserRole(user.roleId);
      const userRole = userRoleData?.name || '';
      
      if (userRole === 'reviewer' && submission.reviewerId !== req.user.id) {
        console.log(`[AUDIT] Reviewer ${req.user.id} attempted to modify submission ${id} not assigned to them`);
        return res.status(403).json({ message: "You can only approve/reject submissions assigned to you" });
      }
      
      // Update the submission
      const updated = await storage.updateChecklistSubmission(id, {
        status,
        reviewedAt: reviewedAt ? new Date(reviewedAt) : undefined,
        approvedAt: approvedAt ? new Date(approvedAt) : undefined,
      });
      
      console.log(`[AUDIT] User ${req.user.id} (${req.user.username}) updated checklist submission ${id} to status: ${status}`);
      await logAudit(req.user.id, 'UPDATE', 'checklist_submissions', id, `Changed status to ${status}`);
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating checklist submission:", error);
      res.status(500).json({ message: "Failed to update checklist submission" });
    }
  });

  // Machine Startup Tasks Routes
  app.post('/api/machine-startup-tasks', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const taskData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const task = await storage.createMachineStartupTask(taskData);
      console.log(`[AUDIT] ${req.user.username} created machine startup task ${task.id} for machine ${task.machineId}`);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating machine startup task:", error);
      res.status(500).json({ message: "Failed to create startup task" });
    }
  });

  app.get('/api/machine-startup-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { date, userId, status } = req.query;
      
      let tasks;
      if (date) {
        tasks = await storage.getStartupTasksByDate(date as string);
      } else if (userId) {
        tasks = await storage.getStartupTasksByUser(userId as string);
      } else {
        tasks = await storage.getAllMachineStartupTasks();
      }

      // If user is operator, filter to only their tasks
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      const userRoleData = await storage.getUserRole(user.roleId);
      const userRole = userRoleData?.name || 'operator';
      
      if (userRole === 'operator') {
        tasks = tasks.filter(t => t.assignedUserId === req.user.id);
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching machine startup tasks:", error);
      res.status(500).json({ message: "Failed to fetch startup tasks" });
    }
  });

  app.get('/api/machine-startup-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getMachineStartupTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Startup task not found" });
      }

      // If user is operator, only allow viewing their own tasks
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      const userRoleData = await storage.getUserRole(user.roleId);
      const userRole = userRoleData?.name || 'operator';
      
      if (userRole === 'operator' && task.assignedUserId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching machine startup task:", error);
      res.status(500).json({ message: "Failed to fetch startup task" });
    }
  });

  app.patch('/api/machine-startup-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getMachineStartupTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Startup task not found" });
      }

      // Operators can only mark their own tasks as completed
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      const userRoleData = await storage.getUserRole(user.roleId);
      const userRole = userRoleData?.name || 'operator';
      
      if (userRole === 'operator') {
        if (task.assignedUserId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        // Operators can only update status and machineStartedAt
        const { status, machineStartedAt } = req.body;
        const updateData: any = {};
        if (status) updateData.status = status;
        if (machineStartedAt) updateData.machineStartedAt = new Date(machineStartedAt);
        
        const updated = await storage.updateMachineStartupTask(id, updateData);
        console.log(`[AUDIT] Operator ${req.user.username} updated startup task ${id} status to ${status}`);
        return res.json(updated);
      }

      // Managers and admins can update any field
      const updated = await storage.updateMachineStartupTask(id, req.body);
      console.log(`[AUDIT] ${userRole} ${req.user.username} updated startup task ${id}`);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating machine startup task:", error);
      res.status(500).json({ message: "Failed to update startup task" });
    }
  });

  app.delete('/api/machine-startup-tasks/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMachineStartupTask(id);
      console.log(`[AUDIT] ${req.user.username} deleted startup task ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting machine startup task:", error);
      res.status(500).json({ message: "Failed to delete startup task" });
    }
  });

  // Mark machine as started (operator quick action)
  app.post('/api/machine-startup-tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getMachineStartupTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Startup task not found" });
      }

      if (task.assignedUserId !== req.user.id) {
        return res.status(403).json({ message: "This task is not assigned to you" });
      }

      const updated = await storage.updateMachineStartupTask(id, {
        status: 'completed',
        machineStartedAt: new Date()
      });

      console.log(`[AUDIT] Operator ${req.user.username} completed startup task ${id}`);
      res.json(updated);
    } catch (error) {
      console.error("Error completing machine startup task:", error);
      res.status(500).json({ message: "Failed to complete startup task" });
    }
  });

  // Notification Configuration Routes
  app.get('/api/notification-config', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const config = await storage.getNotificationConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching notification config:", error);
      res.status(500).json({ message: "Failed to fetch notification config" });
    }
  });

  app.post('/api/notification-config', requireRole('admin'), async (req: any, res) => {
    try {
      const configData = req.body;
      const newConfig = await storage.createNotificationConfig(configData);
      console.log(`[AUDIT] ${req.user.username} created notification config`);
      res.json(newConfig);
    } catch (error) {
      console.error("Error creating notification config:", error);
      res.status(500).json({ message: "Failed to create notification config" });
    }
  });

  app.patch('/api/notification-config/:id', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await storage.updateNotificationConfig(id, updates);
      console.log(`[AUDIT] ${req.user.username} updated notification config ${id}`);
      res.json(updated);
    } catch (error) {
      console.error("Error updating notification config:", error);
      res.status(500).json({ message: "Failed to update notification config" });
    }
  });

  // Test endpoint to manually trigger missed checklist notifications (for testing purposes)
  app.post('/api/cron/missed-checklists', async (req: any, res) => {
    try {
      console.log('[TEST ENDPOINT] Manually triggering missed checklist notification check...');
      const { notificationService } = await import("./notificationService");
      await notificationService.checkAndSendMissedChecklistNotifications();
      console.log('[TEST ENDPOINT] Missed checklist notification check completed');
      res.json({ success: true, message: 'Missed checklist notification check completed' });
    } catch (error) {
      console.error('[TEST ENDPOINT ERROR]', error);
      res.status(500).json({ message: "Failed to check missed checklists", error: String(error) });
    }
  });

  // WhatsApp Webhook - Verification (GET)
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!VERIFY_TOKEN) {
      console.error('❌ WHATSAPP_VERIFY_TOKEN not configured - webhook verification disabled');
      return res.sendStatus(500);
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ WhatsApp webhook verification failed');
      res.sendStatus(403);
    }
  });

  // WhatsApp Webhook - Receive Messages (POST)
  app.post('/api/whatsapp/webhook', async (req, res) => {
    const body = req.body;

    // Acknowledge receipt immediately (required by Meta)
    res.sendStatus(200);

    // Process webhook asynchronously
    try {
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Handle incoming messages
        if (value?.messages && value.messages[0]) {
          const message = value.messages[0];
          const from = message.from; // Sender's phone number
          const messageId = message.id;

          // Check for image messages (photo uploads for NOK tasks)
          if (message.type === 'image' && message.image?.id) {
            console.log(`Received image from ${from}`);
            
            // Find checklist assignment waiting for photo
            const allAssignments = await storage.getAllChecklistAssignments();
            let assignment: any = null;
            let pendingPhotoTask: any = null;
            
            for (const a of allAssignments) {
              if (a.status !== 'pending') continue;
              const task = await storage.getPendingPhotoTask(a.id);
              if (task) {
                // Verify phone number
                const operator = await storage.getUser(a.operatorId);
                if (operator?.mobileNumber) {
                  const fromLast10 = from.replace(/\D/g, '').slice(-10);
                  const opLast10 = operator.mobileNumber.replace(/\D/g, '').slice(-10);
                  if (fromLast10 === opLast10) {
                    assignment = a;
                    pendingPhotoTask = task;
                    break;
                  }
                }
              }
            }
            
            if (!assignment || !pendingPhotoTask) {
              await whatsappService.sendTextMessage({
                to: from,
                message: 'No pending photo request found. Please submit task first.'
              });
              await whatsappService.markMessageAsRead(messageId);
              return;
            }
            
            // Download photo
            const fileName = `${assignment.taskReferenceId}_task${pendingPhotoTask.taskOrder}_${Date.now()}.jpg`;
            const photoUrl = await whatsappService.downloadMedia(message.image.id, fileName);
            
            if (!photoUrl) {
              await whatsappService.sendTextMessage({
                to: from,
                message: 'Failed to download photo. Please try again.'
              });
              await whatsappService.markMessageAsRead(messageId);
              return;
            }
            
            // Update task with photo URL and trigger spare part request
            await storage.updatePartialTaskPhoto(assignment.id, pendingPhotoTask.taskOrder, photoUrl);
            
            // Ask for spare part
            await whatsappService.sendTextMessage({
              to: from,
              message: `Photo received for Task ${pendingPhotoTask.taskOrder}.\n\nNeed spare part? Reply with:\n- Part name (e.g., "Bearing SKF-6205")\n- Or "SKIP" if no spare part needed`
            });
            
            await whatsappService.markMessageAsRead(messageId);
            return;
          }

          // Guard against non-text messages (buttons, etc.)
          if (!message.text || !message.text.body) {
            console.log(`Received non-text message type from ${from}, ignoring`);
            await whatsappService.markMessageAsRead(messageId);
            return;
          }

          const messageBody = message.text.body;
          console.log(`WhatsApp message from ${from}: ${messageBody}`);

          // Parse message for task reference
          // Expected format: "Done MST-12345" or just "MST-12345"
          const taskRefMatch = messageBody.match(/MST-[A-Z0-9]+/i);
          
          if (taskRefMatch) {
            const taskRef = taskRefMatch[0].toUpperCase();
            console.log(`Found task reference: ${taskRef}`);

            // Find the task by reference ID
            const task = await storage.getMachineStartupTaskByReference(taskRef);
            
            if (task) {
              // Verify sender matches assigned operator
              const assignedUser = await storage.getUser(task.assignedUserId);
              if (!assignedUser || !assignedUser.mobileNumber) {
                console.error(`Task ${taskRef}: No mobile number for assigned operator`);
                await whatsappService.sendTextMessage({
                  to: from,
                  message: `Task ${taskRef} verification failed. Contact administrator.`
                });
                await whatsappService.markMessageAsRead(messageId);
                return;
              }

              // Normalize both phone numbers for comparison (remove all non-digits)
              const normalizedFrom = from.replace(/\D/g, '');
              const normalizedAssigned = assignedUser.mobileNumber.replace(/\D/g, '');

              // Compare last 10 digits (handles various country code formats)
              const fromLast10 = normalizedFrom.slice(-10);
              const assignedLast10 = normalizedAssigned.slice(-10);

              if (fromLast10 !== assignedLast10) {
                console.warn(`Task ${taskRef}: Unauthorized sender ${from} (expected ${assignedUser.mobileNumber})`);
                await whatsappService.sendTextMessage({
                  to: from,
                  message: `Task ${taskRef} is not assigned to this number.`
                });
                await whatsappService.markMessageAsRead(messageId);
                return;
              }

              const responseTime = new Date();
              const scheduledTime = new Date(task.scheduledStartTime);
              const timeDiff = (responseTime.getTime() - scheduledTime.getTime()) / 1000 / 60; // Minutes
              
              // Determine response status (allow 15 min window before/after)
              let responseStatus = 'on_time';
              if (timeDiff > 15) {
                responseStatus = 'late';
              } else if (timeDiff < -15) {
                responseStatus = 'early';
              }

              // Update task with operator response (atomic - only if not already completed/cancelled)
              const updated = await storage.updateMachineStartupTask(task.id, {
                operatorResponse: messageBody,
                operatorResponseTime: responseTime,
                responseStatus: responseStatus as any,
                status: 'completed',
                machineStartedAt: responseTime
              }, true); // true = only update if not completed/cancelled

              if (!updated) {
                console.log(`Task ${taskRef} was already completed/cancelled in another process`);
                await whatsappService.sendTextMessage({
                  to: from,
                  message: `Task ${taskRef} was already marked as completed.`
                });
                await whatsappService.markMessageAsRead(messageId);
                return;
              }

              console.log(`Updated task ${taskRef}: ${responseStatus} (${Math.round(timeDiff)} min diff)`);

              // Send confirmation reply (no emojis per design guidelines)
              const machine = await storage.getMachine(task.machineId);
              const statusText = responseStatus === 'on_time' ? 'On Time' : responseStatus === 'late' ? 'Late' : 'Early';
              const confirmMsg = `Confirmed! Machine ${machine?.name || 'startup'} marked as started.\n` +
                `Status: ${statusText}\n` +
                `Time: ${Math.abs(Math.round(timeDiff))} min ${timeDiff > 0 ? 'after' : 'before'} scheduled`;
              
              await whatsappService.sendTextMessage({
                to: from,
                message: confirmMsg
              });
            } else {
              console.log(`Task not found: ${taskRef}`);
              await whatsappService.sendTextMessage({
                to: from,
                message: `Task ${taskRef} not found. Please check the task ID.`
              });
            }
          } else {
            // Check for checklist reference (CL-XXXXXX)
            const checklistRefMatch = messageBody.match(/CL-[A-Z0-9]{6}/i);
            
            if (checklistRefMatch) {
              const taskRef = checklistRefMatch[0].toUpperCase();
              console.log(`Found checklist reference: ${taskRef}`);

              // Find the checklist assignment by reference ID
              const assignment = await storage.getChecklistAssignmentByReference(taskRef);
              
              if (assignment) {
                // Check if already completed
                if (assignment.status === 'completed') {
                  console.log(`Checklist ${taskRef} already completed`);
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Checklist ${taskRef} was already marked as completed.`
                  });
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Verify sender matches assigned operator
                const assignedOperator = await storage.getUser(assignment.operatorId);
                if (!assignedOperator || !assignedOperator.mobileNumber) {
                  console.error(`Checklist ${taskRef}: No mobile for assigned operator`);
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Checklist ${taskRef} verification failed. Contact administrator.`
                  });
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Normalize phone numbers for comparison
                const normalizedFrom = from.replace(/\D/g, '');
                const normalizedAssigned = assignedOperator.mobileNumber.replace(/\D/g, '');
                const fromLast10 = normalizedFrom.slice(-10);
                const assignedLast10 = normalizedAssigned.slice(-10);

                if (fromLast10 !== assignedLast10) {
                  console.warn(`Checklist ${taskRef}: Unauthorized sender ${from} (expected ${assignedOperator.mobileNumber})`);
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Checklist ${taskRef} is not assigned to this number.`
                  });
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Load template tasks first
                const templateTasks = await storage.getTemplateTasks(assignment.templateId);
                if (!templateTasks || templateTasks.length === 0) {
                  console.error(`Checklist ${taskRef}: No template tasks found`);
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Checklist ${taskRef} has no tasks defined. Contact administrator.`
                  });
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Sort template tasks by orderIndex
                const sortedTasks = templateTasks.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

                // Check for explicit DONE command
                // Must appear as standalone word, not in remarks (not after "-" in task syntax)
                // Valid: "CL-123 DONE", "CL-123 1:OK 2:OK DONE", "CL-123 DONE.", "CL-123 DONE please confirm"
                // Invalid: "CL-123 2:NOK-already done" (done is part of remark, will be stripped)
                // Escape taskRef to prevent regex issues with special characters
                const escapedTaskRef = taskRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Remove ALL occurrences of task reference (handles greetings like "Hi team CL-123 1:OK DONE")
                const afterTaskRef = messageBody.replace(new RegExp(escapedTaskRef, 'gi'), '').trim();
                // Remove all parsed task segments (format: "1:OK" or "2:NOK-remarks with spaces")
                // Use same tempered greedy token pattern as main task parser (case-sensitive DONE matching)
                const withoutTasks = afterTaskRef.replace(/\d+:[A-Za-z]+(?:-((?:(?!\s+\d+:|\s+DONE\b).)+))?/g, '').trim();
                // Check for DONE (uppercase only, case-sensitive) in remaining text
                // This prevents false positives from lowercase "done" in remarks like "already done"
                // Operator must use uppercase "DONE" to trigger submission
                const isDoneCommand = /\bDONE\b/.test(withoutTasks);

                // Parse task results from message
                // Supports both incremental (single task) and bulk (all tasks)
                // Format: "CL-ABC123 2:NOK-broken" or "CL-ABC123 1:OK thanks" or "CL-ABC123 1:ok 2:Ok DONE"
                const taskResults: { [key: number]: { status: string; remarks?: string } } = {};
                // Use tempered greedy token for remarks: consume everything except when next task/DONE ahead
                // IMPORTANT: No 'i' flag - makes DONE matching case-sensitive (prevents "done" in remarks from triggering)
                // Status captures any letters (case-insensitive), then validates after normalization
                const taskPattern = /(\d+):([A-Za-z]+)(?:-((?:(?!\s+\d+:|\s+DONE\b).)+))?/g;
                let match;
                
                while ((match = taskPattern.exec(messageBody)) !== null) {
                  const taskNum = parseInt(match[1]);
                  const status = match[2].toUpperCase();
                  const remarks = match[3]?.trim() || undefined;
                  
                  // Validate task number is within range
                  if (taskNum < 1 || taskNum > sortedTasks.length) {
                    console.warn(`Checklist ${taskRef}: Invalid task number ${taskNum} (valid range: 1-${sortedTasks.length})`);
                    await whatsappService.sendTextMessage({
                      to: from,
                      message: `Invalid task number ${taskNum}. Valid tasks: 1-${sortedTasks.length}`
                    });
                    await whatsappService.markMessageAsRead(messageId);
                    return;
                  }
                  
                  // Validate status value
                  if (!['OK', 'NOK', 'NA'].includes(status)) {
                    console.warn(`Checklist ${taskRef}: Invalid status for task ${taskNum}: ${status}`);
                    await whatsappService.sendTextMessage({
                      to: from,
                      message: `Invalid status for task ${taskNum}. Use: OK, NOK, or NA`
                    });
                    await whatsappService.markMessageAsRead(messageId);
                    return;
                  }
                  
                  taskResults[taskNum] = { status, remarks };
                }

                // Check if waiting for spare part response
                const pendingSparePartTask = await storage.getPendingSparePartTask(assignment.id);
                if (pendingSparePartTask && Object.keys(taskResults).length === 0 && !isDoneCommand) {
                  // This is a spare part response
                  const response = messageBody.replace(new RegExp(taskRef, 'gi'), '').trim();
                  
                  if (response.toUpperCase() === 'SKIP') {
                    // No spare part needed
                    await storage.updatePartialTaskSparePart(assignment.id, pendingSparePartTask.taskOrder, null, 'SKIP');
                    await whatsappService.sendTextMessage({
                      to: from,
                      message: `Task ${pendingSparePartTask.taskOrder} completed without spare part request.\n\nContinue with remaining tasks or send "DONE".`
                    });
                  } else {
                    // Search for spare part in catalog
                    const sparePartText = response;
                    const matches = await storage.searchSparePartsByName(sparePartText);
                    
                    if (matches.length > 0) {
                      // Use first match
                      await storage.updatePartialTaskSparePart(assignment.id, pendingSparePartTask.taskOrder, matches[0].id, sparePartText);
                      await whatsappService.sendTextMessage({
                        to: from,
                        message: `Spare part "${matches[0].partName}" linked to Task ${pendingSparePartTask.taskOrder}.\n\nContinue with remaining tasks or send "DONE".`
                      });
                    } else {
                      // No match - just store the text
                      await storage.updatePartialTaskSparePart(assignment.id, pendingSparePartTask.taskOrder, null, sparePartText);
                      await whatsappService.sendTextMessage({
                        to: from,
                        message: `Spare part request "${sparePartText}" recorded for Task ${pendingSparePartTask.taskOrder}.\n(Not found in catalog - manager will review)\n\nContinue with remaining tasks or send "DONE".`
                      });
                    }
                  }
                  
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // If no tasks parsed and no DONE command, provide help
                if (Object.keys(taskResults).length === 0 && !isDoneCommand) {
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Format: ${taskRef} <task>:<status>-<remarks>\n` +
                      `Example: ${taskRef} 1:OK or ${taskRef} 2:NOK-broken part\n` +
                      `Send "DONE" to submit current progress.`
                  });
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Store partial answers (upsert each task)
                let hasNOKTask = false;
                let nokTaskNum = 0;
                
                for (const [taskNumStr, result] of Object.entries(taskResults)) {
                  const taskNum = parseInt(taskNumStr);
                  const task = sortedTasks[taskNum - 1];
                  
                  await storage.upsertPartialTaskAnswer({
                    assignmentId: assignment.id,
                    taskOrder: taskNum,
                    taskName: task.taskName,
                    status: result.status,
                    remarks: result.remarks || null,
                    answeredAt: new Date(),
                    answeredBy: assignment.operatorId,
                    waitingForPhoto: result.status === 'NOK' ? 1 : 0,
                    waitingForSparePart: 0
                  });
                  
                  if (result.status === 'NOK') {
                    hasNOKTask = true;
                    nokTaskNum = taskNum;
                  }
                  
                  console.log(`Stored answer for ${taskRef} task ${taskNum}: ${result.status}${result.remarks ? ' - ' + result.remarks : ''}`);
                }

                // If NOK task submitted, request photo
                if (hasNOKTask) {
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Task ${nokTaskNum} marked as NOK. Please send a photo of the issue.`
                  });
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Get current progress
                const progress = await storage.getPartialTaskProgress(assignment.id, sortedTasks.length);
                const remainingTasks = progress.total - progress.completed;

                // Check if submission should be created
                const shouldSubmit = isDoneCommand || remainingTasks === 0;

                if (!shouldSubmit) {
                  // Send progress notification
                  const progressMsg = `Task ${Object.keys(taskResults).join(', ')} recorded.\n` +
                    `Progress: ${progress.completed}/${progress.total} tasks (${progress.percentage}%)\n` +
                    `Remaining: ${remainingTasks} task${remainingTasks === 1 ? '' : 's'}\n` +
                    `Send more tasks or "DONE" to submit.`;
                  
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: progressMsg
                  });
                  
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Auto-submit when all tasks completed or DONE command received
                const missingTasks: number[] = [];
                for (let i = 0; i < sortedTasks.length; i++) {
                  const taskNum = i + 1;
                  const hasAnswer = progress.answers.some(a => a.taskOrder === taskNum);
                  if (!hasAnswer) {
                    missingTasks.push(taskNum);
                  }
                }

                if (missingTasks.length > 0 && isDoneCommand) {
                  console.warn(`Checklist ${taskRef}: DONE command with missing tasks ${missingTasks.join(', ')}`);
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Cannot submit. Missing tasks: ${missingTasks.join(', ')}\n` +
                      `Please complete all tasks before sending DONE.`
                  });
                  await whatsappService.markMessageAsRead(messageId);
                  return;
                }

                // Create submission with all stored partial answers
                try {
                  const submissionData = {
                    templateId: assignment.templateId,
                    machineId: assignment.machineId,
                    operatorId: assignment.operatorId,
                    reviewerId: assignment.reviewerId,
                    status: 'pending',
                    date: new Date(),
                    shift: assignment.shift || 'Unknown',
                    submittedAt: new Date()
                  };

                  // Build tasks data from stored partial answers
                  const tasksData = sortedTasks.map((task, index) => {
                    const taskNum = index + 1;
                    const answer = progress.answers.find(a => a.taskOrder === taskNum);
                    
                    if (!answer) {
                      throw new Error(`Missing answer for task ${taskNum}`);
                    }
                    
                    return {
                      taskName: task.taskName,
                      result: answer.status,
                      remarks: answer.remarks || undefined
                    };
                  });

                  const { submission } = await storage.createChecklistSubmissionWithTasks(submissionData, tasksData);

                  // Update assignment with response and link to submission
                  await storage.updateChecklistAssignment(assignment.id, {
                    status: 'completed',
                    submissionId: submission.id,
                    operatorResponse: isDoneCommand ? `DONE command (${progress.completed} tasks)` : messageBody,
                    operatorResponseTime: new Date()
                  } as any);

                  // Clean up partial answers after successful submission
                  await storage.deletePartialTaskAnswers(assignment.id);

                  console.log(`✅ Checklist ${taskRef} completed via WhatsApp (incremental), submission ${submission.id} created`);

                  // Get machine name for confirmation
                  const machine = await storage.getMachine(assignment.machineId);
                  const confirmMsg = `Confirmed! Checklist for ${machine?.name || 'machine'} completed.\n` +
                    `${sortedTasks.length} tasks submitted.\n` +
                    `Status: Pending review`;
                  
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: confirmMsg
                  });

                  // TODO: Notify reviewer if assigned
                  if (assignment.reviewerId) {
                    console.log(`TODO: Notify reviewer ${assignment.reviewerId} for submission ${submission.id}`);
                  }

                } catch (error) {
                  console.error(`Checklist ${taskRef} submission error:`, error);
                  await whatsappService.sendTextMessage({
                    to: from,
                    message: `Error creating submission for ${taskRef}. Please try again or contact administrator.`
                  });
                }
              } else {
                console.log(`Checklist not found: ${taskRef}`);
                await whatsappService.sendTextMessage({
                  to: from,
                  message: `Checklist ${taskRef} not found. Please check the task ID.`
                });
              }
            } else {
              console.log(`No valid task reference found in message: ${messageBody}`);
            }
          }

          // Mark message as read
          await whatsappService.markMessageAsRead(messageId);
        }

        // Handle message status updates (delivered, read, etc.)
        if (value?.statuses && value.statuses[0]) {
          const status = value.statuses[0];
          console.log(`📊 WhatsApp status update: ${status.status} for message ${status.id}`);
        }
      }
    } catch (error) {
      console.error('❌ WhatsApp webhook processing error:', error);
    }
  });

  // Colloki Flow Callback Endpoint (if using webhook pattern)
  // This endpoint receives AI interpretation results from Colloki Flow
  app.post('/api/colloki/callback', async (req, res) => {
    try {
      console.log('[COLLOKI CALLBACK] Received:', JSON.stringify(req.body, null, 2));

      // Verify API key for security
      const apiKey = req.headers.authorization?.replace('Bearer ', '');
      const expectedKey = process.env.COLLOKI_CALLBACK_API_KEY || 'KINTO_COLLOKI_WEBHOOK_SECRET_2025';
      
      if (apiKey !== expectedKey) {
        console.error('[COLLOKI CALLBACK] Unauthorized - Invalid API key');
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid API key' 
        });
      }

      // Extract data from Colloki Flow response
      const { session_id, outputs } = req.body;

      if (!session_id) {
        console.error('[COLLOKI CALLBACK] Missing session_id');
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Missing session_id' 
        });
      }

      // Extract AI interpretation from outputs
      const aiText = outputs?.[0]?.outputs?.[0]?.results?.message?.text || '';
      
      if (!aiText) {
        console.error('[COLLOKI CALLBACK] No AI response text found');
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'No AI response text' 
        });
      }

      console.log('[COLLOKI CALLBACK] AI Response:', aiText.substring(0, 200));

      // Parse AI response (try to extract JSON)
      let interpretation;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          interpretation = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('[COLLOKI CALLBACK] Failed to parse AI response:', parseError);
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Invalid AI response format' 
        });
      }

      // Get session (phone number is used as session_id, add + prefix back for DB lookup)
      const phoneNumber = session_id.startsWith('+') ? session_id : `+${session_id}`;
      
      // Find active conversation session
      const [session] = await db
        .select()
        .from(whatsappConversationSessions)
        .where(
          and(
            eq(whatsappConversationSessions.phoneNumber, phoneNumber),
            eq(whatsappConversationSessions.status, 'active')
          )
        );

      if (!session) {
        console.error('[COLLOKI CALLBACK] No active session found for', phoneNumber);
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'No active session found' 
        });
      }

      // Process interpretation and save answer
      const result: 'OK' | 'NOK' = interpretation.status === 'NOK' ? 'NOK' : 'OK';
      const remarks = interpretation.remarks || '';

      // Save answer and progress to next question
      await whatsappConversationService.saveAnswerAndProgress(session.id, {
        result,
        remarks,
        photoUrl: undefined,
      });

      console.log('[COLLOKI CALLBACK] Successfully processed interpretation for', phoneNumber);

      // Respond to Colloki Flow
      res.status(200).json({ 
        success: true,
        message: 'Interpretation processed successfully',
        session_id: phoneNumber
      });

    } catch (error) {
      console.error('[COLLOKI CALLBACK] Error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process callback'
      });
    }
  });

  // Configure multer for file uploads (store in memory temporarily)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Vyapaar data import endpoint
  app.post('/api/import-vyapaar', isAuthenticated, requireRole('admin'), upload.fields([
    { name: 'partyReport', maxCount: 1 },
    { name: 'saleReport', maxCount: 1 },
    { name: 'itemDetails', maxCount: 1 }
  ]), async (req: any, res: Response) => {
    try {
      const files = req.files as {
        partyReport?: Express.Multer.File[];
        saleReport?: Express.Multer.File[];
        itemDetails?: Express.Multer.File[];
      };

      // Check if Party Report and Sale Report are provided
      if (!files?.partyReport?.[0] || !files?.saleReport?.[0]) {
        return res.status(400).json({ 
          success: false,
          error: 'Party Report and Sale Report files are required'
        });
      }

      // Create temporary directory first
      const tmpDir = path.join(process.cwd(), 'tmp', 'uploads');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Handle two file upload formats:
      // 1. Three separate files (partyReport, saleReport, itemDetails)
      // 2. Two files where SaleReport contains "Item Details" sheet
      let itemDetailsBuffer: Buffer;
      
      if (files?.itemDetails?.[0]) {
        // Format 1: Separate item details file
        itemDetailsBuffer = files.itemDetails[0].buffer;
      } else {
        // Format 2: Extract "Item Details" sheet from SaleReport
        // Read from buffer since multer uses memory storage
        const workbook = XLSX.read(files.saleReport[0].buffer, { type: 'buffer' });
        
        // Check if "Item Details" sheet exists
        if (!workbook.SheetNames.includes('Item Details')) {
          return res.status(400).json({ 
            success: false,
            error: 'Sale Report must contain an "Item Details" sheet, or provide a separate Item Details file'
          });
        }
        
        // Create a new workbook with just the Item Details sheet
        const itemDetailsSheet = workbook.Sheets['Item Details'];
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, itemDetailsSheet, 'Sheet1');
        
        // Convert to buffer
        itemDetailsBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      }

      // Save files temporarily
      const timestamp = Date.now();
      const partyPath = path.join(tmpDir, `party-${timestamp}.xlsx`);
      const salePath = path.join(tmpDir, `sale-${timestamp}.xlsx`);
      const itemPath = path.join(tmpDir, `item-${timestamp}.xlsx`);

      fs.writeFileSync(partyPath, files.partyReport[0].buffer);
      fs.writeFileSync(salePath, files.saleReport[0].buffer);
      fs.writeFileSync(itemPath, itemDetailsBuffer);

      console.log('[DATA IMPORT] Starting import from uploaded files');
      
      // Run import
      const result = await importVyapaarData(partyPath, salePath, itemPath);

      // Clean up temporary files
      try {
        fs.unlinkSync(partyPath);
        fs.unlinkSync(salePath);
        fs.unlinkSync(itemPath);
      } catch (cleanupError) {
        console.error('[DATA IMPORT] Failed to cleanup temp files:', cleanupError);
      }

      console.log('[DATA IMPORT] Import completed:', result);
      
      res.json(result);
    } catch (error: any) {
      console.error('[DATA IMPORT] Error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Import failed'
      });
    }
  });

  // Clear imported Vyapaar data endpoint
  app.post('/api/clear-imported-data', isAuthenticated, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      console.log('[DATA CLEAR] Clearing all imported data...');
      
      const result = await clearImportedData();
      
      console.log('[DATA CLEAR] Clear completed:', result);
      
      res.json(result);
    } catch (error: any) {
      console.error('[DATA CLEAR] Error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to clear imported data'
      });
    }
  });

  // ============= DOCUMENT MANAGEMENT ROUTES =============
  
  // Configure multer for document uploads
  const documentUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `doc-${uniqueSuffix}${ext}`);
      }
    }),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Allowed: PDF, Images, Word, Excel, Text, CSV'));
      }
    }
  });

  // Document Categories CRUD
  app.get('/api/document-categories', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllDocumentCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error fetching categories:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch document categories' });
    }
  });

  app.post('/api/document-categories', isAuthenticated, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
    try {
      const parsed = insertDocumentCategorySchema.parse(req.body);
      const category = await storage.createDocumentCategory(parsed);
      res.status(201).json(category);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error creating category:', error);
      res.status(400).json({ message: error.message || 'Failed to create document category' });
    }
  });

  app.put('/api/document-categories/:id', isAuthenticated, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = insertDocumentCategorySchema.partial().parse(req.body);
      const category = await storage.updateDocumentCategory(id, parsed);
      if (!category) {
        return res.status(404).json({ message: 'Document category not found' });
      }
      res.json(category);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error updating category:', error);
      res.status(400).json({ message: error.message || 'Failed to update document category' });
    }
  });

  app.delete('/api/document-categories/:id', isAuthenticated, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteDocumentCategory(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('[DOCUMENTS] Error deleting category:', error);
      res.status(500).json({ message: error.message || 'Failed to delete document category' });
    }
  });

  // Documents CRUD with file upload
  app.get('/api/documents', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { categoryId, entityType, entityId } = req.query;
      let documents;
      
      if (entityType && entityId) {
        documents = await storage.getDocumentsByEntity(entityType as string, entityId as string);
      } else if (categoryId) {
        documents = await storage.getDocumentsByCategory(categoryId as string);
      } else {
        documents = await storage.getAllDocuments();
      }
      res.json(documents);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error fetching documents:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch documents' });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json(document);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error fetching document:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch document' });
    }
  });

  app.post('/api/documents', isAuthenticated, documentUpload.single('file'), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const documentData = {
        title: req.body.title || req.file.originalname,
        description: req.body.description || null,
        categoryId: req.body.categoryId || null,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: `/uploads/documents/${req.file.filename}`,
        relatedEntityType: req.body.relatedEntityType || null,
        relatedEntityId: req.body.relatedEntityId || null,
        documentDate: req.body.documentDate || null,
        expiryDate: req.body.expiryDate || null,
        tags: req.body.tags ? JSON.parse(req.body.tags) : null,
        uploadedBy: req.user?.id || null,
        version: 1,
        isLatestVersion: true,
      };

      const parsed = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(parsed);
      
      await logAudit(req.user?.id, 'CREATE', 'documents', document.id, `Document uploaded: ${document.title}`);
      res.status(201).json(document);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error creating document:', error);
      res.status(400).json({ message: error.message || 'Failed to create document' });
    }
  });

  app.put('/api/documents/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = insertDocumentSchema.partial().parse(req.body);
      const document = await storage.updateDocument(id, parsed);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json(document);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error updating document:', error);
      res.status(400).json({ message: error.message || 'Failed to update document' });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Optionally delete the physical file
      if (document.filePath) {
        const fullPath = path.join(process.cwd(), document.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      
      await storage.deleteDocument(id);
      await logAudit(req.user?.id, 'DELETE', 'documents', id, `Document deleted: ${document.title}`);
      res.status(204).send();
    } catch (error: any) {
      console.error('[DOCUMENTS] Error deleting document:', error);
      res.status(500).json({ message: error.message || 'Failed to delete document' });
    }
  });

  // Serve document files (view in browser)
  app.get('/uploads/documents/:filename', isAuthenticated, (req: Request, res: Response) => {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'documents', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.sendFile(filePath);
  });

  // Download document file (forces download)
  app.get('/api/documents/:id/download', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      if (!document.filePath) {
        return res.status(404).json({ message: 'No file attached to this document' });
      }
      
      const filePath = path.join(process.cwd(), document.filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on server' });
      }
      
      // Set headers for download
      const fileName = document.originalName || document.title || 'document';
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
      
      res.sendFile(filePath);
    } catch (error: any) {
      console.error('[DOCUMENTS] Error downloading document:', error);
      res.status(500).json({ message: error.message || 'Failed to download document' });
    }
  });

  // Bulk download documents as ZIP
  app.post('/api/documents/bulk-download', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { documentIds } = req.body;
      
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ message: 'No documents selected for download' });
      }
      
      if (documentIds.length > 50) {
        return res.status(400).json({ message: 'Maximum 50 documents can be downloaded at once' });
      }
      
      // Fetch all documents
      const documents = await Promise.all(
        documentIds.map(id => storage.getDocument(id))
      );
      
      const validDocuments = documents.filter(doc => doc && doc.filePath);
      
      if (validDocuments.length === 0) {
        return res.status(404).json({ message: 'No valid documents found' });
      }
      
      // Create ZIP archive
      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 5 } });
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="documents-${Date.now()}.zip"`);
      
      archive.pipe(res);
      
      for (const doc of validDocuments) {
        if (doc && doc.filePath) {
          const filePath = path.join(process.cwd(), doc.filePath);
          if (fs.existsSync(filePath)) {
            const fileName = doc.originalName || doc.title || `document-${doc.id}`;
            archive.file(filePath, { name: fileName });
          }
        }
      }
      
      await archive.finalize();
    } catch (error: any) {
      console.error('[DOCUMENTS] Error bulk downloading:', error);
      res.status(500).json({ message: error.message || 'Failed to download documents' });
    }
  });

  // ============= EXPENSE TRACKING ROUTES =============
  
  // Configure multer for expense attachments
  const expenseUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'expenses');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `receipt-${uniqueSuffix}${ext}`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Allowed: PDF, Images'));
      }
    }
  });

  // Expense Categories CRUD
  app.get('/api/expense-categories', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllExpenseCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('[EXPENSES] Error fetching categories:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch expense categories' });
    }
  });

  app.post('/api/expense-categories', isAuthenticated, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
    try {
      const parsed = insertExpenseCategorySchema.parse(req.body);
      const category = await storage.createExpenseCategory(parsed);
      res.status(201).json(category);
    } catch (error: any) {
      console.error('[EXPENSES] Error creating category:', error);
      res.status(400).json({ message: error.message || 'Failed to create expense category' });
    }
  });

  app.put('/api/expense-categories/:id', isAuthenticated, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parsed = insertExpenseCategorySchema.partial().parse(req.body);
      const category = await storage.updateExpenseCategory(id, parsed);
      if (!category) {
        return res.status(404).json({ message: 'Expense category not found' });
      }
      res.json(category);
    } catch (error: any) {
      console.error('[EXPENSES] Error updating category:', error);
      res.status(400).json({ message: error.message || 'Failed to update expense category' });
    }
  });

  app.delete('/api/expense-categories/:id', isAuthenticated, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteExpenseCategory(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('[EXPENSES] Error deleting category:', error);
      res.status(500).json({ message: error.message || 'Failed to delete expense category' });
    }
  });

  // Expense Vouchers CRUD
  app.get('/api/expense-vouchers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const vouchers = await storage.getAllExpenseVouchers();
      res.json(vouchers);
    } catch (error: any) {
      console.error('[EXPENSES] Error fetching vouchers:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch expense vouchers' });
    }
  });

  app.get('/api/expense-vouchers/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const voucher = await storage.getExpenseVoucher(id);
      if (!voucher) {
        return res.status(404).json({ message: 'Expense voucher not found' });
      }
      
      // Fetch related items and attachments
      const items = await storage.getExpenseItems(id);
      const attachments = await storage.getExpenseAttachments(id);
      
      res.json({ ...voucher, items, attachments });
    } catch (error: any) {
      console.error('[EXPENSES] Error fetching voucher:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch expense voucher' });
    }
  });

  // Generate unique voucher number
  async function generateVoucherNumber(): Promise<string> {
    const today = new Date();
    const prefix = `EXP-${format(today, 'yyyyMM')}`;
    
    // Find the highest voucher number for this month
    const allVouchers = await storage.getAllExpenseVouchers();
    const monthVouchers = allVouchers.filter(v => v.voucherNumber?.startsWith(prefix));
    
    let maxNum = 0;
    monthVouchers.forEach(v => {
      const match = v.voucherNumber?.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    
    return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
  }

  app.post('/api/expense-vouchers', isAuthenticated, async (req: any, res: Response) => {
    try {
      const voucherNumber = await generateVoucherNumber();
      
      const voucherData = {
        ...req.body,
        voucherNumber,
        status: 'draft',
        createdBy: req.user?.id || null,
      };
      
      const parsed = insertExpenseVoucherSchema.parse(voucherData);
      const voucher = await storage.createExpenseVoucher(parsed);
      
      // Create expense items if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        for (const item of req.body.items) {
          const itemData = {
            voucherId: voucher.id,
            categoryId: item.categoryId || null,
            description: item.description,
            amount: item.amount,
            gstAmount: item.gstAmount || '0',
            totalAmount: item.totalAmount || item.amount,
            vendorId: item.vendorId || null,
            invoiceNumber: item.invoiceNumber || null,
            invoiceDate: item.invoiceDate || null,
            notes: item.notes || null,
          };
          await storage.createExpenseItem(insertExpenseItemSchema.parse(itemData));
        }
      }
      
      await logAudit(req.user?.id, 'CREATE', 'expense_vouchers', voucher.id, `Expense voucher created: ${voucherNumber}`);
      res.status(201).json(voucher);
    } catch (error: any) {
      console.error('[EXPENSES] Error creating voucher:', error);
      res.status(400).json({ message: error.message || 'Failed to create expense voucher' });
    }
  });

  app.put('/api/expense-vouchers/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const existingVoucher = await storage.getExpenseVoucher(id);
      
      if (!existingVoucher) {
        return res.status(404).json({ message: 'Expense voucher not found' });
      }
      
      // Only allow edits if status is draft or pending
      if (!['draft', 'pending'].includes(existingVoucher.status || 'draft')) {
        return res.status(400).json({ message: 'Cannot edit approved or rejected vouchers' });
      }
      
      const parsed = insertExpenseVoucherSchema.partial().parse(req.body);
      const voucher = await storage.updateExpenseVoucher(id, parsed);
      
      // Update items if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        // Delete existing items
        const existingItems = await storage.getExpenseItems(id);
        for (const item of existingItems) {
          await storage.deleteExpenseItem(item.id);
        }
        
        // Create new items
        for (const item of req.body.items) {
          const itemData = {
            voucherId: id,
            categoryId: item.categoryId || null,
            description: item.description,
            amount: item.amount,
            gstAmount: item.gstAmount || '0',
            totalAmount: item.totalAmount || item.amount,
            vendorId: item.vendorId || null,
            invoiceNumber: item.invoiceNumber || null,
            invoiceDate: item.invoiceDate || null,
            notes: item.notes || null,
          };
          await storage.createExpenseItem(insertExpenseItemSchema.parse(itemData));
        }
      }
      
      await logAudit(req.user?.id, 'UPDATE', 'expense_vouchers', id, `Expense voucher updated`);
      res.json(voucher);
    } catch (error: any) {
      console.error('[EXPENSES] Error updating voucher:', error);
      res.status(400).json({ message: error.message || 'Failed to update expense voucher' });
    }
  });

  // Submit voucher for approval
  app.post('/api/expense-vouchers/:id/submit', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const voucher = await storage.getExpenseVoucher(id);
      
      if (!voucher) {
        return res.status(404).json({ message: 'Expense voucher not found' });
      }
      
      if (voucher.status !== 'draft') {
        return res.status(400).json({ message: 'Only draft vouchers can be submitted' });
      }
      
      const updated = await storage.updateExpenseVoucher(id, { 
        status: 'pending',
        submittedAt: new Date().toISOString()
      });
      
      await logAudit(req.user?.id, 'SUBMIT', 'expense_vouchers', id, `Expense voucher submitted for approval`);
      res.json(updated);
    } catch (error: any) {
      console.error('[EXPENSES] Error submitting voucher:', error);
      res.status(500).json({ message: error.message || 'Failed to submit expense voucher' });
    }
  });

  // Approve voucher
  app.post('/api/expense-vouchers/:id/approve', isAuthenticated, requireRole('admin', 'manager'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const voucher = await storage.getExpenseVoucher(id);
      
      if (!voucher) {
        return res.status(404).json({ message: 'Expense voucher not found' });
      }
      
      if (voucher.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending vouchers can be approved' });
      }
      
      const updated = await storage.updateExpenseVoucher(id, { 
        status: 'approved',
        approvedBy: req.user?.id || null,
        approvedAt: new Date().toISOString()
      });
      
      await logAudit(req.user?.id, 'APPROVE', 'expense_vouchers', id, `Expense voucher approved`);
      res.json(updated);
    } catch (error: any) {
      console.error('[EXPENSES] Error approving voucher:', error);
      res.status(500).json({ message: error.message || 'Failed to approve expense voucher' });
    }
  });

  // Reject voucher
  app.post('/api/expense-vouchers/:id/reject', isAuthenticated, requireRole('admin', 'manager'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const voucher = await storage.getExpenseVoucher(id);
      
      if (!voucher) {
        return res.status(404).json({ message: 'Expense voucher not found' });
      }
      
      if (voucher.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending vouchers can be rejected' });
      }
      
      const updated = await storage.updateExpenseVoucher(id, { 
        status: 'rejected',
        rejectionReason: rejectionReason || 'No reason provided'
      });
      
      await logAudit(req.user?.id, 'REJECT', 'expense_vouchers', id, `Expense voucher rejected: ${rejectionReason}`);
      res.json(updated);
    } catch (error: any) {
      console.error('[EXPENSES] Error rejecting voucher:', error);
      res.status(500).json({ message: error.message || 'Failed to reject expense voucher' });
    }
  });

  app.delete('/api/expense-vouchers/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const voucher = await storage.getExpenseVoucher(id);
      
      if (!voucher) {
        return res.status(404).json({ message: 'Expense voucher not found' });
      }
      
      if (voucher.status === 'approved') {
        return res.status(400).json({ message: 'Cannot delete approved vouchers' });
      }
      
      // Delete attachments and their files
      const attachments = await storage.getExpenseAttachments(id);
      for (const attachment of attachments) {
        if (attachment.filePath) {
          const fullPath = path.join(process.cwd(), attachment.filePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
        await storage.deleteExpenseAttachment(attachment.id);
      }
      
      // Delete items
      const items = await storage.getExpenseItems(id);
      for (const item of items) {
        await storage.deleteExpenseItem(item.id);
      }
      
      await storage.deleteExpenseVoucher(id);
      await logAudit(req.user?.id, 'DELETE', 'expense_vouchers', id, `Expense voucher deleted: ${voucher.voucherNumber}`);
      res.status(204).send();
    } catch (error: any) {
      console.error('[EXPENSES] Error deleting voucher:', error);
      res.status(500).json({ message: error.message || 'Failed to delete expense voucher' });
    }
  });

  // Expense Attachments
  app.post('/api/expense-vouchers/:id/attachments', isAuthenticated, expenseUpload.single('file'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const voucher = await storage.getExpenseVoucher(id);
      if (!voucher) {
        return res.status(404).json({ message: 'Expense voucher not found' });
      }
      
      const attachmentData = {
        voucherId: id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: `/uploads/expenses/${req.file.filename}`,
        uploadedBy: req.user?.id || null,
      };
      
      const parsed = insertExpenseAttachmentSchema.parse(attachmentData);
      const attachment = await storage.createExpenseAttachment(parsed);
      
      res.status(201).json(attachment);
    } catch (error: any) {
      console.error('[EXPENSES] Error uploading attachment:', error);
      res.status(400).json({ message: error.message || 'Failed to upload attachment' });
    }
  });

  app.delete('/api/expense-attachments/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      
      // Note: We'd need a getExpenseAttachment method to properly delete the file
      // For now, just soft-delete the record
      await storage.deleteExpenseAttachment(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('[EXPENSES] Error deleting attachment:', error);
      res.status(500).json({ message: error.message || 'Failed to delete attachment' });
    }
  });

  // Serve expense attachment files
  app.get('/uploads/expenses/:filename', isAuthenticated, (req: Request, res: Response) => {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'expenses', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.sendFile(filePath);
  });

  // ==================== CASH REGISTER ====================

  // Get all cash register days
  app.get('/api/cash-register/days', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { startDate, endDate, salespersonName, status } = req.query;
      const days = await storage.getCashRegisterDays({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        salespersonName: salespersonName as string | undefined,
        status: status as string | undefined,
      });
      res.json(days);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error fetching days:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch cash register days' });
    }
  });

  // Get single cash register day with transactions
  app.get('/api/cash-register/days/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const day = await storage.getCashRegisterDay(id);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      const transactions = await storage.getCashRegisterTransactions(id);
      
      // Get expense items for each expense transaction
      const transactionsWithItems = await Promise.all(
        transactions.map(async (tx) => {
          if (tx.transactionType === 'expense') {
            const items = await storage.getCashRegisterExpenseItems(tx.id);
            return { ...tx, items };
          }
          return { ...tx, items: [] };
        })
      );
      
      res.json({ ...day, transactions: transactionsWithItems });
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error fetching day:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch cash register day' });
    }
  });

  // Create cash register day
  app.post('/api/cash-register/days', isAuthenticated, async (req: any, res: Response) => {
    try {
      const parsed = insertCashRegisterDaySchema.parse({
        ...req.body,
        createdBy: req.user?.id,
      });
      
      // Check if there are any open imported days - must close all imported data first
      const allDays = await storage.getCashRegisterDays();
      const openImportedDays = allDays.filter(d => 
        d.status === 'open' && d.importedFromFile
      );
      
      if (openImportedDays.length > 0) {
        const dates = openImportedDays.slice(0, 3).map(d => d.registerDate).join(', ');
        const moreText = openImportedDays.length > 3 ? ` and ${openImportedDays.length - 3} more` : '';
        return res.status(400).json({ 
          message: `Please close all imported days before creating a new day. Open imported days: ${dates}${moreText}` 
        });
      }
      
      // Check for duplicate
      const existing = await storage.getCashRegisterDayByDateAndPerson(
        parsed.registerDate,
        parsed.salespersonName
      );
      if (existing) {
        return res.status(400).json({ 
          message: `Day already exists for ${parsed.salespersonName} on ${parsed.registerDate}` 
        });
      }
      
      const day = await storage.createCashRegisterDay(parsed);
      await logAudit(req.user?.id, 'CREATE', 'cash_register_days', day.id, 
        `Cash register day created for ${day.salespersonName} on ${day.registerDate}`);
      res.status(201).json(day);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error creating day:', error);
      res.status(400).json({ message: error.message || 'Failed to create cash register day' });
    }
  });

  // Update cash register day
  app.patch('/api/cash-register/days/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const day = await storage.getCashRegisterDay(id);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      if (day.status === 'locked') {
        return res.status(400).json({ message: 'Cannot modify a locked day' });
      }
      
      const updated = await storage.updateCashRegisterDay(id, req.body);
      await logAudit(req.user?.id, 'UPDATE', 'cash_register_days', id, 
        `Cash register day updated for ${day.salespersonName}`);
      res.json(updated);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error updating day:', error);
      res.status(400).json({ message: error.message || 'Failed to update cash register day' });
    }
  });

  // Reconcile/lock cash register day
  app.post('/api/cash-register/days/:id/reconcile', isAuthenticated, requireRole('Admin', 'Finance'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { varianceAmount, notes } = req.body;
      
      const day = await storage.getCashRegisterDay(id);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      const updated = await storage.updateCashRegisterDay(id, {
        status: 'reconciled',
        reconciledBy: req.user?.id,
        reconciledAt: new Date().toISOString(),
        varianceAmount: varianceAmount || 0,
        notes: notes || day.notes,
      });
      
      await logAudit(req.user?.id, 'RECONCILE', 'cash_register_days', id, 
        `Cash register day reconciled for ${day.salespersonName}`);
      res.json(updated);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error reconciling day:', error);
      res.status(400).json({ message: error.message || 'Failed to reconcile cash register day' });
    }
  });

  // Delete cash register day
  app.delete('/api/cash-register/days/:id', isAuthenticated, requireRole('Admin'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const day = await storage.getCashRegisterDay(id);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      await storage.deleteCashRegisterDay(id);
      await logAudit(req.user?.id, 'DELETE', 'cash_register_days', id, 
        `Cash register day deleted for ${day.salespersonName}`);
      res.status(204).send();
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error deleting day:', error);
      res.status(500).json({ message: error.message || 'Failed to delete cash register day' });
    }
  });

  // Add transaction to cash register day
  app.post('/api/cash-register/days/:dayId/transactions', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { dayId } = req.params;
      const day = await storage.getCashRegisterDay(dayId);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      if (day.status === 'locked' || day.status === 'closed') {
        return res.status(400).json({ message: 'Cannot add transactions to a closed or locked day' });
      }
      
      const parsed = insertCashRegisterTransactionSchema.parse({
        ...req.body,
        dayId,
      });
      
      let transaction = await storage.createCashRegisterTransaction(parsed);
      
      // Update day totals
      const amount = parsed.amount || 0;
      const updates: any = {};
      
      switch (parsed.transactionType) {
        case 'deposit':
          updates.totalDeposits = day.totalDeposits + amount;
          break;
        case 'cash_received':
          updates.totalCashReceived = day.totalCashReceived + amount;
          break;
        case 'expense':
          updates.totalExpenses = day.totalExpenses + amount;
          // Auto-generate expense voucher
          try {
            const voucherNumber = `EV-CR-${day.registerDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
            const voucher = await storage.createExpenseVoucher({
              voucherNumber,
              voucherDate: day.registerDate,
              status: 'submitted',
              paymentMode: 'cash',
              totalAmount: amount,
              gstAmount: 0,
              netAmount: amount,
              notes: `Cash Register Expense: ${parsed.reference || parsed.description || 'Expense'}`,
              submittedBy: req.user?.id,
              submittedAt: new Date().toISOString(),
            });
            
            // Link transaction to voucher
            await storage.updateCashRegisterTransaction(transaction.id, {
              convertedToVoucherId: voucher.id,
              convertedAt: new Date().toISOString(),
            });
            
            // Refresh transaction to include voucher link
            transaction = await storage.getCashRegisterTransaction(transaction.id) || transaction;
          } catch (voucherError) {
            console.error('[CASH_REGISTER] Error creating expense voucher:', voucherError);
            // Continue even if voucher creation fails
          }
          break;
        case 'transfer':
          updates.totalTransfers = day.totalTransfers + amount;
          break;
      }
      
      // Recalculate closing balance (Opening + CashReceived - Expenses - Transfers)
      updates.closingBalance = day.openingBalance + 
        (updates.totalCashReceived ?? day.totalCashReceived) - 
        (updates.totalExpenses ?? day.totalExpenses) - 
        (updates.totalTransfers ?? day.totalTransfers);
      
      await storage.updateCashRegisterDay(dayId, updates);
      
      res.status(201).json(transaction);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error creating transaction:', error);
      res.status(400).json({ message: error.message || 'Failed to create transaction' });
    }
  });

  // Close cash register day with reconciliation
  app.post('/api/cash-register/days/:id/close', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { actualClosingBalance, varianceNotes } = req.body;
      
      // Validate required reconciliation data
      if (actualClosingBalance === undefined || actualClosingBalance === null) {
        return res.status(400).json({ message: 'Actual closing balance is required for reconciliation' });
      }
      
      const day = await storage.getCashRegisterDay(id);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      if (day.status !== 'open') {
        return res.status(400).json({ message: 'Day is already closed or locked' });
      }
      
      // Calculate expected closing balance
      const expectedClosingBalance = day.openingBalance + day.totalCashReceived - day.totalExpenses - day.totalTransfers;
      
      // Calculate variance (actual - expected)
      const varianceAmount = actualClosingBalance - expectedClosingBalance;
      
      // Enforce that actual must match expected - user must record adjustment transactions first
      if (varianceAmount !== 0) {
        return res.status(400).json({ 
          message: `Cannot close day with variance of ${varianceAmount} paise. Please record an adjustment transaction (Expense for shortage, Cash Received for surplus) to balance the books first.` 
        });
      }
      
      // Update day status to closed with reconciliation data
      const updated = await storage.updateCashRegisterDay(id, {
        status: 'closed',
        closingBalance: expectedClosingBalance,
        actualClosingBalance,
        varianceAmount,
        varianceNotes: varianceNotes || null,
        reconciledAt: new Date().toISOString(),
        reconciledBy: req.user?.id,
      });
      
      await logAudit(req.user?.id, 'CLOSE', 'cash_register_days', id, 
        `Cash register day closed. Expected: ${expectedClosingBalance}, Actual: ${actualClosingBalance}`);
      
      // If this was an imported day, check if all imported days are now closed
      // If so, auto-fix opening balances of manual days to maintain continuity
      let fixedDays: any[] = [];
      if (day.importedFromFile) {
        const allDays = await storage.getCashRegisterDays();
        const openImportedDays = allDays.filter(d => d.status === 'open' && d.importedFromFile);
        
        // All imported days are now closed - fix manual days' opening balances
        if (openImportedDays.length === 0) {
          // Sort all days by date to build the chain
          const sortedDays = allDays.sort((a, b) => 
            new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime()
          );
          
          // Find the last imported (closed) day to get its closing balance
          const closedImportedDays = sortedDays.filter(d => d.importedFromFile && d.status === 'closed');
          if (closedImportedDays.length > 0) {
            const lastImportedDay = closedImportedDays[closedImportedDays.length - 1];
            const lastImportedClosing = lastImportedDay.openingBalance + lastImportedDay.totalCashReceived - lastImportedDay.totalExpenses - lastImportedDay.totalTransfers;
            
            // Find manual days that come after the last imported day
            const manualDaysAfterImport = sortedDays.filter(d => 
              !d.importedFromFile && 
              new Date(d.registerDate) > new Date(lastImportedDay.registerDate)
            );
            
            // Fix opening balances in sequence and set status to 'open' for reconciliation
            let previousClosing = lastImportedClosing;
            for (const manualDay of manualDaysAfterImport) {
              if (manualDay.openingBalance !== previousClosing) {
                // Fix this day's opening balance and set to open for reconciliation
                const oldOB = manualDay.openingBalance;
                await storage.updateCashRegisterDay(manualDay.id, {
                  openingBalance: previousClosing,
                  status: 'open', // Reopen so user can reconcile with new OB
                });
                fixedDays.push({
                  id: manualDay.id,
                  date: manualDay.registerDate,
                  oldOB,
                  newOB: previousClosing,
                });
                await logAudit(req.user?.id, 'UPDATE', 'cash_register_days', manualDay.id, 
                  `Opening balance auto-fixed from ${oldOB} to ${previousClosing} and status set to open for reconciliation`);
              }
              // Calculate this day's closing for the next day in chain
              previousClosing = previousClosing + manualDay.totalCashReceived - manualDay.totalExpenses - manualDay.totalTransfers;
            }
          }
        }
      }
      
      // Auto-create next day ONLY if this was NOT imported data
      let nextDay = null;
      if (!day.importedFromFile) {
        // Calculate next day's date
        const currentDate = new Date(day.registerDate);
        currentDate.setDate(currentDate.getDate() + 1);
        const nextDateStr = currentDate.toISOString().split('T')[0];
        
        // Check if next day already exists
        const existingNextDay = await storage.getCashRegisterDayByDateAndPerson(nextDateStr, day.salespersonName);
        
        if (!existingNextDay) {
          // Create next day with closing balance as opening
          nextDay = await storage.createCashRegisterDay({
            registerDate: nextDateStr,
            salespersonName: day.salespersonName,
            salespersonId: day.salespersonId,
            openingBalance: expectedClosingBalance,
            closingBalance: expectedClosingBalance, // Initially same as opening
            totalDeposits: 0,
            totalCashReceived: 0,
            totalExpenses: 0,
            totalTransfers: 0,
            status: 'open',
            createdBy: req.user?.id,
          });
          
          await logAudit(req.user?.id, 'CREATE', 'cash_register_days', nextDay.id, 
            `Next day auto-created with opening balance ${expectedClosingBalance} from previous day close`);
        }
      }
      
      res.json({ closedDay: updated, nextDay, fixedDays });
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error closing day:', error);
      res.status(400).json({ message: error.message || 'Failed to close cash register day' });
    }
  });

  // Delete cash register transaction
  app.delete('/api/cash-register/transactions/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getCashRegisterTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      const day = await storage.getCashRegisterDay(transaction.dayId);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      if (day.status !== 'open') {
        return res.status(400).json({ message: 'Cannot delete transactions from a closed or locked day' });
      }
      
      // Update day totals by subtracting the transaction amount
      const amount = transaction.amount || 0;
      const updates: any = {};
      
      switch (transaction.transactionType) {
        case 'deposit':
          updates.totalDeposits = Math.max(0, day.totalDeposits - amount);
          break;
        case 'cash_received':
          updates.totalCashReceived = Math.max(0, day.totalCashReceived - amount);
          break;
        case 'expense':
          updates.totalExpenses = Math.max(0, day.totalExpenses - amount);
          break;
        case 'transfer':
          updates.totalTransfers = Math.max(0, day.totalTransfers - amount);
          break;
      }
      
      // Recalculate closing balance
      updates.closingBalance = day.openingBalance + 
        (updates.totalCashReceived ?? day.totalCashReceived) - 
        (updates.totalExpenses ?? day.totalExpenses) - 
        (updates.totalTransfers ?? day.totalTransfers);
      
      await storage.updateCashRegisterDay(day.id, updates);
      
      // Delete the transaction
      await storage.deleteCashRegisterTransaction(id);
      
      await logAudit(req.user?.id, 'DELETE', 'cash_register_transactions', id, 
        `Transaction deleted: ${transaction.transactionType} - ${amount}`);
      
      res.status(204).send();
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error deleting transaction:', error);
      res.status(500).json({ message: error.message || 'Failed to delete transaction' });
    }
  });

  // Upload document for cash register transaction
  app.post('/api/cash-register/transactions/:transactionId/document', isAuthenticated, documentUpload.single('file'), async (req: any, res: Response) => {
    try {
      const { transactionId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const transaction = await storage.getCashRegisterTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      const day = await storage.getCashRegisterDay(transaction.dayId);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      if (day.status !== 'open') {
        return res.status(400).json({ message: 'Cannot upload documents to closed or locked days' });
      }
      
      // Update transaction with document info
      const updates = {
        documentPath: `/uploads/documents/${req.file.filename}`,
        documentName: req.file.originalname,
      };
      
      await storage.updateCashRegisterTransaction(transactionId, updates);
      
      await logAudit(req.user?.id, 'UPDATE', 'cash_register_transactions', transactionId, 
        `Document uploaded: ${req.file.originalname}`);
      
      // Return updated transaction
      const updatedTransaction = await storage.getCashRegisterTransaction(transactionId);
      res.json(updatedTransaction);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error uploading transaction document:', error);
      res.status(500).json({ message: error.message || 'Failed to upload document' });
    }
  });

  // Add expense items to transaction
  app.post('/api/cash-register/transactions/:transactionId/items', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { transactionId } = req.params;
      const transaction = await storage.getCashRegisterTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      if (transaction.transactionType !== 'expense') {
        return res.status(400).json({ message: 'Can only add items to expense transactions' });
      }
      
      const parsed = insertCashRegisterExpenseItemSchema.parse({
        ...req.body,
        transactionId,
      });
      
      const item = await storage.createCashRegisterExpenseItem(parsed);
      res.status(201).json(item);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error creating expense item:', error);
      res.status(400).json({ message: error.message || 'Failed to create expense item' });
    }
  });

  // Update expense item amount
  app.patch('/api/cash-register/expense-items/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      
      if (amount === undefined || amount < 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
      }
      
      // Get the item to find the transaction and day
      const item = await storage.getCashRegisterExpenseItem(id);
      if (!item) {
        return res.status(404).json({ message: 'Expense item not found' });
      }
      
      // Update the item
      const updatedItem = await storage.updateCashRegisterExpenseItem(id, { amount: Math.round(amount) });
      
      // Recalculate discrepancy for the day
      const transaction = await storage.getCashRegisterTransaction(item.transactionId);
      if (transaction) {
        await recalculateDayDiscrepancy(transaction.dayId);
      }
      
      res.json(updatedItem);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error updating expense item:', error);
      res.status(400).json({ message: error.message || 'Failed to update expense item' });
    }
  });

  // Add new expense item (for adjustments)
  app.post('/api/cash-register/expense-items', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { transactionId, amount, itemLabel } = req.body;
      
      if (!transactionId || amount === undefined || !itemLabel) {
        return res.status(400).json({ message: 'transactionId, amount, and itemLabel are required' });
      }
      
      const transaction = await storage.getCashRegisterTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      if (transaction.transactionType !== 'expense') {
        return res.status(400).json({ message: 'Can only add items to expense transactions' });
      }
      
      const item = await storage.createCashRegisterExpenseItem({
        transactionId,
        amount: Math.round(amount),
        itemLabel,
        rawText: `${itemLabel} - ${amount / 100}`,
      });
      
      // Recalculate discrepancy for the day
      await recalculateDayDiscrepancy(transaction.dayId);
      
      res.status(201).json(item);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error adding expense item:', error);
      res.status(400).json({ message: error.message || 'Failed to add expense item' });
    }
  });

  // Excel import - preview
  app.post('/api/cash-register/import/preview', isAuthenticated, requireRole('Admin', 'Finance'), documentUpload.single('file'), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // documentUpload uses disk storage, so read from file path
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      
      const preview = await parseExcelFile(fileBuffer, req.file.originalname);
      
      // Clean up temp file after parsing
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('[CASH_REGISTER] Could not delete temp file:', req.file.path);
      }
      
      res.json(preview);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error parsing Excel file:', error);
      res.status(400).json({ message: error.message || 'Failed to parse Excel file' });
    }
  });

  // Excel import - commit
  app.post('/api/cash-register/import/commit', isAuthenticated, requireRole('Admin', 'Finance'), async (req: any, res: Response) => {
    try {
      const { rows, fileName } = req.body;
      
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ message: 'No rows to import' });
      }
      
      const result = await commitImport(rows, fileName, req.user?.id);
      
      if (result.success) {
        await logAudit(req.user?.id, 'IMPORT', 'cash_register', '', 
          `Imported ${result.daysCreated} days from ${fileName}`);
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error committing import:', error);
      res.status(400).json({ message: error.message || 'Failed to commit import' });
    }
  });

  // Bulk import from attached Excel file (for all sheets)
  app.post('/api/cash-register/import/bulk', isAuthenticated, requireRole('Admin', 'Finance'), async (req: any, res: Response) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: 'No file path provided' });
      }
      
      const result = await importCashRegisterFromExcel(filePath, req.user?.id);
      
      if (result.success) {
        await logAudit(req.user?.id, 'IMPORT', 'cash_register', '', 
          `Bulk imported ${result.daysCreated} days, ${result.vouchersCreated} vouchers from ${filePath}`);
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error bulk importing:', error);
      res.status(400).json({ message: error.message || 'Failed to bulk import' });
    }
  });

  // Cash Register Report - Daily, Weekly, Monthly, Yearly
  app.get('/api/cash-register/report', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { periodType, startDate, endDate, salespersonName } = req.query;
      
      // Get all days within date range
      const allDays = await storage.getCashRegisterDays({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        salespersonName: salespersonName as string | undefined,
      });
      
      // Sort by date
      const sortedDays = allDays.sort((a, b) => 
        new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime()
      );
      
      // Group by period
      const groupByPeriod = (days: typeof sortedDays, type: string) => {
        const groups: Record<string, typeof sortedDays> = {};
        
        for (const day of days) {
          const date = new Date(day.registerDate);
          let key: string;
          
          switch (type) {
            case 'daily':
              key = day.registerDate;
              break;
            case 'weekly':
              // Get week start (Monday)
              const weekStart = new Date(date);
              weekStart.setDate(date.getDate() - date.getDay() + 1);
              key = weekStart.toISOString().split('T')[0];
              break;
            case 'monthly':
              key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              break;
            case 'yearly':
              key = String(date.getFullYear());
              break;
            default:
              key = day.registerDate;
          }
          
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(day);
        }
        
        return groups;
      };
      
      const groups = groupByPeriod(sortedDays, periodType as string || 'daily');
      
      // Calculate summaries for each period
      const periodSummaries = Object.entries(groups).map(([period, days]) => {
        const firstDay = days[0];
        const lastDay = days[days.length - 1];
        
        const totalCashReceived = days.reduce((sum, d) => sum + d.totalCashReceived, 0);
        const totalExpenses = days.reduce((sum, d) => sum + d.totalExpenses, 0);
        const totalTransfers = days.reduce((sum, d) => sum + d.totalTransfers, 0);
        const openingBalance = firstDay.openingBalance;
        const closingBalance = lastDay.openingBalance + lastDay.totalCashReceived - lastDay.totalExpenses - lastDay.totalTransfers;
        const netCashFlow = totalCashReceived - totalExpenses - totalTransfers;
        
        // Count statuses
        const openDays = days.filter(d => d.status === 'open').length;
        const closedDays = days.filter(d => d.status === 'closed').length;
        
        return {
          period,
          startDate: firstDay.registerDate,
          endDate: lastDay.registerDate,
          daysCount: days.length,
          openDays,
          closedDays,
          openingBalance,
          closingBalance,
          totalCashReceived,
          totalExpenses,
          totalTransfers,
          netCashFlow,
          days: days.map(d => ({
            id: d.id,
            date: d.registerDate,
            status: d.status,
            openingBalance: d.openingBalance,
            cashReceived: d.totalCashReceived,
            expenses: d.totalExpenses,
            transfers: d.totalTransfers,
            closingBalance: d.openingBalance + d.totalCashReceived - d.totalExpenses - d.totalTransfers,
            salespersonName: d.salespersonName,
            importedFromFile: d.importedFromFile,
          })),
        };
      });
      
      // Sort periods chronologically
      periodSummaries.sort((a, b) => a.period.localeCompare(b.period));
      
      // Overall summary
      const overallSummary = {
        totalDays: sortedDays.length,
        totalCashReceived: sortedDays.reduce((sum, d) => sum + d.totalCashReceived, 0),
        totalExpenses: sortedDays.reduce((sum, d) => sum + d.totalExpenses, 0),
        totalTransfers: sortedDays.reduce((sum, d) => sum + d.totalTransfers, 0),
        netCashFlow: 0,
        openingBalance: sortedDays.length > 0 ? sortedDays[0].openingBalance : 0,
        closingBalance: 0,
        openDays: sortedDays.filter(d => d.status === 'open').length,
        closedDays: sortedDays.filter(d => d.status === 'closed').length,
      };
      overallSummary.netCashFlow = overallSummary.totalCashReceived - overallSummary.totalExpenses - overallSummary.totalTransfers;
      if (sortedDays.length > 0) {
        const lastDay = sortedDays[sortedDays.length - 1];
        overallSummary.closingBalance = lastDay.openingBalance + lastDay.totalCashReceived - lastDay.totalExpenses - lastDay.totalTransfers;
      }
      
      res.json({
        periodType: periodType || 'daily',
        startDate,
        endDate,
        overallSummary,
        periods: periodSummaries,
      });
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error generating report:', error);
      res.status(500).json({ message: error.message || 'Failed to generate report' });
    }
  });

  // Get cash register documents for a date range
  app.get('/api/cash-register/documents', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { startDate, endDate, transactionType } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }
      
      // Get all days in range
      const allDays = await storage.getCashRegisterDays();
      const daysInRange = allDays.filter(d => {
        const date = d.registerDate;
        return date >= startDate && date <= endDate;
      });
      
      const dayIds = daysInRange.map(d => d.id);
      
      // Get all transactions for these days that have documents
      const allTransactions = await db.select()
        .from(cashRegisterTransactions)
        .where(and(
          inArray(cashRegisterTransactions.dayId, dayIds.length > 0 ? dayIds : ['']),
          isNotNull(cashRegisterTransactions.documentPath),
          eq(cashRegisterTransactions.recordStatus, 1)
        ));
      
      // Filter by transaction type if specified
      let filteredTransactions = allTransactions;
      if (transactionType && transactionType !== 'all') {
        filteredTransactions = allTransactions.filter(t => t.transactionType === transactionType);
      }
      
      // Map to document data format with day info
      const dayMap = new Map(daysInRange.map(d => [d.id, d]));
      const documents = filteredTransactions.map(t => {
        const day = dayMap.get(t.dayId);
        return {
          id: t.id,
          date: day?.registerDate || '',
          transactionType: t.transactionType,
          sourceType: t.sourceType,
          amount: t.amount,
          description: t.description,
          documentPath: t.documentPath,
          documentName: t.documentName,
          reference: t.reference,
          dayId: t.dayId,
          voucherId: t.convertedToVoucherId,
        };
      }).filter(d => d.documentPath); // Only include ones with actual documents
      
      // Sort by date descending
      documents.sort((a, b) => b.date.localeCompare(a.date));
      
      res.json({ documents });
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error fetching documents:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch documents' });
    }
  });

  // Download multiple cash register documents as ZIP
  app.get('/api/cash-register/documents/download', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { startDate, endDate, transactionType } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }
      
      // Get all days in range
      const allDays = await storage.getCashRegisterDays();
      const daysInRange = allDays.filter(d => {
        const date = d.registerDate;
        return date >= startDate && date <= endDate;
      });
      
      const dayIds = daysInRange.map(d => d.id);
      
      if (dayIds.length === 0) {
        return res.status(404).json({ message: 'No days found in the selected range' });
      }
      
      // Get all transactions for these days that have documents
      const allTransactions = await db.select()
        .from(cashRegisterTransactions)
        .where(and(
          inArray(cashRegisterTransactions.dayId, dayIds),
          isNotNull(cashRegisterTransactions.documentPath),
          eq(cashRegisterTransactions.recordStatus, 1)
        ));
      
      // Filter by transaction type if specified
      let filteredTransactions = allTransactions;
      if (transactionType && transactionType !== 'all') {
        filteredTransactions = allTransactions.filter(t => t.transactionType === transactionType);
      }
      
      // Filter to only those with actual documents
      const docsToDownload = filteredTransactions.filter(t => t.documentPath);
      
      if (docsToDownload.length === 0) {
        return res.status(404).json({ message: 'No documents found for the selected criteria' });
      }
      
      // Create a map of day IDs to dates for naming
      const dayMap = new Map(daysInRange.map(d => [d.id, d.registerDate]));
      
      // Set up ZIP response
      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 5 } });
      
      // Generate filename based on date range
      const zipFilename = `cash_register_docs_${startDate}_to_${endDate}.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
      
      archive.pipe(res);
      
      // Add each document to the archive
      const fs = require('fs');
      const path = require('path');
      
      for (const doc of docsToDownload) {
        if (doc.documentPath) {
          // Extract the file path from the URL/path
          let filePath = doc.documentPath;
          if (filePath.startsWith('/')) {
            filePath = filePath.substring(1);
          }
          
          const fullPath = path.join(process.cwd(), filePath);
          
          if (fs.existsSync(fullPath)) {
            const date = dayMap.get(doc.dayId) || 'unknown';
            const type = doc.transactionType || 'other';
            const ext = path.extname(doc.documentName || filePath);
            const baseName = path.basename(doc.documentName || filePath, ext);
            
            // Create folder structure: date/type/filename
            const archivePath = `${date}/${type}/${baseName}_${doc.id}${ext}`;
            archive.file(fullPath, { name: archivePath });
          }
        }
      }
      
      await archive.finalize();
      
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error downloading documents:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || 'Failed to download documents' });
      }
    }
  });

  // Get expense vouchers for printing
  app.get('/api/cash-register/vouchers/print', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id, startDate, endDate, mode } = req.query;
      
      let voucherIds: string[] = [];
      
      if (mode === 'single' && id) {
        // Single voucher
        voucherIds = [id as string];
      } else if (mode === 'all') {
        // Get all expense vouchers from cash register (EXP-CR-*)
        const allVouchers = await db.select({ id: expenseVouchers.id })
          .from(expenseVouchers)
          .where(and(
            sql`${expenseVouchers.voucherNumber} LIKE 'EXP-CR-%'`,
            eq(expenseVouchers.recordStatus, 1)
          ))
          .orderBy(desc(expenseVouchers.voucherDate))
          .limit(50); // Limit to 50 for performance
        
        voucherIds = allVouchers.map(v => v.id);
      } else if ((mode === 'day' || mode === 'range') && startDate && endDate) {
        // Get vouchers from cash register transactions in date range
        const allDays = await storage.getCashRegisterDays();
        const daysInRange = allDays.filter(d => {
          const date = d.registerDate;
          return date >= startDate && date <= endDate;
        });
        
        const dayIds = daysInRange.map(d => d.id);
        
        if (dayIds.length > 0) {
          // Get expense transactions with voucher IDs
          const transactions = await db.select()
            .from(cashRegisterTransactions)
            .where(and(
              inArray(cashRegisterTransactions.dayId, dayIds),
              eq(cashRegisterTransactions.transactionType, 'expense'),
              isNotNull(cashRegisterTransactions.convertedToVoucherId),
              eq(cashRegisterTransactions.recordStatus, 1)
            ));
          
          voucherIds = transactions
            .map(t => t.convertedToVoucherId)
            .filter((id): id is string => id !== null);
        }
      }
      
      if (voucherIds.length === 0) {
        return res.json([]);
      }
      
      // Fetch vouchers with their items
      const vouchers = await db.select()
        .from(expenseVouchers)
        .where(and(
          inArray(expenseVouchers.id, voucherIds),
          eq(expenseVouchers.recordStatus, 1)
        ))
        .orderBy(expenseVouchers.voucherDate);
      
      // Fetch items for all vouchers
      const allItems = await db.select()
        .from(expenseItems)
        .where(and(
          inArray(expenseItems.voucherId, voucherIds),
          eq(expenseItems.recordStatus, 1)
        ));
      
      // Group items by voucher
      const itemsByVoucher = allItems.reduce((acc: Record<string, typeof allItems>, item) => {
        if (!acc[item.voucherId]) acc[item.voucherId] = [];
        acc[item.voucherId].push(item);
        return acc;
      }, {});
      
      // Combine vouchers with their items
      const vouchersWithItems = vouchers.map(v => ({
        ...v,
        items: itemsByVoucher[v.id] || [],
      }));
      
      res.json(vouchersWithItems);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error fetching vouchers for print:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch vouchers' });
    }
  });

  // Clear all cash register data
  app.post('/api/cash-register/clear-data', isAuthenticated, requireRole('Admin'), async (req: any, res: Response) => {
    try {
      console.log('[CASH_REGISTER] Clearing all cash register data...');
      
      // Delete in correct order due to foreign keys
      // 1. Delete expense items
      const itemsDeleted = await db.delete(cashRegisterExpenseItems).returning();
      
      // 2. Delete transactions
      const transactionsDeleted = await db.delete(cashRegisterTransactions).returning();
      
      // 3. Delete days
      const daysDeleted = await db.delete(cashRegisterDays).returning();
      
      // 4. Delete related vouchers (EXP-CR-*)
      const vouchersResult = await db.execute(sql`
        DELETE FROM expense_items WHERE voucher_id IN (
          SELECT id FROM expense_vouchers WHERE voucher_number LIKE 'EXP-CR-%'
        );
        DELETE FROM expense_vouchers WHERE voucher_number LIKE 'EXP-CR-%';
      `);
      
      await logAudit(req.user?.id, 'DELETE', 'cash_register', '', 
        `Cleared all cash register data: ${daysDeleted.length} days, ${transactionsDeleted.length} transactions, ${itemsDeleted.length} items`);
      
      res.json({
        success: true,
        daysDeleted: daysDeleted.length,
        transactionsDeleted: transactionsDeleted.length,
        itemsDeleted: itemsDeleted.length,
        message: `Cleared ${daysDeleted.length} days, ${transactionsDeleted.length} transactions, ${itemsDeleted.length} expense items`
      });
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error clearing data:', error);
      res.status(500).json({ message: error.message || 'Failed to clear cash register data' });
    }
  });

  // Salesperson mappings CRUD
  app.get('/api/cash-register/salesperson-mappings', isAuthenticated, async (req: any, res: Response) => {
    try {
      const mappings = await storage.getAllSalespersonMappings();
      res.json(mappings);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error fetching mappings:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch salesperson mappings' });
    }
  });

  app.post('/api/cash-register/salesperson-mappings', isAuthenticated, requireRole('Admin'), async (req: any, res: Response) => {
    try {
      const parsed = insertSalespersonMappingSchema.parse(req.body);
      
      // Check for duplicate
      const existing = await storage.getSalespersonMappingByName(parsed.excelName);
      if (existing) {
        return res.status(400).json({ message: `Mapping already exists for "${parsed.excelName}"` });
      }
      
      const mapping = await storage.createSalespersonMapping(parsed);
      res.status(201).json(mapping);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error creating mapping:', error);
      res.status(400).json({ message: error.message || 'Failed to create salesperson mapping' });
    }
  });

  app.patch('/api/cash-register/salesperson-mappings/:id', isAuthenticated, requireRole('Admin'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateSalespersonMapping(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: 'Mapping not found' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error updating mapping:', error);
      res.status(400).json({ message: error.message || 'Failed to update salesperson mapping' });
    }
  });

  app.delete('/api/cash-register/salesperson-mappings/:id', isAuthenticated, requireRole('Admin'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteSalespersonMapping(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error deleting mapping:', error);
      res.status(500).json({ message: error.message || 'Failed to delete salesperson mapping' });
    }
  });

  // Convert cash register expense to voucher
  app.post('/api/cash-register/transactions/:transactionId/convert-to-voucher', isAuthenticated, requireRole('Admin', 'Finance'), async (req: any, res: Response) => {
    try {
      const { transactionId } = req.params;
      const { categoryId, payeeName } = req.body;
      
      const transaction = await storage.getCashRegisterTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      if (transaction.transactionType !== 'expense') {
        return res.status(400).json({ message: 'Can only convert expense transactions' });
      }
      
      if (transaction.convertedToVoucherId) {
        return res.status(400).json({ message: 'Transaction already converted to voucher' });
      }
      
      // Get the day for additional context
      const day = await storage.getCashRegisterDay(transaction.dayId);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      // Get expense items
      const expenseItems = await storage.getCashRegisterExpenseItems(transactionId);
      
      // Generate voucher number
      const now = new Date();
      const voucherNumber = `EXP-${format(now, 'yyyyMMdd')}-${Date.now().toString().slice(-4)}`;
      
      // Create expense voucher
      const voucher = await storage.createExpenseVoucher({
        voucherNumber,
        voucherDate: day.registerDate,
        payeeType: 'staff' as const,
        payeeName: payeeName || day.salespersonName,
        payeeVendorId: null,
        categoryId: categoryId || null,
        totalAmount: transaction.amount,
        paymentMode: 'cash' as const,
        gstApplicable: false,
        status: 'submitted' as const,
        purpose: transaction.description || `Converted from Cash Register - ${day.salespersonName}`,
        createdBy: req.user?.id,
      });
      
      // Create expense items
      for (const item of expenseItems) {
        await storage.createExpenseItem({
          voucherId: voucher.id,
          description: item.itemLabel,
          amount: item.amount,
          categoryId: item.expenseCategoryId || categoryId || null,
        });
      }
      
      // If no items, create a single item
      if (expenseItems.length === 0) {
        await storage.createExpenseItem({
          voucherId: voucher.id,
          description: transaction.description || 'Cash register expense',
          amount: transaction.amount,
          categoryId: categoryId || null,
        });
      }
      
      // Update transaction to link to voucher
      await storage.updateCashRegisterTransaction(transactionId, {
        convertedToVoucherId: voucher.id,
        convertedAt: new Date().toISOString(),
      });
      
      await logAudit(req.user?.id, 'CONVERT', 'cash_register_transactions', transactionId, 
        `Converted to expense voucher ${voucherNumber}`);
      
      res.status(201).json({ voucher, transactionId });
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error converting to voucher:', error);
      res.status(400).json({ message: error.message || 'Failed to convert to voucher' });
    }
  });

  // Get unique salespersons from cash register
  app.get('/api/cash-register/salespersons', isAuthenticated, async (req: any, res: Response) => {
    try {
      const days = await storage.getCashRegisterDays({});
      const salespersons = [...new Set(days.map(d => d.salespersonName))].filter(Boolean).sort();
      res.json(salespersons);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error fetching salespersons:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch salespersons' });
    }
  });

  // ==================== REPORTS API ENDPOINTS ====================
  
  // Expense Report - Get expense vouchers with items for date range
  app.get('/api/reports/expenses', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { startDate, endDate, status, payeeType } = req.query;
      
      const allVouchers = await storage.getAllExpenseVouchers();
      
      // Filter by date range and other criteria
      let filteredVouchers = allVouchers.filter(v => {
        if (startDate && v.voucherDate < startDate) return false;
        if (endDate && v.voucherDate > endDate) return false;
        if (status && status !== 'all' && v.status !== status) return false;
        if (payeeType && payeeType !== 'all' && v.payeeType !== payeeType) return false;
        return true;
      });
      
      // Get items for each voucher
      const vouchersWithItems = await Promise.all(
        filteredVouchers.map(async (voucher) => {
          const fullVoucher = await storage.getExpenseVoucher(voucher.id);
          return {
            ...voucher,
            items: fullVoucher?.items || []
          };
        })
      );
      
      // Calculate summary
      const summary = {
        totalVouchers: vouchersWithItems.length,
        totalAmount: vouchersWithItems.reduce((sum, v) => sum + (v.totalAmount || 0), 0),
        totalGST: vouchersWithItems.reduce((sum, v) => sum + (v.gstAmount || 0), 0),
        byStatus: {
          draft: vouchersWithItems.filter(v => v.status === 'draft').length,
          submitted: vouchersWithItems.filter(v => v.status === 'submitted').length,
          approved: vouchersWithItems.filter(v => v.status === 'approved').length,
          rejected: vouchersWithItems.filter(v => v.status === 'rejected').length,
          paid: vouchersWithItems.filter(v => v.status === 'paid').length,
        },
        byPaymentMode: {} as Record<string, number>,
      };
      
      // Group by payment mode
      vouchersWithItems.forEach(v => {
        const mode = v.paymentMode || 'unknown';
        summary.byPaymentMode[mode] = (summary.byPaymentMode[mode] || 0) + (v.totalAmount || 0);
      });
      
      res.json({
        vouchers: vouchersWithItems,
        summary,
        dateRange: { startDate, endDate }
      });
    } catch (error: any) {
      console.error('[REPORTS] Error fetching expense report:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch expense report' });
    }
  });
  
  // Cash Register Report - Get cash register data for date range
  app.get('/api/reports/cash-register', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { startDate, endDate, salesperson, status } = req.query;
      
      const allDays = await storage.getCashRegisterDays({});
      
      // Filter by date range and other criteria
      let filteredDays = allDays.filter(d => {
        if (startDate && d.registerDate < startDate) return false;
        if (endDate && d.registerDate > endDate) return false;
        if (salesperson && salesperson !== 'all' && d.salespersonName !== salesperson) return false;
        if (status && status !== 'all' && d.status !== status) return false;
        return true;
      });
      
      // Get transactions and items for each day
      const daysWithDetails = await Promise.all(
        filteredDays.map(async (day) => {
          const fullDay = await storage.getCashRegisterDayWithDetails(day.id);
          return fullDay || day;
        })
      );
      
      // Sort by date
      daysWithDetails.sort((a, b) => 
        new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime()
      );
      
      // Calculate summary
      const summary = {
        totalDays: daysWithDetails.length,
        startingBalance: daysWithDetails.length > 0 ? daysWithDetails[0].openingBalance : 0,
        endingBalance: daysWithDetails.length > 0 ? daysWithDetails[daysWithDetails.length - 1].closingBalance : 0,
        totalCashReceived: daysWithDetails.reduce((sum, d) => sum + (d.totalCashReceived || 0), 0),
        totalDeposits: daysWithDetails.reduce((sum, d) => sum + (d.totalDeposits || 0), 0),
        totalExpenses: daysWithDetails.reduce((sum, d) => sum + (d.totalExpenses || 0), 0),
        totalTransfers: daysWithDetails.reduce((sum, d) => sum + (d.totalTransfers || 0), 0),
        totalVariance: daysWithDetails.reduce((sum, d) => sum + (d.variance || 0), 0),
        daysWithDiscrepancy: daysWithDetails.filter(d => d.hasDiscrepancy === 1).length,
        byStatus: {
          open: daysWithDetails.filter(d => d.status === 'open').length,
          reconciled: daysWithDetails.filter(d => d.status === 'reconciled').length,
          locked: daysWithDetails.filter(d => d.status === 'locked').length,
        },
        bySalesperson: {} as Record<string, { days: number; expenses: number; cashReceived: number }>,
      };
      
      // Group by salesperson
      daysWithDetails.forEach(d => {
        const sp = d.salespersonName || 'Unknown';
        if (!summary.bySalesperson[sp]) {
          summary.bySalesperson[sp] = { days: 0, expenses: 0, cashReceived: 0 };
        }
        summary.bySalesperson[sp].days++;
        summary.bySalesperson[sp].expenses += d.totalExpenses || 0;
        summary.bySalesperson[sp].cashReceived += d.totalCashReceived || 0;
      });
      
      res.json({
        days: daysWithDetails,
        summary,
        dateRange: { startDate, endDate }
      });
    } catch (error: any) {
      console.error('[REPORTS] Error fetching cash register report:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch cash register report' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
