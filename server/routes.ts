import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertMachineSchema, insertSparePartSchema, insertChecklistTemplateSchema, insertTemplateTaskSchema, insertMachineTypeSchema, insertMachineSpareSchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema, purchaseOrders, purchaseOrderItems, insertMaintenancePlanSchema, insertPMTaskListTemplateSchema, insertPMTemplateTaskSchema, insertPMExecutionSchema, insertPMExecutionTaskSchema, insertUomSchema, insertProductCategorySchema, insertProductTypeSchema, insertProductSchema, insertProductBomSchema, insertRawMaterialTypeSchema, insertRawMaterialSchema, insertRawMaterialTransactionSchema, insertFinishedGoodSchema, insertRawMaterialIssuanceSchema, insertRawMaterialIssuanceItemSchema, insertProductionEntrySchema, insertProductionReconciliationSchema, insertProductionReconciliationItemSchema, insertGatepassSchema, insertGatepassItemSchema, insertInvoiceSchema, insertInvoiceItemSchema, insertInvoicePaymentSchema, insertBankSchema, insertUserSchema, insertChecklistAssignmentSchema, insertNotificationConfigSchema, insertSalesReturnSchema, insertSalesReturnItemSchema, insertVendorTypeSchema, rawMaterialTypes, rawMaterials, rawMaterialIssuance, rawMaterialIssuanceItems, productionEntries, productionReconciliations, productionReconciliationItems, rawMaterialTransactions, finishedGoods, gatepasses, gatepassItems, invoices, invoiceItems, invoicePayments, paymentEvidence, salesReturns, salesReturnItems, creditNotes, creditNoteItems, debitNotes, debitNoteItems, manualCreditNoteRequests, products, productBom, whatsappConversationSessions, vendorTypes, vendorVendorTypes, vendors, users, uom, insertDocumentCategorySchema, insertDocumentSchema, insertExpenseCategorySchema, insertExpenseVoucherSchema, insertExpenseItemSchema, insertExpenseAttachmentSchema, rolePermissions, vendorDebitNotes, vendorDebitNoteItems, vendorDebitNoteAdjustments, transporters, vehicles, drivers, insertTransporterSchema, insertVehicleSchema, insertDriverSchema, scrapInventory, insertScrapInventorySchema } from "@shared/schema";
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
import { importVyapaarData, clearImportedData, importPaymentsOnly } from "./vyapaar-import";
import { importCreditNotesFromExcel } from "./creditnote-import";
import { parseExcelFile, commitImport } from "./cashRegisterImport";
import { importCashRegisterFromExcel } from "./importCashRegisterFromExcel";
import { insertCashRegisterDaySchema, insertCashRegisterTransactionSchema, insertCashRegisterExpenseItemSchema, insertSalespersonMappingSchema, cashRegisterDays, cashRegisterTransactions, cashRegisterExpenseItems, expenseVouchers, expenseItems, customerAdvances, advanceApplications, insertCustomerAdvanceSchema, insertAdvanceApplicationSchema } from "@shared/schema";
import { sql, and, eq, ne, gte, lte, gt, desc, inArray, isNotNull, isNull, or, ilike, type SQL } from "drizzle-orm";

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
    
    // Update the day with discrepancy info (amounts already in rupees)
    await storage.updateCashRegisterDay(dayId, {
      hasDiscrepancy: hasDiscrepancy ? 1 : 0,
      discrepancyDetails: {
        balance_mismatch: balanceMismatch,
        items_mismatch: itemsMismatch,
        expected_closing: expectedClosing,
        actual_closing: day.closingBalance,
        closing_difference: day.closingBalance - expectedClosing,
        total_expenses: day.totalExpenses,
        items_total: itemsTotal,
        items_difference: day.totalExpenses - itemsTotal,
      },
    } as any);
    
    console.log(`[CASH_REGISTER] Recalculated discrepancy for day ${dayId}: hasDiscrepancy=${hasDiscrepancy}`);
  } catch (error) {
    console.error('[CASH_REGISTER] Error recalculating discrepancy:', error);
  }
}


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

// Mapping of API endpoints to screen keys for permission checking
// This allows custom roles with database permissions to access these endpoints
// COMPREHENSIVE: Maps all API endpoints to their corresponding screen permissions
const endpointToScreenKey: Record<string, string> = {
  // Dashboard & Analytics
  '/api/dashboard': 'dashboard',
  '/api/sales-analytics': 'sales_dashboard',
  '/api/vendor-analytics': 'vendor_analytics',
  '/api/reports': 'reports',
  '/api/reports/finished-goods': 'report_finished_goods',
  '/api/reports/monthly-sales': 'report_monthly_sales',
  '/api/gst-reports': 'report_gst',
  
  // Quality & Checklists
  '/api/checklist-templates': 'checklist_templates',
  '/api/checklist-assignments': 'checklist_assignments',
  '/api/checklists': 'checklists',
  '/api/machine-startup-reminders': 'machine_startup_reminders',
  '/api/whatsapp': 'whatsapp_analytics',
  
  // Inventory Management
  '/api/products': 'products',
  '/api/product-categories': 'product_categories',
  '/api/product-types': 'product_types',
  '/api/raw-materials': 'raw_materials',
  '/api/raw-material-types': 'raw_material_types',
  '/api/finished-goods': 'finished_goods',
  '/api/inventory': 'inventory',
  '/api/uom': 'uom',
  
  // Production
  '/api/raw-material-issuance': 'raw_material_issuance',
  '/api/production-entries': 'production_entries',
  '/api/production-reconciliations': 'production_reconciliations',
  '/api/production': 'production_entries',
  '/api/variance': 'variance_analytics',
  
  // Sales & Invoicing
  '/api/invoices': 'invoices',
  '/api/invoice-items': 'invoices',
  '/api/invoice-payments': 'payments',
  '/api/pending-payments': 'pending_payments',
  '/api/payment-management': 'payments',
  '/api/credit-notes': 'credit_notes',
  '/api/debit-notes': 'credit_notes',
  '/api/cancelled-invoices': 'cancelled_invoices_report',
  '/api/sales-returns': 'sales_returns',
  '/api/payment-writeoff': 'payment_writeoff',
  '/api/write-off': 'payment_writeoff',
  '/api/customer-advances': 'customer_advances',
  '/api/advance-applications': 'customer_advances',
  
  // Dispatch & Logistics
  '/api/gatepasses': 'gatepasses',
  '/api/gatepass': 'gatepasses',
  '/api/dispatch': 'dispatch_tracking',
  '/api/dispatch-tracking': 'dispatch_tracking',
  '/api/transporters': 'dispatch_masters',
  '/api/vehicles': 'dispatch_masters',
  '/api/drivers': 'dispatch_masters',
  
  // Finance & Expenses
  '/api/cash-register': 'cash_register',
  '/api/expenses': 'expenses',
  '/api/expense-vouchers': 'expenses',
  '/api/expense-categories': 'expenses',
  
  // Documents
  '/api/documents': 'documents',
  '/api/document-categories': 'documents',
  
  // Maintenance
  '/api/maintenance-plans': 'maintenance_plans',
  '/api/pm-executions': 'pm_execution',
  '/api/pm-templates': 'pm_templates',
  
  // Purchasing
  '/api/purchase-orders': 'purchase_orders',
  '/api/vendor-debit-notes': 'vendor_debit_notes',
  '/api/vendor-debit-note-adjustments': 'vendor_debit_notes',
  
  // Master Data
  '/api/vendors': 'vendors',
  '/api/vendor-types': 'vendor_types',
  '/api/machines': 'machines',
  '/api/machine-types': 'machine_types',
  '/api/spare-parts': 'spare_parts',
  '/api/banks': 'banks',
  '/api/scrap-inventory': 'scrap_inventory',
  '/api/machine-startup-tasks': 'machine_startup_reminders',
  '/api/checklist-submissions': 'checklists',
  '/api/payment-evidence': 'payments',
  '/api/terms-conditions': 'template_management',
  
  // Administration
  '/api/users': 'users',
  '/api/roles': 'roles',
  '/api/role-permissions': 'roles',
  '/api/my-permissions': 'roles',
  '/api/templates': 'template_management',
  '/api/invoice-templates': 'template_management',
  '/api/notification-config': 'notification_settings',
  '/api/notification-settings': 'notification_settings',
  '/api/data-import': 'data_import',
  '/api/vyapaar': 'data_import',
  
  // MIS (Management Information System)
  '/api/mis/kpi-dashboard': 'mis_dashboard',
  '/api/mis/alerts': 'mis_dashboard',
  '/api/mis/production-analytics': 'mis_production',
  '/api/mis/inventory-analytics': 'mis_inventory',
  '/api/mis/sales-analytics': 'mis_sales',
  '/api/mis/delivery-performance': 'mis_delivery',
};

// Standard roles that are handled by name matching (case-insensitive)
const STANDARD_ROLES = ['admin', 'manager', 'operator', 'reviewer'];

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

      // ALL access is controlled by database permissions - no role name matching
      // This ensures custom roles with proper permissions can access any endpoint
      const pathBase = req.path.split('?')[0]; // Remove query params
      let screenKey: string | undefined;
      
      // Try exact match first
      screenKey = endpointToScreenKey[pathBase];
      
      // If no exact match, try prefix matching (e.g., /api/invoices/123 -> /api/invoices)
      if (!screenKey) {
        for (const [endpoint, key] of Object.entries(endpointToScreenKey)) {
          if (pathBase.startsWith(endpoint)) {
            screenKey = key;
            break;
          }
        }
      }
      
      if (screenKey) {
        // Check if the role has the appropriate permission for this action
        const permission = await db.select()
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, user.roleId),
            eq(rolePermissions.screenKey, screenKey),
            eq(rolePermissions.recordStatus, 1)
          ))
          .limit(1);
        
        if (permission.length > 0) {
          const perm = permission[0];
          const method = req.method.toUpperCase();
          
          // Check the appropriate permission based on HTTP method
          let hasRequiredPermission = false;
          let requiredAction = 'view';
          
          if (method === 'GET') {
            hasRequiredPermission = perm.canView === 1;
            requiredAction = 'view';
          } else if (method === 'POST') {
            hasRequiredPermission = perm.canCreate === 1;
            requiredAction = 'create';
          } else if (method === 'PUT' || method === 'PATCH') {
            hasRequiredPermission = perm.canEdit === 1;
            requiredAction = 'edit';
          } else if (method === 'DELETE') {
            hasRequiredPermission = perm.canDelete === 1;
            requiredAction = 'delete';
          }
          
          if (hasRequiredPermission) {
            console.log(`[AUDIT] Role ${role.name} granted ${requiredAction} access to ${req.path} via screen permission ${screenKey}`);
            req.userRole = role.name;
            return next();
          } else {
            console.log(`[AUDIT] Role ${role.name} denied ${requiredAction} access to ${req.path} - missing ${requiredAction} permission for ${screenKey}`);
          }
        }
      }
      
      console.log(`[AUDIT] User ${user.id} with role ${role.name} denied access to ${req.path} (requires: ${allowedRoles.join(', ')} or database permissions)`);
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });

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

  // Forgot Password - sends reset link to email
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success message to prevent email enumeration attacks
      if (!user) {
        console.log(`[AUTH] Forgot password attempt for non-existent email: ${email}`);
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store token in database
      await storage.setPasswordResetToken(user.id, resetToken, tokenExpiry);

      // Build reset URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      // Send email via Office 365 SMTP or SendGrid
      const sendEmail = async () => {
        const subject = 'Password Reset - KINTO Smart Ops';
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .warning { color: #dc2626; font-size: 12px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${user.firstName || user.username}</strong>,</p>
      <p>We received a request to reset your password for KINTO Smart Ops.</p>
      <p>Click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button" style="color: white;">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${resetUrl}</p>
      <p class="warning">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>KINTO Smart Ops - Manufacturing Operations Platform</p>
    </div>
  </div>
</body>
</html>
        `;

        // Check if Office 365 SMTP is configured
        if (process.env.OFFICE365_EMAIL && process.env.OFFICE365_PASSWORD) {
          const nodemailer = await import('nodemailer');
          
          console.log(`[EMAIL] Attempting to send via Office 365 SMTP...`);
          console.log(`[EMAIL] From: ${process.env.OFFICE365_EMAIL}`);
          console.log(`[EMAIL] To: ${email}`);
          
          const transporter = nodemailer.default.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false, // TLS
            auth: {
              user: process.env.OFFICE365_EMAIL,
              pass: process.env.OFFICE365_PASSWORD, // App password if MFA enabled
            },
            tls: {
              ciphers: 'SSLv3',
              rejectUnauthorized: false
            },
            debug: true, // Enable debug output
            logger: true // Log to console
          });

          try {
            // Verify connection first
            await transporter.verify();
            console.log(`[EMAIL] SMTP connection verified successfully`);
            
            const info = await transporter.sendMail({
              from: `"KINTO Smart Ops" <${process.env.OFFICE365_EMAIL}>`,
              to: email,
              subject,
              html: htmlBody
            });

            console.log(`[AUTH] Password reset email sent via Office 365 to: ${email}`);
            console.log(`[EMAIL] Message ID: ${info.messageId}`);
            return;
          } catch (smtpError: any) {
            console.error(`[EMAIL] Office 365 SMTP Error:`, smtpError.message);
            console.error(`[EMAIL] Error code:`, smtpError.code);
            console.error(`[EMAIL] Full error:`, smtpError);
            
            // Check for common Office 365 authentication issues
            if (smtpError.code === 'EAUTH' || smtpError.message?.includes('535')) {
              console.error(`[EMAIL] Authentication failed. This is usually because:`);
              console.error(`[EMAIL] 1. Basic authentication is disabled in Office 365 (Microsoft is phasing this out)`);
              console.error(`[EMAIL] 2. You need to use an App Password (if MFA is enabled)`);
              console.error(`[EMAIL] 3. SMTP AUTH may need to be enabled for this mailbox in Exchange Admin Center`);
            }
            throw smtpError;
          }
        }

        // Fallback: Check if SendGrid is configured
        if (process.env.SENDGRID_API_KEY) {
          const sgMail = await import('@sendgrid/mail');
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

          await sgMail.default.send({
            to: email,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || 'noreply@kinto.com',
              name: 'KINTO Smart Ops'
            },
            subject,
            html: htmlBody
          });

          console.log(`[AUTH] Password reset email sent via SendGrid to: ${email}`);
          return;
        }

        // No email service configured - log to console
        console.log('\n' + '='.repeat(60));
        console.log('[PASSWORD RESET - NO EMAIL SERVICE CONFIGURED]');
        console.log('Set OFFICE365_EMAIL + OFFICE365_PASSWORD for Office 365');
        console.log('Or set SENDGRID_API_KEY for SendGrid');
        console.log('='.repeat(60));
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('='.repeat(60) + '\n');
      };

      await sendEmail();
      
      console.log(`[AUDIT] Password reset requested for user ${user.id} (${email})`);
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error('[AUTH] Forgot password error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset Password - validates token and updates password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
      }

      // Hash new password and update user
      const hashedPassword = await hashPassword(password);
      await storage.clearPasswordResetToken(user.id, hashedPassword);

      console.log(`[AUDIT] Password reset completed for user ${user.id}`);
      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error('[AUTH] Reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

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
      const { email, password, firstName, lastName, role, mobileNumber, username: providedUsername } = req.body;

      // Validate required fields
      if (!email || !password || !mobileNumber) {
        return res.status(400).json({ message: "Email, password, and mobile number are required" });
      }
      
      // Validate mobile number format
      if (!/^[0-9]{10}$/.test(mobileNumber)) {
        return res.status(400).json({ message: "Mobile number must be 10 digits" });
      }

      // Validate role - check if role exists in database (allows custom roles)
      const validRole = await storage.getRoleByName(role);
      if (!validRole) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Use provided username or generate from email
      let username: string;
      if (providedUsername && providedUsername.trim()) {
        username = providedUsername.trim();
        // Check if provided username already exists
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername) {
          return res.status(400).json({ message: "Username already taken. Please choose a different username." });
        }
      } else {
        // Generate username from email (part before @) with random 2-digit suffix
        const emailPrefix = email.split('@')[0];
        const randomDigits = Math.floor(10 + Math.random() * 90); // Generates 10-99
        username = `${emailPrefix}${randomDigits}`;
        
        // Check if auto-generated username already exists (very unlikely with random suffix)
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername) {
          // Extremely rare case - generate new random digits
          const newRandomDigits = Math.floor(10 + Math.random() * 90);
          username = `${emailPrefix}${newRandomDigits}`;
        }
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
    } catch (error: any) {
      console.error("Error creating user:", error);
      // Handle duplicate key constraint errors
      if (error?.code === '23505') {
        if (error?.constraint === 'users_email_key') {
          return res.status(400).json({ message: "A user with this email already exists" });
        }
        if (error?.constraint === 'users_username_key') {
          return res.status(400).json({ message: "This username is already taken" });
        }
        return res.status(400).json({ message: "A user with these details already exists" });
      }
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
      const { status } = req.query;
      let purchaseOrders = await storage.getAllPurchaseOrders();
      
      // Filter by status if provided
      if (status) {
        purchaseOrders = purchaseOrders.filter((po: any) => po.status === status);
      }
      
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.post('/api/purchase-orders', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { items, ...poData } = req.body;
      
      const validatedData = insertPurchaseOrderSchema.partial({ requestedBy: true, approvedBy: true }).parse({
        ...poData,
        requestedBy: userId
      });
      const purchaseOrder = await storage.createPurchaseOrder(validatedData);
      
      // Create purchase order items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          // Preprocess item to ensure quantity is string (for numeric type)
          const processedItem = {
            ...item,
            purchaseOrderId: purchaseOrder.id,
            quantity: String(item.quantity || 0),
            serialNo: parseInt(String(item.serialNo)) || 1,
            unitPrice: parseInt(String(item.unitPrice)) || 0,
            amount: parseInt(String(item.amount)) || 0,
            gstRate: parseInt(String(item.gstRate)) || 1800,
            cgstAmount: parseInt(String(item.cgstAmount)) || 0,
            sgstAmount: parseInt(String(item.sgstAmount)) || 0,
            igstAmount: parseInt(String(item.igstAmount)) || 0,
            totalAmount: parseInt(String(item.totalAmount)) || 0,
          };
          const itemData = insertPurchaseOrderItemSchema.parse(processedItem);
          await db.insert(purchaseOrderItems).values(itemData);
        }
      }
      
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

  app.put('/api/purchase-orders/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { items, ...poData } = req.body;
      
      const validatedData = insertPurchaseOrderSchema.partial().parse(poData);
      const purchaseOrder = await storage.updatePurchaseOrder(id, validatedData);
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // Replace purchase order items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
        
        // Insert new items
        for (const item of items) {
          const itemData = insertPurchaseOrderItemSchema.parse({
            ...item,
            purchaseOrderId: id
          });
          await db.insert(purchaseOrderItems).values(itemData);
        }
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
      // Delete items first
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
      await storage.deletePurchaseOrder(id);
      res.json({ message: "Purchase order deleted successfully" });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Purchase Order Items API
  app.get('/api/purchase-order-items/:purchaseOrderId', isAuthenticated, async (req: any, res) => {
    try {
      const { purchaseOrderId } = req.params;
      const items = await db.select().from(purchaseOrderItems)
        .where(and(
          eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId),
          eq(purchaseOrderItems.recordStatus, 1)
        ))
        .orderBy(purchaseOrderItems.serialNo);
      res.json(items);
    } catch (error) {
      console.error("Error fetching purchase order items:", error);
      res.status(500).json({ message: "Failed to fetch purchase order items" });
    }
  });

  // Get receiving progress for all POs (items received vs total items)
  app.get('/api/purchase-orders/receiving-progress', isAuthenticated, async (req: any, res) => {
    try {
      // Get all PO items count per PO
      const poItemCounts = await db.select({
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        totalItems: sql<number>`count(*)::int`,
      })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.recordStatus, 1))
        .groupBy(purchaseOrderItems.purchaseOrderId);

      // Get received items count per PO (raw materials linked to PO items)
      const receivedCounts = await db.select({
        purchaseOrderId: rawMaterials.purchaseOrderId,
        receivedItems: sql<number>`count(distinct ${rawMaterials.purchaseOrderItemId})::int`,
      })
        .from(rawMaterials)
        .where(and(
          sql`${rawMaterials.purchaseOrderId} IS NOT NULL`,
          eq(rawMaterials.recordStatus, 1)
        ))
        .groupBy(rawMaterials.purchaseOrderId);

      // Combine the results
      const progressMap: Record<string, { totalItems: number; receivedItems: number }> = {};
      
      for (const item of poItemCounts) {
        if (item.purchaseOrderId) {
          progressMap[item.purchaseOrderId] = {
            totalItems: item.totalItems,
            receivedItems: 0,
          };
        }
      }
      
      for (const item of receivedCounts) {
        if (item.purchaseOrderId && progressMap[item.purchaseOrderId]) {
          progressMap[item.purchaseOrderId].receivedItems = item.receivedItems;
        }
      }

      res.json(progressMap);
    } catch (error) {
      console.error("Error fetching receiving progress:", error);
      res.status(500).json({ message: "Failed to fetch receiving progress" });
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

  // ==================== DISPATCH MASTER DATA APIs ====================

  // Transporters API
  app.get('/api/transporters', isAuthenticated, async (req: any, res) => {
    try {
      const allTransporters = await db
        .select()
        .from(transporters)
        .where(eq(transporters.recordStatus, 1))
        .orderBy(transporters.transporterName);
      res.json(allTransporters);
    } catch (error) {
      console.error("Error fetching transporters:", error);
      res.status(500).json({ message: "Failed to fetch transporters" });
    }
  });

  app.post('/api/transporters', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertTransporterSchema.parse(req.body);
      const [created] = await db.insert(transporters).values(validatedData).returning();
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating transporter:", error);
      res.status(500).json({ message: "Failed to create transporter" });
    }
  });

  app.get('/api/transporters/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [transporter] = await db.select().from(transporters).where(eq(transporters.id, id));
      if (!transporter) {
        return res.status(404).json({ message: "Transporter not found" });
      }
      res.json(transporter);
    } catch (error) {
      console.error("Error fetching transporter:", error);
      res.status(500).json({ message: "Failed to fetch transporter" });
    }
  });

  app.patch('/api/transporters/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTransporterSchema.partial().parse(req.body);
      const [updated] = await db.update(transporters).set({ ...validatedData, updatedAt: new Date().toISOString() }).where(eq(transporters.id, id)).returning();
      if (!updated) {
        return res.status(404).json({ message: "Transporter not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating transporter:", error);
      res.status(500).json({ message: "Failed to update transporter" });
    }
  });

  app.delete('/api/transporters/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.update(transporters).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(transporters.id, id));
      res.json({ message: "Transporter deleted successfully" });
    } catch (error) {
      console.error("Error deleting transporter:", error);
      res.status(500).json({ message: "Failed to delete transporter" });
    }
  });

  // Vehicles API
  app.get('/api/vehicles', isAuthenticated, async (req: any, res) => {
    try {
      const { transporterId } = req.query;
      let query = db
        .select({
          vehicle: vehicles,
          transporterName: transporters.transporterName,
        })
        .from(vehicles)
        .leftJoin(transporters, eq(vehicles.transporterId, transporters.id))
        .where(eq(vehicles.recordStatus, 1))
        .orderBy(vehicles.vehicleNumber);
      
      if (transporterId) {
        query = query.where(and(eq(vehicles.recordStatus, 1), eq(vehicles.transporterId, transporterId as string)));
      }
      
      const allVehicles = await query;
      res.json(allVehicles.map(v => ({ ...v.vehicle, transporterName: v.transporterName })));
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.post('/api/vehicles', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertVehicleSchema.parse(req.body);
      const [created] = await db.insert(vehicles).values(validatedData).returning();
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.get('/api/vehicles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.patch('/api/vehicles/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertVehicleSchema.partial().parse(req.body);
      const [updated] = await db.update(vehicles).set({ ...validatedData, updatedAt: new Date().toISOString() }).where(eq(vehicles.id, id)).returning();
      if (!updated) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete('/api/vehicles/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.update(vehicles).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(vehicles.id, id));
      res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Drivers API
  app.get('/api/drivers', isAuthenticated, async (req: any, res) => {
    try {
      const { transporterId } = req.query;
      let query = db
        .select({
          driver: drivers,
          transporterName: transporters.transporterName,
        })
        .from(drivers)
        .leftJoin(transporters, eq(drivers.transporterId, transporters.id))
        .where(eq(drivers.recordStatus, 1))
        .orderBy(drivers.driverName);
      
      if (transporterId) {
        query = query.where(and(eq(drivers.recordStatus, 1), eq(drivers.transporterId, transporterId as string)));
      }
      
      const allDrivers = await query;
      res.json(allDrivers.map(d => ({ ...d.driver, transporterName: d.transporterName })));
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });

  app.post('/api/drivers', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const validatedData = insertDriverSchema.parse(req.body);
      const [created] = await db.insert(drivers).values(validatedData).returning();
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating driver:", error);
      res.status(500).json({ message: "Failed to create driver" });
    }
  });

  app.get('/api/drivers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      console.error("Error fetching driver:", error);
      res.status(500).json({ message: "Failed to fetch driver" });
    }
  });

  app.patch('/api/drivers/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDriverSchema.partial().parse(req.body);
      const [updated] = await db.update(drivers).set({ ...validatedData, updatedAt: new Date().toISOString() }).where(eq(drivers.id, id)).returning();
      if (!updated) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating driver:", error);
      res.status(500).json({ message: "Failed to update driver" });
    }
  });

  app.delete('/api/drivers/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.update(drivers).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(drivers.id, id));
      res.json({ message: "Driver deleted successfully" });
    } catch (error) {
      console.error("Error deleting driver:", error);
      res.status(500).json({ message: "Failed to delete driver" });
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
      
      // Filter out null/undefined/empty values to prevent database constraint violations
      const validTypeIds = vendorTypeIds.filter((id: any) => id != null && id !== '');
      
      // Use transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // 1. Delete all existing vendor type assignments
        await tx.delete(vendorVendorTypes).where(eq(vendorVendorTypes.vendorId, vendorId));
        
        // 2. Insert new assignments
        if (validTypeIds.length > 0) {
          const assignments = validTypeIds.map((typeId: string) => ({
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

  // Get all vendor-type mappings for filtering
  app.get('/api/vendor-type-mappings', isAuthenticated, async (req: any, res) => {
    try {
      const mappings = await db
        .select({
          vendorId: vendorVendorTypes.vendorId,
          vendorTypeId: vendorVendorTypes.vendorTypeId,
          vendorTypeName: vendorTypes.name,
          vendorTypeCode: vendorTypes.code,
        })
        .from(vendorVendorTypes)
        .innerJoin(vendorTypes, eq(vendorVendorTypes.vendorTypeId, vendorTypes.id))
        .where(and(
          eq(vendorVendorTypes.recordStatus, 1),
          eq(vendorTypes.recordStatus, 1)
        ));
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching vendor type mappings:", error);
      res.status(500).json({ message: "Failed to fetch vendor type mappings" });
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
      
      // Convert empty SKU code to null to avoid unique constraint violation
      if (validatedData.skuCode === '' || validatedData.skuCode === undefined) {
        validatedData.skuCode = null;
      }
      
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
      
      // Convert empty SKU code to null to avoid unique constraint violation
      if (validatedData.skuCode === '' || validatedData.skuCode === undefined) {
        validatedData.skuCode = null;
      }
      
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
      const { configurationId } = req.query;
      
      // Validate productId format (must be valid UUID)
      const uuidSchema = z.string().uuid({ message: "Invalid product ID format - must be a valid UUID" });
      const validationResult = uuidSchema.safeParse(productId);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid product ID", 
          errors: validationResult.error.errors 
        });
      }

      const bomData = await storage.getProductBomWithTypes(productId, configurationId as string | undefined);
      res.json(bomData);
    } catch (error) {
      if (error instanceof Error && error.message === 'Product not found') {
        return res.status(404).json({ message: "Product not found" });
      }
      console.error("Error fetching product BOM with types:", error);
      res.status(500).json({ message: "Failed to fetch product BOM with conversion data" });
    }
  });

  // Product BOM Configurations API - Get all configurations for a product
  app.get('/api/products/:productId/bom-configurations', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const configs = await storage.getBomConfigurations(productId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching BOM configurations:", error);
      res.status(500).json({ message: "Failed to fetch BOM configurations" });
    }
  });

  // Create a new BOM configuration for a product
  app.post('/api/products/:productId/bom-configurations', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { productId } = req.params;
      const configData = { ...req.body, productId };
      const created = await storage.createBomConfiguration(configData);
      res.json(created);
    } catch (error) {
      console.error("Error creating BOM configuration:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create BOM configuration" });
    }
  });

  // Update a BOM configuration
  app.patch('/api/products/:productId/bom-configurations/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateBomConfiguration(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "BOM configuration not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating BOM configuration:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update BOM configuration" });
    }
  });

  // Delete a BOM configuration (and its BOM items)
  app.delete('/api/products/:productId/bom-configurations/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBomConfiguration(id);
      res.json({ message: "BOM configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting BOM configuration:", error);
      res.status(500).json({ message: "Failed to delete BOM configuration" });
    }
  });

  // Set default configuration for a product
  app.post('/api/products/:productId/bom-configurations/:id/set-default', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { productId, id } = req.params;
      await storage.setDefaultBomConfiguration(productId, id);
      res.json({ message: "Default configuration updated successfully" });
    } catch (error) {
      console.error("Error setting default BOM configuration:", error);
      res.status(500).json({ message: "Failed to set default BOM configuration" });
    }
  });

  app.post('/api/products/:productId/bom', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { productId } = req.params;
      
      // Check if body is an array (bulk replace) or single item
      if (Array.isArray(req.body)) {
        // Bulk replace: Atomically replace all BOM items using transaction
        console.log(`[BOM] Bulk replacing BOM for product ${productId} with ${req.body.length} items`);
        
        // Check if any item has configurationId (use new bulkReplaceProductBom)
        const hasConfigurationId = req.body.some((item: any) => item.configurationId);
        
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
        
        // Use bulkReplaceProductBom if configurationId is present (handles config-scoped delete)
        // Otherwise use legacy replaceProductBom
        let createdItems;
        if (hasConfigurationId && validatedItems.length > 0) {
          const configId = validatedItems[0].configurationId;
          const itemsWithProductId = validatedItems.map((item: any) => ({
            ...item,
            productId,
          }));
          createdItems = await storage.bulkReplaceProductBom(productId, itemsWithProductId, configId);
        } else {
          createdItems = await storage.replaceProductBom(productId, validatedItems);
        }
        
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
          (v.mobileNumber && v.mobileNumber.includes(query)) ||
          (v.shipToName && v.shipToName.toLowerCase().includes(query)) ||
          (v.shipToGstin && v.shipToGstin.toLowerCase().includes(query))
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

  // Get pending invoices for a vendor (for FIFO payment allocation preview)
  app.get('/api/vendors/:id/pending-invoices', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get vendor
      const vendor = await storage.getVendor(id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Get all invoices for this vendor
      const allInvoices = await storage.getAllInvoices();
      const vendorInvoices = allInvoices.filter(inv => inv.buyerName === vendor.vendorName && inv.recordStatus === 1);

      // Get all credit notes and debit notes for outstanding balance calculation
      const allCreditNotes = await db.select().from(creditNotes).where(
        and(eq(creditNotes.recordStatus, 1), eq(creditNotes.status, 'issued'))
      );
      const allDebitNotes = await db.select().from(debitNotes).where(
        and(eq(debitNotes.recordStatus, 1), eq(debitNotes.status, 'issued'))
      );

      // Group credit/debit notes by invoice ID
      const creditNotesByInvoice = new Map<string, number>();
      allCreditNotes.forEach(cn => {
        const current = creditNotesByInvoice.get(cn.invoiceId) || 0;
        creditNotesByInvoice.set(cn.invoiceId, current + cn.grandTotal);
      });

      const debitNotesByInvoice = new Map<string, number>();
      allDebitNotes.forEach(dn => {
        const current = debitNotesByInvoice.get(dn.invoiceId) || 0;
        debitNotesByInvoice.set(dn.invoiceId, current + dn.grandTotal);
      });

      // Calculate outstanding balance for each invoice
      // Formula: outstanding = (totalAmount + debitNotes) - creditNotes - amountReceived
      const invoicesWithBalance = vendorInvoices.map((invoice) => {
        const totalPaid = invoice.amountReceived || 0;
        const creditNoteTotal = creditNotesByInvoice.get(invoice.id) || 0;
        const debitNoteTotal = debitNotesByInvoice.get(invoice.id) || 0;
        const effectiveTotal = invoice.totalAmount + debitNoteTotal - creditNoteTotal;
        const outstanding = Math.max(0, effectiveTotal - totalPaid);
        return { 
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          totalAmount: invoice.totalAmount,
          effectiveTotal,
          creditNoteTotal,
          debitNoteTotal,
          totalPaid,
          outstanding 
        };
      });

      // Filter only invoices with outstanding balance and sort by invoice date (FIFO)
      const pendingInvoices = invoicesWithBalance
        .filter(inv => inv.outstanding > 0)
        .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

      // Calculate totals
      const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);

      res.json({
        vendorName: vendor.vendorName,
        pendingInvoices,
        totalOutstanding,
        invoiceCount: pendingInvoices.length
      });
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
      res.status(500).json({ message: "Failed to fetch pending invoices" });
    }
  });

  // GST Verification API
  app.post('/api/gst/verify', isAuthenticated, async (req: any, res) => {
    try {
      const { gstin } = req.body;
      
      if (!gstin) {
        return res.status(400).json({ message: "GSTIN is required" });
      }
      
      // Validate GSTIN format (15 characters: 2 state code + 10 PAN + 1 entity + 1 check + 1 default)
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstin.toUpperCase())) {
        return res.status(400).json({ 
          message: "Invalid GSTIN format", 
          valid: false,
          status: 'Invalid'
        });
      }
      
      // Try to verify using free GST API
      try {
        const axios = require('axios');
        const response = await axios.get(
          `https://sheet.gstincheck.co.in/check/free/${gstin.toUpperCase()}`,
          { timeout: 10000 }
        );
        
        if (response.data && response.data.flag === true && response.data.data) {
          const gstData = response.data.data;
          
          // Map status codes to readable status
          let status = 'Unknown';
          if (gstData.sts === 'Active') status = 'Active';
          else if (gstData.sts === 'Cancelled') status = 'Cancelled';
          else if (gstData.sts === 'Suspended') status = 'Suspended';
          else if (gstData.sts === 'Inactive') status = 'Inactive';
          else if (gstData.sts) status = gstData.sts;
          
          return res.json({
            valid: true,
            gstin: gstin.toUpperCase(),
            status: status,
            legalName: gstData.lgnm || '',
            tradeName: gstData.tradeNam || '',
            registrationDate: gstData.rgdt || '',
            cancellationDate: gstData.cxdt || '',
            stateCode: gstData.stcd || '',
            taxpayerType: gstData.dty || '',
            principalPlace: gstData.pradr?.adr || '',
            lastUpdated: gstData.lstupdt || '',
            isBlocked: status !== 'Active',
            blockReason: status !== 'Active' ? `GST registration is ${status}` : null
          });
        } else {
          // API returned but no valid data
          return res.json({
            valid: false,
            gstin: gstin.toUpperCase(),
            status: 'Unknown',
            message: 'Could not verify GSTIN. Please check the number and try again.',
            isBlocked: false
          });
        }
      } catch (apiError: any) {
        console.error('GST API error:', apiError.message);
        // Return unknown status if API fails (don't block the user)
        return res.json({
          valid: true,
          gstin: gstin.toUpperCase(),
          status: 'Unknown',
          message: 'GST verification service unavailable. Please verify manually.',
          isBlocked: false
        });
      }
    } catch (error) {
      console.error("Error verifying GST:", error);
      res.status(500).json({ message: "Failed to verify GST" });
    }
  });

  // Update vendor with GST verification
  app.post('/api/vendors/:id/verify-gst', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const vendor = await storage.getVendor(id);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      if (!vendor.gstNumber) {
        return res.status(400).json({ message: "Vendor has no GST number" });
      }
      
      // Call the GST verification
      const axios = require('axios');
      try {
        const response = await axios.get(
          `https://sheet.gstincheck.co.in/check/free/${vendor.gstNumber.toUpperCase()}`,
          { timeout: 10000 }
        );
        
        if (response.data && response.data.flag === true && response.data.data) {
          const gstData = response.data.data;
          
          let status = 'Unknown';
          if (gstData.sts === 'Active') status = 'Active';
          else if (gstData.sts === 'Cancelled') status = 'Cancelled';
          else if (gstData.sts === 'Suspended') status = 'Suspended';
          else if (gstData.sts === 'Inactive') status = 'Inactive';
          else if (gstData.sts) status = gstData.sts;
          
          // Update vendor with GST details
          const updatedVendor = await storage.updateVendor(id, {
            gstStatus: status,
            gstLegalName: gstData.lgnm || null,
            gstTradeName: gstData.tradeNam || null,
            gstVerifiedAt: new Date().toISOString()
          });
          
          return res.json({
            vendor: updatedVendor,
            gstDetails: {
              status,
              legalName: gstData.lgnm,
              tradeName: gstData.tradeNam,
              registrationDate: gstData.rgdt,
              taxpayerType: gstData.dty
            }
          });
        } else {
          return res.json({
            vendor,
            message: 'Could not verify GSTIN'
          });
        }
      } catch (apiError: any) {
        console.error('GST API error:', apiError.message);
        return res.json({
          vendor,
          message: 'GST verification service unavailable'
        });
      }
    } catch (error) {
      console.error("Error verifying vendor GST:", error);
      res.status(500).json({ message: "Failed to verify vendor GST" });
    }
  });

  // Bulk verify GST for all unverified vendors
  app.post('/api/vendors/bulk-verify-gst', requireRole('admin'), async (req: any, res) => {
    try {
      const axios = require('axios');
      
      // Get all vendors with GST numbers that haven't been verified
      const allVendors = await storage.getAllVendors();
      const unverifiedVendors = allVendors.filter(v => 
        v.gstNumber && 
        v.gstNumber.trim() !== '' && 
        (!v.gstStatus || v.gstStatus === '' || v.gstStatus === 'Unknown')
      );
      
      console.log(`[GST BULK] Starting verification for ${unverifiedVendors.length} vendors`);
      
      const results = {
        total: unverifiedVendors.length,
        verified: 0,
        active: 0,
        cancelled: 0,
        suspended: 0,
        inactive: 0,
        unknown: 0,
        failed: 0,
        details: [] as any[]
      };
      
      // Process in batches to avoid rate limiting
      const batchSize = 5;
      const delayBetweenBatches = 2000; // 2 seconds
      
      for (let i = 0; i < unverifiedVendors.length; i += batchSize) {
        const batch = unverifiedVendors.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (vendor) => {
          try {
            const gstin = vendor.gstNumber!.toUpperCase();
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            
            if (!gstinRegex.test(gstin)) {
              results.details.push({
                vendorId: vendor.id,
                vendorName: vendor.vendorName,
                gstNumber: vendor.gstNumber,
                status: 'Invalid Format',
                error: 'GSTIN format invalid'
              });
              results.failed++;
              return;
            }
            
            const response = await axios.get(
              `https://sheet.gstincheck.co.in/check/free/${gstin}`,
              { timeout: 15000 }
            );
            
            if (response.data && response.data.flag === true && response.data.data) {
              const gstData = response.data.data;
              
              let status = 'Unknown';
              if (gstData.sts === 'Active') { status = 'Active'; results.active++; }
              else if (gstData.sts === 'Cancelled') { status = 'Cancelled'; results.cancelled++; }
              else if (gstData.sts === 'Suspended') { status = 'Suspended'; results.suspended++; }
              else if (gstData.sts === 'Inactive') { status = 'Inactive'; results.inactive++; }
              else { status = gstData.sts || 'Unknown'; results.unknown++; }
              
              // Update vendor with GST details
              await storage.updateVendor(vendor.id, {
                gstStatus: status,
                gstLegalName: gstData.lgnm || null,
                gstTradeName: gstData.tradeNam || null,
                gstVerifiedAt: new Date().toISOString()
              });
              
              results.verified++;
              results.details.push({
                vendorId: vendor.id,
                vendorName: vendor.vendorName,
                gstNumber: vendor.gstNumber,
                status: status,
                legalName: gstData.lgnm || ''
              });
              
              console.log(`[GST BULK] Verified ${vendor.vendorName}: ${status}`);
            } else {
              results.unknown++;
              results.details.push({
                vendorId: vendor.id,
                vendorName: vendor.vendorName,
                gstNumber: vendor.gstNumber,
                status: 'Unknown',
                error: 'No data returned'
              });
            }
          } catch (apiError: any) {
            console.error(`[GST BULK] Error for ${vendor.vendorName}:`, apiError.message);
            results.failed++;
            results.details.push({
              vendorId: vendor.id,
              vendorName: vendor.vendorName,
              gstNumber: vendor.gstNumber,
              status: 'Error',
              error: apiError.message
            });
          }
        });
        
        await Promise.all(batchPromises);
        
        // Delay between batches to avoid rate limiting
        if (i + batchSize < unverifiedVendors.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      
      console.log(`[GST BULK] Completed: ${results.verified}/${results.total} verified`);
      res.json(results);
    } catch (error) {
      console.error("Error in bulk GST verification:", error);
      res.status(500).json({ message: "Failed to complete bulk GST verification" });
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
        // Find ALL records including deleted ones to ensure truly next number
        const allTypesRaw = await db.select({ typeCode: rawMaterialTypes.typeCode }).from(rawMaterialTypes);
        const existingCodes = allTypesRaw
          .map(t => t.typeCode)
          .filter(code => code && code.startsWith('RMT-'))
          .map(code => parseInt(code.replace('RMT-', '')) || 0);
        
        const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
        typeCode = `RMT-${(maxNumber + 1).toString().padStart(3, '0')}`;
      }
      
      // Check if typeCode already exists (including soft-deleted records)
      const existingWithType = await storage.getRawMaterialTypeByCode(typeCode);
      if (existingWithType) {
        if (existingWithType.recordStatus === 0) {
          // If it exists but is deleted, we should warn the user they can't reuse it
          // OR we could suggest restoring it. For now, strict uniqueness is safer for audit trails.
          return res.status(400).json({ 
            message: "Duplicate Type Code (Deleted)", 
            error: `The code '${typeCode}' was previously used for '${existingWithType.typeName}' and is now inactive. Please use a different code or contact admin to restore the previous record.` 
          });
        }
        return res.status(400).json({ 
          message: "Duplicate Type Code", 
          error: `The code '${typeCode}' is already assigned to '${existingWithType.typeName}'. Please use a different code.` 
        });
      }
      
      // VALIDATE FIRST with discriminated union schema - this ensures method-specific fields are present
      const inputToValidate = {
        ...req.body,
        typeCode,
        baseUnitWeight: req.body.baseUnitWeight != null && req.body.baseUnitWeight !== "" ? parseFloat(req.body.baseUnitWeight.toString()) : undefined,
        weightPerDerivedUnit: req.body.weightPerDerivedUnit != null && req.body.weightPerDerivedUnit !== "" ? parseFloat(req.body.weightPerDerivedUnit.toString()) : undefined,
        derivedValuePerBase: req.body.derivedValuePerBase != null && req.body.derivedValuePerBase !== "" ? parseFloat(req.body.derivedValuePerBase.toString()) : undefined,
        outputUnitsCovered: req.body.outputUnitsCovered != null && req.body.outputUnitsCovered !== "" ? parseFloat(req.body.outputUnitsCovered.toString()) : undefined,
        lossPercent: req.body.lossPercent != null && req.body.lossPercent !== "" ? parseFloat(req.body.lossPercent.toString()) : 0,
      };

      console.log("Validating RMT Input:", JSON.stringify(inputToValidate, null, 2));
      const validatedInput = insertRawMaterialTypeSchema.parse(inputToValidate);
      
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
        console.error("RMT Validation Error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating raw material type:", error);
      res.status(500).json({ message: "Failed to create raw material type", error: error instanceof Error ? error.message : String(error) });
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
      const inputToValidate = {
        ...sanitized,
        baseUnitWeight: sanitized.baseUnitWeight != null && sanitized.baseUnitWeight !== "" ? parseFloat(sanitized.baseUnitWeight.toString()) : undefined,
        weightPerDerivedUnit: sanitized.weightPerDerivedUnit != null && sanitized.weightPerDerivedUnit !== "" ? parseFloat(sanitized.weightPerDerivedUnit.toString()) : undefined,
        derivedValuePerBase: sanitized.derivedValuePerBase != null && sanitized.derivedValuePerBase !== "" ? parseFloat(sanitized.derivedValuePerBase.toString()) : undefined,
        outputUnitsCovered: sanitized.outputUnitsCovered != null && sanitized.outputUnitsCovered !== "" ? parseFloat(sanitized.outputUnitsCovered.toString()) : undefined,
        lossPercent: sanitized.lossPercent != null && sanitized.lossPercent !== "" ? parseFloat(sanitized.lossPercent.toString()) : 0,
      };

      console.log("Validating RMT Update Input:", JSON.stringify(inputToValidate, null, 2));
      const validatedMerged = insertRawMaterialTypeSchema.parse(inputToValidate);
      
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
    } catch (error: any) {
      console.error("Error fetching raw materials:", error);
      console.error("Error stack:", error?.stack);
      res.status(500).json({ message: "Failed to fetch raw materials", error: error?.message || String(error) });
    }
  });

  app.post('/api/raw-materials', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Auto-generate Material Code if not provided
      let materialCode = req.body.materialCode;
      if (!materialCode) {
        // Find ALL records including deleted ones to ensure truly next number
        const allMaterialsRaw = await db.select({ materialCode: rawMaterials.materialCode }).from(rawMaterials);
        const existingCodes = allMaterialsRaw
          .map(m => m.materialCode)
          .filter(code => code && code.startsWith('RM-'))
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
      
      // Auto-generate Batch Code based on receivedDate or openingDate (LOT-YYYYMMDD format)
      // Always generate batch code - default to current date if no date provided
      let batchCode = req.body.batchCode;
      const dateForBatch = req.body.receivedDate || req.body.openingDate || new Date().toISOString().slice(0, 10);
      if (!batchCode) {
        const receivedDate = new Date(dateForBatch);
        const dateStr = receivedDate.toISOString().slice(0, 10).replace(/-/g, '');
        // Include type category in batch code for uniqueness (e.g., LOT-PREFORM-20260127)
        const typeCategory = typeDetails?.category?.toUpperCase().replace(/\s+/g, '') || 'MATERIAL';
        const baseBatchCode = `LOT-${typeCategory}-${dateStr}`;
        
        // Check for existing materials with same TYPE and same date to determine sequence
        const allMaterials = await storage.getAllRawMaterials();
        const typeId = req.body.typeId;
        const sameDateBatches = allMaterials
          .filter(m => m.typeId === typeId && m.batchCode && m.batchCode.startsWith(baseBatchCode))
          .map(m => m.batchCode);
        
        if (sameDateBatches.length === 0) {
          batchCode = baseBatchCode;
        } else {
          // Find highest sequence number
          const sequences = sameDateBatches.map(code => {
            const match = code.match(/-(\d{3})$/);
            return match ? parseInt(match[1]) : 0;
          });
          const nextSeq = Math.max(0, ...sequences) + 1;
          batchCode = `${baseBatchCode}-${String(nextSeq).padStart(3, '0')}`;
        }
        console.log(`[BATCH] Auto-generated batch code: ${batchCode} for type: ${typeCategory}, date: ${dateForBatch}`);
      }

      // Check for duplicate Material Code (including soft-deleted records)
      const existingMaterial = await storage.getRawMaterialByCode(materialCode);
      if (existingMaterial) {
        if (existingMaterial.recordStatus === 0) {
          return res.status(400).json({ 
            message: "Duplicate Material Code (Deleted)", 
            error: `The code '${materialCode}' was previously used for '${existingMaterial.materialName}' and is now inactive. Please use a different code or contact admin to restore the previous record.` 
          });
        }
        return res.status(400).json({ 
          message: "Duplicate Material Code", 
          error: `The code '${materialCode}' is already assigned to '${existingMaterial.materialName}'. Please use a different code.` 
        });
      }
      
      const materialData = { 
        ...req.body, 
        materialCode,
        batchCode,
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
      
      // Auto-generate Batch Code if missing or if receivedDate/openingDate changed
      let updates: any = { ...sanitized };
      const dateForBatch = sanitized.receivedDate || sanitized.openingDate || existing.receivedDate || existing.openingDate || new Date().toISOString().slice(0, 10);
      const existingDateForBatch = existing.receivedDate || existing.openingDate;
      // Generate batch code if: no existing batch code, or date changed, and no new batch code provided
      if (!sanitized.batchCode && (!existing.batchCode || existingDateForBatch !== dateForBatch)) {
        const receivedDate = new Date(dateForBatch);
        const dateStr = receivedDate.toISOString().slice(0, 10).replace(/-/g, '');
        // Include type category in batch code for uniqueness (e.g., LOT-PREFORM-20260127)
        const typeCategory = typeDetails?.category?.toUpperCase().replace(/\s+/g, '') || 'MATERIAL';
        const baseBatchCode = `LOT-${typeCategory}-${dateStr}`;
        
        // Check for existing materials with same TYPE and same date to determine sequence
        const allMaterials = await storage.getAllRawMaterials();
        const typeId = sanitized.typeId || existing.typeId;
        const sameDateBatches = allMaterials
          .filter(m => m.id !== id && m.typeId === typeId && m.batchCode && m.batchCode.startsWith(baseBatchCode))
          .map(m => m.batchCode);
        
        if (sameDateBatches.length === 0) {
          updates.batchCode = baseBatchCode;
        } else {
          const sequences = sameDateBatches.map(code => {
            const match = code.match(/-(\d{3})$/);
            return match ? parseInt(match[1]) : 0;
          });
          const nextSeq = Math.max(0, ...sequences) + 1;
          updates.batchCode = `${baseBatchCode}-${String(nextSeq).padStart(3, '0')}`;
        }
        console.log(`[BATCH] Auto-generated batch code: ${updates.batchCode} for type: ${typeCategory}, date: ${dateForBatch}`);
      }
      
      // Recalculate closing stock if type details exist and stock fields changed
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

  // Fetch finished goods by IDs - used when editing gatepasses to show assigned batches
  // Supports both query params (?0=id1&1=id2) and path parameter (/by-ids/id1,id2)
  app.get('/api/finished-goods/by-ids/:ids?', isAuthenticated, async (req: any, res) => {
    try {
      let ids: string[] = [];
      
      // Check path parameter first (comma-separated)
      if (req.params.ids) {
        ids = req.params.ids.split(',').filter(Boolean);
      } 
      // Then check query params as array (TanStack Query sends array params as ?0=id1&1=id2)
      else if (req.query['0']) {
        ids = Object.values(req.query).filter(Boolean) as string[];
      }
      // Finally check for comma-separated query param
      else if (req.query.ids) {
        ids = (req.query.ids as string).split(',').filter(Boolean);
      }
      
      if (ids.length === 0) {
        return res.json([]);
      }
      
      // Fetch finished goods by IDs (including soft-deleted ones for display purposes)
      const goods = await db.select()
        .from(finishedGoods)
        .where(sql`${finishedGoods.id} IN (${sql.raw(ids.map((id: string) => `'${id}'`).join(','))})`);
      
      res.json(goods);
    } catch (error) {
      console.error("Error fetching finished goods by IDs:", error);
      res.status(500).json({ message: "Failed to fetch finished goods" });
    }
  });

  // Available Stock API - Returns finished goods with reserved quantities deducted
  // Reserved = quantities in invoices with status 'draft' or 'ready_for_gatepass'
  // IMPORTANT: Invoices that have an associated gatepass are NOT counted as reserved
  //            because the physical inventory has already been deducted when gatepass was created
  // Optional: excludeInvoiceId - exclude a specific invoice's reservations (useful when editing)
  app.get('/api/finished-goods/available-stock', isAuthenticated, async (req: any, res) => {
    try {
      const excludeInvoiceId = req.query.excludeInvoiceId as string | undefined;
      
      // Step 1: Get all approved finished goods with quantity > 0
      const allGoods = await storage.getAllFinishedGoods();
      const approvedGoods = allGoods.filter(
        fg => fg.qualityStatus === 'approved' && fg.quantity > 0 && fg.recordStatus === 1
      );

      // Step 2: Get reserved quantities from pending invoices
      // Pending = invoices that are draft or ready_for_gatepass (not yet dispatched)
      // EXCLUDE invoices that already have a gatepass (physical stock already deducted)
      const allPendingInvoices = await db.select().from(invoices).where(
        and(
          sql`${invoices.status} IN ('draft', 'ready_for_gatepass')`,
          eq(invoices.recordStatus, 1)
        )
      );
      
      // Get all active gatepasses to find which invoices already have gatepasses
      const activeGatepasses = await db.select({
        invoiceId: gatepasses.invoiceId
      }).from(gatepasses).where(
        and(
          eq(gatepasses.recordStatus, 1),
          sql`${gatepasses.invoiceId} IS NOT NULL`
        )
      );
      const invoiceIdsWithGatepass = new Set(activeGatepasses.map(gp => gp.invoiceId));
      
      // Filter out invoices that already have gatepasses (their stock is already deducted)
      // Also exclude the specified invoice if editing
      let pendingInvoiceIds = allPendingInvoices
        .filter(inv => !invoiceIdsWithGatepass.has(inv.id)) // Exclude invoices with gatepasses
        .map(inv => inv.id);
      
      if (excludeInvoiceId) {
        pendingInvoiceIds = pendingInvoiceIds.filter(id => id !== excludeInvoiceId);
      }
      let reservedByProduct: Record<string, number> = {};
      
      if (pendingInvoiceIds.length > 0) {
        // IMPORTANT: Only count active (non-soft-deleted) invoice items
        // record_status = 1 means active, record_status = 0 means soft-deleted
        const reservedItems = await db.select({
          productId: invoiceItems.productId,
          quantity: invoiceItems.quantity
        }).from(invoiceItems).where(
          and(
            sql`${invoiceItems.invoiceId} IN (${sql.join(pendingInvoiceIds.map(id => sql`${id}`), sql`, `)})`,
            eq(invoiceItems.recordStatus, 1)
          )
        );
        
        // Aggregate reserved quantities by product
        for (const item of reservedItems) {
          reservedByProduct[item.productId] = (reservedByProduct[item.productId] || 0) + item.quantity;
        }
      }

      // Step 3: Aggregate physical stock by product
      const stockByProduct: Record<string, { totalPhysical: number; reserved: number; available: number; batches: any[] }> = {};
      
      for (const fg of approvedGoods) {
        if (!stockByProduct[fg.productId]) {
          stockByProduct[fg.productId] = {
            totalPhysical: 0,
            reserved: reservedByProduct[fg.productId] || 0,
            available: 0,
            batches: []
          };
        }
        stockByProduct[fg.productId].totalPhysical += fg.quantity;
        stockByProduct[fg.productId].batches.push({
          id: fg.id,
          batchNumber: fg.batchNumber,
          productionDate: fg.productionDate,
          quantity: fg.quantity
        });
      }

      // Step 4: Calculate available stock (physical - reserved)
      for (const productId in stockByProduct) {
        const stock = stockByProduct[productId];
        stock.available = Math.max(0, stock.totalPhysical - stock.reserved);
      }

      // Step 5: Return both summary and individual batches with adjusted quantities
      // For individual batches, we apply FIFO deduction of reserved quantities
      const result = approvedGoods.map(fg => {
        const productStock = stockByProduct[fg.productId];
        // Calculate this batch's effective available quantity using FIFO
        // Sort batches by production date to apply FIFO
        const sortedBatches = productStock.batches.sort((a: any, b: any) => 
          new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
        );
        
        // Find this batch's position and calculate remaining reserved to apply
        let remainingReserved = productStock.reserved;
        let effectiveQuantity = fg.quantity;
        
        for (const batch of sortedBatches) {
          if (batch.id === fg.id) {
            // This is our batch - apply remaining reserved
            effectiveQuantity = Math.max(0, fg.quantity - remainingReserved);
            break;
          } else {
            // Older batch - deduct from reserved first
            remainingReserved = Math.max(0, remainingReserved - batch.quantity);
          }
        }
        
        return {
          ...fg,
          physicalQuantity: fg.quantity,
          reservedQuantity: fg.quantity - effectiveQuantity,
          availableQuantity: effectiveQuantity
        };
      }).filter(fg => fg.availableQuantity > 0); // Only return batches with available stock

      res.json({
        items: result,
        summary: Object.entries(stockByProduct).map(([productId, stock]) => ({
          productId,
          totalPhysical: stock.totalPhysical,
          reserved: stock.reserved,
          available: stock.available
        }))
      });
    } catch (error) {
      console.error("Error fetching available stock:", error);
      res.status(500).json({ message: "Failed to fetch available stock" });
    }
  });

  // Check if batch number already exists
  app.get('/api/finished-goods/check-batch/:batchNumber', isAuthenticated, async (req: any, res) => {
    try {
      const { batchNumber } = req.params;
      const goods = await storage.getAllFinishedGoods();
      const existing = goods.find(g => 
        g.batchNumber.toLowerCase() === batchNumber.toLowerCase() && 
        g.recordStatus === 1
      );
      res.json({ 
        exists: !!existing,
        existingItem: existing ? {
          id: existing.id,
          batchNumber: existing.batchNumber,
          quantity: existing.quantity,
          productionDate: existing.productionDate
        } : null
      });
    } catch (error) {
      console.error("Error checking batch number:", error);
      res.status(500).json({ message: "Failed to check batch number" });
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

  // FIFO Batch Allocation for Gatepass
  // Takes invoice items (product + quantity) and returns FIFO-allocated finished goods batches
  // Now considers reserved quantities from pending invoices (draft/ready_for_gatepass)
  app.post('/api/finished-goods/fifo-allocation', isAuthenticated, async (req: any, res) => {
    try {
      const { items, excludeInvoiceId } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one item is required for FIFO allocation" });
      }
      
      // Get all approved finished goods with stock > 0, ordered by production date (oldest first - FIFO)
      const allFinishedGoods = await storage.getAllFinishedGoods();
      
      // Debug: Log all finished goods with their production dates
      console.log("[FIFO DEBUG] All approved finished goods before sort:");
      allFinishedGoods
        .filter(fg => fg.qualityStatus === 'approved' && fg.quantity > 0 && fg.recordStatus === 1)
        .forEach(fg => {
          console.log(`  Batch: ${fg.batchNumber}, ProductId: ${fg.productId}, Date: ${fg.productionDate}, Qty: ${fg.quantity}`);
        });
      
      const approvedGoods = allFinishedGoods
        .filter(fg => fg.qualityStatus === 'approved' && fg.quantity > 0 && fg.recordStatus === 1)
        .sort((a, b) => {
          // Handle null/undefined production dates - put them at the end (oldest known dates first)
          if (!a.productionDate && !b.productionDate) return 0;
          if (!a.productionDate) return 1; // a goes after b (null dates at end)
          if (!b.productionDate) return -1; // b goes after a
          
          const dateA = new Date(a.productionDate);
          const dateB = new Date(b.productionDate);
          
          // If date parsing fails, maintain original order
          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          
          return dateA.getTime() - dateB.getTime(); // Oldest first (FIFO)
        });
      
      // Debug: Log sorted order
      console.log("[FIFO DEBUG] Sorted finished goods (should be oldest first):");
      approvedGoods.forEach((fg, idx) => {
        console.log(`  ${idx + 1}. Batch: ${fg.batchNumber}, Date: ${fg.productionDate}, Qty: ${fg.quantity}`);
      });
      
      // Get reserved quantities from pending invoices (draft/ready_for_gatepass)
      // This prevents double-allocation when multiple gatepasses are created before dispatch
      const pendingInvoicesList = await db.select().from(invoices).where(
        and(
          sql`${invoices.status} IN ('draft', 'ready_for_gatepass')`,
          eq(invoices.recordStatus, 1)
        )
      );
      
      // Get all active gatepasses to find which invoices already have gatepasses
      // Invoices with gatepasses should NOT be counted as reserved (physical stock already deducted)
      const activeGatepasses = await db.select({
        invoiceId: gatepasses.invoiceId
      }).from(gatepasses).where(
        and(
          eq(gatepasses.recordStatus, 1),
          sql`${gatepasses.invoiceId} IS NOT NULL`
        )
      );
      const invoiceIdsWithGatepass = new Set(activeGatepasses.map(gp => gp.invoiceId));
      
      // Filter out:
      // 1. Invoices that already have gatepasses (their stock is already deducted from physical)
      // 2. The invoice being allocated for (excludeInvoiceId) - we're allocating FOR this invoice
      let filteredInvoices = pendingInvoicesList
        .filter(inv => !invoiceIdsWithGatepass.has(inv.id));
      
      if (excludeInvoiceId) {
        filteredInvoices = filteredInvoices.filter(inv => inv.id !== excludeInvoiceId);
      }
      
      console.log(`[FIFO DEBUG] Pending invoices: ${pendingInvoicesList.length}, With gatepasses: ${invoiceIdsWithGatepass.size}, After filter: ${filteredInvoices.length}, ExcludeId: ${excludeInvoiceId || 'none'}`);
      
      // Get invoice items for pending invoices
      let reservedByBatch = new Map<string, number>(); // finishedGoodId -> reserved qty
      
      if (filteredInvoices.length > 0) {
        const invoiceIds = filteredInvoices.map(inv => inv.id);
        const pendingItems = await db.select().from(invoiceItems).where(
          sql`${invoiceItems.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`
        );
        
        // For each pending invoice item, we need to figure out which batches would be used
        // Since we use FIFO, simulate the allocation to know which batches are reserved
        // Group by productId first
        const pendingByProduct = new Map<string, number>();
        for (const item of pendingItems) {
          if (item.productId) {
            const current = pendingByProduct.get(item.productId) || 0;
            pendingByProduct.set(item.productId, current + item.quantity);
          }
        }
        
        // Simulate FIFO allocation for pending invoices to determine batch-level reservations
        for (const [productId, totalReserved] of pendingByProduct) {
          let remaining = totalReserved;
          const productBatches = approvedGoods.filter(fg => fg.productId === productId);
          
          for (const batch of productBatches) {
            if (remaining <= 0) break;
            const batchQty = batch.quantity;
            const allocate = Math.min(remaining, batchQty);
            
            const currentReserved = reservedByBatch.get(batch.id) || 0;
            reservedByBatch.set(batch.id, currentReserved + allocate);
            remaining -= allocate;
          }
        }
      }
      
      const allocatedItems: Array<{
        productId: string;
        finishedGoodId: string;
        batchNumber: string;
        productionDate: string;
        quantityAllocated: number;
        availableStock: number;
        uomId: string | null;
      }> = [];
      
      // Track remaining stock for each finished good during allocation
      // Now uses AVAILABLE stock (physical - reserved) instead of just physical
      const stockTracker = new Map<string, number>();
      approvedGoods.forEach(fg => {
        const reserved = reservedByBatch.get(fg.id) || 0;
        const available = Math.max(0, fg.quantity - reserved);
        stockTracker.set(fg.id, available);
        console.log(`[FIFO DEBUG] Batch ${fg.batchNumber}: Physical=${fg.quantity}, Reserved=${reserved}, Available=${available}`);
      });
      
      console.log(`[FIFO DEBUG] Request items:`, JSON.stringify(items));
      
      // For each invoice item, allocate from oldest batches first (FIFO)
      for (const item of items) {
        const { productId, quantity } = item;
        let remainingQty = quantity;
        
        // Find all batches for this product - they're already sorted by production date (oldest first)
        const productBatches = approvedGoods.filter(fg => fg.productId === productId);
        
        for (const batch of productBatches) {
          if (remainingQty <= 0) break;
          
          const availableStock = stockTracker.get(batch.id) || 0;
          if (availableStock <= 0) continue;
          
          const allocateQty = Math.min(remainingQty, availableStock);
          
          allocatedItems.push({
            productId: batch.productId,
            finishedGoodId: batch.id,
            batchNumber: batch.batchNumber,
            productionDate: batch.productionDate,
            quantityAllocated: allocateQty,
            availableStock: availableStock,
            uomId: batch.uomId,
          });
          
          // Reduce tracked stock
          stockTracker.set(batch.id, availableStock - allocateQty);
          remainingQty -= allocateQty;
        }
      }
      
      console.log(`[FIFO DEBUG] Allocated items:`, JSON.stringify(allocatedItems));
      console.log(`[FIFO DEBUG] Total allocated: ${allocatedItems.length} items`);
      
      res.json({
        allocatedItems,
        message: "FIFO allocation completed",
      });
    } catch (error) {
      console.error("Error performing FIFO allocation:", error);
      res.status(500).json({ message: "Failed to perform FIFO allocation" });
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
      
      // Explicitly handle productId and bomConfigurationId to ensure they're saved
      const productId = validatedHeader.productId || null;
      const bomConfigurationId = validatedHeader.bomConfigurationId || null;
      
      console.log("[ISSUANCE] Creating issuance with productId:", productId, "bomConfigurationId:", bomConfigurationId);
      
      const issuanceData = {
        ...validatedHeader,
        productId,
        bomConfigurationId,
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
          
          // ALWAYS deduct stock when issuing - both Opening Stock and Ongoing Inventory materials
          // All materials used for production must be deducted from inventory
          const currentStock = Number(material.currentStock) || Number(material.quantity) || 0;
          const newQuantity = currentStock - validatedItem.quantityIssued;
          
          if (newQuantity < 0) {
            throw new Error(`Insufficient stock for material ${material.materialName}. Available: ${currentStock}, Required: ${validatedItem.quantityIssued}`);
          }
          
          // Recalculate total valuation based on remaining stock
          // Total Valuation = (Unit Cost + GST) × Remaining Stock
          const unitCost = Number(material.unitCost) || 0;
          const gstRate = Number(material.gstRate) || 0;
          const unitCostWithGst = unitCost + (unitCost * gstRate / 100);
          const newTotalValuation = unitCostWithGst * newQuantity;
          
          // Deduct from inventory (update both currentStock and quantity for compatibility)
          await tx.update(rawMaterials)
            .set({ 
              currentStock: newQuantity, 
              quantity: newQuantity,
              totalValuation: newTotalValuation.toFixed(2),
              updatedAt: new Date().toISOString() 
            })
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

  // Fetch issuance items by issuance ID (for print preview and edit forms)
  app.get('/api/raw-material-issuance-items/:issuanceId', isAuthenticated, async (req: any, res) => {
    try {
      const { issuanceId } = req.params;
      const items = await storage.getIssuanceItems(issuanceId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching issuance items:", error);
      res.status(500).json({ message: "Failed to fetch issuance items" });
    }
  });

  app.patch('/api/raw-material-issuances/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { header, items } = req.body;
      
      // Handle both formats: { header, items } or flat object
      let headerData = header || req.body;
      
      // Extract header fields for issuance update
      const updateData: any = {};
      if (headerData.issuanceDate) updateData.issuanceDate = headerData.issuanceDate;
      if (headerData.issuedTo !== undefined) updateData.issuedTo = headerData.issuedTo;
      if (headerData.productId !== undefined) updateData.productId = headerData.productId || null;
      if (headerData.bomConfigurationId !== undefined) updateData.bomConfigurationId = headerData.bomConfigurationId || null;
      if (headerData.plannedOutput !== undefined) updateData.plannedOutput = headerData.plannedOutput ? String(headerData.plannedOutput) : null;
      if (headerData.productionReference !== undefined) updateData.productionReference = headerData.productionReference || null;
      if (headerData.remarks !== undefined) updateData.remarks = headerData.remarks || null;
      
      // Check if there's anything to update in header
      if (Object.keys(updateData).length === 0 && !items) {
        return res.status(400).json({ message: "No data provided for update" });
      }
      
      // Use transaction for atomic update of header and items
      const result = await db.transaction(async (tx) => {
        let issuance = null;
        
        // Update header if there are fields to update
        if (Object.keys(updateData).length > 0) {
          const [updated] = await tx.update(rawMaterialIssuance)
            .set(updateData)
            .where(eq(rawMaterialIssuance.id, id))
            .returning();
          issuance = updated;
        } else {
          // Just fetch existing issuance
          const [existing] = await tx.select().from(rawMaterialIssuance).where(eq(rawMaterialIssuance.id, id));
          issuance = existing;
        }
        
        if (!issuance) {
          throw new Error("Raw material issuance not found");
        }
        
        // Update items if provided
        if (items && Array.isArray(items)) {
          // Delete existing items
          await tx.delete(rawMaterialIssuanceItems).where(eq(rawMaterialIssuanceItems.issuanceId, id));
          
          // Insert new items
          for (const item of items) {
            if (!item.rawMaterialId) {
              console.warn('[UPDATE] Skipping item with empty rawMaterialId');
              continue;
            }
            
            await tx.insert(rawMaterialIssuanceItems).values({
              issuanceId: id,
              rawMaterialId: item.rawMaterialId,
              productId: item.productId || null,
              quantityIssued: String(item.quantityIssued),
              suggestedQuantity: item.suggestedQuantity ? String(item.suggestedQuantity) : null,
              calculationBasis: item.calculationBasis || null,
              uomId: item.uomId || null,
              remarks: item.remarks || null,
            });
          }
        }
        
        // Fetch updated items
        const updatedItems = await tx.select().from(rawMaterialIssuanceItems).where(eq(rawMaterialIssuanceItems.issuanceId, id));
        
        return { ...issuance, items: updatedItems };
      });
      
      res.json({ issuance: result, message: "Issuance updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating raw material issuance:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update raw material issuance" });
    }
  });

  app.delete('/api/raw-material-issuances/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get issuance items before deletion to return materials to inventory
      const items = await storage.getIssuanceItems(id);
      const issuance = await storage.getRawMaterialIssuance(id);
      
      if (!issuance) {
        return res.status(404).json({ message: "Issuance not found" });
      }
      
      // Return each item's quantity back to raw material inventory
      for (const item of items) {
        const rawMaterial = await storage.getRawMaterial(item.rawMaterialId);
        if (rawMaterial) {
          const currentQty = Number(rawMaterial.currentStock) || Number(rawMaterial.quantity) || 0;
          const returnQty = Number(item.quantityIssued) || 0;
          const newQty = currentQty + returnQty;
          
          // Update raw material quantity (update both fields for compatibility)
          await storage.updateRawMaterial(item.rawMaterialId, {
            quantity: newQty,
            currentStock: newQty,
          });
          
          // Create transaction record for audit trail
          await storage.createRawMaterialTransaction({
            materialId: item.rawMaterialId,
            transactionType: 'issuance_cancelled',
            quantity: returnQty,
            reference: `Returned from cancelled issuance ${issuance.issuanceNumber}`,
            performedBy: req.user?.id,
          });
          
          console.log(`[INVENTORY] Returned ${returnQty} bags of ${rawMaterial.name} from cancelled issuance ${issuance.issuanceNumber}`);
        }
      }
      
      // Soft delete the issuance (items are cascade soft-deleted or remain linked)
      await storage.deleteRawMaterialIssuance(id);
      
      res.json({ 
        message: "Raw material issuance deleted successfully", 
        itemsReturned: items.length,
        note: "Materials have been returned to inventory"
      });
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
      let bomConfiguration = null;
      if (issuance.productId) {
        product = await storage.getProduct(issuance.productId);
        if (product) {
          // Fetch BOM with enriched type data
          // Use bomConfigurationId from issuance if available (for multi-BOM support)
          const bomResult = await storage.getProductBomWithTypes(
            issuance.productId, 
            issuance.bomConfigurationId || undefined
          );
          
          // Get configuration details from the BOM result metadata
          if (bomResult.metadata?.configurationId) {
            bomConfiguration = await storage.getBomConfiguration(bomResult.metadata.configurationId);
          }
          
          // Transform BOM items to match frontend expectations:
          // - Use 'typeDetails' instead of 'type' for consistency with frontend
          // - Include rawMaterialId from BOM item for variance analysis lookup
          bomItems = bomResult.items.map(item => ({
            ...item.bom,
            material: item.material,
            typeDetails: item.type,
            typeId: item.typeId,
            effectiveUomId: item.effectiveUomId,
            availableRawMaterials: item.availableRawMaterials,
          }));
        }
      }
      
      res.json({
        issuance: { ...issuance, items },
        product,
        bomItems,
        bomConfiguration, // Include BOM configuration name for display
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

  // Get opening bottles balance (from latest production entry's pending)
  app.get('/api/production-entries/opening-bottles', isAuthenticated, async (req: any, res) => {
    try {
      const entries = await storage.getAllProductionEntries();
      
      // Sort by production date (desc) then by shift to get the latest
      const sortedEntries = entries.sort((a, b) => {
        const dateA = new Date(a.productionDate).getTime();
        const dateB = new Date(b.productionDate).getTime();
        if (dateB !== dateA) return dateB - dateA;
        // If same date, sort by shift: General > B > A
        const shiftOrder: Record<string, number> = { 'General': 3, 'B': 2, 'A': 1 };
        return (shiftOrder[b.shift] || 0) - (shiftOrder[a.shift] || 0);
      });
      
      const latestEntry = sortedEntries[0];
      const openingBalance = latestEntry ? Number(latestEntry.emptyBottlesPending) || 0 : 0;
      
      res.json({
        openingBalance,
        fromEntry: latestEntry ? {
          id: latestEntry.id,
          productionDate: latestEntry.productionDate,
          shift: latestEntry.shift,
          pending: latestEntry.emptyBottlesPending,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching opening bottles balance:", error);
      res.status(500).json({ message: "Failed to fetch opening bottles balance" });
    }
  });

  app.post('/api/production-entries', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const entryData = req.body;
      
      // Validate entry data
      const validatedEntry = insertProductionEntrySchema.parse(entryData);
      
      // Fetch linked issuance to get product details for derivedUnits calculation
      const issuance = await storage.getRawMaterialIssuance(validatedEntry.issuanceId);
      console.log("[PRODUCTION ENTRY] Fetched issuance:", issuance?.id, "productId:", issuance?.productId);
      
      if (!issuance) {
        return res.status(404).json({ message: "Linked raw material issuance not found" });
      }
      
      // Calculate derivedUnits if product is linked
      let derivedUnits = null;
      let product = null;
      if (issuance.productId) {
        product = await storage.getProduct(issuance.productId);
        if (product && product.usableDerivedUnits) {
          // derivedUnits = producedQuantity × usableDerivedUnits from Product Master
          derivedUnits = Number(validatedEntry.producedQuantity) * Number(product.usableDerivedUnits);
        }
      }
      
      // Calculate bottles from issuance (preform materials)
      // Formula: Σ (quantityIssued × usableUnits) for preform-type materials
      let bottlesFromIssuance = 0;
      if (issuance.productId) {
        try {
          const items = await storage.getIssuanceItems(validatedEntry.issuanceId);
          const bomResult = await storage.getProductBomWithTypes(issuance.productId, issuance.bomConfigurationId || undefined);
          
          for (const item of items) {
            // Find matching BOM item to get type details
            const bomItem = bomResult.items.find((bom: any) => 
              bom.bom?.rawMaterialId === item.rawMaterialId ||
              (bom.availableRawMaterials && bom.availableRawMaterials.some((rm: any) => rm.id === item.rawMaterialId))
            );
            
            if (bomItem?.type) {
              const typeDetails = bomItem.type;
              const derivedUnit = (typeDetails.derivedUnit || '').toLowerCase();
              const typeName = (typeDetails.typeName || '').toLowerCase();
              
              // Check if this is a preform-type material (produces empty bottles)
              const isPreformType = 
                derivedUnit.includes('piece') || 
                derivedUnit.includes('bottle') ||
                typeName.includes('preform') ||
                typeName.includes('pet');
              
              if (isPreformType && typeDetails.usableUnits) {
                const qty = Number(item.quantityIssued) || 0;
                const usableUnits = Number(typeDetails.usableUnits) || 0;
                bottlesFromIssuance += Math.round(qty * usableUnits);
              }
            }
          }
        } catch (e) {
          console.log("[EMPTY BOTTLES] Could not calculate bottles from issuance:", e);
        }
      }
      
      // Server-side calculation and validation of pending bottles
      // Formula: Pending = Opening + Produced + Additional Produced - Used
      // Note: "From Issuance" is just a reference (potential bottles from preforms)
      // Actual bottles come from blow molding, entered in "Produced"
      // Additional Produced = bottles from other sources (frontend tracks, not stored separately)
      const opening = Number(validatedEntry.emptyBottlesOpening) || 0;
      const produced = Number(validatedEntry.emptyBottlesProduced) || 0;
      const used = Number(validatedEntry.emptyBottlesUsed) || 0;
      // Note: availableBottles includes any additional produced (tracked on frontend, not separate field)
      const availableBottles = opening + produced;
      
      // Validate: Used cannot exceed total produced bottles
      // Note: Frontend may include "Additional Produced" which is not stored separately
      // So we only validate that used <= opening + produced (conservative check)
      if (used > availableBottles && used > 0) {
        console.log(`[EMPTY BOTTLES] Warning: Used (${used}) exceeds Opening + Produced (${availableBottles}). Frontend may have additional produced.`);
      }
      
      const calculatedPending = opening + produced - used;
      
      // Get or default UOM (use "Case" as default for finished goods)
      let uomId = validatedEntry.uomId;
      if (!uomId) {
        // Try to get "Case" UOM as default
        const uomList = await storage.getAllUoms();
        const caseUom = uomList.find((u: any) => u.name.toLowerCase() === 'case');
        uomId = caseUom?.id;
      }
      
      // Generate batch number if not provided: YYMMDD-<productCode>-<shift>-<sequence>
      let batchNumber = validatedEntry.batchNumber;
      if (!batchNumber && issuance.productId) {
        const dateStr = new Date(validatedEntry.productionDate).toISOString().split('T')[0].replace(/-/g, '').slice(2); // YYMMDD
        const productCode = product?.productCode || 'PROD';
        const shift = validatedEntry.shift || 'G';
        // Get count of production entries for this product/date/shift to generate sequence
        const existingCount = await db.select({ count: sql<number>`count(*)` })
          .from(productionEntries)
          .where(and(
            eq(productionEntries.productId, issuance.productId),
            sql`DATE(production_date) = DATE(${validatedEntry.productionDate})`,
            eq(productionEntries.shift, validatedEntry.shift)
          ));
        const sequence = (Number(existingCount[0]?.count) || 0) + 1;
        batchNumber = `${dateStr}-${productCode}-${shift}-${String(sequence).padStart(3, '0')}`;
      }
      
      // Create production entry with calculated values
      // IMPORTANT: productId comes from the linked issuance, not from the frontend
      const productionEntry = await storage.createProductionEntry({
        ...validatedEntry,
        productId: issuance.productId || undefined, // Get productId from the linked issuance (convert null to undefined)
        uomId: uomId || undefined, // UOM for finished goods
        batchNumber: batchNumber || undefined, // Auto-generated or provided batch number
        emptyBottlesPending: calculatedPending, // Use server-calculated pending
        derivedUnits: derivedUnits !== null ? derivedUnits : undefined,
        createdBy: req.user?.id,
      });
      
      // Automatically add produced goods to Finished Goods inventory
      if (issuance.productId && validatedEntry.producedQuantity > 0) {
        try {
          // Use batch number from production entry (already generated above)
          const finishedGoodBatch = batchNumber || `${issuance.issuanceNumber}-${new Date(validatedEntry.productionDate).toISOString().split('T')[0]}-${validatedEntry.shift}`;
          
          // Create finished good record with UOM from production entry
          await storage.createFinishedGood({
            productId: issuance.productId,
            batchNumber: finishedGoodBatch,
            productionDate: validatedEntry.productionDate,
            quantity: Math.floor(Number(validatedEntry.producedQuantity)), // Convert to integer
            uomId: uomId || undefined, // Inherit UOM from production entry (defaults to Case)
            qualityStatus: 'pending', // Needs inspection/approval
            operatorId: req.user?.id,
            storageLocation: issuance.productionReference || null,
            remarks: `Auto-generated from Production Entry ${productionEntry.id}. Shift: ${validatedEntry.shift}. Batch: ${finishedGoodBatch}`,
            createdBy: req.user?.id,
          });
          
          console.log(`[INVENTORY] Auto-added ${validatedEntry.producedQuantity} units of product ${issuance.productId} to Finished Goods (Batch: ${finishedGoodBatch})`);
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

  // Update Production Entry
  app.put('/api/production-entries/:id', requireRole('admin', 'manager', 'operator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get existing entry
      const existingEntry = await storage.getProductionEntry(id);
      if (!existingEntry) {
        return res.status(404).json({ message: "Production entry not found" });
      }
      
      // Check if finished goods from this production entry are approved
      if (existingEntry.batchNumber) {
        const finishedGoodsForBatch = await storage.getFinishedGoodsByBatchNumber(existingEntry.batchNumber);
        const approvedGoods = finishedGoodsForBatch.filter(fg => fg.qualityStatus === 'approved');
        
        if (approvedGoods.length > 0) {
          return res.status(403).json({ 
            message: "Cannot edit - Finished goods from this production entry have already been approved. Please contact admin to make corrections.",
            approvedCount: approvedGoods.length,
            batchNumber: existingEntry.batchNumber
          });
        }
      }
      
      // Validate update data
      const updateSchema = insertProductionEntrySchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      // Update the entry
      const updatedEntry = await storage.updateProductionEntry(id, {
        ...validatedData,
        productionDate: validatedData.productionDate ? new Date(validatedData.productionDate).toISOString() : existingEntry.productionDate,
      });
      
      res.json({ entry: updatedEntry, message: "Production entry updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating production entry:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update production entry" });
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
      
      console.log('[RECONCILIATION] Header received:', JSON.stringify(header, null, 2));
      console.log('[RECONCILIATION] Items received:', JSON.stringify(items, null, 2));
      
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
      
      // Verify production entry exists and get productId and uomId
      let productId: string | null = null;
      let inheritedUomId: string | null = null;
      if (validatedHeader.productionEntryId) {
        const production = await storage.getProductionEntry(validatedHeader.productionEntryId);
        if (!production) {
          return res.status(404).json({ message: "Production entry not found" });
        }
        productId = production.productId || issuance.productId || null;
        inheritedUomId = production.uomId || null; // Inherit UOM from production entry
      } else {
        productId = issuance.productId || null;
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
      
      // Get default UOM (Case) for reconciliation items - use inherited UOM from production entry first
      let defaultUomId = inheritedUomId;
      if (!defaultUomId) {
        // Use storage layer to get Case UOM as default
        const uomList = await storage.getAllUoms();
        const caseUom = uomList.find((u: any) => u.name.toLowerCase() === 'case' && u.recordStatus === 1);
        defaultUomId = caseUom?.id || null;
      }
      
      // Wrap everything in a transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Create reconciliation header
        const [reconciliation] = await tx.insert(productionReconciliations).values([{
          ...validatedHeader,
          reconciliationDate: validatedHeader.reconciliationDate ? new Date(validatedHeader.reconciliationDate).toISOString() : new Date().toISOString(),
          reconciliationNumber,
          productId,  // Auto-populated from production entry or issuance
          editCount: 0,
          createdBy: req.user?.id,
        }]).returning();
        
        // Create items and update raw material inventory for returned materials
        for (const item of items) {
          const validatedItem = insertProductionReconciliationItemSchema.parse({
            ...item,
            reconciliationId: reconciliation.id,
            uomId: item.uomId || defaultUomId,  // Default to Case UOM
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
        console.error('[RECONCILIATION] Validation error:', JSON.stringify(error.errors, null, 2));
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
      
      // Enforce edit limits: users with delete permission = unlimited, others = max 3 edits
      // Check if user has delete permission (which indicates admin-level access)
      const editPermission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, req.user.roleId),
          eq(rolePermissions.screenKey, 'production_reconciliation'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      const hasUnlimitedEdits = editPermission.length > 0 && editPermission[0].canDelete === 1;
      const currentEditCount = existing.editCount || 0;
      const maxEdits = 3;
      
      if (!hasUnlimitedEdits && currentEditCount >= maxEdits) {
        return res.status(403).json({ 
          message: `Edit limit reached. Users without delete permission can only edit this reconciliation ${maxEdits} times. Contact an administrator for further changes.` 
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
        message: `Reconciliation updated successfully (Edit ${newEditCount}/${hasUnlimitedEdits ? '∞' : maxEdits})` 
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

      console.log('[RECONCILIATION_REPORT] Query params:', { dateFrom, dateTo, productId, batchId, shift });

      // Build where conditions
      const conditions = [eq(productionReconciliations.recordStatus, 1)];
      
      if (dateFrom) {
        // Use the date string directly for comparison (YYYY-MM-DD format)
        conditions.push(gte(productionReconciliations.reconciliationDate, dateFrom as string));
        console.log('[RECONCILIATION_REPORT] dateFrom filter:', dateFrom);
      }
      if (dateTo) {
        // Add one day to include the entire "to" date
        const toDateObj = new Date(dateTo as string);
        toDateObj.setDate(toDateObj.getDate() + 1);
        const toDateStr = toDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        conditions.push(lte(productionReconciliations.reconciliationDate, toDateStr));
        console.log('[RECONCILIATION_REPORT] dateTo filter:', toDateStr);
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

      console.log('[RECONCILIATION_REPORT] Found reconciliations:', reconciliations.length);
      if (reconciliations.length > 0) {
        console.log('[RECONCILIATION_REPORT] First reconciliation:', JSON.stringify(reconciliations[0].reconciliation, null, 2));
      }

      // Apply product/batch filters (skip if 'all' is selected)
      let filteredReconciliations = reconciliations;
      if (productId && productId !== 'all') {
        filteredReconciliations = filteredReconciliations.filter(r => 
          r.issuance?.productId === productId
        );
      }
      if (batchId && batchId !== 'all') {
        filteredReconciliations = filteredReconciliations.filter(r => 
          r.production?.id === batchId
        );
      }
      
      console.log('[RECONCILIATION_REPORT] After filtering:', filteredReconciliations.length);

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

          // Empty bottles tracking data from production entry
          const emptyBottles = {
            opening: Number(r.production?.emptyBottlesOpening) || 0,
            produced: Number(r.production?.emptyBottlesProduced) || 0,
            used: Number(r.production?.emptyBottlesUsed) || 0,
            pending: Number(r.production?.emptyBottlesPending) || 0,
          };
          
          // Calculate empty bottles variance (used vs produced)
          // Positive = used more than produced (drawing from opening stock)
          // Negative = produced more than used (building up stock)
          const emptyBottlesNetChange = emptyBottles.produced - emptyBottles.used;
          const emptyBottlesVariance = emptyBottles.opening > 0 
            ? ((emptyBottles.pending - emptyBottles.opening) / emptyBottles.opening) * 100 
            : 0;

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
            // Empty bottles tracking
            emptyBottles,
            emptyBottlesNetChange,
            emptyBottlesVariance,
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
        // Empty bottles tracking
        emptyBottles: {
          totalOpening: number;
          totalProduced: number;
          totalUsed: number;
          totalPending: number;
          entriesWithData: number;
        };
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
            emptyBottles: {
              totalOpening: 0,
              totalProduced: 0,
              totalUsed: 0,
              totalPending: 0,
              entriesWithData: 0,
            },
          };
        }

        const data = periodData[periodInfo.key];
        data.reconciliationCount += 1;

        // Aggregate empty bottles data from production entry
        // Include any entry that has any empty bottle data (including carry-forward scenarios)
        if (r.production) {
          const opening = Number(r.production.emptyBottlesOpening) || 0;
          const produced = Number(r.production.emptyBottlesProduced) || 0;
          const used = Number(r.production.emptyBottlesUsed) || 0;
          const pending = Number(r.production.emptyBottlesPending) || 0;
          
          // Include entry if it has ANY empty bottle data (opening, produced, used, or pending)
          // This ensures carry-forward scenarios are not skipped
          const hasEmptyBottleData = opening !== 0 || produced !== 0 || used !== 0 || pending !== 0;
          if (hasEmptyBottleData) {
            data.emptyBottles.totalOpening += opening;
            data.emptyBottles.totalProduced += produced;
            data.emptyBottles.totalUsed += used;
            data.emptyBottles.totalPending += pending;
            data.emptyBottles.entriesWithData += 1;
          }
        }
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
        // Include empty bottles data
        emptyBottles: data.emptyBottles,
      })).sort((a, b) => a.periodIndex - b.periodIndex);

      // Calculate empty bottles totals across all periods
      const totalOpening = analytics.reduce((sum, p) => sum + p.emptyBottles.totalOpening, 0);
      const totalProduced = analytics.reduce((sum, p) => sum + p.emptyBottles.totalProduced, 0);
      const totalUsed = analytics.reduce((sum, p) => sum + p.emptyBottles.totalUsed, 0);
      const totalPending = analytics.reduce((sum, p) => sum + p.emptyBottles.totalPending, 0);
      const netChange = totalProduced - totalUsed;
      
      // Calculate utilization rate: used / (opening + produced) to account for stock draw-down scenarios
      // When produced=0 but used>0, we're drawing from opening stock
      const availableStock = totalOpening + totalProduced;
      const utilizationRate = availableStock > 0 ? (totalUsed / availableStock) * 100 : 0;

      const emptyBottlesTotals = {
        totalOpening,
        totalProduced,
        totalUsed,
        totalPending,
        entriesWithData: analytics.reduce((sum, p) => sum + p.emptyBottles.entriesWithData, 0),
        utilizationRate,
        netChange,
      };

      // Calculate totals and top materials
      const totals = {
        totalReconciliations: analytics.reduce((sum, p) => sum + p.reconciliationCount, 0),
        avgVariance: analytics.length > 0 ? analytics.reduce((sum, p) => sum + p.avgVariance, 0) / analytics.length : 0,
        avgEfficiency: analytics.length > 0 ? analytics.reduce((sum, p) => sum + p.avgEfficiency, 0) / analytics.length : 0,
        avgYield: analytics.length > 0 ? analytics.reduce((sum, p) => sum + p.avgYield, 0) / analytics.length : 0,
        totalGood: analytics.reduce((sum, p) => sum + p.goodCount, 0),
        totalWarning: analytics.reduce((sum, p) => sum + p.warningCount, 0),
        totalCritical: analytics.reduce((sum, p) => sum + p.criticalCount, 0),
        // Include empty bottles totals
        emptyBottles: emptyBottlesTotals,
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
      
      // Sort by gatepass date descending (latest first) as primary sort, then by gatepass number
      filteredGatepasses.sort((a, b) => {
        const dateA = new Date(a.gatepassDate).getTime();
        const dateB = new Date(b.gatepassDate).getTime();
        if (dateB !== dateA) return dateB - dateA; // Latest date first
        // Secondary sort by gatepass number (numeric comparison for proper ordering)
        // Extract the numeric suffix from gatepass numbers like "GP-202501-0123"
        const numA = parseInt(a.gatepassNumber.replace(/\D/g, '').slice(-4) || '0');
        const numB = parseInt(b.gatepassNumber.replace(/\D/g, '').slice(-4) || '0');
        return numB - numA; // Descending order (higher numbers first)
      });
      
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

  // Enhanced gatepass report with items (batch codes, quantities) for reports page
  // Supports query params: dateFrom, dateTo, customer for server-side filtering
  app.get('/api/gatepasses/report/enhanced', isAuthenticated, async (req: any, res) => {
    try {
      const { dateFrom, dateTo, customer } = req.query;
      
      // Build dynamic where conditions
      const conditions: any[] = [
        eq(gatepasses.recordStatus, 1),
        ne(gatepasses.status, 'cancelled')
      ];
      
      // Add date filters if provided - gatepassDate is a timestamp
      // Use Date objects for proper driver casting across PostgreSQL versions
      if (dateFrom) {
        // dateFrom is like "2025-12-08", we want gatepasses on or after start of this date
        const fromDateObj = new Date(`${dateFrom}T00:00:00`);
        conditions.push(gte(gatepasses.gatepassDate, fromDateObj.toISOString()));
      }
      if (dateTo) {
        // dateTo is like "2025-12-14", we want gatepasses on or before end of this day
        const toDateObj = new Date(`${dateTo}T23:59:59.999`);
        conditions.push(lte(gatepasses.gatepassDate, toDateObj.toISOString()));
      }
      // Add customer filter if provided and not 'all'
      if (customer && customer !== 'all') {
        conditions.push(eq(gatepasses.customerName, customer as string));
      }
      
      // Get filtered gatepasses with driver contact
      const allGatepasses = await db.select()
        .from(gatepasses)
        .where(and(...conditions))
        .orderBy(desc(gatepasses.gatepassDate));
      
      // If no gatepasses match, return empty array early
      if (allGatepasses.length === 0) {
        return res.json([]);
      }
      
      // Get gatepass IDs for filtering items query
      const gatepassIds = allGatepasses.map(g => g.id);

      // Get gatepass items only for the filtered gatepasses
      const allItems = await db.select({
        gatepassId: gatepassItems.gatepassId,
        productId: gatepassItems.productId,
        quantityDispatched: gatepassItems.quantityDispatched,
        batchNumber: finishedGoods.batchNumber,
        productName: products.productName,
      })
        .from(gatepassItems)
        .leftJoin(finishedGoods, eq(gatepassItems.finishedGoodId, finishedGoods.id))
        .leftJoin(products, eq(gatepassItems.productId, products.id))
        .where(and(
          eq(gatepassItems.recordStatus, 1),
          inArray(gatepassItems.gatepassId, gatepassIds)
        ));

      // Group items by gatepassId
      const itemsByGatepass: Record<string, Array<{productName: string | null, batchNumber: string | null, quantity: number}>> = {};
      for (const item of allItems) {
        if (!itemsByGatepass[item.gatepassId]) {
          itemsByGatepass[item.gatepassId] = [];
        }
        itemsByGatepass[item.gatepassId].push({
          productName: item.productName,
          batchNumber: item.batchNumber,
          quantity: item.quantityDispatched,
        });
      }

      // Combine gatepasses with their items
      const enhancedGatepasses = allGatepasses.map(gp => ({
        ...gp,
        items: itemsByGatepass[gp.id] || [],
        batchSummary: (itemsByGatepass[gp.id] || [])
          .map(i => `${i.batchNumber || 'N/A'}: ${i.quantity}`)
          .join(', '),
        totalQuantity: (itemsByGatepass[gp.id] || []).reduce((sum, i) => sum + i.quantity, 0),
      }));

      res.json(enhancedGatepasses);
    } catch (error: any) {
      console.error("Error fetching enhanced gatepasses:", {
        message: error?.message,
        stack: error?.stack,
        query: { dateFrom: req.query.dateFrom, dateTo: req.query.dateTo, customer: req.query.customer }
      });
      res.status(500).json({ message: "Failed to fetch enhanced gatepass data", error: error?.message });
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
        
        // NOTE: Invoice status stays at 'ready_for_gatepass' until vehicle exit is recorded
        // The vehicle exit endpoint will update invoice status to 'dispatched'
        // This follows the 5-stage dispatch workflow:
        // ready_for_gatepass -> Create Gatepass (generated) -> Record Exit (vehicle_out, dispatched) -> POD (delivered)
        
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
          
          // Create gatepass item with batch number from finished good
          await tx.insert(gatepassItems).values({
            ...validatedItem,
            batchNumber: finishedGood.batchNumber, // Automatically get batch number from finished good
          });
          
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
      
      // Handle both flat structure and nested { header, items } structure
      const { header, items } = req.body;
      const gatepassData = header || req.body;
      
      const validatedData = insertGatepassSchema.partial().parse(gatepassData);
      
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
      
      // Update gatepass header
      const gatepass = await storage.updateGatepass(id, validatedData);
      if (!gatepass) {
        return res.status(404).json({ message: "Gatepass not found" });
      }
      
      // Update items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        // For now, we're only updating header info - items update would require
        // handling inventory changes which is complex. The main use case is
        // updating driver/vehicle info, not changing batch allocations.
        // Items are already correctly allocated during creation.
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
      
      // Get the gatepass to check its status and linked invoice
      const gatepass = await storage.getGatepass(id);
      if (!gatepass) {
        return res.status(404).json({ message: "Gatepass not found" });
      }
      
      // Check if the gatepass is already dispatched (vehicle left)
      if (gatepass.status === 'vehicle_out') {
        return res.status(400).json({ 
          message: "Cannot delete gatepass. Vehicle has already left the premises. Use 'Cancel & Reissue' workflow instead."
        });
      }
      
      // Check if the gatepass is delivered
      if (gatepass.status === 'delivered') {
        return res.status(400).json({ 
          message: "Cannot delete gatepass. Goods have been delivered. Use 'Cancel & Reissue' workflow instead."
        });
      }
      
      // Check if linked invoice is dispatched or delivered
      if (gatepass.invoiceId) {
        const invoice = await storage.getInvoice(gatepass.invoiceId);
        if (invoice) {
          if (invoice.status === 'dispatched') {
            return res.status(400).json({ 
              message: "Cannot delete gatepass. Invoice is marked as dispatched. Use 'Cancel & Reissue' workflow instead."
            });
          }
          if (invoice.status === 'delivered') {
            return res.status(400).json({ 
              message: "Cannot delete gatepass. Invoice is marked as delivered. Use 'Cancel & Reissue' workflow instead."
            });
          }
        }
      }
      
      // First, get all items from this gatepass to return inventory
      const gatepassItems = await storage.getGatepassItems(id);
      
      // Return inventory back to finished goods for each item
      for (const item of gatepassItems) {
        if (item.finishedGoodId) {
          // Look for batch regardless of recordStatus (it might have been soft-deleted when quantity hit 0)
          const [finishedGood] = await db
            .select()
            .from(finishedGoods)
            .where(eq(finishedGoods.id, item.finishedGoodId))
            .limit(1);
          
          if (finishedGood) {
            // Return the quantity back to finished goods inventory and reactivate if it was soft-deleted
            await db.update(finishedGoods)
              .set({ 
                quantity: (finishedGood.quantity || 0) + (item.quantityDispatched || 0),
                recordStatus: 1, // Reactivate the batch
                updatedAt: new Date().toISOString()
              })
              .where(eq(finishedGoods.id, item.finishedGoodId));
          }
        }
      }
      
      // Now delete the gatepass (soft delete)
      await storage.deleteGatepass(id);
      
      // Keep invoice status at ready_for_gatepass so user can immediately create a new gatepass
      // The invoice is already in ready_for_gatepass when a gatepass exists
      if (gatepass.invoiceId) {
        await db.update(invoices)
          .set({ status: 'ready_for_gatepass' })
          .where(eq(invoices.id, gatepass.invoiceId));
        console.log(`[AUDIT] Invoice status set to ready_for_gatepass after gatepass deletion - can now create new gatepass`);
      }
      
      console.log(`[AUDIT] Gatepass ${gatepass.gatepassNumber} deleted by user, ${gatepassItems.length} items returned to inventory`);
      res.json({ 
        message: "Gatepass cancelled and inventory returned to finished goods successfully. You can now create a new gatepass.",
        itemsReturned: gatepassItems.length
      });
    } catch (error: any) {
      console.error("Error deleting gatepass:", error);
      res.status(500).json({ 
        message: "Failed to delete gatepass", 
        error: error?.message || String(error)
      });
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
      
      // Allow POD capture if gatepass is 'vehicle_out' or 'delivered' (to add POD details later)
      if (existing.status !== 'vehicle_out' && existing.status !== 'delivered') {
        return res.status(400).json({ 
          message: `Cannot capture POD. Gatepass status must be 'vehicle_out' or 'delivered' but is '${existing.status}'` 
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
      // Only update if invoice is currently in "dispatched" status; skip if already delivered
      if (updated.invoiceId) {
        const [linkedInvoice] = await db.select().from(invoices).where(eq(invoices.id, updated.invoiceId));
        if (!linkedInvoice) {
          return res.status(404).json({ message: "Linked invoice not found" });
        }
        
        // Only update invoice if it's still in dispatched status
        if (linkedInvoice.status === 'dispatched') {
          await db.update(invoices)
            .set({
              status: 'delivered',
              deliveryDate: new Date(podDate).toISOString(),
              receivedBy: podReceivedBy,
              podRemarks: podRemarks || null
            })
            .where(eq(invoices.id, updated.invoiceId));
        } else if (linkedInvoice.status === 'delivered') {
          // Invoice already delivered, just update POD details
          await db.update(invoices)
            .set({
              deliveryDate: new Date(podDate).toISOString(),
              receivedBy: podReceivedBy,
              podRemarks: podRemarks || null
            })
            .where(eq(invoices.id, updated.invoiceId));
        }
        // If invoice is in any other status, skip the update (shouldn't happen in normal flow)
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

  // Get single invoice template (isAuthenticated for read - needed for printing)
  app.get('/api/invoice-templates/:id', isAuthenticated, async (req: any, res) => {
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
      console.log('[Template Update] ID:', id);
      console.log('[Template Update] Signature present:', !!req.body.defaultSignatureImage);
      console.log('[Template Update] Signature length:', req.body.defaultSignatureImage?.length || 0);
      const updated = await storage.updateInvoiceTemplate(id, req.body);
      console.log('[Template Update] After DB - Signature present:', !!updated?.defaultSignatureImage);
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

  // Get single terms & conditions (allow any authenticated user for invoice printing)
  app.get('/api/terms-conditions/:id', isAuthenticated, async (req: any, res) => {
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
      const { page, pageSize, sortBy, sortOrder, search, ...filters } = req.query;
      
      // Get all invoice IDs that have gatepasses (for hasGatepass flag)
      const invoicesWithGatepasses = await db.select({ invoiceId: gatepasses.invoiceId })
        .from(gatepasses)
        .where(and(
          eq(gatepasses.recordStatus, 1),
          sql`${gatepasses.invoiceId} IS NOT NULL`
        ));
      const invoiceIdsWithGatepass = new Set(invoicesWithGatepasses.map(g => g.invoiceId));
      
      // Get all invoices
      let allInvoicesRaw = await storage.getAllInvoices();
      
      // Add hasGatepass flag to each invoice
      let allInvoices = allInvoicesRaw.map(inv => ({
        ...inv,
        hasGatepass: invoiceIdsWithGatepass.has(inv.id)
      }));

      // If pagination params exist, use paginated response logic
      if (page !== undefined && pageSize !== undefined) {
        const { paginationRequestSchema } = await import('@shared/schema');
        const paginationParams = paginationRequestSchema.parse({ page, pageSize, sortBy, sortOrder });
        
        // Apply filters if any
        if (filters.status) {
          allInvoices = allInvoices.filter(inv => inv.status === filters.status);
        }
        if (filters.buyerName) {
          allInvoices = allInvoices.filter(inv => 
            inv.buyerName.toLowerCase().includes((filters.buyerName as string).toLowerCase())
          );
        }
        
        // Apply search filter for invoice number
        if (search) {
          const searchLower = (search as string).toLowerCase();
          allInvoices = allInvoices.filter(inv => 
            inv.invoiceNumber.toLowerCase().includes(searchLower) ||
            inv.buyerName.toLowerCase().includes(searchLower)
          );
        }
        
        // Sort by date descending (newest first) by default
        const sortField = paginationParams.sortBy || 'invoiceDate';
        const sortDirection = paginationParams.sortOrder || 'desc';
        
        allInvoices.sort((a, b) => {
          let valA: any, valB: any;
          
          if (sortField === 'invoiceDate') {
            valA = new Date(a.invoiceDate).getTime();
            valB = new Date(b.invoiceDate).getTime();
          } else if (sortField === 'invoiceNumber') {
            valA = a.invoiceNumber;
            valB = b.invoiceNumber;
          } else if (sortField === 'buyerName') {
            valA = a.buyerName.toLowerCase();
            valB = b.buyerName.toLowerCase();
          } else if (sortField === 'totalAmount') {
            valA = a.totalAmount;
            valB = b.totalAmount;
          } else {
            valA = a.invoiceDate;
            valB = b.invoiceDate;
          }
          
          if (sortDirection === 'asc') {
            return valA > valB ? 1 : valA < valB ? -1 : 0;
          } else {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
          }
        });
        
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
            stats: aggregateStats
          }
        });
      }
      
      // Default non-paginated return (for compatibility with existing components)
      return res.json(allInvoices);
    } catch (error) {
      console.error('[API] Error fetching invoices:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get available invoices (not yet linked to any gatepass)
  app.get('/api/invoices/available', isAuthenticated, async (req: any, res) => {
    try {
      const availableInvoices = await storage.getAvailableInvoices();
      // Sort by invoice date descending (latest first)
      availableInvoices.sort((a, b) => {
        const dateA = new Date(a.invoiceDate).getTime();
        const dateB = new Date(b.invoiceDate).getTime();
        if (dateB !== dateA) return dateB - dateA;
        // Secondary sort by invoice number (numeric comparison for proper ordering)
        // Extract numeric suffix from invoice numbers like "INV-202501-0123"
        const numA = parseInt(a.invoiceNumber.replace(/\D/g, '').slice(-4) || '0');
        const numB = parseInt(b.invoiceNumber.replace(/\D/g, '').slice(-4) || '0');
        return numB - numA; // Descending order (higher numbers first)
      });
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
      
      // Debug: Log incoming ship-to fields
      console.log('[CREATE_INVOICE] Incoming ship-to fields:', JSON.stringify({
        shipToName: header?.shipToName,
        shipToAddress: header?.shipToAddress,
        shipToCity: header?.shipToCity,
        shipToState: header?.shipToState,
        shipToPincode: header?.shipToPincode,
      }));
      
      // Validate header
      const validatedHeader = insertInvoiceSchema.parse(header);
      
      // Debug: Log validated ship-to fields
      console.log('[CREATE_INVOICE] Validated ship-to fields:', JSON.stringify({
        shipToName: (validatedHeader as any)?.shipToName,
        shipToAddress: (validatedHeader as any)?.shipToAddress,
        shipToCity: (validatedHeader as any)?.shipToCity,
        shipToState: (validatedHeader as any)?.shipToState,
        shipToPincode: (validatedHeader as any)?.shipToPincode,
      }));
      
      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one invoice item is required" });
      }
      
      // Check if this is a reissued invoice (has originalInvoiceId)
      const originalInvoiceId = header.originalInvoiceId || null;
      
      // For reissued invoices, verify sufficient inventory exists BEFORE creating
      if (originalInvoiceId) {
        const insufficientItems: { productId: number; productName: string; needed: number; available: number }[] = [];
        
        for (const item of items) {
          if (item.productId && item.quantity > 0) {
            // Get total available inventory for this product
            const inventoryResult = await db.select({
              totalQuantity: sql<number>`COALESCE(SUM(${finishedGoods.quantity}), 0)`
            })
            .from(finishedGoods)
            .where(and(
              eq(finishedGoods.productId, item.productId),
              eq(finishedGoods.recordStatus, 1),
              sql`${finishedGoods.quantity} > 0`
            ));
            
            const availableQuantity = Number(inventoryResult[0]?.totalQuantity || 0);
            
            if (availableQuantity < item.quantity) {
              // Get product name for better error message
              const [product] = await db.select({ name: products.name })
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1);
              
              insufficientItems.push({
                productId: item.productId,
                productName: product?.name || `Product #${item.productId}`,
                needed: item.quantity,
                available: availableQuantity
              });
            }
          }
        }
        
        // Block reissue if any item has insufficient inventory
        if (insufficientItems.length > 0) {
          const errorDetails = insufficientItems.map(i => 
            `${i.productName}: need ${i.needed}, available ${i.available} (short by ${i.needed - i.available})`
          ).join('; ');
          
          console.warn(`[REISSUE_BLOCKED] Insufficient inventory: ${errorDetails}`);
          
          return res.status(400).json({ 
            message: `Cannot reissue invoice - insufficient finished goods inventory`,
            details: errorDetails,
            insufficientItems
          });
        }
        
        console.log(`[REISSUE] Inventory check passed for all ${items.length} items`);
      }
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceData = {
        ...validatedHeader,
        invoiceDate: validatedHeader.invoiceDate ? new Date(validatedHeader.invoiceDate).toISOString() : new Date().toISOString(),
        dateOfSupply: validatedHeader.dateOfSupply ? new Date(validatedHeader.dateOfSupply).toISOString() : null,
        invoiceNumber,
        generatedBy: req.user?.id,
        originalInvoiceId, // Link to cancelled invoice if this is a reissue
        recordStatus: 1, // Explicitly set to active (important for reissued invoices)
      };
      
      console.log(`[CREATE_INVOICE] Creating invoice for ${validatedHeader.buyerName}, originalInvoiceId=${originalInvoiceId}, recordStatus=1`);
      
      // Wrap in transaction
      const result = await db.transaction(async (tx) => {
        // Create invoice header
        console.log('[CREATE_INVOICE] Inserting with data:', JSON.stringify({ 
          recordStatus: invoiceData.recordStatus, 
          buyerName: invoiceData.buyerName,
          originalInvoiceId: invoiceData.originalInvoiceId 
        }));
        const [invoice] = await tx.insert(invoices).values([invoiceData]).returning();
        console.log('[CREATE_INVOICE] Created invoice:', JSON.stringify({ 
          id: invoice.id, 
          invoiceNumber: invoice.invoiceNumber, 
          recordStatus: invoice.recordStatus,
          originalInvoiceId: invoice.originalInvoiceId
        }));
        
        // Create invoice items
        for (const item of items) {
          const validatedItem = insertInvoiceItemSchema.parse({
            ...item,
            invoiceId: invoice.id
          });
          
          await tx.insert(invoiceItems).values(validatedItem);
        }
        
        // If this is a reissued invoice, update the cancelled invoice to link back
        // AND deduct inventory (to balance what was returned during cancellation)
        // AND auto-create a gatepass since the original had one
        let autoCreatedGatepass: any = null;
        const batchAllocations: { productId: string; finishedGoodId: string; quantity: number; uomId: string | null; batchNumber: string | null }[] = [];
        
        if (originalInvoiceId) {
          await tx.update(invoices)
            .set({ replacedByInvoiceId: invoice.id })
            .where(eq(invoices.id, originalInvoiceId));
          console.log(`[REISSUE] Linked cancelled invoice ${originalInvoiceId} → new invoice ${invoice.id}`);
          
          // Deduct finished goods inventory for reissued invoice
          // This balances the inventory that was returned when the original invoice was cancelled
          // Uses multi-batch deduction: if one batch isn't enough, deduct from multiple batches
          for (const item of items) {
            if (item.productId && item.quantity > 0) {
              let remainingToDeduct = item.quantity;
              
              // Get all available batches for this product, prioritizing CANCEL- batches first
              const availableBatches = await tx.select()
                .from(finishedGoods)
                .where(and(
                  eq(finishedGoods.productId, item.productId),
                  eq(finishedGoods.recordStatus, 1),
                  sql`${finishedGoods.quantity} > 0`
                ))
                .orderBy(sql`CASE WHEN ${finishedGoods.batchNumber} LIKE 'CANCEL-%' THEN 0 ELSE 1 END, ${finishedGoods.createdAt} ASC`);
              
              // Deduct from batches until we've covered the full quantity
              for (const batch of availableBatches) {
                if (remainingToDeduct <= 0) break;
                
                const deductFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
                const newQuantity = batch.quantity - deductFromThisBatch;
                
                // Track this allocation for gatepass item creation (include UOM from invoice item and batch number)
                batchAllocations.push({
                  productId: item.productId,
                  finishedGoodId: batch.id,
                  quantity: deductFromThisBatch,
                  uomId: item.uomId || null,
                  batchNumber: batch.originalBatchNumber || batch.batchNumber // Preserve original batch number
                });
                
                // If quantity becomes 0, soft-delete the batch to keep inventory clean
                if (newQuantity === 0) {
                  await tx.update(finishedGoods)
                    .set({ 
                      quantity: 0,
                      recordStatus: 0, // Soft delete - batch is exhausted
                      updatedAt: new Date().toISOString(),
                      remarks: batch.remarks 
                        ? `${batch.remarks} | Fully consumed for reissued invoice ${invoice.invoiceNumber}`
                        : `Fully consumed for reissued invoice ${invoice.invoiceNumber}`
                    })
                    .where(eq(finishedGoods.id, batch.id));
                  
                  console.log(`[REISSUE_INVENTORY] Batch ${batch.batchNumber} fully consumed and removed (deducted ${deductFromThisBatch} units)`);
                } else {
                  await tx.update(finishedGoods)
                    .set({ 
                      quantity: newQuantity, 
                      updatedAt: new Date().toISOString(),
                      remarks: batch.remarks 
                        ? `${batch.remarks} | Deducted ${deductFromThisBatch} for reissued invoice ${invoice.invoiceNumber}`
                        : `Deducted ${deductFromThisBatch} for reissued invoice ${invoice.invoiceNumber}`
                    })
                    .where(eq(finishedGoods.id, batch.id));
                  
                  console.log(`[REISSUE_INVENTORY] Deducted ${deductFromThisBatch} units of product ${item.productId} from batch ${batch.batchNumber} (remaining: ${newQuantity})`);
                }
                
                remainingToDeduct -= deductFromThisBatch;
              }
              
              // Log if we couldn't deduct the full amount
              if (remainingToDeduct > 0) {
                console.warn(`[REISSUE_INVENTORY] Insufficient inventory for product ${item.productId}. Needed: ${item.quantity}, Could only deduct: ${item.quantity - remainingToDeduct}. Shortfall: ${remainingToDeduct}`);
              } else {
                console.log(`[REISSUE_INVENTORY] Successfully deducted ${item.quantity} units of product ${item.productId} for reissued invoice`);
              }
            }
          }
          
          // Auto-create gatepass for reissued invoice using the batch allocations
          if (batchAllocations.length > 0) {
            // Fetch the old gatepass from the original invoice to copy vehicle/driver info
            const [oldGatepass] = await tx.select()
              .from(gatepasses)
              .where(eq(gatepasses.invoiceId, originalInvoiceId))
              .limit(1);
            
            const gatepassNumber = `GP-${Date.now()}`;
            const [newGatepass] = await tx.insert(gatepasses).values({
              invoiceId: invoice.id,
              gatepassNumber,
              gatepassDate: new Date().toISOString(),
              vehicleNumber: oldGatepass?.vehicleNumber || 'PENDING',
              driverName: oldGatepass?.driverName || 'PENDING',
              driverContact: oldGatepass?.driverContact || null,
              destination: oldGatepass?.destination || invoice.shipToCity || invoice.buyerName || 'PENDING',
              customerName: oldGatepass?.customerName || invoice.buyerName,
              transporterName: oldGatepass?.transporterName || null,
              dispatchedBy: req.user?.id,
              remarks: `Auto-generated gatepass for reissued invoice ${invoice.invoiceNumber} (replaces ${oldGatepass?.gatepassNumber || 'unknown'})`,
              status: oldGatepass?.status || 'generated', // Copy status from old gatepass, default to 'generated'
              recordStatus: 1,
            }).returning();
            
            // Create gatepass items for each batch allocation (with UOM from invoice and batch number)
            for (const allocation of batchAllocations) {
              await tx.insert(gatepassItems).values({
                gatepassId: newGatepass.id,
                productId: allocation.productId,
                finishedGoodId: allocation.finishedGoodId,
                quantityDispatched: allocation.quantity,
                uomId: allocation.uomId, // Copy UOM from invoice item
                batchNumber: allocation.batchNumber, // Preserve batch number for display
                recordStatus: 1,
              });
            }
            
            // Update invoice status to ready_for_gatepass since gatepass is created
            await tx.update(invoices)
              .set({ status: 'ready_for_gatepass' })
              .where(eq(invoices.id, invoice.id));
            
            autoCreatedGatepass = newGatepass;
            console.log(`[REISSUE] Auto-created gatepass ${gatepassNumber} for reissued invoice ${invoice.invoiceNumber} with ${batchAllocations.length} item allocations`);
          }
        }
        
        return { invoice, autoCreatedGatepass };
      });
      
      // Audit for potential oversell conditions (non-blocking, for admin visibility)
      try {
        const productIds = items
          .filter((item: any) => item.productId)
          .map((item: any) => item.productId);
        
        if (productIds.length > 0) {
          const auditResult = await storage.auditProductOversell(productIds, result.invoice.id);
          if (auditResult.oversellProducts.length > 0) {
            console.log(`[INVOICE ${result.invoice.invoiceNumber}] Oversell alert created for: ${auditResult.oversellProducts.join(', ')}`);
          }
        }
      } catch (auditError) {
        // Non-blocking - just log the error
        console.error('[OVERSELL_AUDIT_ERROR]', auditError);
      }
      
      // Build response message based on what was created
      let message = "Invoice created successfully with items";
      if (result.autoCreatedGatepass) {
        message = `Invoice created with auto-generated gatepass ${result.autoCreatedGatepass.gatepassNumber}. Update vehicle/driver details before dispatch.`;
      }
      
      res.json({ 
        invoice: result.invoice, 
        gatepass: result.autoCreatedGatepass,
        message 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create invoice" });
    }
  });

  // Get single invoice with items
  // Supports ?includeCancelled=true to view cancelled invoices (read-only)
  app.get('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const includeCancelled = req.query.includeCancelled === 'true';
      
      const invoice = await storage.getInvoice(id, includeCancelled);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Fetch items for this invoice (also include cancelled items if viewing cancelled invoice)
      const items = await storage.getInvoiceItems(id, includeCancelled);
      
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
      
      // Check if invoice exists and is not delivered
      const existingInvoice = await storage.getInvoice(id);
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Support both old format (flat body) and new format ({ header, items })
      const hasHeaderItems = req.body.header !== undefined;
      const headerData = hasHeaderItems ? req.body.header : req.body;
      const itemsData = hasHeaderItems ? req.body.items : undefined;
      
      // Block editing of delivered invoices (use Cancel & Reissue or Credit Notes instead)
      // Exception: Allow marking as delivered when current status is dispatched
      const isMarkingAsDelivered = headerData.status === 'delivered' && existingInvoice.status === 'dispatched';
      if (existingInvoice.status === 'delivered' && !isMarkingAsDelivered) {
        return res.status(400).json({ 
          message: "Delivered invoices cannot be edited. Use 'Cancel & Reissue' for current month invoices or 'Credit Notes' for previous month invoices." 
        });
      }
      
      // Block editing of header/line item fields when a gatepass exists (to maintain data integrity)
      // Allow: status updates, dispatch fields, delivery fields, vehicle/driver info
      // Block: buyer details, ship-to details, amounts, items, bank details, etc.
      const blockedFieldsWhenGatepassExists = [
        // Buyer details
        'buyerGstin', 'buyerName', 'buyerAddress', 'buyerState', 'buyerStateCode', 'buyerContact',
        // Ship-to details
        'shipToName', 'shipToAddress', 'shipToCity', 'shipToState', 'shipToPincode', 'shipToGstin',
        // Amounts (should not be changed after gatepass)
        'subtotal', 'cgstAmount', 'sgstAmount', 'igstAmount', 'cessAmount', 'roundOff', 'totalAmount',
        'transportRatePerCase', 'transportCharges',
        // Bank details
        'bankName', 'bankAccountNumber', 'bankIfscCode', 'accountHolderName', 'branchName', 'upiId',
        // Other header fields
        'invoiceDate', 'dateOfSupply', 'placeOfSupply', 'termsConditionsId', 'templateId',
        'sellerGstin', 'sellerName', 'sellerAddress', 'sellerState', 'sellerStateCode',
        // Items cannot be changed
        'items'
      ];
      
      const requestedFields = Object.keys(headerData);
      // Also check if items are being modified
      if (itemsData && itemsData.length > 0) {
        requestedFields.push('items');
      }
      const blockedFieldsInRequest = requestedFields.filter(field => blockedFieldsWhenGatepassExists.includes(field));
      
      if (blockedFieldsInRequest.length > 0) {
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
            message: "This invoice cannot be edited because a gatepass has been created. Use 'Cancel & Reissue' to make changes.",
            gatepassNumber: existingGatepass[0].gatepassNumber,
            blockedFields: blockedFieldsInRequest
          });
        }
      }
      
      const validatedData = insertInvoiceSchema.partial().parse(headerData);
      
      // If items are provided, wrap header update + item replacement in transaction
      if (itemsData && Array.isArray(itemsData) && itemsData.length > 0) {
        // Validate all items first (before any DB changes)
        const validatedItems = itemsData.map(item => 
          insertInvoiceItemSchema.parse({ ...item, invoiceId: id })
        );
        
        // Perform atomic update: header + items in transaction
        await db.transaction(async (tx) => {
          // Update invoice header
          await tx.update(invoices)
            .set({ ...validatedData, updatedAt: new Date().toISOString() })
            .where(eq(invoices.id, id));
          
          // Soft delete existing ACTIVE items only (prevents re-deleting already deleted items)
          await tx.update(invoiceItems)
            .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
            .where(and(
              eq(invoiceItems.invoiceId, id),
              eq(invoiceItems.recordStatus, 1)
            ));
          
          // Insert new items with explicit recordStatus = 1
          for (const validatedItem of validatedItems) {
            await tx.insert(invoiceItems).values({
              ...validatedItem,
              recordStatus: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        });
        console.log(`[AUDIT] Invoice ${id} updated with ${itemsData.length} items (atomic transaction)`);
        
        // Fetch updated invoice to return
        const invoice = await storage.getInvoice(id);
        if (!invoice) {
          return res.status(404).json({ message: "Invoice not found after update" });
        }
        
        // If marking invoice as delivered, also update linked gatepass status
        if (isMarkingAsDelivered) {
          const linkedGatepass = await db
            .select()
            .from(gatepasses)
            .where(
              and(
                eq(gatepasses.invoiceId, id),
                eq(gatepasses.recordStatus, 1)
              )
            )
            .limit(1);
          
          if (linkedGatepass.length > 0 && linkedGatepass[0].status === 'vehicle_out') {
            await db.update(gatepasses)
              .set({ status: 'delivered' })
              .where(eq(gatepasses.id, linkedGatepass[0].id));
            console.log(`[AUDIT] Gatepass ${linkedGatepass[0].gatepassNumber} marked as delivered along with invoice ${id}`);
          }
        }
        
        return res.json(invoice);
      }
      
      // Header-only update (no items provided)
      const invoice = await storage.updateInvoice(id, validatedData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // If marking invoice as delivered, also update linked gatepass status
      if (isMarkingAsDelivered) {
        const linkedGatepass = await db
          .select()
          .from(gatepasses)
          .where(
            and(
              eq(gatepasses.invoiceId, id),
              eq(gatepasses.recordStatus, 1)
            )
          )
          .limit(1);
        
        if (linkedGatepass.length > 0 && linkedGatepass[0].status === 'vehicle_out') {
          await db.update(gatepasses)
            .set({ status: 'delivered' })
            .where(eq(gatepasses.id, linkedGatepass[0].id));
          console.log(`[AUDIT] Gatepass ${linkedGatepass[0].gatepassNumber} marked as delivered along with invoice ${id}`);
        }
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
      
      // Get invoice to check status
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Block deletion of delivered invoices
      if (invoice.status === 'delivered') {
        return res.status(400).json({ 
          message: "Delivered invoices cannot be deleted. Use 'Cancel & Reissue' for current month invoices or 'Credit Notes' for older invoices."
        });
      }
      
      // Block deletion of dispatched invoices (vehicle already left)
      if (invoice.status === 'dispatched') {
        return res.status(400).json({ 
          message: "Dispatched invoices cannot be deleted. The vehicle has already left the premises. Mark as delivered or use 'Cancel & Reissue' if needed."
        });
      }
      
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
      console.log(`[AUDIT] Invoice ${invoice.invoiceNumber} deleted by user`);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Cancel invoice (simple cancel - soft deletes invoice and gatepass, returns inventory)
  // Uses same pattern as cancel-and-reissue but without creating a new invoice
  app.post('/api/invoices/:id/cancel', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Fetch the invoice
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if invoice is already cancelled (recordStatus = 0)
      if (invoice.recordStatus === 0) {
        return res.status(400).json({ message: "Invoice is already cancelled" });
      }
      
      // Check if invoice is in current month (same restriction as cancel-and-reissue)
      const now = new Date();
      const invoiceDate = new Date(invoice.invoiceDate);
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const invoiceMonth = invoiceDate.getMonth();
      const invoiceYear = invoiceDate.getFullYear();
      
      if (invoiceMonth !== currentMonth || invoiceYear !== currentYear) {
        return res.status(400).json({ 
          message: "Can only cancel invoices from the current month. For older invoices, use Credit Notes instead.",
          invoiceMonth: invoiceDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          currentMonth: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        });
      }
      
      // Check if invoice has an associated gatepass
      const existingGatepasses = await db
        .select()
        .from(gatepasses)
        .where(
          and(
            eq(gatepasses.invoiceId, id),
            eq(gatepasses.recordStatus, 1)
          )
        );
      
      // Get invoice items for inventory return
      const items = await storage.getInvoiceItems(id);
      
      // Use a transaction for atomicity
      await db.transaction(async (tx) => {
        const cancelledGatepassNumbers: string[] = [];
        
        // Cancel gatepasses (soft delete)
        for (const gp of existingGatepasses) {
          await tx.update(gatepasses)
            .set({ recordStatus: 0 })
            .where(eq(gatepasses.id, gp.id));
          
          cancelledGatepassNumbers.push(gp.gatepassNumber);
          console.log(`[CANCEL] Cancelled gatepass ${gp.gatepassNumber}`);
        }
        
        // Return inventory to finished goods (same logic as cancel-and-reissue)
        for (const item of items) {
          if (item.productId && item.quantity > 0) {
            // Verify product exists
            const [existingProduct] = await tx.select({ id: products.id })
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);
            
            if (existingProduct) {
              const batchNumber = `CANCEL-${invoice.invoiceNumber}-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
              const hasGatepass = cancelledGatepassNumbers.length > 0;
              
              await tx.insert(finishedGoods).values({
                productId: item.productId,
                batchNumber,
                productionDate: new Date().toISOString(),
                quantity: item.quantity,
                qualityStatus: 'approved',
                remarks: hasGatepass 
                  ? `Inventory returned - Invoice ${invoice.invoiceNumber} cancelled. Gatepass(es): ${cancelledGatepassNumbers.join(', ')}. ${reason ? 'Reason: ' + reason : ''}`
                  : `Inventory returned - Invoice ${invoice.invoiceNumber} cancelled. ${reason ? 'Reason: ' + reason : ''}`,
                createdBy: req.user?.id,
              });
              
              console.log(`[INVENTORY] Returned ${item.quantity} units of product ${item.productId} to inventory (Cancel)`);
            } else {
              console.warn(`[INVENTORY] Skipping inventory return for product ${item.productId} - product not found`);
            }
          }
        }
        
        // Cancel the invoice (soft delete with cancellation tracking)
        await tx.update(invoices)
          .set({ 
            recordStatus: 0,
            cancelledAt: new Date().toISOString(),
            cancelledBy: req.user?.id || null,
            remarks: reason ? `Cancelled: ${reason}` : 'Cancelled'
          })
          .where(eq(invoices.id, id));
        
        console.log(`[AUDIT] Invoice ${invoice.invoiceNumber} cancelled by user. Reason: ${reason || 'Not specified'}`);
      });
      
      res.json({ 
        message: "Invoice cancelled successfully",
        invoiceNumber: invoice.invoiceNumber,
        gatepassesCancelled: existingGatepasses.length
      });
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      res.status(500).json({ message: "Failed to cancel invoice" });
    }
  });

  // Restore a cancelled invoice (Undo cancellation)
  app.post('/api/invoices/:id/restore', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const invoice = await storage.getInvoice(id, true); // true to include cancelled
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.recordStatus === 1) {
        return res.status(400).json({ message: "Invoice is already active" });
      }
      
      // Check if this invoice was replaced by another invoice (Cancel & Reissue)
      if (invoice.replacedByInvoiceId) {
        return res.status(400).json({ 
          message: "Cannot restore: This invoice was replaced by a reissued invoice. Delete the replacement invoice first if you want to restore this one." 
        });
      }
      
      await db.transaction(async (tx) => {
        // 1. Restore invoice header
        await tx.update(invoices)
          .set({ 
            recordStatus: 1,
            cancelledAt: null,
            cancelledBy: null,
            updatedAt: new Date().toISOString()
          })
          .where(eq(invoices.id, id));
          
        // 2. Restore invoice items
        await tx.update(invoiceItems)
          .set({ 
            recordStatus: 1,
            updatedAt: new Date().toISOString()
          })
          .where(eq(invoiceItems.invoiceId, id));
          
        // 3. Find and restore the associated gatepass
        const [linkedGatepass] = await tx.select()
          .from(gatepasses)
          .where(eq(gatepasses.invoiceId, id))
          .limit(1);

        if (linkedGatepass) {
          // Reactivate gatepass
          await tx.update(gatepasses)
            .set({ 
              recordStatus: 1,
              updatedAt: new Date().toISOString()
            })
            .where(eq(gatepasses.id, linkedGatepass.id));

          // Reactivate gatepass items
          await tx.update(gatepassItems)
            .set({ 
              recordStatus: 1,
              updatedAt: new Date().toISOString()
            })
            .where(eq(gatepassItems.gatepassId, linkedGatepass.id));

          // 4. Remove the 'CANCEL' inventory returns from finished goods
          // When we cancel, we add records with batchNumber like 'CANCEL-INV-...'
          // We need to delete or mark these as inactive to "un-return" the stock
          const cancelBatchPrefix = `CANCEL-${invoice.invoiceNumber}-`;
          await tx.update(finishedGoods)
            .set({ 
              recordStatus: 0,
              remarks: `Correction: Cancellation undone for Invoice ${invoice.invoiceNumber}`
            })
            .where(and(
              ilike(finishedGoods.batchNumber, `${cancelBatchPrefix}%`),
              eq(finishedGoods.recordStatus, 1)
            ));
          
          console.log(`[RESTORE] Undid inventory returns for invoice ${invoice.invoiceNumber} and reactivated gatepass ${linkedGatepass.gatepassNumber}`);
        }
      });
      
      res.json({ message: "Invoice restored successfully. It is now active again." });
    } catch (error) {
      console.error("Error restoring invoice:", error);
      res.status(500).json({ message: "Failed to restore invoice" });
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
      const result = await db.transaction(async (tx) => {
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
        
        // Only return finished goods inventory if there was a gatepass
        // Inventory is only deducted when gatepass is created, not when invoice is created
        // So if there's no gatepass, there's no inventory to return
        
        // Define itemsWithBatch at transaction scope so it's available for return
        let itemsWithBatch: Array<typeof items[0] & { batchNumber: string | null }> = items.map(item => ({
          ...item,
          batchNumber: null
        }));
        
        if (cancelledGatepassNumbers.length > 0) {
          // Get the original batch numbers from the cancelled gatepass items
          const originalBatchMap = new Map<string, string>(); // productId -> original batch number
          for (const gatepass of existingGatepasses) {
            const gpItems = await tx.select({
              productId: gatepassItems.productId,
              finishedGoodId: gatepassItems.finishedGoodId,
            })
              .from(gatepassItems)
              .where(eq(gatepassItems.gatepassId, gatepass.id));
            
            for (const gpItem of gpItems) {
              if (gpItem.finishedGoodId) {
                const [fg] = await tx.select({ batchNumber: finishedGoods.batchNumber, originalBatchNumber: finishedGoods.originalBatchNumber })
                  .from(finishedGoods)
                  .where(eq(finishedGoods.id, gpItem.finishedGoodId))
                  .limit(1);
                if (fg && gpItem.productId) {
                  // Use originalBatchNumber if available, otherwise use batchNumber
                  const displayBatch = fg.originalBatchNumber || fg.batchNumber;
                  originalBatchMap.set(gpItem.productId, displayBatch);
                }
              }
            }
          }
          
          // Update itemsWithBatch with original batch numbers
          itemsWithBatch = items.map(item => ({
            ...item,
            batchNumber: originalBatchMap.get(item.productId) || null
          }));

          for (const item of itemsWithBatch) {
            if (item.productId && item.quantity > 0) {
              const [existingProduct] = await tx.select({ id: products.id })
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1);
              
              if (existingProduct) {
                const originalBatchNumber = item.batchNumber || null;
                // Preserve the original batch number as the new batchNumber for FIFO continuity
                const batchNumber = originalBatchNumber || `CANCEL-${invoice.invoiceNumber}-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
                
                await tx.insert(finishedGoods).values({
                  productId: item.productId,
                  batchNumber,
                  originalBatchNumber, // Store the original batch number for display
                  productionDate: new Date().toISOString(),
                  quantity: item.quantity,
                  qualityStatus: 'approved',
                  remarks: `Inventory returned - Invoice ${invoice.invoiceNumber} cancelled & reissued. Gatepass(es): ${cancelledGatepassNumbers.join(', ')}${originalBatchNumber ? `. Original batch: ${originalBatchNumber}` : ''}`,
                  createdBy: req.user?.id,
                });
              }
            }
          }
          console.log(`[CANCEL_REISSUE] Returned inventory for ${items.length} items from cancelled gatepass(es)`);
        } else {
          console.log(`[CANCEL_REISSUE] No gatepass found - skipping inventory return (inventory was never deducted)`);
        }
        
        // Cancel the invoice (soft delete) with tracking info
        await tx.update(invoices)
          .set({ 
            recordStatus: 0,
            cancelledAt: new Date().toISOString(),
            cancelledBy: req.user?.id || null,
          })
          .where(eq(invoices.id, id));

        // Return the invoice and items data for the frontend to populate the form
        return { invoice, items: itemsWithBatch };
      });
      
      // Return invoice data so frontend can open a popup form with it pre-filled
      res.json({ 
        message: "Invoice cancelled. You can now create a corrected replacement.",
        invoiceData: result.invoice,
        invoiceItems: result.items,
        isReissue: true
      });
    } catch (error) {
      console.error("Error in cancel & reissue:", error);
      res.status(500).json({ message: "Failed to cancel & reissue invoice" });
    }
  });

  // Update invoice signature settings (allowed even on locked/delivered invoices)
  app.patch('/api/invoices/:id/signature', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { signatureType, includeSignature } = req.body;
      
      // Validate signature type
      const validTypes = ['default', 'alternate'];
      if (signatureType && !validTypes.includes(signatureType)) {
        return res.status(400).json({ 
          message: `Invalid signature type. Must be one of: ${validTypes.join(', ')}` 
        });
      }
      
      // Prepare update data
      const updateData: any = {};
      if (signatureType !== undefined) updateData.signatureType = signatureType;
      if (includeSignature !== undefined) updateData.includeSignature = includeSignature ? 1 : 0;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No signature settings provided to update" });
      }
      
      // Update invoice
      const [updated] = await db.update(invoices)
        .set(updateData)
        .where(eq(invoices.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      console.log(`[AUDIT] Invoice ${id} signature updated: type=${signatureType}, include=${includeSignature}`);
      res.json({ invoice: updated, message: "Invoice signature settings updated" });
    } catch (error) {
      console.error("Error updating invoice signature:", error);
      res.status(500).json({ message: "Failed to update invoice signature" });
    }
  });

  // Update invoice status (for dispatch workflow)
  // Allow admin, manager, or custom roles with create OR edit permission on invoices
  app.patch('/api/invoices/:id/status', async (req: any, res) => {
    try {
      // Manual permission check - allow create OR edit for workflow progression
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ message: "Forbidden: No role assigned" });
      }
      
      const role = await storage.getUserRole(user.roleId);
      if (!role) {
        return res.status(403).json({ message: "Forbidden: Invalid role" });
      }
      
      // Check database permissions - allow create OR edit for workflow progression
      const permission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'invoices'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      
      if (permission.length === 0) {
        return res.status(403).json({ message: "Forbidden: No invoice permissions" });
      }
      
      const perm = permission[0];
      // Allow either create or edit permission for workflow progression
      if (perm.canCreate !== 1 && perm.canEdit !== 1) {
        return res.status(403).json({ message: "Forbidden: Requires create or edit permission" });
      }
      
      const { id } = req.params;
      const { status, dispatchDate, deliveryDate, receivedBy, podRemarks } = req.body;
      
      // Validate status
      const validStatuses = ['draft', 'ready_for_gatepass', 'dispatched', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      
      // Ship-to validation removed - gatepass form auto-fills destination from buyer/vendor address
      
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
      const includeCancelled = req.query.includeCancelled === 'true';
      const items = await storage.getInvoiceItems(invoiceId, includeCancelled);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ message: "Failed to fetch invoice items" });
    }
  });

  // Get effective invoice item values (after credit/debit notes adjustments)
  // This calculates: Effective Qty = Original - Credited + Debited
  // And: Effective Price = Original + Price Adjustments from Debits
  app.get('/api/invoice-items-effective/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      
      // Get original invoice items
      const originalItems = await storage.getInvoiceItems(invoiceId, false);
      if (!originalItems || originalItems.length === 0) {
        return res.json([]);
      }
      
      // Get all issued credit notes for this invoice
      const issuedCreditNotes = await db.select()
        .from(creditNotes)
        .where(and(
          eq(creditNotes.invoiceId, invoiceId),
          eq(creditNotes.status, 'issued'),
          eq(creditNotes.recordStatus, 1)
        ));
      
      // Get all issued debit notes for this invoice
      const issuedDebitNotes = await db.select()
        .from(debitNotes)
        .where(and(
          eq(debitNotes.invoiceId, invoiceId),
          eq(debitNotes.status, 'issued'),
          eq(debitNotes.recordStatus, 1)
        ));
      
      // Get credit note items grouped by invoice item - track VALUE and QUANTITY
      const creditedByItem = new Map<string, { value: number, quantity: number }>(); // invoiceItemId -> total credited value & qty
      
      for (const cn of issuedCreditNotes) {
        const cnItems = await db.select()
          .from(creditNoteItems)
          .where(and(
            eq(creditNoteItems.creditNoteId, cn.id),
            eq(creditNoteItems.recordStatus, 1)
          ));
        
        for (const item of cnItems) {
          if (item.invoiceItemId) {
            const existing = creditedByItem.get(item.invoiceItemId) || { value: 0, quantity: 0 };
            creditedByItem.set(item.invoiceItemId, {
              value: existing.value + item.taxableValue,
              quantity: existing.quantity + item.quantity
            });
          }
        }
      }
      
      // Get debit note items grouped by invoice item - track VALUE, QUANTITY, and PRICE
      const debitedByItem = new Map<string, { value: number, quantity: number, maxPrice: number }>(); // invoiceItemId -> total debited value, qty, max price
      
      for (const dn of issuedDebitNotes) {
        const dnItems = await db.select()
          .from(debitNoteItems)
          .where(and(
            eq(debitNoteItems.debitNoteId, dn.id),
            eq(debitNoteItems.recordStatus, 1)
          ));
        
        for (const item of dnItems) {
          if (item.invoiceItemId) {
            const existing = debitedByItem.get(item.invoiceItemId) || { value: 0, quantity: 0, maxPrice: 0 };
            // Debit note items use additionalQuantity (not quantity) for extra units charged
            const debitQty = item.additionalQuantity || 0;
            // Track the highest price charged (new price from debit note)
            const newPrice = item.newUnitPrice || 0;
            debitedByItem.set(item.invoiceItemId, {
              value: existing.value + item.taxableValue,
              quantity: existing.quantity + debitQty,
              maxPrice: Math.max(existing.maxPrice, newPrice)
            });
          }
        }
      }
      
      // Calculate effective values for each item
      // Track both VALUE and QUANTITY for user-friendly display
      const effectiveItems = originalItems.map(item => {
        const creditedData = creditedByItem.get(item.id) || { value: 0, quantity: 0 };
        const debitedData = debitedByItem.get(item.id) || { value: 0, quantity: 0, maxPrice: 0 };
        
        const creditedValue = creditedData.value;
        const creditedQuantity = creditedData.quantity;
        const debitedValue = debitedData.value;
        const debitedQuantity = debitedData.quantity;
        const debitedMaxPrice = debitedData.maxPrice;
        
        // Original taxable value for this item
        const originalValue = item.quantity * item.unitPrice;
        
        // Effective remaining value = original - credited + debited
        const effectiveValue = originalValue - creditedValue + debitedValue;
        
        // For UI: remaining quantity = original - credited + debited
        const remainingQuantity = Math.max(0, item.quantity - creditedQuantity + debitedQuantity);
        
        const hasAdjustments = creditedValue > 0 || debitedValue > 0;
        
        // Calculate remaining creditable amount for this item (value-based)
        const remainingCreditable = Math.max(0, effectiveValue);
        
        // Effective unit price: use highest price charged (original or from debit note)
        // If debit note increased the price, credit note can credit at that higher price
        const effectiveUnitPrice = Math.max(item.unitPrice, debitedMaxPrice);
        
        // Current unit price: actual per-unit value after ALL adjustments (credits AND debits)
        // This reflects the true value remaining per unit, whether increased or decreased
        const currentUnitPrice = remainingQuantity > 0 
          ? Math.round(remainingCreditable / remainingQuantity) 
          : item.unitPrice;
        
        // Determine price change direction for UI indicators
        const priceIncreased = currentUnitPrice > item.unitPrice;
        const priceDecreased = currentUnitPrice < item.unitPrice;
        
        return {
          // Original item data
          id: item.id,
          invoiceId: item.invoiceId,
          productId: item.productId,
          productName: item.productName,
          hsnCode: item.hsnCode,
          uom: item.uom,
          
          // Original values (what the invoice shows)
          originalQuantity: item.quantity,
          originalUnitPrice: item.unitPrice,
          originalTaxableValue: item.taxableValue,
          
          // Adjustment summaries (value-based)
          creditedValue,
          debitedValue,
          
          // Adjustment summaries (quantity-based) for UI display
          creditedQuantity,
          debitedQuantity,
          remainingQuantity,
          
          // Effective values - for correction dialogs
          effectiveQuantity: remainingQuantity,
          effectiveUnitPrice, // Highest price charged (original or debit note's new price)
          currentUnitPrice, // Actual per-unit value after ALL adjustments
          effectiveTaxableValue: effectiveValue,
          remainingCreditable,
          
          // Price change indicators for UI
          priceIncreased,
          priceDecreased,
          
          // GST rates (unchanged from original)
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          igstRate: item.igstRate,
          
          // Flags
          hasAdjustments,
        };
      });
      
      // Calculate totals
      const summary = {
        totalCreditedValue: issuedCreditNotes.reduce((sum, cn) => sum + cn.grandTotal, 0),
        totalDebitedValue: issuedDebitNotes.reduce((sum, dn) => sum + dn.grandTotal, 0),
        creditNoteCount: issuedCreditNotes.length,
        debitNoteCount: issuedDebitNotes.length,
      };
      
      res.json({
        items: effectiveItems,
        summary,
      });
    } catch (error) {
      console.error("Error fetching effective invoice items:", error);
      res.status(500).json({ message: "Failed to fetch effective invoice items" });
    }
  });

  // Get invoice items with batch numbers from gatepass (for sales returns)
  app.get('/api/invoice-items-with-batch/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      const items = await storage.getInvoiceItems(invoiceId, false);
      
      // Get gatepass for this invoice
      const [gatepass] = await db.select().from(gatepasses)
        .where(and(
          eq(gatepasses.invoiceId, invoiceId),
          eq(gatepasses.recordStatus, 1)
        ));
      
      console.log(`[BATCH] Invoice ${invoiceId}: Gatepass found: ${gatepass ? gatepass.id : 'NONE'}`);
      
      // If gatepass exists, get gatepass items with batch numbers
      // Use array to handle multiple batches per product
      let batchMap: Record<string, string[]> = {};
      if (gatepass) {
        // Use LEFT JOIN to include items even if finished_goods record is missing
        const gatepassItemsData = await db.select({
          productId: gatepassItems.productId,
          finishedGoodId: gatepassItems.finishedGoodId,
          batchNumber: finishedGoods.batchNumber
        })
        .from(gatepassItems)
        .leftJoin(finishedGoods, eq(gatepassItems.finishedGoodId, finishedGoods.id))
        .where(and(
          eq(gatepassItems.gatepassId, gatepass.id),
          eq(gatepassItems.recordStatus, 1)
        ));
        
        console.log(`[BATCH] Gatepass ${gatepass.id}: Found ${gatepassItemsData.length} gatepass items`);
        gatepassItemsData.forEach((item, i) => {
          console.log(`[BATCH] Item ${i}: productId=${item.productId}, finishedGoodId=${item.finishedGoodId}, batchNumber=${item.batchNumber}`);
        });
        
        // Create a map of productId to array of unique batchNumbers
        for (const item of gatepassItemsData) {
          if (item.productId && item.batchNumber) {
            if (!batchMap[item.productId]) {
              batchMap[item.productId] = [];
            }
            // Only add if not already in array (unique batches)
            if (!batchMap[item.productId].includes(item.batchNumber)) {
              batchMap[item.productId].push(item.batchNumber);
            }
          }
        }
      }
      
      console.log(`[BATCH] BatchMap:`, JSON.stringify(batchMap));
      
      // Merge batch numbers into items
      // Only auto-fill if there's exactly one unique batch for the product
      const itemsWithBatch = items.map(item => {
        const batches = batchMap[item.productId] || [];
        return {
          ...item,
          // Only auto-fill when exactly one batch available for this product
          batchNumber: batches.length === 1 ? batches[0] : null,
          // Provide all available batches for user to choose if multiple
          availableBatches: batches.length > 1 ? batches : undefined
        };
      });
      
      res.json(itemsWithBatch);
    } catch (error) {
      console.error("Error fetching invoice items with batch:", error);
      res.status(500).json({ message: "Failed to fetch invoice items" });
    }
  });

  // GST Reports - Get invoices with items and HSN summary for a period
  // Allow admin, manager, billing manager, and accounts manager roles
  app.post('/api/gst-reports', requireRole('admin', 'manager', 'billing manager', 'accounts manager', 'AccountsManager'), async (req: any, res) => {
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

      // Fetch debit notes for the period
      const allDebitNotes = await db.select().from(debitNotes)
        .where(
          and(
            eq(debitNotes.recordStatus, 1),
            eq(debitNotes.status, 'issued'),
            gte(debitNotes.debitDate, startDate.toISOString().split('T')[0]),
            lte(debitNotes.debitDate, endDate.toISOString().split('T')[0])
          )
        );
      
      // Get related invoice data and items for each debit note
      const debitNotesWithInvoice = await Promise.all(
        allDebitNotes.map(async (dn) => {
          const invoice = await storage.getInvoice(dn.invoiceId);
          const debitItems = await storage.getDebitNoteItems(dn.id);
          return {
            debitNote: dn,
            invoice: invoice!,
            items: debitItems
          };
        })
      );
      
      // Fetch VENDOR debit notes for the period (purchase-side for ITC adjustments)
      const allVendorDebitNotes = await db.select().from(vendorDebitNotes)
        .where(
          and(
            eq(vendorDebitNotes.recordStatus, 1),
            gte(vendorDebitNotes.debitDate, startDate.toISOString().split('T')[0]),
            lte(vendorDebitNotes.debitDate, endDate.toISOString().split('T')[0])
          )
        );
      
      // Fetch approved scrap inventory records for the period (write-off losses)
      // scrapDate is stored as ISO timestamp string, so compare using ISO format
      const scrapStartStr = startDate.toISOString();
      const scrapEndStr = endDate.toISOString();
      const scrapLosses = await db.select().from(scrapInventory)
        .where(
          and(
            eq(scrapInventory.recordStatus, 1),
            eq(scrapInventory.approvalStatus, 'approved'),
            gte(scrapInventory.scrapDate, scrapStartStr),
            lte(scrapInventory.scrapDate, scrapEndStr)
          )
        );
      
      // Get vendor details and items for each vendor debit note
      const vendorDebitNotesWithDetails = await Promise.all(
        allVendorDebitNotes.map(async (vdn) => {
          const vendor = await storage.getVendor(vdn.vendorId);
          const vdnItems = await db.select().from(vendorDebitNoteItems)
            .where(eq(vendorDebitNoteItems.vendorDebitNoteId, vdn.id));
          return {
            vendorDebitNote: vdn,
            vendor: vendor!,
            items: vdnItems
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
      
      // Calculate vendor debit note totals for ITC adjustments
      let vendorDebitNoteTaxableTotal = 0;
      let vendorDebitNoteTaxTotal = 0;
      vendorDebitNotesWithDetails.forEach(({ vendorDebitNote }) => {
        vendorDebitNoteTaxableTotal += vendorDebitNote.subtotal / 100;
        vendorDebitNoteTaxTotal += (vendorDebitNote.cgstAmount + vendorDebitNote.sgstAmount + vendorDebitNote.igstAmount) / 100;
      });
      
      // Calculate scrap loss totals for write-off disclosure
      // GST Treatment: Scrap/damaged inventory losses require ITC reversal if ITC was claimed on input
      let scrapLossCostTotal = 0;
      let scrapLossSellingTotal = 0;
      let scrapLossCount = 0;
      const scrapByReason = new Map<string, { count: number; lossAmount: number }>();
      
      scrapLosses.forEach((scrap) => {
        scrapLossCostTotal += (scrap.totalCostValue || 0) / 100;
        scrapLossSellingTotal += (scrap.totalSellingValue || 0) / 100;
        scrapLossCount += scrap.quantity || 0;
        
        const reason = scrap.damageReason || 'other';
        if (!scrapByReason.has(reason)) {
          scrapByReason.set(reason, { count: 0, lossAmount: 0 });
        }
        const entry = scrapByReason.get(reason)!;
        entry.count += scrap.quantity || 0;
        entry.lossAmount += (scrap.lossAmount || 0) / 100;
      });
      
      const scrapSummaryByReason = Array.from(scrapByReason.entries()).map(([reason, data]) => ({
        reason,
        count: data.count,
        lossAmount: Number(data.lossAmount.toFixed(2)),
      }));
      
      // Build response
      const response = {
        invoices: invoicesWithItems,
        creditNotes: creditNotesWithInvoice,
        debitNotes: debitNotesWithInvoice,
        vendorDebitNotes: vendorDebitNotesWithDetails,
        scrapLosses: scrapLosses.map(scrap => ({
          ...scrap,
          // Convert paise to rupees for frontend display
          unitCostRupees: (scrap.unitCost || 0) / 100,
          sellingPriceRupees: (scrap.sellingPrice || 0) / 100,
          totalCostValueRupees: (scrap.totalCostValue || 0) / 100,
          totalSellingValueRupees: (scrap.totalSellingValue || 0) / 100,
          lossAmountRupees: (scrap.lossAmount || 0) / 100,
        })),
        hsnSummary,
        scrapSummary: {
          totalRecords: scrapLosses.length,
          totalUnits: scrapLossCount,
          totalCostValue: Number(scrapLossCostTotal.toFixed(2)),
          totalSellingValue: Number(scrapLossSellingTotal.toFixed(2)),
          byReason: scrapSummaryByReason,
        },
        metadata: {
          period: `${month.toString().padStart(2, '0')}${year}`,
          periodType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalInvoices: invoicesWithItems.length,
          totalCreditNotes: creditNotesWithInvoice.length,
          totalDebitNotes: debitNotesWithInvoice.length,
          totalVendorDebitNotes: vendorDebitNotesWithDetails.length,
          totalScrapRecords: scrapLosses.length,
          totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
          totalTax: Number(totalTax.toFixed(2)),
          vendorDebitNoteTaxableTotal: Number(vendorDebitNoteTaxableTotal.toFixed(2)),
          vendorDebitNoteTaxTotal: Number(vendorDebitNoteTaxTotal.toFixed(2)),
          scrapLossCostTotal: Number(scrapLossCostTotal.toFixed(2)),
          scrapLossSellingTotal: Number(scrapLossSellingTotal.toFixed(2)),
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
      
      // Get all credit notes and debit notes for outstanding balance calculation
      const allCreditNotes = await db.select().from(creditNotes).where(
        and(eq(creditNotes.recordStatus, 1), eq(creditNotes.status, 'issued'))
      );
      const allDebitNotes = await db.select().from(debitNotes).where(
        and(eq(debitNotes.recordStatus, 1), eq(debitNotes.status, 'issued'))
      );

      // Group credit/debit notes by invoice ID
      const creditNotesByInvoice = new Map<string, number>();
      allCreditNotes.forEach(cn => {
        const current = creditNotesByInvoice.get(cn.invoiceId) || 0;
        creditNotesByInvoice.set(cn.invoiceId, current + cn.grandTotal);
      });

      const debitNotesByInvoice = new Map<string, number>();
      allDebitNotes.forEach(dn => {
        const current = debitNotesByInvoice.get(dn.invoiceId) || 0;
        debitNotesByInvoice.set(dn.invoiceId, current + dn.grandTotal);
      });
      
      // Calculate outstanding balance for each invoice
      // Formula: outstanding = (totalAmount + debitNotes) - creditNotes - amountReceived
      const invoicesWithBalance = allInvoices.map(invoice => {
        const totalPaid = invoice.amountReceived || 0;
        const creditNoteTotal = creditNotesByInvoice.get(invoice.id) || 0;
        const debitNoteTotal = debitNotesByInvoice.get(invoice.id) || 0;
        const effectiveTotal = invoice.totalAmount + debitNoteTotal - creditNoteTotal;
        const outstandingBalance = Math.max(0, effectiveTotal - totalPaid);
        
        return {
          ...invoice,
          totalPaid,
          creditNoteTotal,
          debitNoteTotal,
          effectiveTotal,
          outstandingBalance,
          isOverpaid: (effectiveTotal - totalPaid) < 0,
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

  // Payment History - Get all payments with linked invoice and vendor details
  // MUST be before /:invoiceId route to avoid "history" being matched as invoiceId
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
      .orderBy(desc(invoicePayments.paymentDate));

      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching payment history:", error?.message || error);
      res.status(500).json({ message: "Failed to fetch payment history" });
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

        // Update invoice amountReceived to reflect the write-off
        const newAmountReceived = totalPaid + outstandingBalance;
        await tx.update(invoices)
          .set({
            amountReceived: newAmountReceived,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(invoices.id, invoiceId));

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

  // Get write-off report
  app.get('/api/reports/write-offs', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { page = 1, pageSize = 25, dateFrom, dateTo, buyerName } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 25));
      const offset = (pageNum - 1) * pageSizeNum;

      // Build WHERE conditions for SQL-level filtering
      const conditions: any[] = [
        eq(invoicePayments.paymentType, 'Write-off'),
        eq(invoicePayments.recordStatus, 1)
      ];

      if (dateFrom) {
        conditions.push(sql`${invoicePayments.paymentDate}::date >= ${dateFrom}::date`);
      }
      if (dateTo) {
        conditions.push(sql`${invoicePayments.paymentDate}::date <= ${dateTo}::date`);
      }
      if (buyerName) {
        conditions.push(sql`LOWER(${invoices.buyerName}) LIKE LOWER(${'%' + buyerName + '%'})`);
      }

      // Get total count and aggregate stats with SQL-level filtering
      const aggregateResult = await db
        .select({
          totalCount: sql<number>`COUNT(*)::int`,
          totalWriteOffAmount: sql<number>`COALESCE(SUM(${invoicePayments.amount}), 0)::bigint`,
        })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
        .where(and(...conditions));

      const totalCount = aggregateResult[0]?.totalCount || 0;
      const totalWriteOffAmount = Number(aggregateResult[0]?.totalWriteOffAmount || 0);
      const totalPages = Math.ceil(totalCount / pageSizeNum);

      // Fetch paginated write-off payments with SQL-level filtering
      const writeOffs = await db
        .select({
          id: invoicePayments.id,
          invoiceId: invoicePayments.invoiceId,
          amount: invoicePayments.amount,
          paymentDate: invoicePayments.paymentDate,
          remarks: invoicePayments.remarks,
          recordedBy: invoicePayments.recordedBy,
          createdAt: invoicePayments.createdAt,
          invoiceNumber: invoices.invoiceNumber,
          invoiceDate: invoices.invoiceDate,
          buyerName: invoices.buyerName,
          totalAmount: invoices.totalAmount,
        })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
        .where(and(...conditions))
        .orderBy(desc(invoicePayments.createdAt))
        .limit(pageSizeNum)
        .offset(offset);

      // Fetch user names for recordedBy
      const userIds = [...new Set(writeOffs.map(wo => wo.recordedBy).filter(Boolean))];
      const userNames: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const usersData = await db.select({ id: users.id, username: users.username })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`,`)})`);
        
        usersData.forEach(u => {
          userNames[u.id] = u.username;
        });
      }

      // Add user names to write-offs
      const writeOffsWithUserNames = writeOffs.map(wo => ({
        ...wo,
        recordedByName: wo.recordedBy ? userNames[wo.recordedBy] || 'Unknown' : 'System',
      }));

      res.json({
        data: writeOffsWithUserNames,
        meta: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: totalCount,
          totalPages,
        },
        aggregateStats: {
          totalWriteOffAmount,
          totalCount,
        },
      });
    } catch (error) {
      console.error("Error fetching write-off report:", error);
      res.status(500).json({ message: "Failed to fetch write-off report" });
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

  // Enriched Payment Report API - combines payments with evidence metadata for reporting
  app.get('/api/invoice-payments/with-evidence', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId, invoiceId, dateFrom, dateTo, page, pageSize } = req.query;
      
      const result = await storage.getPaymentsWithEvidence({
        vendorId: vendorId as string,
        invoiceId: invoiceId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching payments with evidence:", error);
      res.status(500).json({ message: "Failed to fetch payment report" });
    }
  });

  // Payment Evidence API - for tracking Payments.xlsx records linked to VY- payments
  // Get orphan evidence records (for reconciliation dashboard)
  // MUST be before /:paymentId route to avoid "orphans" being matched as paymentId
  app.get('/api/payment-evidence/orphans', isAuthenticated, async (req: any, res) => {
    try {
      const orphans = await storage.getAllOrphanEvidence();
      res.json(orphans);
    } catch (error) {
      console.error("Error fetching orphan evidence:", error);
      res.status(500).json({ message: "Failed to fetch orphan evidence" });
    }
  });

  // Get evidence records for a specific payment
  app.get('/api/payment-evidence/:paymentId', isAuthenticated, async (req: any, res) => {
    try {
      const { paymentId } = req.params;
      
      if (!paymentId || paymentId.length < 1) {
        return res.status(400).json({ message: "Payment ID is required" });
      }
      
      // Verify payment exists before fetching evidence
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      const evidence = await storage.getPaymentEvidenceByPayment(paymentId);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching payment evidence:", error);
      res.status(500).json({ message: "Failed to fetch payment evidence" });
    }
  });

  // Get ALL evidence records for a specific invoice (across all payments)
  app.get('/api/invoice-evidence/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      
      if (!invoiceId || invoiceId.length < 1) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }
      
      // Verify invoice exists before fetching evidence
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const evidence = await storage.getPaymentEvidenceByInvoice(invoiceId);
      
      // Aggregate summary
      const evidenceCount = evidence.length;
      const evidenceTotalAmount = evidence.reduce((sum, e) => sum + (e.amount || 0), 0);
      const evidenceReferences = evidence
        .map(e => e.referenceNumber)
        .filter(Boolean)
        .join(', ');
      const evidenceModes = [...new Set(evidence.map(e => e.paymentMode).filter(Boolean))].join(', ');
      
      res.json({
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        summary: {
          count: evidenceCount,
          totalAmount: evidenceTotalAmount,
          references: evidenceReferences || null,
          paymentModes: evidenceModes || null,
        },
        records: evidence,
      });
    } catch (error) {
      console.error("Error fetching invoice evidence:", error);
      res.status(500).json({ message: "Failed to fetch invoice evidence" });
    }
  });

  // Update evidence status (for manual reconciliation)
  app.patch('/api/payment-evidence/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      if (!id || id.length < 1) {
        return res.status(400).json({ message: "Evidence ID is required" });
      }
      
      const { matchStatus, parentPaymentId, matchConfidence } = req.body;
      
      // Validate matchStatus if provided
      if (matchStatus && !['matched', 'orphan', 'manual'].includes(matchStatus)) {
        return res.status(400).json({ message: "Invalid match status" });
      }
      
      const updatedEvidence = await storage.updatePaymentEvidence(id, {
        matchStatus,
        parentPaymentId,
        matchConfidence
      });
      
      if (!updatedEvidence) {
        return res.status(404).json({ message: "Evidence record not found" });
      }
      
      await logAudit(req.user?.id, 'UPDATE', 'payment_evidence', id, `Updated evidence status to ${matchStatus}`);
      res.json(updatedEvidence);
    } catch (error) {
      console.error("Error updating payment evidence:", error);
      res.status(500).json({ message: "Failed to update payment evidence" });
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
      
      // Fetch invoice to get customer name
      const invoice = await storage.getInvoice(header.invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Validate header with customerName from invoice
      const validatedHeader = insertSalesReturnSchema.parse({
        ...header,
        customerName: invoice.buyerName,
        createdBy: req.user?.id,
      });
      
      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one return item is required" });
      }
      
      // Server-side max quantity validation: fetch invoice items and validate quantities
      const invoiceItemsList = await storage.getInvoiceItems(header.invoiceId);
      const invoiceItemMap = new Map<string, number>();
      invoiceItemsList.forEach((ii: any) => {
        invoiceItemMap.set(ii.productId, ii.quantity);
      });
      
      for (const item of items) {
        const maxQty = invoiceItemMap.get(item.productId) || 0;
        if (item.quantityReturned > maxQty) {
          return res.status(400).json({ 
            message: `Cannot return more than invoiced quantity for product ${item.productName || item.productId}. Max: ${maxQty}, Requested: ${item.quantityReturned}` 
          });
        }
        if (item.quantityReturned < 1) {
          return res.status(400).json({ 
            message: `Quantity must be at least 1 for product ${item.productName || item.productId}` 
          });
        }
      }
      
      // Create return header using storage
      const salesReturn = await storage.createSalesReturn(validatedHeader);
      
      // Create return items using storage
      for (const item of items) {
        // Calculate creditAmount if not provided: creditAmount = quantityReturned * unitPrice
        const creditAmount = item.creditAmount ?? (item.quantityReturned * (item.unitPrice || 0));
        
        const validatedItem = insertSalesReturnItemSchema.parse({
          ...item,
          returnId: salesReturn.id,
          creditAmount,
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

  // Mark return as received - allow create OR edit for workflow progression
  app.patch('/api/sales-returns/:id/receive', async (req: any, res) => {
    try {
      // Manual permission check - allow create OR edit for workflow progression
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ message: "Forbidden: No role assigned" });
      }
      
      const role = await storage.getUserRole(user.roleId);
      if (!role) {
        return res.status(403).json({ message: "Forbidden: Invalid role" });
      }
      
      // Check database permissions - allow create OR edit for workflow progression
      const permission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'sales_returns'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      
      if (permission.length === 0 || (permission[0].canCreate !== 1 && permission[0].canEdit !== 1)) {
        return res.status(403).json({ message: "Forbidden: Requires create or edit permission" });
      }
      
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

  // Inspect return and update inventory - allow create OR edit for workflow progression
  app.patch('/api/sales-returns/:id/inspect', async (req: any, res) => {
    try {
      // Manual permission check - allow create OR edit for workflow progression
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ message: "Forbidden: No role assigned" });
      }
      
      const role = await storage.getUserRole(user.roleId);
      if (!role) {
        return res.status(403).json({ message: "Forbidden: Invalid role" });
      }
      
      // Check database permissions - allow create OR edit for workflow progression
      const permission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'sales_returns'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      
      if (permission.length === 0 || (permission[0].canCreate !== 1 && permission[0].canEdit !== 1)) {
        return res.status(403).json({ message: "Forbidden: Requires create or edit permission" });
      }
      
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
        // Group inspections by itemId to track overall disposition per item
        const itemDispositions: Record<string, string[]> = {};
        
        // Process each inspection entry (supports split quantities across dispositions)
        for (const inspection of inspections) {
          // Track dispositions per item for updating the salesReturnItems record
          if (!itemDispositions[inspection.itemId]) {
            itemDispositions[inspection.itemId] = [];
          }
          itemDispositions[inspection.itemId].push(inspection.disposition);
          
          // Get the return item details
          const [item] = await tx.select().from(salesReturnItems)
            .where(eq(salesReturnItems.id, inspection.itemId));
          
          if (!item) continue;
          
          // Use the quantity from the inspection (for split dispositions) or fall back to item quantity
          const processQty = inspection.quantity || item.quantityReturned;
          
          // Get product details
          const [product] = await tx.select().from(products)
            .where(eq(products.id, item.productId));
          
          // Update inventory based on disposition
          if (inspection.disposition === 'restock' && inspection.condition === 'good') {
            // Return good items to finished goods inventory
            if (product) {
              await tx.insert(finishedGoods).values([{
                productId: item.productId,
                batchNumber: `${item.batchNumber || 'RETURN'}-RETURNED`,
                productionDate: new Date().toISOString(),
                quantity: processQty,
                qualityStatus: 'approved',
                remarks: `Returned goods from sales return - Good condition`,
                createdBy: req.user?.id,
              }]);
              console.log(`[INVENTORY] Restocked ${processQty} units of product ${item.productId} (Sales Return - Good condition)`);
            } else {
              console.warn(`[INVENTORY] Skipping restock for product ${item.productId} - product not found in master data`);
            }
          } else if (inspection.disposition === 'repack') {
            // Items needing repacking - add to finished goods with 'pending' quality status
            if (product) {
              await tx.insert(finishedGoods).values([{
                productId: item.productId,
                batchNumber: `${item.batchNumber || 'RETURN'}-REPACK`,
                productionDate: new Date().toISOString(),
                quantity: processQty,
                qualityStatus: 'pending', // Pending until repacked
                remarks: `Returned goods - Needs repacking before sale`,
                createdBy: req.user?.id,
              }]);
              console.log(`[INVENTORY] Added ${processQty} units of product ${item.productId} for repacking (Sales Return)`);
            } else {
              console.warn(`[INVENTORY] Skipping repack for product ${item.productId} - product not found in master data`);
            }
          } else if (inspection.disposition === 'scrap' || inspection.condition === 'damaged') {
            // Create damaged inventory record AND scrap inventory record for loss tracking
            if (product) {
              // Create rejected finished goods record
              await tx.insert(finishedGoods).values([{
                productId: item.productId,
                batchNumber: `${item.batchNumber || 'RETURN'}-DAMAGED`,
                productionDate: new Date().toISOString(),
                quantity: processQty,
                qualityStatus: 'rejected',
                remarks: `Returned goods - Damaged/Scrapped`,
                createdBy: req.user?.id,
              }]);
              
              // Generate scrap number with atomic sequence
              const today = format(new Date(), 'yyyyMMdd');
              const scrapCountResult = await tx.execute(sql`
                SELECT COALESCE(MAX(CAST(SUBSTRING(scrap_number FROM 15 FOR 3) AS INTEGER)), 0) + 1 as next_seq
                FROM scrap_inventory 
                WHERE scrap_number LIKE ${'SCRAP-' + today + '-%'}
                FOR UPDATE
              `);
              const seq = scrapCountResult.rows?.[0]?.next_seq || 1;
              const scrapNumber = `SCRAP-${today}-${String(seq).padStart(3, '0')}`;
              
              // Calculate costs with robust fallback to prevent NaN
              let unitCost = 0;
              const sellingPrice = item.unitPrice || 0;
              
              if (item.unitCost && item.unitCost > 0) {
                unitCost = item.unitCost;
              } else if (sellingPrice > 0) {
                unitCost = Math.round(sellingPrice * 0.6); // Assume 40% margin
              } else if (product.costPrice && product.costPrice > 0) {
                unitCost = product.costPrice;
              }
              
              const totalCostValue = unitCost * processQty;
              const totalSellingValue = sellingPrice * processQty;
              
              // Create scrap inventory record for loss tracking
              await tx.insert(scrapInventory).values({
                scrapNumber,
                scrapDate: new Date().toISOString(),
                salesReturnId: id,
                salesReturnItemId: item.id,
                invoiceId: salesReturn.invoiceId,
                productId: item.productId,
                productName: product.name,
                batchNumber: item.batchNumber,
                quantity: processQty,
                unitCost,
                sellingPrice,
                totalCostValue,
                totalSellingValue,
                lossAmount: totalCostValue,
                damageReason: inspection.damageReason || item.damageReason || 'other',
                conditionDescription: inspection.conditionDescription || item.remarks,
                damageEvidenceUrl: item.damageEvidenceUrl,
                approvalStatus: 'pending',
                createdBy: req.user?.id,
              });
              
              console.log(`[INVENTORY] Recorded ${processQty} damaged units of product ${item.productId} (Sales Return)`);
              console.log(`[SCRAP] Created scrap record ${scrapNumber} with loss amount ${totalCostValue / 100} INR`);
            } else {
              console.warn(`[INVENTORY] Skipping damaged goods record for product ${item.productId} - product not found in master data`);
            }
          }
        }
        
        // Update salesReturnItems with the primary disposition (or 'mixed' if multiple)
        for (const [itemId, dispositions] of Object.entries(itemDispositions)) {
          const uniqueDispositions = [...new Set(dispositions)];
          const primaryDisposition = uniqueDispositions.length > 1 ? 'mixed' : uniqueDispositions[0];
          const hasScrap = dispositions.includes('scrap');
          const hasGood = dispositions.includes('restock');
          const condition = hasScrap && hasGood ? 'mixed' : (hasScrap ? 'damaged' : 'good');
          
          await tx.update(salesReturnItems)
            .set({
              conditionOnReceipt: condition,
              disposition: primaryDisposition,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(salesReturnItems.id, itemId));
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
              // Handle null/undefined tax rates for old/ported invoices
              const safeCgstRate = invoiceItem.cgstRate || 0;
              const safeSgstRate = invoiceItem.sgstRate || 0;
              const safeIgstRate = invoiceItem.igstRate || 0;
              
              const itemCgst = Math.round(itemSubtotal * safeCgstRate / 10000); // cgstRate is in basis points
              const itemSgst = Math.round(itemSubtotal * safeSgstRate / 10000); // sgstRate is in basis points
              
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
                cgstRate: safeCgstRate,
                cgstAmount: itemCgst,
                sgstRate: safeSgstRate,
                sgstAmount: itemSgst,
                igstRate: safeIgstRate,
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

  // Delete sales return (soft delete)
  app.delete('/api/sales-returns/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Check if sales return exists
      const salesReturn = await storage.getSalesReturn(id);
      if (!salesReturn) {
        return res.status(404).json({ message: "Sales return not found" });
      }
      
      // Only allow deletion of pending returns (not yet received/inspected)
      if (salesReturn.status !== 'pending_receipt' && salesReturn.status !== 'pending') {
        return res.status(400).json({ 
          message: "Cannot delete sales return that has been received or inspected. Only pending returns can be deleted." 
        });
      }
      
      // Soft delete the return and its items
      await storage.deleteSalesReturn(id);
      
      // Also soft delete the items
      const items = await storage.getSalesReturnItems(id);
      for (const item of items) {
        await storage.deleteSalesReturnItem(item.id);
      }
      
      await logAudit(req.user?.id, 'DELETE', 'sales_returns', id, `Deleted sales return ${salesReturn.returnNumber}`);
      res.json({ message: "Sales return deleted successfully" });
    } catch (error) {
      console.error("Error deleting sales return:", error);
      res.status(500).json({ message: "Failed to delete sales return" });
    }
  });

  // ============ SCRAP INVENTORY API ============
  // Get all scrap inventory records with optional filters (manager+ only)
  app.get('/api/scrap-inventory', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res) => {
    try {
      const { startDate, endDate, approvalStatus, productId } = req.query;
      
      let query = db.select().from(scrapInventory)
        .where(eq(scrapInventory.recordStatus, 1))
        .orderBy(desc(scrapInventory.scrapDate));
      
      // Apply filters if provided
      const conditions = [eq(scrapInventory.recordStatus, 1)];
      
      if (startDate) {
        conditions.push(gte(scrapInventory.scrapDate, new Date(startDate as string).toISOString()));
      }
      if (endDate) {
        conditions.push(lte(scrapInventory.scrapDate, new Date(endDate as string).toISOString()));
      }
      if (approvalStatus && approvalStatus !== 'all') {
        conditions.push(eq(scrapInventory.approvalStatus, approvalStatus as string));
      }
      if (productId) {
        conditions.push(eq(scrapInventory.productId, productId as string));
      }
      
      const scrapRecords = await db.select()
        .from(scrapInventory)
        .where(and(...conditions))
        .orderBy(desc(scrapInventory.scrapDate));
      
      res.json(scrapRecords);
    } catch (error) {
      console.error("Error fetching scrap inventory:", error);
      res.status(500).json({ message: "Failed to fetch scrap inventory" });
    }
  });

  // Get scrap inventory summary/report for month-end loss calculation (manager+ only)
  app.get('/api/scrap-inventory/report', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res) => {
    try {
      const { month, year } = req.query;
      
      // Default to current month/year if not provided
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      
      // Get scrap records for the month
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
      
      const scrapRecords = await db.select()
        .from(scrapInventory)
        .where(and(
          eq(scrapInventory.recordStatus, 1),
          gte(scrapInventory.scrapDate, startDate.toISOString()),
          lte(scrapInventory.scrapDate, endDate.toISOString())
        ))
        .orderBy(desc(scrapInventory.scrapDate));
      
      // Calculate summary
      const summary = {
        totalRecords: scrapRecords.length,
        totalQuantity: scrapRecords.reduce((sum, r) => sum + r.quantity, 0),
        totalCostValue: scrapRecords.reduce((sum, r) => sum + (r.totalCostValue || 0), 0),
        totalSellingValue: scrapRecords.reduce((sum, r) => sum + (r.totalSellingValue || 0), 0),
        totalLossAmount: scrapRecords.reduce((sum, r) => sum + (r.lossAmount || 0), 0),
        totalGstReversal: scrapRecords.reduce((sum, r) => sum + (r.gstReversal || 0), 0),
        totalDisposalValue: scrapRecords.reduce((sum, r) => sum + (r.disposalValue || 0), 0),
        netLoss: 0, // Will be calculated
        byApprovalStatus: {
          pending: scrapRecords.filter(r => r.approvalStatus === 'pending').length,
          approved: scrapRecords.filter(r => r.approvalStatus === 'approved').length,
          rejected: scrapRecords.filter(r => r.approvalStatus === 'rejected').length,
        },
        byDamageReason: {} as Record<string, { count: number, lossAmount: number }>,
        byProduct: {} as Record<string, { productName: string, count: number, quantity: number, lossAmount: number }>,
      };
      
      // Net loss = total cost value - disposal recovery
      summary.netLoss = summary.totalLossAmount - summary.totalDisposalValue;
      
      // Group by damage reason
      scrapRecords.forEach(r => {
        const reason = r.damageReason || 'other';
        if (!summary.byDamageReason[reason]) {
          summary.byDamageReason[reason] = { count: 0, lossAmount: 0 };
        }
        summary.byDamageReason[reason].count++;
        summary.byDamageReason[reason].lossAmount += r.lossAmount || 0;
      });
      
      // Group by product
      scrapRecords.forEach(r => {
        const productId = r.productId;
        if (!summary.byProduct[productId]) {
          summary.byProduct[productId] = { productName: r.productName, count: 0, quantity: 0, lossAmount: 0 };
        }
        summary.byProduct[productId].count++;
        summary.byProduct[productId].quantity += r.quantity;
        summary.byProduct[productId].lossAmount += r.lossAmount || 0;
      });
      
      res.json({
        month: targetMonth,
        year: targetYear,
        summary,
        records: scrapRecords,
      });
    } catch (error) {
      console.error("Error generating scrap report:", error);
      res.status(500).json({ message: "Failed to generate scrap report" });
    }
  });

  // Get specific scrap record (manager+ only)
  app.get('/api/scrap-inventory/:id', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const [scrap] = await db.select()
        .from(scrapInventory)
        .where(and(
          eq(scrapInventory.id, id),
          eq(scrapInventory.recordStatus, 1)
        ))
        .limit(1);
      
      if (!scrap) {
        return res.status(404).json({ message: "Scrap record not found" });
      }
      
      res.json(scrap);
    } catch (error) {
      console.error("Error fetching scrap record:", error);
      res.status(500).json({ message: "Failed to fetch scrap record" });
    }
  });

  // Approve/reject scrap record
  app.patch('/api/scrap-inventory/:id/approve', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { action, remarks } = req.body; // action: 'approve' or 'reject'
      
      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
      }
      
      const [scrap] = await db.select()
        .from(scrapInventory)
        .where(and(
          eq(scrapInventory.id, id),
          eq(scrapInventory.recordStatus, 1)
        ))
        .limit(1);
      
      if (!scrap) {
        return res.status(404).json({ message: "Scrap record not found" });
      }
      
      if (scrap.approvalStatus !== 'pending') {
        return res.status(400).json({ message: `Scrap record is already ${scrap.approvalStatus}` });
      }
      
      const [updated] = await db.update(scrapInventory)
        .set({
          approvalStatus: action === 'approve' ? 'approved' : 'rejected',
          approvedBy: req.user?.id,
          approvalDate: new Date().toISOString(),
          approvalRemarks: remarks || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(scrapInventory.id, id))
        .returning();
      
      await logAudit(req.user?.id, 'UPDATE', 'scrap_inventory', id, `${action === 'approve' ? 'Approved' : 'Rejected'} scrap record ${scrap.scrapNumber}`);
      
      res.json({ message: `Scrap record ${action === 'approve' ? 'approved' : 'rejected'} successfully`, scrap: updated });
    } catch (error) {
      console.error("Error approving scrap record:", error);
      res.status(500).json({ message: "Failed to approve scrap record" });
    }
  });

  // Update scrap disposal details
  app.patch('/api/scrap-inventory/:id/dispose', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { disposalMethod, disposalValue, remarks } = req.body;
      
      const [scrap] = await db.select()
        .from(scrapInventory)
        .where(and(
          eq(scrapInventory.id, id),
          eq(scrapInventory.recordStatus, 1)
        ))
        .limit(1);
      
      if (!scrap) {
        return res.status(404).json({ message: "Scrap record not found" });
      }
      
      if (scrap.approvalStatus !== 'approved') {
        return res.status(400).json({ message: "Scrap record must be approved before disposal" });
      }
      
      const [updated] = await db.update(scrapInventory)
        .set({
          processedStatus: 'disposed',
          processedDate: new Date().toISOString(),
          disposalMethod: disposalMethod || 'disposed',
          disposalValue: disposalValue || 0,
          remarks: remarks || scrap.remarks,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(scrapInventory.id, id))
        .returning();
      
      await logAudit(req.user?.id, 'UPDATE', 'scrap_inventory', id, `Disposed scrap ${scrap.scrapNumber} via ${disposalMethod}, recovered ${(disposalValue || 0) / 100} INR`);
      
      res.json({ message: "Scrap disposal recorded successfully", scrap: updated });
    } catch (error) {
      console.error("Error recording scrap disposal:", error);
      res.status(500).json({ message: "Failed to record scrap disposal" });
    }
  });

  // Configure multer for scrap evidence uploads (disk storage)
  const scrapEvidenceDir = path.join(process.cwd(), 'uploads', 'scrap-evidence');
  if (!fs.existsSync(scrapEvidenceDir)) {
    fs.mkdirSync(scrapEvidenceDir, { recursive: true });
  }
  
  const scrapEvidenceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, scrapEvidenceDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `scrap-${uniqueSuffix}${ext}`);
    }
  });
  
  const scrapEvidenceUpload = multer({
    storage: scrapEvidenceStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for photos
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
      }
    }
  });

  // Upload damage evidence photo for scrap record
  app.post('/api/scrap-inventory/:id/evidence', requireRole('admin', 'manager'), scrapEvidenceUpload.single('photo'), async (req: any, res) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }
      
      // Secondary MIME type validation (defense in depth)
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        try { fs.promises.unlink(req.file.path).catch(() => {}); } catch {}
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, and WebP are allowed" });
      }
      
      const [scrap] = await db.select()
        .from(scrapInventory)
        .where(and(
          eq(scrapInventory.id, id),
          eq(scrapInventory.recordStatus, 1)
        ))
        .limit(1);
      
      if (!scrap) {
        // Clean up uploaded file asynchronously
        fs.promises.unlink(req.file.path).catch((err) => console.error("Failed to cleanup orphan upload:", err));
        return res.status(404).json({ message: "Scrap record not found" });
      }
      
      // Delete old evidence file asynchronously if exists
      if (scrap.damageEvidenceUrl) {
        const oldFilename = scrap.damageEvidenceUrl.split('/').pop();
        if (oldFilename && /^scrap-\d+-\d+\.(jpg|jpeg|png|webp)$/i.test(oldFilename)) {
          const oldPath = path.join(scrapEvidenceDir, oldFilename);
          fs.promises.unlink(oldPath).catch((err) => {
            if (err.code !== 'ENOENT') console.error("Failed to delete old evidence:", err);
          });
        }
      }
      
      // Store relative URL for serving
      const evidenceUrl = `/api/scrap-evidence/${req.file.filename}`;
      
      const [updated] = await db.update(scrapInventory)
        .set({
          damageEvidenceUrl: evidenceUrl,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(scrapInventory.id, id))
        .returning();
      
      await logAudit(req.user?.id, 'UPDATE', 'scrap_inventory', id, `Uploaded damage evidence for ${scrap.scrapNumber}`);
      
      res.json({ message: "Damage evidence uploaded successfully", evidenceUrl, scrap: updated });
    } catch (error) {
      console.error("Error uploading scrap evidence:", error);
      res.status(500).json({ message: "Failed to upload damage evidence" });
    }
  });

  // Serve scrap evidence photos (authenticated access)
  app.get('/api/scrap-evidence/:filename', isAuthenticated, (req: any, res) => {
    try {
      const { filename } = req.params;
      
      // Security: validate filename format to prevent path traversal
      if (!filename || !/^scrap-\d+-\d+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
        return res.status(400).json({ message: 'Invalid filename format' });
      }
      
      const filePath = path.join(scrapEvidenceDir, filename);
      
      // Security: verify file exists and is within allowed directory
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Photo not found' });
      }
      
      // Security: ensure resolved path is still within uploads directory
      const resolvedPath = fs.realpathSync(filePath);
      const resolvedDir = fs.realpathSync(scrapEvidenceDir);
      if (!resolvedPath.startsWith(resolvedDir)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Set appropriate cache headers
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error("Error serving scrap evidence:", error);
      res.status(500).json({ message: 'Failed to retrieve photo' });
    }
  });

  // Customer Advances API - Track advance payments before invoicing
  // Get all customer advances with optional filters
  app.get('/api/customer-advances', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId, status, page, pageSize } = req.query;
      
      // Build query with filters
      let conditions: any[] = [eq(customerAdvances.recordStatus, 1)];
      
      if (vendorId) {
        conditions.push(eq(customerAdvances.vendorId, vendorId as string));
      }
      if (status && status !== 'all') {
        conditions.push(eq(customerAdvances.status, status as string));
      }
      
      // Get advances with vendor info
      const advances = await db.select({
        id: customerAdvances.id,
        advanceNumber: customerAdvances.advanceNumber,
        vendorId: customerAdvances.vendorId,
        vendorName: vendors.vendorName,
        receiptDate: customerAdvances.receiptDate,
        amount: customerAdvances.amount,
        usedAmount: customerAdvances.usedAmount,
        paymentMethod: customerAdvances.paymentMethod,
        referenceNumber: customerAdvances.referenceNumber,
        bankName: customerAdvances.bankName,
        status: customerAdvances.status,
        purpose: customerAdvances.purpose,
        remarks: customerAdvances.remarks,
        receivedBy: customerAdvances.receivedBy,
        cancelledAt: customerAdvances.cancelledAt,
        cancellationRemarks: customerAdvances.cancellationRemarks,
        createdAt: customerAdvances.createdAt,
      })
      .from(customerAdvances)
      .leftJoin(vendors, eq(customerAdvances.vendorId, vendors.id))
      .where(and(...conditions))
      .orderBy(desc(customerAdvances.receiptDate));
      
      // Add balance calculation
      const advancesWithBalance = advances.map(adv => ({
        ...adv,
        availableBalance: adv.amount - adv.usedAmount,
      }));
      
      // Handle pagination if requested
      if (page !== undefined && pageSize !== undefined) {
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 25));
        const totalItems = advancesWithBalance.length;
        const totalPages = Math.ceil(totalItems / pageSizeNum);
        const startIndex = (pageNum - 1) * pageSizeNum;
        const paginatedData = advancesWithBalance.slice(startIndex, startIndex + pageSizeNum);
        
        return res.json({
          data: paginatedData,
          meta: { page: pageNum, pageSize: pageSizeNum, totalItems, totalPages },
        });
      }
      
      res.json(advancesWithBalance);
    } catch (error) {
      console.error("Error fetching customer advances:", error);
      res.status(500).json({ message: "Failed to fetch customer advances" });
    }
  });

  // Get advance balance for a specific vendor
  app.get('/api/customer-advances/vendor/:vendorId/balance', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      
      const advances = await db.select({
        amount: customerAdvances.amount,
        usedAmount: customerAdvances.usedAmount,
      })
      .from(customerAdvances)
      .where(and(
        eq(customerAdvances.vendorId, vendorId),
        eq(customerAdvances.status, 'active'),
        eq(customerAdvances.recordStatus, 1)
      ));
      
      const totalAdvance = advances.reduce((sum, adv) => sum + adv.amount, 0);
      const totalUsed = advances.reduce((sum, adv) => sum + adv.usedAmount, 0);
      const availableBalance = totalAdvance - totalUsed;
      
      res.json({ 
        vendorId, 
        totalAdvance, 
        totalUsed, 
        availableBalance,
        hasAdvance: availableBalance > 0,
      });
    } catch (error) {
      console.error("Error fetching vendor advance balance:", error);
      res.status(500).json({ message: "Failed to fetch vendor advance balance" });
    }
  });

  // Get single customer advance with details
  app.get('/api/customer-advances/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [advance] = await db.select({
        id: customerAdvances.id,
        advanceNumber: customerAdvances.advanceNumber,
        vendorId: customerAdvances.vendorId,
        vendorName: vendors.vendorName,
        receiptDate: customerAdvances.receiptDate,
        amount: customerAdvances.amount,
        usedAmount: customerAdvances.usedAmount,
        paymentMethod: customerAdvances.paymentMethod,
        referenceNumber: customerAdvances.referenceNumber,
        bankName: customerAdvances.bankName,
        status: customerAdvances.status,
        purpose: customerAdvances.purpose,
        remarks: customerAdvances.remarks,
        receivedBy: customerAdvances.receivedBy,
        createdAt: customerAdvances.createdAt,
      })
      .from(customerAdvances)
      .leftJoin(vendors, eq(customerAdvances.vendorId, vendors.id))
      .where(and(eq(customerAdvances.id, id), eq(customerAdvances.recordStatus, 1)));
      
      if (!advance) {
        return res.status(404).json({ message: "Customer advance not found" });
      }
      
      // Get applications for this advance
      const applications = await db.select({
        id: advanceApplications.id,
        invoiceId: advanceApplications.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        appliedAmount: advanceApplications.appliedAmount,
        applicationDate: advanceApplications.applicationDate,
        remarks: advanceApplications.remarks,
        reversedAt: advanceApplications.reversedAt,
        createdAt: advanceApplications.createdAt,
      })
      .from(advanceApplications)
      .leftJoin(invoices, eq(advanceApplications.invoiceId, invoices.id))
      .where(and(
        eq(advanceApplications.advanceId, id),
        eq(advanceApplications.recordStatus, 1)
      ))
      .orderBy(desc(advanceApplications.applicationDate));
      
      res.json({
        ...advance,
        availableBalance: advance.amount - advance.usedAmount,
        applications,
      });
    } catch (error) {
      console.error("Error fetching customer advance:", error);
      res.status(500).json({ message: "Failed to fetch customer advance" });
    }
  });

  // Create new customer advance
  app.post('/api/customer-advances', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res) => {
    try {
      // Generate advance number
      const today = format(new Date(), 'yyyyMMdd');
      const existingCount = await db.select({ count: sql<number>`count(*)` })
        .from(customerAdvances)
        .where(sql`${customerAdvances.advanceNumber} LIKE ${'ADV-' + today + '%'}`);
      const seq = (existingCount[0]?.count || 0) + 1;
      const advanceNumber = `ADV-${today}-${String(seq).padStart(3, '0')}`;
      
      const validatedData = insertCustomerAdvanceSchema.parse({
        ...req.body,
        receivedBy: req.user?.id,
      });
      
      const [created] = await db.insert(customerAdvances).values({
        ...validatedData,
        advanceNumber,
        usedAmount: 0,
        status: 'active',
      }).returning();
      
      await logAudit(req.user?.id, 'CREATE', 'customer_advances', created.id, 
        `Created advance ${advanceNumber} for ₹${(created.amount / 100).toFixed(2)}`);
      
      res.json({ advance: created, message: "Advance payment recorded successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating customer advance:", error);
      res.status(500).json({ message: "Failed to create customer advance" });
    }
  });

  // Apply advance to invoice
  app.post('/api/customer-advances/:id/apply', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { invoiceId, amount, remarks } = req.body;
      
      if (!invoiceId || !amount) {
        return res.status(400).json({ message: "Invoice ID and amount are required" });
      }
      
      const amountPaise = parseInt(amount);
      if (isNaN(amountPaise) || amountPaise <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      
      // Use transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Get advance with lock
        const [advance] = await tx.select().from(customerAdvances)
          .where(and(eq(customerAdvances.id, id), eq(customerAdvances.recordStatus, 1)))
          .for('update');
        
        if (!advance) {
          throw new Error("Advance not found");
        }
        
        if (advance.status === 'cancelled') {
          throw new Error("Cannot apply cancelled advance");
        }
        
        const availableBalance = advance.amount - advance.usedAmount;
        if (amountPaise > availableBalance) {
          throw new Error(`Insufficient advance balance. Available: ₹${(availableBalance / 100).toFixed(2)}`);
        }
        
        // Get invoice
        const [invoice] = await tx.select().from(invoices)
          .where(eq(invoices.id, invoiceId));
        
        if (!invoice) {
          throw new Error("Invoice not found");
        }
        
        // Check invoice belongs to same vendor
        if (invoice.vendorId !== advance.vendorId) {
          throw new Error("Invoice does not belong to the same customer as the advance");
        }
        
        // Create payment record
        const [payment] = await tx.insert(invoicePayments).values({
          invoiceId,
          paymentDate: new Date().toISOString(),
          amount: amountPaise,
          paymentMethod: 'Advance',
          paymentType: 'Advance',
          referenceNumber: advance.advanceNumber,
          bankName: null,
          remarks: remarks || `Applied from advance ${advance.advanceNumber}`,
          recordedBy: req.user?.id,
        }).returning();
        
        // Create application record
        const [application] = await tx.insert(advanceApplications).values({
          advanceId: id,
          invoiceId,
          invoicePaymentId: payment.id,
          appliedAmount: amountPaise,
          applicationDate: format(new Date(), 'yyyy-MM-dd'),
          appliedBy: req.user?.id,
          remarks,
        }).returning();
        
        // Update advance used amount
        const newUsedAmount = advance.usedAmount + amountPaise;
        const newStatus = newUsedAmount >= advance.amount ? 'fully_used' : 'active';
        
        await tx.update(customerAdvances)
          .set({ 
            usedAmount: newUsedAmount, 
            status: newStatus,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(customerAdvances.id, id));
        
        return { payment, application, advance };
      });
      
      await logAudit(req.user?.id, 'CREATE', 'advance_applications', result.application.id,
        `Applied ₹${(amountPaise / 100).toFixed(2)} from advance ${result.advance.advanceNumber} to invoice ${invoiceId}`);
      
      res.json({ 
        application: result.application, 
        payment: result.payment,
        message: "Advance applied successfully" 
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error applying advance:", error);
      res.status(500).json({ message: "Failed to apply advance" });
    }
  });

  // Cancel customer advance
  app.post('/api/customer-advances/:id/cancel', requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      
      const [advance] = await db.select().from(customerAdvances)
        .where(and(eq(customerAdvances.id, id), eq(customerAdvances.recordStatus, 1)));
      
      if (!advance) {
        return res.status(404).json({ message: "Advance not found" });
      }
      
      if (advance.usedAmount > 0) {
        return res.status(400).json({ 
          message: "Cannot cancel advance that has been partially or fully used" 
        });
      }
      
      const [updated] = await db.update(customerAdvances)
        .set({
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancellationRemarks: remarks,
          cancelledBy: req.user?.id,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(customerAdvances.id, id))
        .returning();
      
      await logAudit(req.user?.id, 'UPDATE', 'customer_advances', id, 
        `Cancelled advance ${advance.advanceNumber}`);
      
      res.json({ advance: updated, message: "Advance cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling advance:", error);
      res.status(500).json({ message: "Failed to cancel advance" });
    }
  });

  // Get advances available for a specific vendor (for invoice creation)
  app.get('/api/customer-advances/available/:vendorId', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      
      const advances = await db.select({
        id: customerAdvances.id,
        advanceNumber: customerAdvances.advanceNumber,
        receiptDate: customerAdvances.receiptDate,
        amount: customerAdvances.amount,
        usedAmount: customerAdvances.usedAmount,
        paymentMethod: customerAdvances.paymentMethod,
        referenceNumber: customerAdvances.referenceNumber,
        purpose: customerAdvances.purpose,
      })
      .from(customerAdvances)
      .where(and(
        eq(customerAdvances.vendorId, vendorId),
        eq(customerAdvances.status, 'active'),
        eq(customerAdvances.recordStatus, 1)
      ))
      .orderBy(customerAdvances.receiptDate);
      
      // Filter to only those with available balance
      const availableAdvances = advances
        .map(adv => ({
          ...adv,
          availableBalance: adv.amount - adv.usedAmount,
        }))
        .filter(adv => adv.availableBalance > 0);
      
      const totalAvailable = availableAdvances.reduce((sum, adv) => sum + adv.availableBalance, 0);
      
      res.json({
        advances: availableAdvances,
        totalAvailable,
        count: availableAdvances.length,
      });
    } catch (error) {
      console.error("Error fetching available advances:", error);
      res.status(500).json({ message: "Failed to fetch available advances" });
    }
  });

  // Credit Notes API
  // Get all credit notes with buyer/seller details for GST compliance
  app.get('/api/credit-notes', isAuthenticated, async (req: any, res) => {
    try {
      // Seller details - hardcoded for now (can be moved to settings table later)
      const sellerName = 'KINTO Operations';
      const sellerAddress = 'Karnataka, India';
      const sellerGstin = '';
      const sellerStateCode = '29';
      
      // Fetch credit notes with invoice details first
      const creditNotesData = await db
        .select({
          id: creditNotes.id,
          noteNumber: creditNotes.noteNumber,
          invoiceId: creditNotes.invoiceId,
          vendorId: creditNotes.vendorId,
          salesReturnId: creditNotes.salesReturnId,
          creditDate: creditNotes.creditDate,
          reason: creditNotes.reason,
          status: creditNotes.status,
          subtotal: creditNotes.subtotal,
          cgstAmount: creditNotes.cgstAmount,
          sgstAmount: creditNotes.sgstAmount,
          igstAmount: creditNotes.igstAmount,
          grandTotal: creditNotes.grandTotal,
          notes: creditNotes.notes,
          issuedBy: creditNotes.issuedBy,
          createdAt: creditNotes.createdAt,
          invoiceNumber: invoices.invoiceNumber,
          invoiceBuyerName: invoices.buyerName,
        })
        .from(creditNotes)
        .leftJoin(invoices, eq(creditNotes.invoiceId, invoices.id))
        .where(eq(creditNotes.recordStatus, 1))
        .orderBy(desc(creditNotes.createdAt));
      
      // Fetch all vendors for lookup (by name since invoices store buyerName)
      const allVendors = await storage.getAllVendors();
      const vendorByIdMap = new Map(allVendors.map(v => [v.id, v]));
      const vendorByNameMap = new Map(allVendors.map(v => [v.vendorName, v]));
      
      // Enrich with vendor details
      const creditNotesWithDetails = creditNotesData.map(cn => {
        // Use vendorId if available, otherwise lookup by invoice buyerName
        let vendor = cn.vendorId ? vendorByIdMap.get(cn.vendorId) : null;
        if (!vendor && cn.invoiceBuyerName) {
          vendor = vendorByNameMap.get(cn.invoiceBuyerName);
        }
        return {
          id: cn.id,
          noteNumber: cn.noteNumber,
          invoiceId: cn.invoiceId,
          vendorId: cn.vendorId,
          salesReturnId: cn.salesReturnId,
          creditDate: cn.creditDate,
          reason: cn.reason,
          status: cn.status,
          subtotal: cn.subtotal,
          cgstAmount: cn.cgstAmount,
          sgstAmount: cn.sgstAmount,
          igstAmount: cn.igstAmount,
          grandTotal: cn.grandTotal,
          notes: cn.notes,
          issuedBy: cn.issuedBy,
          createdAt: cn.createdAt,
          invoiceNumber: cn.invoiceNumber,
          buyerName: vendor?.vendorName || cn.invoiceBuyerName || null,
          buyerAddress: vendor?.address || null,
          buyerGstin: vendor?.gstNumber || null,
          buyerState: vendor?.state || null,
        };
      });
      
      // Add seller details to each credit note
      const enrichedCreditNotes = creditNotesWithDetails.map(cn => ({
        ...cn,
        sellerName,
        sellerAddress,
        sellerGstin,
        sellerStateCode,
      }));
      
      res.json(enrichedCreditNotes);
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

  // Get credit note items with product names for printing
  app.get('/api/credit-note-items', isAuthenticated, async (req: any, res) => {
    try {
      const { creditNoteId } = req.query;
      if (!creditNoteId) {
        return res.status(400).json({ message: "creditNoteId is required" });
      }
      
      // Step 1: Fetch items using storage
      const items = await storage.getCreditNoteItems(creditNoteId as string);
      
      // Step 2: Fetch product names for each item
      const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))] as string[];
      const productMap = new Map<string, string>();
      
      if (productIds.length > 0) {
        const productsList = await db.select({ id: products.id, name: products.name })
          .from(products)
          .where(inArray(products.id, productIds));
        
        productsList.forEach(p => productMap.set(p.id, p.name));
      }
      
      // Step 3: Enrich items with product names
      const itemsWithProducts = items.map(item => ({
        ...item,
        productName: productMap.get(item.productId) || item.description || 'Unknown Product',
      }));
      
      res.json(itemsWithProducts);
    } catch (error) {
      console.error("Error fetching credit note items:", error);
      res.status(500).json({ message: "Failed to fetch credit note items" });
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

      // GST Compliance: Only allow credit notes for previous month invoices
      const now = new Date();
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear()) {
        return res.status(400).json({ 
          message: "Cannot create credit notes for current month invoices. Use 'Cancel & Reissue' instead for GST compliance." 
        });
      }

      // Fetch invoice items - authoritative source for prices and quantities
      const invoiceItems_list = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems_list || invoiceItems_list.length === 0) {
        return res.status(404).json({ message: "Invoice has no items" });
      }

      // Fetch existing debit notes to get effective prices (after price increases)
      const issuedDebitNotes = await db.select()
        .from(debitNotes)
        .where(and(
          eq(debitNotes.invoiceId, invoiceId),
          eq(debitNotes.status, 'issued'),
          eq(debitNotes.recordStatus, 1)
        ));
      
      // Build maps of debit note adjustments for each invoice item
      const debitPriceByItem = new Map<string, number>(); // Max price from debit notes
      const debitQtyByItem = new Map<string, number>(); // Additional qty from debit notes
      for (const dn of issuedDebitNotes) {
        const dnItems = await storage.getDebitNoteItems(dn.id);
        for (const item of dnItems) {
          if (item.invoiceItemId) {
            const newPrice = item.newUnitPrice || 0;
            const additionalQty = item.additionalQuantity || 0;
            
            const existingPrice = debitPriceByItem.get(item.invoiceItemId) || 0;
            debitPriceByItem.set(item.invoiceItemId, Math.max(existingPrice, newPrice));
            
            const existingQty = debitQtyByItem.get(item.invoiceItemId) || 0;
            debitQtyByItem.set(item.invoiceItemId, existingQty + additionalQty);
          }
        }
      }
      
      // Fetch existing credit notes for validation
      const existingCreditNotes = await db.select()
        .from(creditNotes)
        .where(eq(creditNotes.invoiceId, invoiceId));
      const issuedCreditNotes = existingCreditNotes.filter(cn => cn.status === 'issued');
      
      // Build map of credited quantities for each invoice item
      const creditedQtyByItem = new Map<string, number>();
      for (const cn of issuedCreditNotes) {
        const cnItems = await storage.getCreditNoteItems(cn.id);
        for (const item of cnItems) {
          if (item.invoiceItemId) {
            const existingQty = creditedQtyByItem.get(item.invoiceItemId) || 0;
            creditedQtyByItem.set(item.invoiceItemId, existingQty + item.quantity);
          }
        }
      }

      // Generate credit note number
      const sequence = existingCreditNotes.length + 1;
      const creditNoteNumber = `CN-${invoice.invoiceNumber}-${sequence.toString().padStart(2, '0')}`;

      // Calculate existing credit notes total to prevent over-crediting
      const existingCreditTotal = issuedCreditNotes.reduce((sum, cn) => sum + cn.grandTotal, 0);

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

        // STRICT VALIDATION: Quantity cannot exceed remaining amount
        // Remaining = original + debited - credited
        const debitedQty = debitQtyByItem.get(item.invoiceItemId) || 0;
        const creditedQty = creditedQtyByItem.get(item.invoiceItemId) || 0;
        const remainingQty = invoiceItem.quantity + debitedQty - creditedQty;
        
        if (item.quantity > remainingQty) {
          return res.status(400).json({ 
            message: `Credit quantity (${item.quantity}) cannot exceed remaining quantity (${remainingQty}) for ${invoiceItem.productName}. Original: ${invoiceItem.quantity}, Debited: ${debitedQty}, Already Credited: ${creditedQty}` 
          });
        }

        // SECURITY: Use adjusted price but validate it doesn't exceed effective price
        // Effective price = max(original invoice price, debit note increased price)
        // For pricing_error corrections, the adjusted price should be <= effective price
        const debitMaxPrice = debitPriceByItem.get(item.invoiceItemId) || 0;
        const effectiveMaxPrice = Math.max(invoiceItem.unitPrice, debitMaxPrice);
        
        if (reason === 'pricing_error' && item.adjustedUnitPrice > effectiveMaxPrice) {
          return res.status(400).json({ 
            message: `Adjusted price (₹${(item.adjustedUnitPrice/100).toFixed(2)}) cannot exceed effective price (₹${(effectiveMaxPrice/100).toFixed(2)}) for pricing error corrections on ${invoiceItem.productName}` 
          });
        }

        // Calculate using AUTHORITATIVE GST rates from invoice (handle null for old invoices)
        const itemSubtotal = item.adjustedUnitPrice * item.quantity;
        const safeCgstRate = invoiceItem.cgstRate || 0;
        const safeSgstRate = invoiceItem.sgstRate || 0;
        const safeIgstRate = invoiceItem.igstRate || 0;
        
        const itemCgst = Math.round(itemSubtotal * safeCgstRate / 10000);
        const itemSgst = Math.round(itemSubtotal * safeSgstRate / 10000);
        const itemIgst = Math.round(itemSubtotal * safeIgstRate / 10000);
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
          cgstRate: safeCgstRate, // Authoritative from invoice
          cgstAmount: itemCgst,
          sgstRate: safeSgstRate, // Authoritative from invoice
          sgstAmount: itemSgst,
          igstRate: safeIgstRate, // Authoritative from invoice
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

      // GST Compliance: Only allow credit notes for previous month invoices
      const now = new Date();
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear()) {
        return res.status(400).json({ 
          message: "Cannot create credit notes for current month invoices. Use 'Cancel & Reissue' instead for GST compliance." 
        });
      }

      // Fetch invoice items
      const invoiceItems_list = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems_list || invoiceItems_list.length === 0) {
        return res.status(404).json({ message: "Invoice has no items" });
      }

      // Fetch issued debit notes to calculate effective prices and quantities
      const issuedDebitNotes = await db.select()
        .from(debitNotes)
        .where(and(
          eq(debitNotes.invoiceId, invoiceId),
          eq(debitNotes.status, 'issued'),
          eq(debitNotes.recordStatus, 1)
        ));
      
      // Build maps of debit note adjustments for each invoice item
      const debitPriceByItem = new Map<string, number>(); // Max price from debit notes
      const debitQtyByItem = new Map<string, number>(); // Additional qty from debit notes
      for (const dn of issuedDebitNotes) {
        const dnItems = await storage.getDebitNoteItems(dn.id);
        for (const dnItem of dnItems) {
          if (dnItem.invoiceItemId) {
            const newPrice = dnItem.newUnitPrice || 0;
            const additionalQty = dnItem.additionalQuantity || 0;
            
            const existingPrice = debitPriceByItem.get(dnItem.invoiceItemId) || 0;
            debitPriceByItem.set(dnItem.invoiceItemId, Math.max(existingPrice, newPrice));
            
            const existingQty = debitQtyByItem.get(dnItem.invoiceItemId) || 0;
            debitQtyByItem.set(dnItem.invoiceItemId, existingQty + additionalQty);
          }
        }
      }
      
      // Fetch existing credit notes for quantity tracking
      const existingCreditNotesCC = await db.select()
        .from(creditNotes)
        .where(and(
          eq(creditNotes.invoiceId, invoiceId),
          eq(creditNotes.status, 'issued'),
          eq(creditNotes.recordStatus, 1)
        ));
      
      // Build map of credited quantities for each invoice item
      const creditedQtyByItem = new Map<string, number>();
      for (const cn of existingCreditNotesCC) {
        const cnItems = await storage.getCreditNoteItems(cn.id);
        for (const cnItem of cnItems) {
          if (cnItem.invoiceItemId) {
            const existingQty = creditedQtyByItem.get(cnItem.invoiceItemId) || 0;
            creditedQtyByItem.set(cnItem.invoiceItemId, existingQty + cnItem.quantity);
          }
        }
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
        totalAmount: number;
        qtyReturned: number; // Track actual quantity being returned for inventory
      }> = [];

      for (const item of items) {
        // Find the invoice item first for validation
        const invoiceItem = invoiceItems_list.find(i => i.id === item.invoiceItemId);
        if (!invoiceItem) {
          return res.status(400).json({ 
            message: `Invalid invoice item ID: ${item.invoiceItemId}` 
          });
        }
        
        // Calculate effective price and quantity considering debit note adjustments
        const debitMaxPrice = debitPriceByItem.get(item.invoiceItemId) || 0;
        const effectivePrice = Math.max(invoiceItem.unitPrice, debitMaxPrice);
        const debitedQty = debitQtyByItem.get(item.invoiceItemId) || 0;
        const creditedQty = creditedQtyByItem.get(item.invoiceItemId) || 0;
        const effectiveQty = invoiceItem.quantity + debitedQty;
        const remainingQty = effectiveQty - creditedQty;
        
        // VALUE-BASED calculation: We no longer validate originalUnitPrice against effectivePrice
        // because currentUnitPrice can legitimately be higher than original price when
        // previous credits were issued at a lower price (due to rounding/averaging)
        
        if (item.originalQuantity > remainingQty) {
          return res.status(400).json({ 
            message: `Original quantity (${item.originalQuantity}) exceeds remaining quantity (${remainingQty}) for ${invoiceItem.productName || invoiceItem.description}` 
          });
        }
        
        const originalAmount = item.originalQuantity * item.originalUnitPrice;
        const correctedAmount = item.correctedQuantity * item.correctedUnitPrice;
        const difference = originalAmount - correctedAmount;

        if (difference > 0) {
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
          
          // Handle null/undefined tax rates for old/ported invoices
          const safeCgstRate = invoiceItem.cgstRate || 0;
          const safeSgstRate = invoiceItem.sgstRate || 0;
          const safeIgstRate = invoiceItem.igstRate || 0;
          const cgstAmountCalc = Math.round(taxableValue * safeCgstRate / 10000);
          const sgstAmountCalc = Math.round(taxableValue * safeSgstRate / 10000);
          const igstAmountCalc = Math.round(taxableValue * safeIgstRate / 10000);

          creditItems.push({
            invoiceItemId: item.invoiceItemId,
            productId: invoiceItem.productId,
            description: invoiceItem.description,
            quantity: creditQty,
            unitPrice: creditPrice,
            discountAmount: 0,
            taxableValue: taxableValue,
            cgstRate: safeCgstRate,
            cgstAmount: cgstAmountCalc,
            sgstRate: safeSgstRate,
            sgstAmount: sgstAmountCalc,
            igstRate: safeIgstRate,
            igstAmount: igstAmountCalc,
            totalAmount: taxableValue + cgstAmountCalc + sgstAmountCalc + igstAmountCalc,
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

      // Sum GST amounts from credit items (calculated from item-level rates)
      // This is more accurate than using nullable invoice-level rates
      const cgstAmount = creditItems.reduce((sum, item) => sum + item.cgstAmount, 0);
      const sgstAmount = creditItems.reduce((sum, item) => sum + item.sgstAmount, 0);
      const igstAmount = creditItems.reduce((sum, item) => sum + item.igstAmount, 0);
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
            totalAmount: itemData.totalAmount,
          });
          
          // Return finished goods inventory for quantity reductions only
          // IMPORTANT: Check if product exists before inserting (handles Vyapaar imports where product may be missing)
          if (itemData.productId && itemData.qtyReturned > 0) {
            // Verify product exists in products table to avoid foreign key violation
            const [existingProduct] = await tx.select({ id: products.id })
              .from(products)
              .where(eq(products.id, itemData.productId))
              .limit(1);
            
            if (existingProduct) {
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
            } else {
              // Product not found - skip inventory return but continue with credit note (compliance priority)
              console.warn(`[INVENTORY] Skipping inventory return for product ${itemData.productId} - product not found in master data (Vyapaar import or deleted product)`);
            }
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

      // GST Compliance: Only allow credit notes for previous month invoices
      const now = new Date();
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear()) {
        return res.status(400).json({ 
          message: "Cannot create credit notes for current month invoices. Use 'Cancel & Reissue' instead for GST compliance." 
        });
      }

      // Fetch invoice items
      const invoiceItems_list = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems_list || invoiceItems_list.length === 0) {
        return res.status(404).json({ message: "Invoice has no items" });
      }

      // Check for existing credit notes AND debit notes (value-based approach)
      const existingCreditNotes = await db.select()
        .from(creditNotes)
        .where(and(
          eq(creditNotes.invoiceId, invoiceId),
          eq(creditNotes.status, 'issued'),
          eq(creditNotes.recordStatus, 1)
        ));
      
      const existingDebitNotes = await db.select()
        .from(debitNotes)
        .where(and(
          eq(debitNotes.invoiceId, invoiceId),
          eq(debitNotes.status, 'issued'),
          eq(debitNotes.recordStatus, 1)
        ));
      
      const existingCreditTotal = existingCreditNotes.reduce((sum, cn) => sum + cn.grandTotal, 0);
      const existingDebitTotal = existingDebitNotes.reduce((sum, dn) => sum + dn.grandTotal, 0);

      // Calculate remaining creditable amount: Original + Debited - Credited
      const remainingCreditableAmount = invoice.totalAmount + existingDebitTotal - existingCreditTotal;
      
      if (remainingCreditableAmount <= 0) {
        return res.status(400).json({ 
          message: "Invoice has already been fully credited" 
        });
      }

      // Build per-item effective values from debit notes
      const debitPriceByItem = new Map<string, number>(); // Max price from debit notes
      const debitQtyByItem = new Map<string, number>(); // Additional qty from debit notes
      for (const dn of existingDebitNotes) {
        const dnItems = await storage.getDebitNoteItems(dn.id);
        for (const dnItem of dnItems) {
          if (dnItem.invoiceItemId) {
            const newPrice = dnItem.newUnitPrice || 0;
            const additionalQty = dnItem.additionalQuantity || 0;
            
            const existingPrice = debitPriceByItem.get(dnItem.invoiceItemId) || 0;
            debitPriceByItem.set(dnItem.invoiceItemId, Math.max(existingPrice, newPrice));
            
            const existingQty = debitQtyByItem.get(dnItem.invoiceItemId) || 0;
            debitQtyByItem.set(dnItem.invoiceItemId, existingQty + additionalQty);
          }
        }
      }
      
      // Build map of credited quantities for each invoice item
      const creditedQtyByItem = new Map<string, number>();
      for (const cn of existingCreditNotes) {
        const cnItems = await storage.getCreditNoteItems(cn.id);
        for (const cnItem of cnItems) {
          if (cnItem.invoiceItemId) {
            const existingQty = creditedQtyByItem.get(cnItem.invoiceItemId) || 0;
            creditedQtyByItem.set(cnItem.invoiceItemId, existingQty + cnItem.quantity);
          }
        }
      }

      // Calculate per-item effective values and totals
      let subtotal = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;
      
      // Store effective item data for credit note items
      type EffectiveItem = {
        invoiceItem: typeof invoiceItems_list[0];
        effectiveQty: number;
        remainingQty: number;
        effectivePrice: number;
        taxableValue: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
      };
      const effectiveItems: EffectiveItem[] = [];
      
      for (const item of invoiceItems_list) {
        const debitMaxPrice = debitPriceByItem.get(item.id) || 0;
        const effectivePrice = Math.max(item.unitPrice, debitMaxPrice);
        const debitedQty = debitQtyByItem.get(item.id) || 0;
        const creditedQty = creditedQtyByItem.get(item.id) || 0;
        const effectiveQty = item.quantity + debitedQty;
        const remainingQty = effectiveQty - creditedQty;
        
        if (remainingQty > 0) {
          const lineTotal = remainingQty * effectivePrice;
          const discountAmount = item.discount || 0;
          const discountRatio = remainingQty / effectiveQty;
          const adjustedDiscount = Math.round(discountAmount * discountRatio);
          const taxableValue = lineTotal - adjustedDiscount;
          
          // Calculate GST based on original rates
          const itemCgstRate = item.cgstRate || 0;
          const itemSgstRate = item.sgstRate || 0;
          const itemIgstRate = item.igstRate || 0;
          const itemCgstAmount = Math.round(taxableValue * itemCgstRate / 10000);
          const itemSgstAmount = Math.round(taxableValue * itemSgstRate / 10000);
          const itemIgstAmount = Math.round(taxableValue * itemIgstRate / 10000);
          
          subtotal += taxableValue;
          cgstAmount += itemCgstAmount;
          sgstAmount += itemSgstAmount;
          igstAmount += itemIgstAmount;
          
          effectiveItems.push({
            invoiceItem: item,
            effectiveQty,
            remainingQty,
            effectivePrice,
            taxableValue,
            cgstAmount: itemCgstAmount,
            sgstAmount: itemSgstAmount,
            igstAmount: itemIgstAmount,
          });
        }
      }
      
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

        // Create credit note items using effective values (accounting for debit notes)
        for (const effItem of effectiveItems) {
          const { invoiceItem, remainingQty, effectivePrice, taxableValue } = effItem;
          
          // Handle null/undefined tax rates for old/ported invoice items
          const itemCgstRate = invoiceItem.cgstRate || 0;
          const itemSgstRate = invoiceItem.sgstRate || 0;
          const itemIgstRate = invoiceItem.igstRate || 0;
          const totalAmount = taxableValue + effItem.cgstAmount + effItem.sgstAmount + effItem.igstAmount;
          
          await tx.insert(creditNoteItems).values({
            creditNoteId: creditNote.id,
            invoiceItemId: invoiceItem.id,
            productId: invoiceItem.productId,
            description: invoiceItem.description,
            quantity: remainingQty,
            unitPrice: effectivePrice,
            discountAmount: 0,
            taxableValue: taxableValue,
            cgstRate: itemCgstRate,
            cgstAmount: effItem.cgstAmount,
            sgstRate: itemSgstRate,
            sgstAmount: effItem.sgstAmount,
            igstRate: itemIgstRate,
            igstAmount: effItem.igstAmount,
            totalAmount: totalAmount,
          });
          
          // Return finished goods inventory for this item (full credit means goods returned)
          // Only return the remaining quantity that's being credited
          // IMPORTANT: Check if product exists before inserting (handles Vyapaar imports where product may be missing)
          if (invoiceItem.productId && remainingQty > 0) {
            // Verify product exists in products table to avoid foreign key violation
            const [existingProduct] = await tx.select({ id: products.id })
              .from(products)
              .where(eq(products.id, invoiceItem.productId))
              .limit(1);
            
            if (existingProduct) {
              const batchNumber = `CREDIT-${invoice.invoiceNumber}-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
              
              await tx.insert(finishedGoods).values({
                productId: invoiceItem.productId,
                batchNumber,
                productionDate: new Date().toISOString(),
                quantity: remainingQty,
                qualityStatus: 'approved',
                remarks: `Inventory returned - Full credit note ${creditNoteNumber} for invoice ${invoice.invoiceNumber}`,
                createdBy: req.user?.id,
              });
              
              console.log(`[INVENTORY] Returned ${remainingQty} units of product ${invoiceItem.productId} to inventory (Quick Full Credit)`);
            } else {
              // Product not found - skip inventory return but continue with credit note (compliance priority)
              console.warn(`[INVENTORY] Skipping inventory return for product ${invoiceItem.productId} - product not found in master data (Vyapaar import or deleted product)`);
            }
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

  // Get pending credit/debit notes for a buyer (used in invoice form)
  app.get('/api/buyer-adjustments/:buyerName', isAuthenticated, async (req: any, res) => {
    try {
      const { buyerName } = req.params;
      const decodedBuyerName = decodeURIComponent(buyerName);
      
      // Get all invoices for this buyer
      const allInvoices = await storage.getAllInvoices();
      const buyerInvoices = allInvoices.filter(inv => 
        inv.buyerName === decodedBuyerName && inv.recordStatus === 1
      );
      
      if (buyerInvoices.length === 0) {
        return res.json({
          buyerName: decodedBuyerName,
          pendingCredits: [],
          pendingDebits: [],
          totalCreditAmount: 0,
          totalDebitAmount: 0,
          netAdjustment: 0,
          totalOutstanding: 0,
        });
      }
      
      const invoiceIds = buyerInvoices.map(inv => inv.id);
      
      // Get all credit notes for this buyer's invoices
      const allCreditNotes = await db.select({
        id: creditNotes.id,
        noteNumber: creditNotes.noteNumber,
        invoiceId: creditNotes.invoiceId,
        creditDate: creditNotes.creditDate,
        reason: creditNotes.reason,
        status: creditNotes.status,
        grandTotal: creditNotes.grandTotal,
      })
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.recordStatus, 1),
          eq(creditNotes.status, 'issued'),
          inArray(creditNotes.invoiceId, invoiceIds)
        )
      );
      
      // Get all debit notes for this buyer's invoices
      const allDebitNotes = await db.select({
        id: debitNotes.id,
        noteNumber: debitNotes.noteNumber,
        invoiceId: debitNotes.invoiceId,
        debitDate: debitNotes.debitDate,
        reason: debitNotes.reason,
        status: debitNotes.status,
        grandTotal: debitNotes.grandTotal,
      })
      .from(debitNotes)
      .where(
        and(
          eq(debitNotes.recordStatus, 1),
          eq(debitNotes.status, 'issued'),
          inArray(debitNotes.invoiceId, invoiceIds)
        )
      );
      
      // Calculate totals
      const totalCreditAmount = allCreditNotes.reduce((sum, cn) => sum + (cn.grandTotal || 0), 0);
      const totalDebitAmount = allDebitNotes.reduce((sum, dn) => sum + (dn.grandTotal || 0), 0);
      const netAdjustment = totalDebitAmount - totalCreditAmount; // Positive = buyer owes more, Negative = buyer has credit
      
      // Calculate total outstanding (invoices - received - credits + debits)
      const totalInvoiced = buyerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalReceived = buyerInvoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);
      const totalOutstanding = totalInvoiced - totalReceived - totalCreditAmount + totalDebitAmount;
      
      res.json({
        buyerName: decodedBuyerName,
        pendingCredits: allCreditNotes.map(cn => ({
          ...cn,
          invoiceNumber: buyerInvoices.find(inv => inv.id === cn.invoiceId)?.invoiceNumber,
        })),
        pendingDebits: allDebitNotes.map(dn => ({
          ...dn,
          invoiceNumber: buyerInvoices.find(inv => inv.id === dn.invoiceId)?.invoiceNumber,
        })),
        totalCreditAmount,
        totalDebitAmount,
        netAdjustment,
        totalOutstanding,
        invoiceCount: buyerInvoices.length,
      });
    } catch (error) {
      console.error("Error fetching buyer adjustments:", error);
      res.status(500).json({ message: "Failed to fetch buyer adjustments" });
    }
  });

  // =================== VENDOR HISTORY ===================
  // Vendor history provides a complete ledger view of all transactions with a vendor
  
  // Get all vendors with summary totals (list view)
  app.get('/api/vendor-history', isAuthenticated, async (req: any, res) => {
    try {
      const { search, page = '1', pageSize = '20', sortBy = 'outstanding', sortOrder = 'desc' } = req.query;
      const pageNum = parseInt(page as string);
      const limit = Math.min(parseInt(pageSize as string), 100);
      const offset = (pageNum - 1) * limit;
      
      // Get all active vendors
      const allVendors = await storage.getAllVendors();
      const activeVendors = allVendors.filter(v => v.isActive === 'true' && v.recordStatus === 1);
      
      // Filter by search if provided
      let filteredVendors = activeVendors;
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredVendors = activeVendors.filter(v => 
          v.vendorName.toLowerCase().includes(searchLower) ||
          (v.gstNumber && v.gstNumber.toLowerCase().includes(searchLower)) ||
          (v.vendorCode && v.vendorCode.toLowerCase().includes(searchLower))
        );
      }
      
      // Get all invoices for aggregation
      const allInvoices = await storage.getAllInvoices();
      const activeInvoices = allInvoices.filter(inv => inv.recordStatus === 1);
      
      // Get all credit notes
      const allCreditNotes = await db.select()
        .from(creditNotes)
        .where(and(
          eq(creditNotes.recordStatus, 1),
          eq(creditNotes.status, 'issued')
        ));
      
      // Get all debit notes
      const allDebitNotes = await db.select()
        .from(debitNotes)
        .where(and(
          eq(debitNotes.recordStatus, 1),
          eq(debitNotes.status, 'issued')
        ));
      
      // Build vendor summaries
      const vendorSummaries = filteredVendors.map(vendor => {
        // Get invoices for this vendor (by buyerName match)
        const vendorInvoices = activeInvoices.filter(inv => inv.buyerName === vendor.vendorName);
        
        // Get invoice IDs for this vendor
        const invoiceIds = vendorInvoices.map(inv => inv.id);
        
        // Calculate totals - use amountReceived as authoritative source (matches Vyapaar import)
        const totalInvoiced = vendorInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalReceived = vendorInvoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);
        
        // Credit notes for this vendor's invoices (issued status only)
        const vendorCredits = allCreditNotes.filter(cn => invoiceIds.includes(cn.invoiceId));
        const totalCredits = vendorCredits.reduce((sum, cn) => sum + (cn.grandTotal || 0), 0);
        
        // Debit notes for this vendor's invoices (issued status only)
        const vendorDebits = allDebitNotes.filter(dn => invoiceIds.includes(dn.invoiceId));
        const totalDebits = vendorDebits.reduce((sum, dn) => sum + (dn.grandTotal || 0), 0);
        
        // Outstanding = Invoiced + Debits - Credits - Received
        // Formula: What they originally owed + additional charges - reductions - what they paid
        const outstanding = totalInvoiced + totalDebits - totalCredits - totalReceived;
        
        // Last transaction date
        const lastInvoiceDate = vendorInvoices.length > 0 
          ? vendorInvoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())[0].invoiceDate
          : null;
        
        return {
          id: vendor.id,
          vendorCode: vendor.vendorCode,
          vendorName: vendor.vendorName,
          gstNumber: vendor.gstNumber,
          mobileNumber: vendor.mobileNumber,
          city: vendor.city,
          state: vendor.state,
          invoiceCount: vendorInvoices.length,
          creditNoteCount: vendorCredits.length,
          debitNoteCount: vendorDebits.length,
          totalInvoiced,
          totalReceived,
          totalCredits,
          totalDebits,
          outstanding,
          lastTransactionDate: lastInvoiceDate,
        };
      });
      
      // Sort
      vendorSummaries.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'outstanding':
            comparison = a.outstanding - b.outstanding;
            break;
          case 'invoiceCount':
            comparison = a.invoiceCount - b.invoiceCount;
            break;
          case 'totalInvoiced':
            comparison = a.totalInvoiced - b.totalInvoiced;
            break;
          case 'vendorName':
            comparison = a.vendorName.localeCompare(b.vendorName);
            break;
          case 'lastTransaction':
            comparison = (a.lastTransactionDate || '').localeCompare(b.lastTransactionDate || '');
            break;
          default:
            comparison = a.outstanding - b.outstanding;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      // Calculate totals across all filtered vendors
      const totals = {
        totalVendors: vendorSummaries.length,
        totalInvoiced: vendorSummaries.reduce((sum, v) => sum + v.totalInvoiced, 0),
        totalReceived: vendorSummaries.reduce((sum, v) => sum + v.totalReceived, 0),
        totalOutstanding: vendorSummaries.reduce((sum, v) => sum + v.outstanding, 0),
        vendorsWithBalance: vendorSummaries.filter(v => v.outstanding > 0).length,
      };
      
      // Paginate
      const paginatedVendors = vendorSummaries.slice(offset, offset + limit);
      
      res.json({
        vendors: paginatedVendors,
        totals,
        pagination: {
          page: pageNum,
          pageSize: limit,
          totalItems: vendorSummaries.length,
          totalPages: Math.ceil(vendorSummaries.length / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching vendor history:", error);
      res.status(500).json({ message: "Failed to fetch vendor history" });
    }
  });
  
  // Get detailed ledger for a specific vendor
  app.get('/api/vendor-history/:vendorId', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      const { startDate, endDate, type } = req.query;
      
      // Get vendor details
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      // Get all invoices for this vendor
      const allInvoices = await storage.getAllInvoices();
      let vendorInvoices = allInvoices.filter(inv => 
        inv.buyerName === vendor.vendorName && inv.recordStatus === 1
      );
      
      // Filter by date range if provided
      if (startDate) {
        vendorInvoices = vendorInvoices.filter(inv => 
          new Date(inv.invoiceDate) >= new Date(startDate as string)
        );
      }
      if (endDate) {
        vendorInvoices = vendorInvoices.filter(inv => 
          new Date(inv.invoiceDate) <= new Date(endDate as string)
        );
      }
      
      const invoiceIds = vendorInvoices.map(inv => inv.id);
      
      // Get credit notes for these invoices
      let vendorCreditNotes: any[] = [];
      if (invoiceIds.length > 0) {
        vendorCreditNotes = await db.select()
          .from(creditNotes)
          .where(and(
            eq(creditNotes.recordStatus, 1),
            inArray(creditNotes.invoiceId, invoiceIds)
          ));
      }
      
      // Get debit notes for these invoices (customer debit notes)
      let customerDebitNotes: any[] = [];
      if (invoiceIds.length > 0) {
        customerDebitNotes = await db.select()
          .from(debitNotes)
          .where(and(
            eq(debitNotes.recordStatus, 1),
            inArray(debitNotes.invoiceId, invoiceIds)
          ));
      }

      // Get invoice payments to show detailed payment breakdown
      let allInvoicePayments: any[] = [];
      if (invoiceIds.length > 0) {
        allInvoicePayments = await db.select()
          .from(invoicePayments)
          .where(and(
            eq(invoicePayments.recordStatus, 1),
            inArray(invoicePayments.invoiceId, invoiceIds)
          ));
      }

      // Group payments by invoice
      const paymentsByInvoice = allInvoicePayments.reduce((acc, pmt) => {
        if (!acc[pmt.invoiceId]) acc[pmt.invoiceId] = [];
        acc[pmt.invoiceId].push(pmt);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Build ledger entries - use a single-pass approach
      const ledgerEntries: any[] = [];
      
      // Add invoices to ledger with detailed payment breakdown
      vendorInvoices.forEach(inv => {
        // Invoice entry - what they owe
        ledgerEntries.push({
          type: 'invoice',
          id: inv.id,
          date: inv.invoiceDate,
          reference: inv.invoiceNumber,
          description: `Invoice ${inv.invoiceNumber}`,
          debit: inv.totalAmount, // Customer owes us
          credit: 0,
          status: inv.paymentStatus,
        });
        
        // Get payments for this invoice
        const invoicePaymentsList = paymentsByInvoice[inv.id] || [];
        
        if (invoicePaymentsList.length > 0) {
          // Show each payment as a separate line item
          invoicePaymentsList.forEach(pmt => {
            const isDebitNoteAdjustment = pmt.paymentMethod === 'Debit Note Adjustment';
            ledgerEntries.push({
              type: isDebitNoteAdjustment ? 'vendor_debit_note_adjustment' : 'payment',
              id: pmt.id,
              date: pmt.paymentDate ? new Date(pmt.paymentDate).toISOString().split('T')[0] : inv.invoiceDate,
              reference: isDebitNoteAdjustment ? pmt.referenceNumber : `PMT-${inv.invoiceNumber}`,
              description: isDebitNoteAdjustment 
                ? `Vendor Debit Note Adjustment ${pmt.referenceNumber} (against Invoice ${inv.invoiceNumber})`
                : `Payment received for ${inv.invoiceNumber} (${pmt.paymentMethod || 'Cash'})`,
              debit: 0,
              credit: pmt.amount, // Reduces what customer owes
              paymentMethod: pmt.paymentMethod,
            });
          });
        } else if (inv.amountReceived && inv.amountReceived > 0) {
          // Fallback: If no payment records exist, use amountReceived (for imported data)
          ledgerEntries.push({
            type: 'payment',
            id: `pmt-${inv.id}`,
            date: inv.invoiceDate,
            reference: `PMT-${inv.invoiceNumber}`,
            description: `Payment received for ${inv.invoiceNumber}`,
            debit: 0,
            credit: inv.amountReceived,
          });
        }
      });
      
      // Add credit notes to ledger (reduce what customer owes)
      vendorCreditNotes.forEach(cn => {
        const relatedInvoice = vendorInvoices.find(inv => inv.id === cn.invoiceId);
        ledgerEntries.push({
          type: 'credit_note',
          id: cn.id,
          date: cn.creditDate,
          reference: cn.noteNumber,
          description: `Credit Note ${cn.noteNumber} (against ${relatedInvoice?.invoiceNumber || 'N/A'})`,
          debit: 0,
          credit: cn.grandTotal, // Reduces what customer owes
          status: cn.status,
          reason: cn.reason,
        });
      });
      
      // Add customer debit notes to ledger (increase what customer owes)
      customerDebitNotes.forEach(dn => {
        const relatedInvoice = vendorInvoices.find(inv => inv.id === dn.invoiceId);
        ledgerEntries.push({
          type: 'debit_note',
          id: dn.id,
          date: dn.debitDate,
          reference: dn.noteNumber,
          description: `Debit Note ${dn.noteNumber} (against ${relatedInvoice?.invoiceNumber || 'N/A'})`,
          debit: dn.grandTotal, // Increases what customer owes
          credit: 0,
          status: dn.status,
          reason: dn.reason,
        });
      });
      
      // Filter by type if specified
      let filteredEntries = ledgerEntries;
      if (type && type !== 'all') {
        filteredEntries = ledgerEntries.filter(e => e.type === type);
      }
      
      // Sort by date (oldest first for running balance)
      filteredEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate running balance from ledger entries
      let runningBalance = 0;
      filteredEntries.forEach(entry => {
        runningBalance += entry.debit - entry.credit;
        entry.balance = runningBalance;
      });
      
      // Calculate summary totals - use amountReceived as authoritative source (matches Vyapaar)
      const totalInvoiced = vendorInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalPayments = vendorInvoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);
      const totalCredits = vendorCreditNotes.reduce((sum, cn) => sum + (cn.grandTotal || 0), 0);
      const totalDebits = customerDebitNotes.reduce((sum, dn) => sum + (dn.grandTotal || 0), 0);
      
      // Calculate vendor debit note adjustments total
      const vendorDebitNoteAdjustmentsTotal = allInvoicePayments
        .filter(pmt => pmt.paymentMethod === 'Debit Note Adjustment')
        .reduce((sum, pmt) => sum + pmt.amount, 0);
      
      // Current balance = Invoiced + Debits - Credits - Payments (consistent with list view)
      const currentBalance = totalInvoiced + totalDebits - totalCredits - totalPayments;
      
      res.json({
        vendor: {
          id: vendor.id,
          vendorCode: vendor.vendorCode,
          vendorName: vendor.vendorName,
          gstNumber: vendor.gstNumber,
          address: vendor.address,
          city: vendor.city,
          state: vendor.state,
          mobileNumber: vendor.mobileNumber,
          email: vendor.email,
        },
        summary: {
          totalInvoiced,
          totalCredits,
          totalDebits,
          totalPayments,
          vendorDebitNoteAdjustments: vendorDebitNoteAdjustmentsTotal,
          currentBalance,
          invoiceCount: vendorInvoices.length,
          creditNoteCount: vendorCreditNotes.length,
          debitNoteCount: customerDebitNotes.length,
          paymentCount: vendorInvoices.filter(inv => inv.amountReceived && inv.amountReceived > 0).length,
        },
        ledger: filteredEntries.reverse(), // Most recent first for display
      });
    } catch (error) {
      console.error("Error fetching vendor ledger:", error);
      res.status(500).json({ message: "Failed to fetch vendor ledger" });
    }
  });

  // =================== DEBIT NOTES ===================
  // Debit notes are used to INCREASE amounts on previous month invoices
  // (e.g., quantity increases, price increases on old invoices where Cancel & Reissue is not allowed)
  
  // List all debit notes
  app.get('/api/debit-notes', isAuthenticated, async (req: any, res) => {
    try {
      const debitNotesList = await storage.getAllDebitNotes();
      res.json(debitNotesList);
    } catch (error) {
      console.error("Error fetching debit notes:", error);
      res.status(500).json({ message: "Failed to fetch debit notes" });
    }
  });
  
  // Get debit notes for a specific invoice
  app.get('/api/debit-notes/invoice/:invoiceId', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      const debitNotesList = await storage.getDebitNotesByInvoice(invoiceId);
      res.json(debitNotesList);
    } catch (error) {
      console.error("Error fetching debit notes for invoice:", error);
      res.status(500).json({ message: "Failed to fetch debit notes" });
    }
  });
  
  // Get single debit note with items
  app.get('/api/debit-notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const debitNote = await storage.getDebitNote(id);
      if (!debitNote) {
        return res.status(404).json({ message: "Debit note not found" });
      }
      
      const items = await storage.getDebitNoteItems(id);
      res.json({ ...debitNote, items });
    } catch (error) {
      console.error("Error fetching debit note:", error);
      res.status(500).json({ message: "Failed to fetch debit note" });
    }
  });
  
  // Correct & Debit - Create debit note for increases (qty or price)
  app.post('/api/debit-notes/correct-and-debit', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const correctAndDebitSchema = z.object({
        invoiceId: z.string().min(1, "Invoice ID is required"),
        reason: z.enum(['quantity_increase', 'price_increase', 'additional_charges', 'other'], { 
          required_error: "Reason is required" 
        }),
        customReason: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          invoiceItemId: z.string().min(1),
          originalQuantity: z.number().min(0),
          originalUnitPrice: z.number().min(0),
          newQuantity: z.number().min(0),
          newUnitPrice: z.number().min(0),
        })).min(1, "At least one item is required"),
      });

      const validationResult = correctAndDebitSchema.safeParse(req.body);
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

      // GST Compliance: Debit notes are for PREVIOUS month invoices only
      // (Current month invoices should use Cancel & Reissue)
      const now = new Date();
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear()) {
        return res.status(400).json({ 
          message: "Cannot create debit notes for current month invoices. Use 'Cancel & Reissue' instead to modify the invoice directly." 
        });
      }

      // Fetch invoice items
      const invoiceItems_list = await storage.getInvoiceItems(invoiceId);
      if (!invoiceItems_list || invoiceItems_list.length === 0) {
        return res.status(404).json({ message: "Invoice has no items" });
      }

      // Calculate increases and create debit items
      let subtotal = 0;
      const debitItems: Array<{
        invoiceItemId: string;
        productId: string;
        description: string;
        originalQuantity: number;
        originalUnitPrice: number;
        additionalQuantity: number;
        newUnitPrice: number;
        priceDifferencePerUnit: number;
        taxableValue: number;
        cgstRate: number;
        cgstAmount: number;
        sgstRate: number;
        sgstAmount: number;
        igstRate: number;
        igstAmount: number;
        totalAmount: number;
      }> = [];

      for (const item of items) {
        const originalAmount = item.originalQuantity * item.originalUnitPrice;
        const newAmount = item.newQuantity * item.newUnitPrice;
        const difference = newAmount - originalAmount;

        if (difference > 0) {
          // Find the original invoice item for GST rates and product details
          const invoiceItem = invoiceItems_list.find(i => i.id === item.invoiceItemId);
          if (!invoiceItem) continue;

          // Determine additional quantity and price difference
          const qtyIncrease = item.newQuantity - item.originalQuantity;
          const priceIncrease = item.newUnitPrice - item.originalUnitPrice;

          // Calculate taxable value (additional amount being charged)
          const taxableValue = difference;
          
          // Handle null/undefined tax rates for old/ported invoices
          const safeCgstRate = invoiceItem.cgstRate || 0;
          const safeSgstRate = invoiceItem.sgstRate || 0;
          const safeIgstRate = invoiceItem.igstRate || 0;
          
          const cgstAmountCalc = Math.round(taxableValue * safeCgstRate / 10000);
          const sgstAmountCalc = Math.round(taxableValue * safeSgstRate / 10000);
          const igstAmountCalc = Math.round(taxableValue * safeIgstRate / 10000);

          debitItems.push({
            invoiceItemId: item.invoiceItemId,
            productId: invoiceItem.productId,
            description: invoiceItem.description,
            originalQuantity: item.originalQuantity,
            originalUnitPrice: item.originalUnitPrice,
            additionalQuantity: qtyIncrease > 0 ? qtyIncrease : 0,
            newUnitPrice: item.newUnitPrice,
            priceDifferencePerUnit: priceIncrease > 0 ? priceIncrease : 0,
            taxableValue: taxableValue,
            cgstRate: safeCgstRate,
            cgstAmount: cgstAmountCalc,
            sgstRate: safeSgstRate,
            sgstAmount: sgstAmountCalc,
            igstRate: safeIgstRate,
            igstAmount: igstAmountCalc,
            totalAmount: taxableValue + cgstAmountCalc + sgstAmountCalc + igstAmountCalc,
          });

          subtotal += taxableValue;
        }
      }

      if (debitItems.length === 0 || subtotal === 0) {
        return res.status(400).json({ message: "No debit amount calculated. Increase quantities or prices to create a debit note." });
      }

      // Check for existing debit notes to generate sequence number
      const existingDebitNotes = await storage.getDebitNotesByInvoice(invoiceId);

      // Sum GST amounts from debit items
      const cgstAmount = debitItems.reduce((sum, item) => sum + item.cgstAmount, 0);
      const sgstAmount = debitItems.reduce((sum, item) => sum + item.sgstAmount, 0);
      const igstAmount = debitItems.reduce((sum, item) => sum + item.igstAmount, 0);
      const grandTotal = subtotal + cgstAmount + sgstAmount + igstAmount;

      // Generate debit note number
      const sequence = existingDebitNotes.length + 1;
      const debitNoteNumber = `DN-${invoice.invoiceNumber}-${sequence.toString().padStart(2, '0')}`;

      // Create debit note in transaction
      await db.transaction(async (tx) => {
        const [debitNote] = await tx.insert(debitNotes).values({
          noteNumber: debitNoteNumber,
          invoiceId,
          debitDate: format(new Date(), 'yyyy-MM-dd'),
          reason: reason === 'other' ? (customReason || 'Additional Charges') : `Correct & Debit: ${reason}`,
          status: 'issued',
          subtotal,
          cgstAmount,
          sgstAmount,
          igstAmount,
          grandTotal,
          issuedBy: req.user?.id,
          notes: notes || `Auto-generated debit note for invoice correction`,
        }).returning();

        // Create debit note items
        for (const itemData of debitItems) {
          await tx.insert(debitNoteItems).values({
            debitNoteId: debitNote.id,
            invoiceItemId: itemData.invoiceItemId,
            productId: itemData.productId,
            description: itemData.description,
            originalQuantity: itemData.originalQuantity,
            originalUnitPrice: itemData.originalUnitPrice,
            additionalQuantity: itemData.additionalQuantity,
            newUnitPrice: itemData.newUnitPrice,
            priceDifferencePerUnit: itemData.priceDifferencePerUnit,
            taxableValue: itemData.taxableValue,
            cgstRate: itemData.cgstRate,
            cgstAmount: itemData.cgstAmount,
            sgstRate: itemData.sgstRate,
            sgstAmount: itemData.sgstAmount,
            igstRate: itemData.igstRate,
            igstAmount: itemData.igstAmount,
            totalAmount: itemData.totalAmount,
          });
        }

        await logAudit(
          req.user?.id,
          'CREATE',
          'debit_notes',
          debitNote.id,
          `Correct & Debit note ${debitNoteNumber} created for invoice ${invoice.invoiceNumber}. Reason: ${reason}. Amount: ₹${(grandTotal / 100).toFixed(2)}`
        );
      });

      res.json({
        message: `Debit note ${debitNoteNumber} created successfully`,
        debitNoteNumber,
        grandTotal,
      });
    } catch (error) {
      console.error("Error creating correct & debit note:", error);
      res.status(500).json({ message: "Failed to create debit note" });
    }
  });

  // ==================== VENDOR DEBIT NOTES ====================
  // Manual debit notes against vendors for claims (defective goods, short receipts, quality issues)

  // Get all vendor debit notes
  app.get('/api/vendor-debit-notes', isAuthenticated, async (req: any, res) => {
    try {
      const notes = await db.select({
        id: vendorDebitNotes.id,
        noteNumber: vendorDebitNotes.noteNumber,
        vendorId: vendorDebitNotes.vendorId,
        purchaseOrderId: vendorDebitNotes.purchaseOrderId,
        debitDate: vendorDebitNotes.debitDate,
        reason: vendorDebitNotes.reason,
        status: vendorDebitNotes.status,
        subtotal: vendorDebitNotes.subtotal,
        cgstAmount: vendorDebitNotes.cgstAmount,
        sgstAmount: vendorDebitNotes.sgstAmount,
        igstAmount: vendorDebitNotes.igstAmount,
        grandTotal: vendorDebitNotes.grandTotal,
        settledAmount: vendorDebitNotes.settledAmount,
        settlementDate: vendorDebitNotes.settlementDate,
        settlementReference: vendorDebitNotes.settlementReference,
        notes: vendorDebitNotes.notes,
        issuedBy: vendorDebitNotes.issuedBy,
        createdAt: vendorDebitNotes.createdAt,
        vendorName: vendors.vendorName,
        vendorGst: vendors.gstNumber,
      })
      .from(vendorDebitNotes)
      .leftJoin(vendors, eq(vendorDebitNotes.vendorId, vendors.id))
      .where(eq(vendorDebitNotes.recordStatus, 1))
      .orderBy(desc(vendorDebitNotes.createdAt));
      
      res.json(notes);
    } catch (error) {
      console.error("Error fetching vendor debit notes:", error);
      res.status(500).json({ message: "Failed to fetch vendor debit notes" });
    }
  });

  // Get vendor debit note by ID with items
  app.get('/api/vendor-debit-notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const [note] = await db.select({
        id: vendorDebitNotes.id,
        noteNumber: vendorDebitNotes.noteNumber,
        vendorId: vendorDebitNotes.vendorId,
        purchaseOrderId: vendorDebitNotes.purchaseOrderId,
        debitDate: vendorDebitNotes.debitDate,
        reason: vendorDebitNotes.reason,
        status: vendorDebitNotes.status,
        subtotal: vendorDebitNotes.subtotal,
        cgstAmount: vendorDebitNotes.cgstAmount,
        sgstAmount: vendorDebitNotes.sgstAmount,
        igstAmount: vendorDebitNotes.igstAmount,
        grandTotal: vendorDebitNotes.grandTotal,
        settledAmount: vendorDebitNotes.settledAmount,
        settlementDate: vendorDebitNotes.settlementDate,
        settlementReference: vendorDebitNotes.settlementReference,
        notes: vendorDebitNotes.notes,
        issuedBy: vendorDebitNotes.issuedBy,
        createdAt: vendorDebitNotes.createdAt,
        vendorName: vendors.vendorName,
        vendorGst: vendors.gstNumber,
      })
      .from(vendorDebitNotes)
      .leftJoin(vendors, eq(vendorDebitNotes.vendorId, vendors.id))
      .where(and(eq(vendorDebitNotes.id, id), eq(vendorDebitNotes.recordStatus, 1)));

      if (!note) {
        return res.status(404).json({ message: "Vendor debit note not found" });
      }

      const items = await db.select()
        .from(vendorDebitNoteItems)
        .where(and(eq(vendorDebitNoteItems.vendorDebitNoteId, id), eq(vendorDebitNoteItems.recordStatus, 1)));

      res.json({ ...note, items });
    } catch (error) {
      console.error("Error fetching vendor debit note:", error);
      res.status(500).json({ message: "Failed to fetch vendor debit note" });
    }
  });

  // Create vendor debit note
  app.post('/api/vendor-debit-notes', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res) => {
    try {
      const { vendorId, purchaseOrderId, debitDate, reason, notes, items } = req.body;

      // Validate required fields
      if (!vendorId || !debitDate || !reason || !items || items.length === 0) {
        return res.status(400).json({ message: "Vendor, date, reason, and at least one item are required" });
      }

      // Generate note number: VDN-YYYYMMDD-{seq}
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Get count of today's vendor debit notes for sequence
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const existingToday = await db.select({ count: sql<number>`count(*)` })
        .from(vendorDebitNotes)
        .where(gte(vendorDebitNotes.createdAt, todayStart.toISOString()));
      
      const sequence = (Number(existingToday[0]?.count) || 0) + 1;
      const noteNumber = `VDN-${dateStr}-${sequence.toString().padStart(3, '0')}`;

      // Calculate totals
      let subtotal = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      for (const item of items) {
        const taxableValue = Math.round(item.quantity * item.unitPrice);
        subtotal += taxableValue;
        
        const cgstAmount = Math.round(taxableValue * (item.cgstRate || 0) / 10000);
        const sgstAmount = Math.round(taxableValue * (item.sgstRate || 0) / 10000);
        const igstAmount = Math.round(taxableValue * (item.igstRate || 0) / 10000);
        
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        totalIgst += igstAmount;
      }

      const grandTotal = subtotal + totalCgst + totalSgst + totalIgst;

      // Create debit note and items in transaction
      let createdNote: any;
      
      await db.transaction(async (tx) => {
        const [note] = await tx.insert(vendorDebitNotes).values({
          noteNumber,
          vendorId,
          purchaseOrderId: purchaseOrderId || null,
          debitDate,
          reason,
          status: 'issued',
          subtotal,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          grandTotal,
          issuedBy: req.user?.id,
          notes: notes || null,
        }).returning();

        createdNote = note;

        // Insert items
        for (const item of items) {
          const taxableValue = Math.round(item.quantity * item.unitPrice);
          const cgstAmount = Math.round(taxableValue * (item.cgstRate || 0) / 10000);
          const sgstAmount = Math.round(taxableValue * (item.sgstRate || 0) / 10000);
          const igstAmount = Math.round(taxableValue * (item.igstRate || 0) / 10000);
          const totalAmount = taxableValue + cgstAmount + sgstAmount + igstAmount;

          await tx.insert(vendorDebitNoteItems).values({
            vendorDebitNoteId: note.id,
            rawMaterialId: item.rawMaterialId || null,
            description: item.description,
            hsnCode: item.hsnCode || null,
            quantity: item.quantity,
            unit: item.unit || 'units',
            unitPrice: item.unitPrice,
            taxableValue,
            cgstRate: item.cgstRate || 0,
            cgstAmount,
            sgstRate: item.sgstRate || 0,
            sgstAmount,
            igstRate: item.igstRate || 0,
            igstAmount,
            totalAmount,
          });
        }

        await logAudit(
          req.user?.id,
          'CREATE',
          'vendor_debit_notes',
          note.id,
          `Vendor Debit Note ${noteNumber} created. Reason: ${reason}. Amount: ₹${(grandTotal / 100).toFixed(2)}`
        );
      });

      res.json({
        message: `Vendor Debit Note ${noteNumber} created successfully`,
        noteNumber,
        id: createdNote.id,
        grandTotal,
      });
    } catch (error) {
      console.error("Error creating vendor debit note:", error);
      res.status(500).json({ message: "Failed to create vendor debit note" });
    }
  });

  // Update vendor debit note status - allow create OR edit for workflow progression
  app.patch('/api/vendor-debit-notes/:id/status', async (req: any, res) => {
    try {
      // Manual permission check - allow create OR edit for workflow progression
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(403).json({ message: "Forbidden: No role assigned" });
      }
      
      const role = await storage.getUserRole(user.roleId);
      if (!role) {
        return res.status(403).json({ message: "Forbidden: Invalid role" });
      }
      
      // Check database permissions - allow create OR edit for workflow progression
      const permission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'vendor_debit_notes'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      
      if (permission.length === 0 || (permission[0].canCreate !== 1 && permission[0].canEdit !== 1)) {
        return res.status(403).json({ message: "Forbidden: Requires create or edit permission" });
      }
      
      const { id } = req.params;
      const { status, settlementDate, settlementReference, settledAmount } = req.body;

      const validStatuses = ['draft', 'issued', 'acknowledged', 'settled', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updateData: any = { status, updatedAt: new Date().toISOString() };
      
      if (status === 'settled') {
        updateData.settlementDate = settlementDate || new Date().toISOString().split('T')[0];
        updateData.settlementReference = settlementReference || null;
        if (settledAmount !== undefined) {
          updateData.settledAmount = settledAmount;
        }
      }

      const [updated] = await db.update(vendorDebitNotes)
        .set(updateData)
        .where(eq(vendorDebitNotes.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Vendor debit note not found" });
      }

      await logAudit(
        req.user?.id,
        'UPDATE',
        'vendor_debit_notes',
        id,
        `Vendor Debit Note ${updated.noteNumber} status updated to ${status}`
      );

      res.json({ message: "Status updated successfully", note: updated });
    } catch (error) {
      console.error("Error updating vendor debit note status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Get vendor debit notes by vendor ID
  app.get('/api/vendor-debit-notes/vendor/:vendorId', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      
      const notes = await db.select()
        .from(vendorDebitNotes)
        .where(and(eq(vendorDebitNotes.vendorId, vendorId), eq(vendorDebitNotes.recordStatus, 1)))
        .orderBy(desc(vendorDebitNotes.createdAt));

      res.json(notes);
    } catch (error) {
      console.error("Error fetching vendor debit notes:", error);
      res.status(500).json({ message: "Failed to fetch vendor debit notes" });
    }
  });

  // Get pending invoices for a vendor - matches invoices by buyer name to vendor name
  // Used for adjusting vendor debit notes against sales invoices owed by the vendor
  app.get('/api/vendor-debit-notes/pending-invoices/:vendorId', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      
      // Get the vendor details to find matching invoices by buyer name
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      // Find invoices where buyer matches this vendor (by name or ship_to_name)
      const vendorInvoices = await db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        buyerName: invoices.buyerName,
        totalAmount: invoices.totalAmount,
        amountReceived: invoices.amountReceived,
        status: invoices.status,
      })
        .from(invoices)
        .where(and(
          eq(invoices.recordStatus, 1),
          or(
            eq(invoices.buyerName, vendor.vendorName),
            eq(invoices.buyerName, vendor.shipToName || '')
          )
        ))
        .orderBy(desc(invoices.invoiceDate));
      
      // Get existing payments for these invoices
      const invoiceIds = vendorInvoices.map(inv => inv.id);
      
      const existingPayments = invoiceIds.length > 0
        ? await db.select({
            invoiceId: invoicePayments.invoiceId,
            amount: invoicePayments.amount,
          })
          .from(invoicePayments)
          .where(and(
            inArray(invoicePayments.invoiceId, invoiceIds),
            eq(invoicePayments.recordStatus, 1)
          ))
        : [];
      
      const paymentsByInvoice = existingPayments.reduce((acc, p) => {
        if (p.invoiceId) {
          acc[p.invoiceId] = (acc[p.invoiceId] || 0) + p.amount;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Return invoices with pending amounts (totalAmount - paid)
      const pendingInvoices = vendorInvoices.map(inv => ({
        ...inv,
        paidAmount: paymentsByInvoice[inv.id] || inv.amountReceived || 0,
        pendingAmount: (inv.totalAmount || 0) - (paymentsByInvoice[inv.id] || inv.amountReceived || 0),
      })).filter(inv => inv.pendingAmount > 0);
      
      res.json(pendingInvoices);
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
      res.status(500).json({ message: "Failed to fetch pending invoices" });
    }
  });

  // Get pending purchase orders for a vendor for adjustment
  app.get('/api/vendor-debit-notes/pending-purchase-orders/:vendorId', isAuthenticated, async (req: any, res) => {
    try {
      const { vendorId } = req.params;
      
      // Get POs with pending amounts (delivered but not fully settled)
      const vendorPOs = await db.select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        poDate: purchaseOrders.poDate,
        grandTotal: purchaseOrders.grandTotal,
        status: purchaseOrders.status,
        vendorId: purchaseOrders.vendorId,
      })
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.vendorId, vendorId),
          eq(purchaseOrders.recordStatus, 1),
          inArray(purchaseOrders.status, ['delivered', 'partially_delivered', 'approved'])
        ))
        .orderBy(desc(purchaseOrders.poDate));

      // Get existing adjustments for these POs
      const poIds = vendorPOs.map(po => po.id);
      
      const existingAdjustments = poIds.length > 0
        ? await db.select({
            purchaseOrderId: vendorDebitNoteAdjustments.purchaseOrderId,
            adjustmentAmount: vendorDebitNoteAdjustments.adjustmentAmount,
          })
          .from(vendorDebitNoteAdjustments)
          .where(and(
            inArray(vendorDebitNoteAdjustments.purchaseOrderId, poIds),
            eq(vendorDebitNoteAdjustments.recordStatus, 1)
          ))
        : [];

      const adjustmentsByPO = existingAdjustments.reduce((acc, a) => {
        if (a.purchaseOrderId) {
          acc[a.purchaseOrderId] = (acc[a.purchaseOrderId] || 0) + a.adjustmentAmount;
        }
        return acc;
      }, {} as Record<string, number>);

      const pendingPOs = vendorPOs.map(po => ({
        ...po,
        adjustedAmount: adjustmentsByPO[po.id] || 0,
        pendingAmount: (po.grandTotal || 0) - (adjustmentsByPO[po.id] || 0),
      })).filter(po => po.pendingAmount > 0);

      res.json(pendingPOs);
    } catch (error) {
      console.error("Error fetching pending purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch pending purchase orders" });
    }
  });

  // Create debit note adjustment (link to invoice or PO)
  app.post('/api/vendor-debit-notes/:id/adjustments', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res) => {
    try {
      const { id: debitNoteId } = req.params;
      const { referenceType, invoiceId, purchaseOrderId, adjustmentAmount, remarks } = req.body;

      // Validate debit note exists and has unsettled balance
      const [debitNote] = await db.select()
        .from(vendorDebitNotes)
        .where(and(eq(vendorDebitNotes.id, debitNoteId), eq(vendorDebitNotes.recordStatus, 1)));

      if (!debitNote) {
        return res.status(404).json({ message: "Vendor debit note not found" });
      }

      const unsettledAmount = debitNote.grandTotal - debitNote.settledAmount;
      if (adjustmentAmount > unsettledAmount) {
        return res.status(400).json({ 
          message: `Adjustment amount (₹${(adjustmentAmount / 100).toFixed(2)}) exceeds unsettled balance (₹${(unsettledAmount / 100).toFixed(2)})` 
        });
      }

      // Validate reference exists
      if (referenceType === 'invoice' && invoiceId) {
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
        if (!invoice) {
          return res.status(404).json({ message: "Invoice not found" });
        }
      } else if (referenceType === 'purchase_order' && purchaseOrderId) {
        const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, purchaseOrderId));
        if (!po) {
          return res.status(404).json({ message: "Purchase order not found" });
        }
      } else {
        return res.status(400).json({ message: "Invalid reference type or missing reference ID" });
      }

      // Create adjustment in transaction
      await db.transaction(async (tx) => {
        // Insert adjustment record
        await tx.insert(vendorDebitNoteAdjustments).values({
          vendorDebitNoteId: debitNoteId,
          referenceType,
          invoiceId: referenceType === 'invoice' ? invoiceId : null,
          purchaseOrderId: referenceType === 'purchase_order' ? purchaseOrderId : null,
          adjustmentAmount,
          adjustmentDate: new Date().toISOString().split('T')[0],
          remarks,
          adjustedBy: req.user?.id,
        });

        // Update settled amount on debit note
        await tx.update(vendorDebitNotes)
          .set({ 
            settledAmount: debitNote.settledAmount + adjustmentAmount,
            status: (debitNote.settledAmount + adjustmentAmount) >= debitNote.grandTotal ? 'settled' : 'issued',
          })
          .where(eq(vendorDebitNotes.id, debitNoteId));

        // If adjusting against an invoice, record it as a payment and update amountReceived
        if (referenceType === 'invoice' && invoiceId) {
          // Get current invoice to update amountReceived
          const [currentInvoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
          
          await tx.insert(invoicePayments).values({
            invoiceId,
            paymentDate: new Date().toISOString(),
            amount: adjustmentAmount,
            paymentMethod: 'Debit Note Adjustment',
            referenceNumber: debitNote.noteNumber,
            paymentType: 'Adjustment',
            remarks: `Adjusted against Vendor Debit Note ${debitNote.noteNumber}`,
            recordedBy: req.user?.id,
          });

          // Update invoice amountReceived to reflect the adjustment
          const currentAmountReceived = currentInvoice?.amountReceived || 0;
          await tx.update(invoices)
            .set({ amountReceived: currentAmountReceived + adjustmentAmount })
            .where(eq(invoices.id, invoiceId));
        }
      });

      await logAudit(
        req.user?.id,
        'CREATE',
        'vendor_debit_note_adjustments',
        debitNoteId,
        `Adjustment of ₹${(adjustmentAmount / 100).toFixed(2)} created for ${referenceType} ${invoiceId || purchaseOrderId}`
      );

      res.json({ message: "Adjustment created successfully" });
    } catch (error: any) {
      console.error("Error creating adjustment:", error);
      console.error("Error details:", error?.message, error?.stack);
      res.status(500).json({ message: error?.message || "Failed to create adjustment" });
    }
  });

  // Delete a vendor debit note (revokes all adjustments and payments)
  app.delete('/api/vendor-debit-notes/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id: debitNoteId } = req.params;

      // Get the debit note
      const [debitNote] = await db.select()
        .from(vendorDebitNotes)
        .where(and(eq(vendorDebitNotes.id, debitNoteId), eq(vendorDebitNotes.recordStatus, 1)));

      if (!debitNote) {
        return res.status(404).json({ message: "Vendor debit note not found" });
      }

      // Get all adjustments for this debit note
      const adjustments = await db.select()
        .from(vendorDebitNoteAdjustments)
        .where(and(
          eq(vendorDebitNoteAdjustments.vendorDebitNoteId, debitNoteId),
          eq(vendorDebitNoteAdjustments.recordStatus, 1)
        ));

      await db.transaction(async (tx) => {
        // For each adjustment, find and soft-delete the corresponding invoice payment
        // and reverse the amountReceived update
        for (const adjustment of adjustments) {
          if (adjustment.referenceType === 'invoice' && adjustment.invoiceId) {
            // Get current invoice to update amountReceived
            const [currentInvoice] = await tx.select().from(invoices).where(eq(invoices.id, adjustment.invoiceId));
            
            // Find the payment record created for this adjustment
            await tx.update(invoicePayments)
              .set({ recordStatus: 0 })
              .where(and(
                eq(invoicePayments.invoiceId, adjustment.invoiceId),
                eq(invoicePayments.referenceNumber, debitNote.noteNumber),
                eq(invoicePayments.paymentMethod, 'Debit Note Adjustment'),
                eq(invoicePayments.recordStatus, 1)
              ));

            // Decrease invoice amountReceived to reverse the adjustment
            if (currentInvoice) {
              const newAmountReceived = Math.max(0, (currentInvoice.amountReceived || 0) - adjustment.adjustmentAmount);
              await tx.update(invoices)
                .set({ amountReceived: newAmountReceived })
                .where(eq(invoices.id, adjustment.invoiceId));
            }
          }
        }

        // Soft-delete all adjustments
        await tx.update(vendorDebitNoteAdjustments)
          .set({ recordStatus: 0 })
          .where(eq(vendorDebitNoteAdjustments.vendorDebitNoteId, debitNoteId));

        // Soft-delete the debit note
        await tx.update(vendorDebitNotes)
          .set({ 
            recordStatus: 0,
            status: 'cancelled'
          })
          .where(eq(vendorDebitNotes.id, debitNoteId));
      });

      await logAudit(
        req.user?.id,
        'DELETE',
        'vendor_debit_notes',
        debitNoteId,
        `Deleted vendor debit note ${debitNote.noteNumber}. Revoked ${adjustments.length} adjustment(s).`
      );

      res.json({ 
        message: "Debit note deleted successfully", 
        revokedAdjustments: adjustments.length 
      });
    } catch (error) {
      console.error("Error deleting vendor debit note:", error);
      res.status(500).json({ message: "Failed to delete vendor debit note" });
    }
  });

  // Get adjustments for a debit note
  app.get('/api/vendor-debit-notes/:id/adjustments', isAuthenticated, async (req: any, res) => {
    try {
      const { id: debitNoteId } = req.params;

      const adjustments = await db.select({
        id: vendorDebitNoteAdjustments.id,
        referenceType: vendorDebitNoteAdjustments.referenceType,
        invoiceId: vendorDebitNoteAdjustments.invoiceId,
        purchaseOrderId: vendorDebitNoteAdjustments.purchaseOrderId,
        adjustmentAmount: vendorDebitNoteAdjustments.adjustmentAmount,
        adjustmentDate: vendorDebitNoteAdjustments.adjustmentDate,
        remarks: vendorDebitNoteAdjustments.remarks,
        createdAt: vendorDebitNoteAdjustments.createdAt,
        invoiceNumber: invoices.invoiceNumber,
        poNumber: purchaseOrders.poNumber,
      })
        .from(vendorDebitNoteAdjustments)
        .leftJoin(invoices, eq(vendorDebitNoteAdjustments.invoiceId, invoices.id))
        .leftJoin(purchaseOrders, eq(vendorDebitNoteAdjustments.purchaseOrderId, purchaseOrders.id))
        .where(and(
          eq(vendorDebitNoteAdjustments.vendorDebitNoteId, debitNoteId),
          eq(vendorDebitNoteAdjustments.recordStatus, 1)
        ))
        .orderBy(desc(vendorDebitNoteAdjustments.createdAt));

      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching adjustments:", error);
      res.status(500).json({ message: "Failed to fetch adjustments" });
    }
  });

  // Sales Analytics - Get aggregated sales data by time period
  app.get('/api/sales-analytics', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { period = 'monthly', year, dateFrom, dateTo } = req.query;
      
      // Fetch all invoices
      const allInvoices = await storage.getAllInvoices();
      
      // Fetch credit notes for net revenue calculation
      const allCreditNotes = await db.select().from(creditNotes).where(
        and(eq(creditNotes.recordStatus, 1), eq(creditNotes.status, 'issued'))
      );
      
      // Group credit notes by invoice ID
      const creditNotesByInvoice = new Map<string, number>();
      allCreditNotes.forEach(cn => {
        if (cn.invoiceId) {
          const current = creditNotesByInvoice.get(cn.invoiceId) || 0;
          creditNotesByInvoice.set(cn.invoiceId, current + cn.grandTotal);
        }
      });
      
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
      
      // Fetch vendors for vendor-linked credit notes
      const allVendors = await storage.getAllVendors();

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

        // Calculate net revenue = gross - credit notes for this invoice
        const invoiceCredits = creditNotesByInvoice.get(invoice.id) || 0;
        const netRevenue = invoice.totalAmount - invoiceCredits;
        
        periodData[periodInfo.key].revenue += netRevenue;
        periodData[periodInfo.key].invoiceCount += 1;
      });
      
      // Also subtract vendor-linked credit notes (distributed across periods proportionally)
      // For simplicity, we subtract them from the total at the end

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

      // Calculate totals from analytics (invoice-linked credit notes already subtracted per invoice)
      const grossTotalRevenue = analytics.reduce((sum, p) => sum + p.revenue, 0);
      const netTotalRevenue = grossTotalRevenue;
      
      const totals = {
        totalRevenue: netTotalRevenue,
        totalQuantity: analytics.reduce((sum, p) => sum + p.quantity, 0),
        totalInvoices: analytics.reduce((sum, p) => sum + p.invoiceCount, 0),
        avgOrderValue: analytics.length > 0 ? netTotalRevenue / analytics.reduce((sum, p) => sum + p.invoiceCount, 0) : 0,
      };

      // Calculate vendor type breakdown (same logic as vendor-analytics)
      // Get vendor types
      const allVendorTypes = await storage.getAllVendorTypes();
      const vendorTypeLinks = await db.select().from(vendorVendorTypes).where(eq(vendorVendorTypes.recordStatus, 1));

      // Build vendor type breakdown by primary type only (with net revenue)
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
              // Use net revenue (gross - credit notes)
              const invoiceCredits = creditNotesByInvoice.get(invoice.id) || 0;
              typeBreakdown[primaryType.name].revenue += (invoice.totalAmount - invoiceCredits);
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

      // Get all credit notes and debit notes for outstanding balance and net revenue calculation
      const allCreditNotes = await db.select().from(creditNotes).where(
        and(eq(creditNotes.recordStatus, 1), eq(creditNotes.status, 'issued'))
      );
      const allDebitNotes = await db.select().from(debitNotes).where(
        and(eq(debitNotes.recordStatus, 1), eq(debitNotes.status, 'issued'))
      );

      // Group credit notes by invoice ID (for credit notes linked to invoices)
      const creditNotesByInvoice = new Map<string, number>();
      allCreditNotes.forEach(cn => {
        if (cn.invoiceId) {
          const current = creditNotesByInvoice.get(cn.invoiceId) || 0;
          creditNotesByInvoice.set(cn.invoiceId, current + cn.grandTotal);
        }
      });

      const debitNotesByInvoice = new Map<string, number>();
      allDebitNotes.forEach(dn => {
        const current = debitNotesByInvoice.get(dn.invoiceId) || 0;
        debitNotesByInvoice.set(dn.invoiceId, current + dn.grandTotal);
      });

      // Calculate analytics for each vendor
      const vendorAnalytics = await Promise.all(allVendors.map(async (vendor) => {
        // Find invoices for this vendor (where buyerName matches vendorName)
        const vendorInvoices = allInvoices.filter(inv => 
          inv.buyerName === vendor.vendorName && inv.recordStatus === 1
        );

        // Calculate gross revenue, quantity, and orders
        const grossRevenue = vendorInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalOrders = vendorInvoices.length;

        // Calculate total quantity from invoice items
        const invoiceIds = new Set(vendorInvoices.map(inv => inv.id));
        const vendorItems = allItems.filter(item => invoiceIds.has(item.invoiceId));
        const totalQuantity = vendorItems.reduce((sum, item) => sum + item.quantity, 0);

        // Calculate credit notes for this vendor (invoice-linked only)
        const totalPaid = vendorInvoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);
        const invoiceCreditNotes = vendorInvoices.reduce((sum, inv) => sum + (creditNotesByInvoice.get(inv.id) || 0), 0);
        const totalDebits = vendorInvoices.reduce((sum, inv) => sum + (debitNotesByInvoice.get(inv.id) || 0), 0);
        
        // Net revenue = gross - invoice-linked credit notes
        const totalRevenue = grossRevenue - invoiceCreditNotes;
        
        // Outstanding balance = max(0, (grossAmount + debitNotes) - creditNotes - amountReceived)
        const outstandingBalance = Math.max(0, (grossRevenue + totalDebits) - invoiceCreditNotes - totalPaid);

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

        // Update invoice.amountReceived to reflect the payment (for vendor analytics consistency)
        const currentAmountReceived = invoice.amountReceived || 0;
        await db.update(invoices)
          .set({ amountReceived: currentAmountReceived + allocationAmount })
          .where(eq(invoices.id, invoice.id));

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

  // Edit Payment - Update payment date, method, reference, bank, remarks, and amount (PY- only)
  app.patch('/api/invoice-payments/:id', requireRole('admin', 'manager'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { paymentDate, paymentMethod, referenceNumber, bankName, remarks, amount, amountChangeReason } = req.body;

      // Get the payment to verify it exists and is not cancelled
      const [payment] = await db.select().from(invoicePayments).where(eq(invoicePayments.id, id));
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.cancelledAt) {
        return res.status(400).json({ message: "Cannot edit a cancelled payment" });
      }

      if (payment.paymentType === 'Write-off') {
        return res.status(400).json({ message: "Cannot edit write-off payments" });
      }

      // Check if trying to edit amount
      const isAmountChange = amount !== undefined && amount !== payment.amount;
      
      if (isAmountChange) {
        // Require reason for amount changes
        if (!amountChangeReason || !amountChangeReason.trim()) {
          return res.status(400).json({ message: "A reason is required when changing payment amount" });
        }

        // Validate amount is positive
        if (amount <= 0) {
          return res.status(400).json({ message: "Payment amount must be positive" });
        }
      }

      // Update the payment
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (paymentDate) {
        updateData.paymentDate = new Date(paymentDate).toISOString();
      }
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
      if (referenceNumber !== undefined) {
        updateData.referenceNumber = referenceNumber || null;
      }
      if (bankName !== undefined) {
        updateData.bankName = bankName || null;
      }
      if (remarks !== undefined) {
        updateData.remarks = remarks || null;
      }
      if (isAmountChange) {
        updateData.amount = amount;
      }

      const oldAmount = payment.amount;

      await db.update(invoicePayments)
        .set(updateData)
        .where(eq(invoicePayments.id, id));

      // If amount changed, recalculate invoice's amountReceived
      if (isAmountChange) {
        // Get all active payments for this invoice
        const allPayments = await db.select()
          .from(invoicePayments)
          .where(and(
            eq(invoicePayments.invoiceId, payment.invoiceId),
            eq(invoicePayments.recordStatus, 1)
          ));
        
        // Only count non-cancelled payments
        const totalReceived = allPayments
          .filter(p => !p.cancelledAt)
          .reduce((sum, p) => sum + p.amount, 0);
        
        // Update invoice amountReceived
        await db.update(invoices)
          .set({ 
            amountReceived: totalReceived,
            updatedAt: new Date().toISOString()
          })
          .where(eq(invoices.id, payment.invoiceId));

        await logAudit(
          req.user?.id, 
          'UPDATE', 
          'invoice_payments', 
          id, 
          `Amount changed from ₹${(oldAmount / 100).toFixed(2)} to ₹${(amount / 100).toFixed(2)}. Reason: ${amountChangeReason}. Invoice balance recalculated.`
        );
      } else {
        await logAudit(
          req.user?.id, 
          'UPDATE', 
          'invoice_payments', 
          id, 
          `Updated payment details: ${Object.keys(updateData).filter(k => k !== 'updatedAt').join(', ')}`
        );
      }

      // Fetch updated payment
      const [updatedPayment] = await db.select().from(invoicePayments).where(eq(invoicePayments.id, id));

      res.json({ payment: updatedPayment, message: "Payment updated successfully" });
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ message: "Failed to update payment" });
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

  // Get current user's permissions (any authenticated user)
  app.get('/api/my-permissions', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(404).json({ message: "User or role not found" });
      }

      // Get the role details
      const role = await storage.getRole(user.roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Get permissions for this role
      const permissions = await storage.getRolePermissions(user.roleId);

      // Return role name and permissions
      res.json({
        role: role.name,
        roleId: user.roleId,
        permissions: permissions.map(p => ({
          screenKey: p.screenKey,
          canView: p.canView === 1,
          canCreate: p.canCreate === 1,
          canEdit: p.canEdit === 1,
          canDelete: p.canDelete === 1,
        }))
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
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

        // SECURITY: Users without edit permission can only view their own submissions
        const checklistPermission = await db.select()
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, user.roleId),
            eq(rolePermissions.screenKey, 'checklist_submissions'),
            eq(rolePermissions.recordStatus, 1)
          ))
          .limit(1);
        const hasFullAccess = checklistPermission.length > 0 && checklistPermission[0].canEdit === 1;
        
        if (!hasFullAccess && submission.reviewerId !== req.user.id) {
          console.log(`[AUDIT] User ${req.user.id} attempted to access assignment ${id} not assigned to them`);
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
      
      // SECURITY: Users without edit permission can only modify their own submissions
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const checklistPermission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'checklist_submissions'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      const hasFullAccess = checklistPermission.length > 0 && checklistPermission[0].canDelete === 1;
      
      if (!hasFullAccess && submission.reviewerId !== req.user.id) {
        console.log(`[AUDIT] User ${req.user.id} attempted to modify submission ${id} not assigned to them`);
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

      // Users without edit permission can only see their own tasks
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const taskPermission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'machine_startup_tasks'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      const hasFullAccess = taskPermission.length > 0 && taskPermission[0].canEdit === 1;
      
      if (!hasFullAccess) {
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

      // Users without edit permission can only view their own tasks
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const taskPermission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'machine_startup_tasks'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      const hasFullAccess = taskPermission.length > 0 && taskPermission[0].canEdit === 1;
      
      if (!hasFullAccess && task.assignedUserId !== req.user.id) {
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

      // Users without full edit permission can only mark their own tasks as completed with limited fields
      const user = await storage.getUser(req.user.id);
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const taskPermission = await db.select()
        .from(rolePermissions)
        .where(and(
          eq(rolePermissions.roleId, user.roleId),
          eq(rolePermissions.screenKey, 'machine_startup_tasks'),
          eq(rolePermissions.recordStatus, 1)
        ))
        .limit(1);
      const hasFullAccess = taskPermission.length > 0 && taskPermission[0].canDelete === 1;
      
      if (!hasFullAccess) {
        if (task.assignedUserId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        // Users without full access can only update status and machineStartedAt
        const { status, machineStartedAt } = req.body;
        const updateData: any = {};
        if (status) updateData.status = status;
        if (machineStartedAt) updateData.machineStartedAt = new Date(machineStartedAt);
        
        const updated = await storage.updateMachineStartupTask(id, updateData);
        console.log(`[AUDIT] User ${req.user.username} updated startup task ${id} status to ${status}`);
        return res.json(updated);
      }

      // Users with full access can update any field
      const updated = await storage.updateMachineStartupTask(id, req.body);
      console.log(`[AUDIT] User ${req.user.username} (full access) updated startup task ${id}`);
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

  // Sync WhatsApp secrets from environment to database
  app.post('/api/notification-config/sync-whatsapp-secrets', requireRole('admin'), async (req: any, res) => {
    try {
      const config = await storage.getNotificationConfig();
      if (!config) {
        return res.status(404).json({ message: "Notification config not found" });
      }

      const updates: any = {};
      let synced = [];

      // Sync WhatsApp Phone Number ID
      if (process.env.WHATSAPP_PHONE_NUMBER_ID) {
        updates.metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        synced.push('Meta Phone Number ID');
      }

      // Sync WhatsApp Access Token
      if (process.env.WHATSAPP_ACCESS_TOKEN) {
        updates.metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        synced.push('Meta Access Token');
      }

      // Sync WhatsApp Verify Token
      if (process.env.WHATSAPP_VERIFY_TOKEN) {
        updates.metaVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        synced.push('Meta Verify Token');
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No WhatsApp secrets found in environment variables" });
      }

      const updated = await storage.updateNotificationConfig(config.id, updates);
      console.log(`[AUDIT] ${req.user.username} synced WhatsApp secrets to database: ${synced.join(', ')}`);
      
      res.json({ 
        success: true, 
        message: `Synced ${synced.length} WhatsApp settings to database`,
        synced 
      });
    } catch (error) {
      console.error("Error syncing WhatsApp secrets:", error);
      res.status(500).json({ message: "Failed to sync WhatsApp secrets" });
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
    { name: 'itemDetails', maxCount: 1 },
    { name: 'paymentsReport', maxCount: 1 }
  ]), async (req: any, res: Response) => {
    try {
      const files = req.files as {
        partyReport?: Express.Multer.File[];
        saleReport?: Express.Multer.File[];
        itemDetails?: Express.Multer.File[];
        paymentsReport?: Express.Multer.File[];
      };

      // Check if Sale Report is provided (Party Report is optional if vendors exist)
      if (!files?.saleReport?.[0]) {
        return res.status(400).json({ 
          success: false,
          error: 'Sale Report file is required'
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
      const partyPath = files?.partyReport?.[0] ? path.join(tmpDir, `party-${timestamp}.xlsx`) : null;
      const salePath = path.join(tmpDir, `sale-${timestamp}.xlsx`);
      const itemPath = path.join(tmpDir, `item-${timestamp}.xlsx`);
      const paymentsPath = files?.paymentsReport?.[0] ? path.join(tmpDir, `payments-${timestamp}.xlsx`) : null;

      if (partyPath && files?.partyReport?.[0]) {
        fs.writeFileSync(partyPath, files.partyReport[0].buffer);
      }
      fs.writeFileSync(salePath, files.saleReport[0].buffer);
      fs.writeFileSync(itemPath, itemDetailsBuffer);
      if (paymentsPath && files?.paymentsReport?.[0]) {
        fs.writeFileSync(paymentsPath, files.paymentsReport[0].buffer);
      }

      console.log('[DATA IMPORT] Starting import from uploaded files');
      console.log('[DATA IMPORT] Party Report:', partyPath ? 'provided' : 'not provided (using existing vendors)');
      console.log('[DATA IMPORT] Payments Report:', paymentsPath ? 'provided' : 'not provided');
      
      // Run import
      const result = await importVyapaarData(partyPath, salePath, itemPath, paymentsPath);

      // Clean up temporary files
      try {
        if (partyPath) fs.unlinkSync(partyPath);
        fs.unlinkSync(salePath);
        fs.unlinkSync(itemPath);
        if (paymentsPath) fs.unlinkSync(paymentsPath);
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

  // Credit Notes import endpoint (from Vyapaar export)
  app.post('/api/import-credit-notes', isAuthenticated, requireRole('admin'), upload.single('creditNotesFile'), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'Credit Notes file is required'
        });
      }

      // Create temporary directory
      const tmpDir = path.join(process.cwd(), 'tmp', 'uploads');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Save file temporarily
      const timestamp = Date.now();
      const filePath = path.join(tmpDir, `creditnotes-${timestamp}.xlsx`);
      fs.writeFileSync(filePath, req.file.buffer);

      console.log('[CREDIT NOTES IMPORT] Starting import...');
      
      // Run import
      const result = await importCreditNotesFromExcel(filePath);

      // Clean up
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('[CREDIT NOTES IMPORT] Failed to cleanup temp file:', cleanupError);
      }

      console.log('[CREDIT NOTES IMPORT] Import completed:', result);
      
      res.json(result);
    } catch (error: any) {
      console.error('[CREDIT NOTES IMPORT] Error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Credit notes import failed'
      });
    }
  });

  // Payments-only import endpoint (FIFO matching to existing invoices)
  app.post('/api/import-payments-only', isAuthenticated, requireRole('admin'), upload.single('paymentsFile'), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: 'Payments file is required'
        });
      }

      // Create temporary directory
      const tmpDir = path.join(process.cwd(), 'tmp', 'uploads');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Save file temporarily
      const timestamp = Date.now();
      const paymentsPath = path.join(tmpDir, `payments-${timestamp}.xlsx`);
      fs.writeFileSync(paymentsPath, req.file.buffer);

      console.log('[PAYMENTS IMPORT] Starting payments-only import...');
      
      // Run import
      const result = await importPaymentsOnly(paymentsPath);

      // Clean up
      try {
        fs.unlinkSync(paymentsPath);
      } catch (cleanupError) {
        console.error('[PAYMENTS IMPORT] Failed to cleanup temp file:', cleanupError);
      }

      console.log('[PAYMENTS IMPORT] Import completed:', result);
      
      res.json(result);
    } catch (error: any) {
      console.error('[PAYMENTS IMPORT] Error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Payments import failed'
      });
    }
  });

  // Clear only invoices data endpoint (keeps vendors and products)
  app.post('/api/clear-invoices-only', isAuthenticated, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      console.log('[INVOICE CLEAR] Clearing all invoice data...');
      
      // Clear in correct order due to FK constraints
      // Must delete payment_evidence first (references invoice_payments and invoices)
      const paymentEvidenceResult = await db.delete(paymentEvidence);
      const creditNoteItemsResult = await db.delete(creditNoteItems);
      const creditNotesResult = await db.delete(creditNotes);
      const invoiceItemsResult = await db.delete(invoiceItems);
      const invoicePaymentsResult = await db.delete(invoicePayments);
      const invoicesResult = await db.delete(invoices);
      
      const result = {
        success: true,
        message: 'All invoice data cleared successfully. Vendors and products preserved.',
        stats: {
          paymentEvidence: paymentEvidenceResult.rowCount || 0,
          creditNoteItems: creditNoteItemsResult.rowCount || 0,
          creditNotes: creditNotesResult.rowCount || 0,
          invoiceItems: invoiceItemsResult.rowCount || 0,
          invoicePayments: invoicePaymentsResult.rowCount || 0,
          invoices: invoicesResult.rowCount || 0,
        }
      };
      
      console.log('[INVOICE CLEAR] Clear completed:', result);
      
      res.json(result);
    } catch (error: any) {
      console.error('[INVOICE CLEAR] Error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to clear invoice data'
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

  // Clear discrepancy remarks from a cash register day
  app.post('/api/cash-register/days/:id/clear-discrepancy', isAuthenticated, requireRole('Admin'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const day = await storage.getCashRegisterDay(id);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      const updated = await storage.updateCashRegisterDay(id, {
        hasDiscrepancy: 0,
        discrepancyDetails: null,
      });
      
      await logAudit(req.user?.id, 'UPDATE', 'cash_register_days', id, 
        `Cleared discrepancy remarks for ${day.registerDate}`);
      res.json(updated);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error clearing discrepancy:', error);
      res.status(400).json({ message: error.message || 'Failed to clear discrepancy' });
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
            // Cash Register stores in rupees, expense_vouchers table uses paise
            const amountInPaise = amount * 100;
            const voucher = await storage.createExpenseVoucher({
              voucherNumber,
              voucherDate: day.registerDate,
              status: 'submitted',
              paymentMode: 'cash',
              totalAmount: amountInPaise,
              gstAmount: 0,
              netAmount: amountInPaise,
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
          message: `Cannot close day with variance of ₹${varianceAmount}. Please record an adjustment transaction (Expense for shortage, Cash Received for surplus) to balance the books first.` 
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

  // Update cash register transaction
  app.put('/api/cash-register/transactions/:id', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, reference, description, transferTo, sourceType } = req.body;
      
      const transaction = await storage.getCashRegisterTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      const day = await storage.getCashRegisterDay(transaction.dayId);
      if (!day) {
        return res.status(404).json({ message: 'Cash register day not found' });
      }
      
      if (day.status !== 'open') {
        return res.status(400).json({ message: 'Cannot update transactions on a closed or locked day' });
      }
      
      // Calculate the difference in amount to update day totals
      const oldAmount = transaction.amount || 0;
      const newAmount = amount !== undefined ? Math.round(parseFloat(amount)) : oldAmount;
      const amountDifference = newAmount - oldAmount;
      
      // Update day totals based on transaction type
      const dayUpdates: any = {};
      
      switch (transaction.transactionType) {
        case 'deposit':
          dayUpdates.totalDeposits = Math.max(0, day.totalDeposits + amountDifference);
          break;
        case 'cash_received':
          dayUpdates.totalCashReceived = Math.max(0, day.totalCashReceived + amountDifference);
          break;
        case 'expense':
          dayUpdates.totalExpenses = Math.max(0, day.totalExpenses + amountDifference);
          break;
        case 'transfer':
          dayUpdates.totalTransfers = Math.max(0, day.totalTransfers + amountDifference);
          break;
      }
      
      // Recalculate closing balance
      dayUpdates.closingBalance = day.openingBalance + 
        (dayUpdates.totalCashReceived ?? day.totalCashReceived) - 
        (dayUpdates.totalExpenses ?? day.totalExpenses) - 
        (dayUpdates.totalTransfers ?? day.totalTransfers);
      
      // Update the day
      await storage.updateCashRegisterDay(day.id, dayUpdates);
      
      // Update the transaction
      const txnUpdates: any = {};
      if (amount !== undefined) txnUpdates.amount = newAmount;
      if (reference !== undefined) txnUpdates.reference = reference;
      if (description !== undefined) txnUpdates.description = description;
      if (transferTo !== undefined) txnUpdates.transferTo = transferTo;
      if (sourceType !== undefined) txnUpdates.sourceType = sourceType;
      
      const updated = await storage.updateCashRegisterTransaction(id, txnUpdates);
      
      // For expense transactions, also update expense items if amount changed
      if (transaction.transactionType === 'expense' && amount !== undefined && amountDifference !== 0) {
        const expenseItemsList = await storage.getCashRegisterExpenseItems(id);
        
        if (expenseItemsList.length === 1) {
          // Single item: update its amount directly
          await storage.updateCashRegisterExpenseItem(expenseItemsList[0].id, { 
            amount: newAmount 
          });
        } else if (expenseItemsList.length > 1) {
          // Multiple items: distribute the change proportionally with remainder correction
          const totalItemAmount = expenseItemsList.reduce((sum, item) => sum + item.amount, 0);
          
          if (totalItemAmount > 0) {
            // Calculate proportional amounts, tracking allocated total
            const newAmounts: number[] = [];
            let allocatedTotal = 0;
            
            for (let i = 0; i < expenseItemsList.length; i++) {
              const item = expenseItemsList[i];
              if (i === expenseItemsList.length - 1) {
                // Last item gets the remainder to ensure sum matches exactly
                newAmounts.push(newAmount - allocatedTotal);
              } else {
                const ratio = item.amount / totalItemAmount;
                const newItemAmount = Math.round(newAmount * ratio);
                newAmounts.push(newItemAmount);
                allocatedTotal += newItemAmount;
              }
            }
            
            // Apply the calculated amounts
            for (let i = 0; i < expenseItemsList.length; i++) {
              await storage.updateCashRegisterExpenseItem(expenseItemsList[i].id, { 
                amount: newAmounts[i] 
              });
            }
          } else {
            // Zero-sum case: distribute equally across all items
            const equalShare = Math.floor(newAmount / expenseItemsList.length);
            const remainder = newAmount - (equalShare * expenseItemsList.length);
            
            for (let i = 0; i < expenseItemsList.length; i++) {
              // Last item gets any remainder
              const itemAmount = i === expenseItemsList.length - 1 
                ? equalShare + remainder 
                : equalShare;
              await storage.updateCashRegisterExpenseItem(expenseItemsList[i].id, { 
                amount: itemAmount 
              });
            }
          }
        }
        
        // Recalculate day discrepancy to update items_mismatch flag
        await recalculateDayDiscrepancy(day.id);
      }
      
      await logAudit(req.user?.id, 'UPDATE', 'cash_register_transactions', id, 
        `Transaction updated: ${transaction.transactionType} - old amount: ${oldAmount}, new amount: ${newAmount}`);
      
      res.json(updated);
    } catch (error: any) {
      console.error('[CASH_REGISTER] Error updating transaction:', error);
      res.status(500).json({ message: error.message || 'Failed to update transaction' });
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

  // Excel import - preview (admin only)
  app.post('/api/cash-register/import/preview', isAuthenticated, requireRole('admin'), documentUpload.single('file'), async (req: any, res: Response) => {
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

  // Excel import - commit (admin only)
  app.post('/api/cash-register/import/commit', isAuthenticated, requireRole('admin'), async (req: any, res: Response) => {
    try {
      const { rows, fileName, discrepancies } = req.body;
      
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ message: 'No rows to import' });
      }
      
      const result = await commitImport(rows, fileName, req.user?.id, discrepancies || []);
      
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

  // Bulk import from attached Excel file (admin only)
  app.post('/api/cash-register/import/bulk', isAuthenticated, requireRole('admin'), async (req: any, res: Response) => {
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
      
      // Fetch transactions for all days for line items export
      const allDayIds = sortedDays.map(d => d.id);
      let allTransactions: any[] = [];
      if (allDayIds.length > 0) {
        allTransactions = await db.select({
          id: cashRegisterTransactions.id,
          dayId: cashRegisterTransactions.dayId,
          transactionType: cashRegisterTransactions.transactionType,
          sourceType: cashRegisterTransactions.sourceType,
          amount: cashRegisterTransactions.amount,
          description: cashRegisterTransactions.description,
          reference: cashRegisterTransactions.reference,
          convertedToVoucherId: cashRegisterTransactions.convertedToVoucherId,
        })
        .from(cashRegisterTransactions)
        .where(and(
          inArray(cashRegisterTransactions.dayId, allDayIds),
          eq(cashRegisterTransactions.recordStatus, 1)
        ));
      }
      
      // Create day lookup for transaction mapping
      const dayLookup = new Map(sortedDays.map(d => [d.id, { date: d.registerDate, salespersonName: d.salespersonName }]));
      const transactionsWithDayInfo = allTransactions.map(t => {
        const dayInfo = dayLookup.get(t.dayId);
        return {
          ...t,
          date: dayInfo?.date || '',
          salespersonName: dayInfo?.salespersonName || '',
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
        transactions: transactionsWithDayInfo,
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
        // Get all expense vouchers from cash register (EXP-CR-* or CR-*)
        const allVouchers = await db.select({ id: expenseVouchers.id })
          .from(expenseVouchers)
          .where(and(
            or(
              sql`${expenseVouchers.voucherNumber} LIKE 'EXP-CR-%'`,
              sql`${expenseVouchers.voucherNumber} LIKE 'CR-%'`
            ),
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

  // Clear all cash register data (admin only)
  app.post('/api/cash-register/clear-data', isAuthenticated, requireRole('admin'), async (req: any, res: Response) => {
    try {
      console.log('[CASH_REGISTER] Clearing all cash register data...');
      
      // Delete in correct order due to foreign keys
      // 1. Delete expense items
      const itemsDeleted = await db.delete(cashRegisterExpenseItems).returning();
      
      // 2. Delete transactions
      const transactionsDeleted = await db.delete(cashRegisterTransactions).returning();
      
      // 3. Delete days
      const daysDeleted = await db.delete(cashRegisterDays).returning();
      
      // 4. Delete related vouchers (EXP-CR-* and CR-*)
      const vouchersResult = await db.execute(sql`
        DELETE FROM expense_items WHERE voucher_id IN (
          SELECT id FROM expense_vouchers WHERE voucher_number LIKE 'EXP-CR-%' OR voucher_number LIKE 'CR-%'
        );
        DELETE FROM expense_vouchers WHERE voucher_number LIKE 'EXP-CR-%' OR voucher_number LIKE 'CR-%';
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

  // ==================== FINISHED GOODS INVENTORY REPORT ====================
  
  // Finished goods report with product-wise grouping, mfg date, batch code, subtotals and totals
  app.get('/api/reports/finished-goods', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { dateFrom, dateTo, productId, qualityStatus } = req.query;
      
      // Build conditions for filtering - exclude items with 0 quantity
      const conditions: SQL[] = [
        eq(finishedGoods.recordStatus, 1),
        gt(finishedGoods.quantity, 0)
      ];
      
      if (dateFrom) {
        conditions.push(gte(finishedGoods.productionDate, dateFrom as string));
      }
      if (dateTo) {
        // Add time to include entire day
        conditions.push(lte(finishedGoods.productionDate, `${dateTo}T23:59:59.999Z`));
      }
      if (productId && productId !== 'all') {
        conditions.push(eq(finishedGoods.productId, productId as string));
      }
      if (qualityStatus && qualityStatus !== 'all') {
        conditions.push(eq(finishedGoods.qualityStatus, qualityStatus as string));
      }
      
      // Fetch finished goods with product details
      const finishedGoodsData = await db.select({
        id: finishedGoods.id,
        productId: finishedGoods.productId,
        productName: products.productName,
        batchNumber: finishedGoods.batchNumber,
        productionDate: finishedGoods.productionDate,
        quantity: finishedGoods.quantity,
        qualityStatus: finishedGoods.qualityStatus,
        storageLocation: finishedGoods.storageLocation,
      })
        .from(finishedGoods)
        .leftJoin(products, eq(finishedGoods.productId, products.id))
        .where(and(...conditions))
        .orderBy(products.productName, finishedGoods.productionDate, finishedGoods.batchNumber);
      
      // Group by product and calculate subtotals
      const productGroups: Record<string, {
        productId: string;
        productName: string;
        items: typeof finishedGoodsData;
        subtotal: number;
      }> = {};
      
      let grandTotal = 0;
      
      finishedGoodsData.forEach(fg => {
        const key = fg.productId;
        if (!productGroups[key]) {
          productGroups[key] = {
            productId: fg.productId,
            productName: fg.productName || 'Unknown Product',
            items: [],
            subtotal: 0,
          };
        }
        productGroups[key].items.push(fg);
        productGroups[key].subtotal += fg.quantity;
        grandTotal += fg.quantity;
      });
      
      // Convert to array and sort by product name
      const groupedData = Object.values(productGroups).sort((a, b) => 
        a.productName.localeCompare(b.productName)
      );
      
      // Calculate summary statistics
      const summary = {
        totalProducts: groupedData.length,
        totalBatches: finishedGoodsData.length,
        grandTotal,
        byQualityStatus: {
          pending: finishedGoodsData.filter(fg => fg.qualityStatus === 'pending').reduce((sum, fg) => sum + fg.quantity, 0),
          approved: finishedGoodsData.filter(fg => fg.qualityStatus === 'approved').reduce((sum, fg) => sum + fg.quantity, 0),
          rejected: finishedGoodsData.filter(fg => fg.qualityStatus === 'rejected').reduce((sum, fg) => sum + fg.quantity, 0),
        }
      };
      
      res.json({
        groupedData,
        summary,
        filters: { dateFrom, dateTo, productId, qualityStatus }
      });
    } catch (error: any) {
      console.error('[REPORTS] Error fetching finished goods report:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch finished goods report' });
    }
  });

  // ==================== MONTHLY SALES REPORT ====================
  
  // Monthly sales report with product-wise breakdown
  app.get('/api/reports/monthly-sales', isAuthenticated, async (req: any, res: Response) => {
    try {
      const { year, month, dateFrom, dateTo } = req.query;
      
      // Default to current year if not specified
      const reportYear = year ? parseInt(year as string) : new Date().getFullYear();
      const reportMonth = month ? parseInt(month as string) : null;
      
      // Calculate date range based on parameters
      let startDate: string;
      let endDate: string;
      
      if (dateFrom && dateTo) {
        // Custom date range
        startDate = dateFrom as string;
        endDate = dateTo as string;
      } else if (reportMonth) {
        // Specific month
        startDate = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(reportYear, reportMonth, 0).getDate();
        endDate = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${lastDay}`;
      } else {
        // Full year (April to March for financial year)
        startDate = `${reportYear}-04-01`;
        endDate = `${reportYear + 1}-03-31`;
      }
      
      // Fetch invoices within date range
      const invoicesData = await db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        buyerName: invoices.buyerName,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
      })
        .from(invoices)
        .where(and(
          gte(invoices.invoiceDate, startDate),
          lte(invoices.invoiceDate, endDate),
          ne(invoices.status, 'cancelled')
        ))
        .orderBy(invoices.invoiceDate);
      
      // Fetch invoice items for all invoices
      const invoiceIds = invoicesData.map(inv => inv.id);
      
      const itemsData = invoiceIds.length > 0 ? await db.select({
        invoiceId: invoiceItems.invoiceId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        totalAmount: invoiceItems.totalAmount,
      })
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, invoiceIds)) : [];
      
      // Create invoice lookup
      const invoiceLookup: Record<string, typeof invoicesData[0]> = {};
      invoicesData.forEach(inv => {
        invoiceLookup[inv.id] = inv;
      });
      
      // Group items by month and product
      const monthlyData: Record<string, {
        month: string;
        monthLabel: string;
        products: Record<string, {
          productName: string;
          totalQuantity: number;
          totalAmount: number;
          invoiceCount: number;
        }>;
        totalQuantity: number;
        totalAmount: number;
        invoiceCount: number;
      }> = {};
      
      // Track products per invoice to count unique invoices
      const productInvoices: Record<string, Set<string>> = {};
      
      itemsData.forEach(item => {
        const invoice = invoiceLookup[item.invoiceId];
        if (!invoice) return;
        
        const invoiceDate = new Date(invoice.invoiceDate);
        const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = invoiceDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            monthLabel,
            products: {},
            totalQuantity: 0,
            totalAmount: 0,
            invoiceCount: 0,
          };
        }
        
        const productName = item.description || 'Unknown Product';
        const productKey = `${monthKey}-${productName}`;
        
        if (!monthlyData[monthKey].products[productName]) {
          monthlyData[monthKey].products[productName] = {
            productName,
            totalQuantity: 0,
            totalAmount: 0,
            invoiceCount: 0,
          };
          productInvoices[productKey] = new Set();
        }
        
        monthlyData[monthKey].products[productName].totalQuantity += item.quantity || 0;
        monthlyData[monthKey].products[productName].totalAmount += item.totalAmount || 0;
        monthlyData[monthKey].totalQuantity += item.quantity || 0;
        monthlyData[monthKey].totalAmount += item.totalAmount || 0;
        
        // Track unique invoices per product
        if (!productInvoices[productKey].has(invoice.id)) {
          productInvoices[productKey].add(invoice.id);
          monthlyData[monthKey].products[productName].invoiceCount++;
        }
      });
      
      // Count unique invoices per month
      const monthInvoices: Record<string, Set<string>> = {};
      itemsData.forEach(item => {
        const invoice = invoiceLookup[item.invoiceId];
        if (!invoice) return;
        
        const invoiceDate = new Date(invoice.invoiceDate);
        const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthInvoices[monthKey]) {
          monthInvoices[monthKey] = new Set();
        }
        monthInvoices[monthKey].add(invoice.id);
      });
      
      Object.keys(monthlyData).forEach(monthKey => {
        monthlyData[monthKey].invoiceCount = monthInvoices[monthKey]?.size || 0;
      });
      
      // Convert to array sorted by month
      const months = Object.values(monthlyData)
        .map(m => ({
          ...m,
          products: Object.values(m.products)
            .filter(p => p.totalQuantity > 0)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
        }))
        .filter(m => m.products.length > 0)
        .sort((a, b) => a.month.localeCompare(b.month));
      
      // Calculate summary
      const summary = {
        totalMonths: months.length,
        totalQuantity: months.reduce((sum, m) => sum + m.totalQuantity, 0),
        totalAmount: months.reduce((sum, m) => sum + m.totalAmount, 0),
        totalInvoices: invoicesData.length,
        uniqueProducts: new Set(itemsData.map(i => i.description)).size,
      };
      
      res.json({
        months,
        summary,
        filters: { year: reportYear, month: reportMonth, startDate, endDate }
      });
    } catch (error: any) {
      console.error('[REPORTS] Error fetching monthly sales report:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch monthly sales report' });
    }
  });

  // ==================== SYSTEM ALERTS ====================
  
  // Get active system alerts (admin only)
  app.get('/api/system-alerts', requireRole('admin'), async (req: any, res: Response) => {
    try {
      const alerts = await storage.getActiveSystemAlerts();
      res.json({ alerts });
    } catch (error: any) {
      console.error('[SYSTEM_ALERTS] Error fetching alerts:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch system alerts' });
    }
  });

  // Acknowledge a system alert (admin only)
  app.post('/api/system-alerts/:id/acknowledge', requireRole('admin'), async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const alert = await storage.acknowledgeSystemAlert(id, req.user?.id);
      if (!alert) {
        return res.status(404).json({ message: 'Alert not found' });
      }
      res.json({ alert, message: 'Alert acknowledged' });
    } catch (error: any) {
      console.error('[SYSTEM_ALERTS] Error acknowledging alert:', error);
      res.status(500).json({ message: error.message || 'Failed to acknowledge alert' });
    }
  });

  // Manually resolve a system alert (admin only)
  app.post('/api/system-alerts/:entityType/:entityId/resolve', requireRole('admin'), async (req: any, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      await storage.resolveSystemAlert(entityType, entityId, req.user?.id);
      res.json({ message: 'Alert resolved successfully' });
    } catch (error: any) {
      console.error('[SYSTEM_ALERTS] Error resolving alert:', error);
      res.status(500).json({ message: error.message || 'Failed to resolve alert' });
    }
  });

  // Run oversell audit manually for all products (admin only)
  app.post('/api/system-alerts/audit-oversell', requireRole('admin'), async (req: any, res: Response) => {
    try {
      // Get all products with pending invoices
      const pendingProducts = await db.execute(sql`
        SELECT DISTINCT ii.product_id
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        WHERE ii.product_id IS NOT NULL
          AND ii.record_status = 1
          AND i.record_status = 1
          AND i.status NOT IN ('dispatched', 'delivered', 'cancelled')
      `);
      
      const productIds = (pendingProducts.rows as any[]).map(r => r.product_id);
      
      if (productIds.length === 0) {
        return res.json({ message: 'No pending invoices found', oversellProducts: [] });
      }
      
      const result = await storage.auditProductOversell(productIds);
      
      res.json({ 
        message: `Audit complete. ${result.oversellProducts.length} products have oversell conditions.`,
        oversellProducts: result.oversellProducts,
        totalProductsChecked: productIds.length
      });
    } catch (error: any) {
      console.error('[SYSTEM_ALERTS] Error running oversell audit:', error);
      res.status(500).json({ message: error.message || 'Failed to run oversell audit' });
    }
  });

  // ==================== MIS (Management Information System) API ENDPOINTS ====================
  
  // MIS Executive KPI Dashboard - Get key performance indicators
  app.get('/api/mis/kpi-dashboard', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res: Response) => {
    try {
      const { period = '30' } = req.query; // days
      const daysBack = parseInt(period as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      // Initialize default values
      let production: any = {};
      let sales: any = {};
      let paymentRows: any[] = [];
      let dispatch: any = {};
      let quality: any = {};
      let cash: any = {};
      
      // Production KPIs (graceful handling if table doesn't exist)
      try {
        const productionStats = await db.execute(sql`
          SELECT 
            COUNT(*) as total_entries,
            COALESCE(SUM(CAST(produced_quantity AS numeric)), 0) as total_produced,
            COALESCE(SUM(CAST(rejected_quantity AS numeric)), 0) as total_rejected,
            COALESCE(SUM(CAST(derived_units AS numeric)), 0) as total_derived_units
          FROM production_entries
          WHERE record_status = 1 AND production_date >= ${startDateStr}
        `);
        production = (productionStats.rows[0] as any) || {};
      } catch (e) { console.log('[MIS] production_entries query skipped:', (e as Error).message); }
      
      // Sales KPIs (invoices)
      try {
        const salesStats = await db.execute(sql`
          SELECT 
            COUNT(*) as total_invoices,
            COALESCE(SUM(subtotal), 0) as total_revenue,
            COALESCE(SUM(total_amount), 0) as total_with_tax,
            COALESCE(SUM(amount_received), 0) as total_received,
            COALESCE(SUM(total_amount - amount_received), 0) as total_pending
          FROM invoices
          WHERE record_status = 1 AND status != 'cancelled' AND invoice_date >= ${startDateStr}
        `);
        sales = (salesStats.rows[0] as any) || {};
      } catch (e) { console.log('[MIS] invoices query skipped:', (e as Error).message); }
      
      // Payments received
      try {
        const paymentStats = await db.execute(sql`
          SELECT 
            COUNT(*) as total_payments,
            COALESCE(SUM(amount), 0) as total_amount,
            payment_method,
            COUNT(*) as count
          FROM invoice_payments
          WHERE record_status = 1 AND payment_date >= ${startDateStr}
          GROUP BY payment_method
        `);
        paymentRows = paymentStats.rows as any[];
      } catch (e) { console.log('[MIS] invoice_payments query skipped:', (e as Error).message); }
      
      // Gatepass/Dispatch stats
      try {
        const dispatchStats = await db.execute(sql`
          SELECT 
            COUNT(*) as total_gatepasses,
            COUNT(CASE WHEN status IN ('delivered', 'completed') THEN 1 END) as delivered,
            COUNT(CASE WHEN status = 'generated' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'vehicle_out' THEN 1 END) as in_transit
          FROM gatepasses
          WHERE record_status = 1 AND gatepass_date >= ${startDateStr}
        `);
        dispatch = (dispatchStats.rows[0] as any) || {};
      } catch (e) { console.log('[MIS] gatepasses query skipped:', (e as Error).message); }
      
      // Quality metrics (checklists)
      try {
        const qualityStats = await db.execute(sql`
          SELECT 
            COUNT(*) as total_submissions,
            COUNT(CASE WHEN overall_status = 'NOK' THEN 1 END) as nok_count,
            COUNT(CASE WHEN overall_status = 'OK' THEN 1 END) as ok_count
          FROM checklist_submissions
          WHERE record_status = 1 AND submission_date >= ${startDateStr}
        `);
        quality = (qualityStats.rows[0] as any) || {};
      } catch (e) { console.log('[MIS] checklist_submissions query skipped:', (e as Error).message); }
      
      // Cash position
      try {
        const cashStats = await db.execute(sql`
          SELECT 
            COALESCE(SUM(closing_balance), 0) as total_closing,
            COALESCE(SUM(total_received), 0) as total_received,
            COALESCE(SUM(total_expenses), 0) as total_expenses
          FROM cash_register_days
          WHERE record_status = 1 AND register_date >= ${startDateStr}
        `);
        cash = (cashStats.rows[0] as any) || {};
      } catch (e) { console.log('[MIS] cash_register_days query skipped:', (e as Error).message); }
      
      res.json({
        period: daysBack,
        startDate: startDateStr,
        kpis: {
          production: {
            totalEntries: parseInt(production.total_entries) || 0,
            totalProduced: parseFloat(production.total_produced) || 0,
            totalRejected: parseFloat(production.total_rejected) || 0,
            totalDerivedUnits: parseFloat(production.total_derived_units) || 0,
            yieldPercent: production.total_produced > 0 
              ? ((production.total_produced - production.total_rejected) / production.total_produced * 100).toFixed(1)
              : 100
          },
          sales: {
            totalInvoices: parseInt(sales.total_invoices) || 0,
            totalRevenue: parseInt(sales.total_revenue) || 0,
            totalWithTax: parseInt(sales.total_with_tax) || 0,
            totalReceived: parseInt(sales.total_received) || 0,
            totalPending: parseInt(sales.total_pending) || 0,
            collectionRate: sales.total_with_tax > 0
              ? ((sales.total_received / sales.total_with_tax) * 100).toFixed(1)
              : 0
          },
          dispatch: {
            totalGatepasses: parseInt(dispatch.total_gatepasses) || 0,
            delivered: parseInt(dispatch.delivered) || 0,
            pending: parseInt(dispatch.pending) || 0,
            inTransit: parseInt(dispatch.in_transit) || 0,
            fulfillmentRate: dispatch.total_gatepasses > 0
              ? ((dispatch.delivered / dispatch.total_gatepasses) * 100).toFixed(1)
              : 0
          },
          quality: {
            totalSubmissions: parseInt(quality.total_submissions) || 0,
            okCount: parseInt(quality.ok_count) || 0,
            nokCount: parseInt(quality.nok_count) || 0,
            complianceRate: quality.total_submissions > 0
              ? ((quality.ok_count / quality.total_submissions) * 100).toFixed(1)
              : 100
          },
          cash: {
            totalClosing: parseInt(cash.total_closing) || 0,
            totalReceived: parseInt(cash.total_received) || 0,
            totalExpenses: parseInt(cash.total_expenses) || 0
          },
          payments: paymentRows.map(p => ({
            method: p.payment_method,
            count: parseInt(p.count),
            amount: parseInt(p.total_amount) || 0
          }))
        }
      });
    } catch (error: any) {
      console.error('[MIS] Error fetching KPI dashboard:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch KPI dashboard' });
    }
  });
  
  // MIS Exception Alerts - Get items needing attention
  app.get('/api/mis/alerts', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res: Response) => {
    try {
      const alerts: any[] = [];
      
      // Overdue payments (invoices with pending amount > 30 days old)
      try {
        const overduePayments = await db.execute(sql`
          SELECT id, invoice_number, buyer_name, invoice_date, total_amount, amount_received,
                 (total_amount - amount_received) as pending_amount,
                 EXTRACT(DAY FROM (NOW() - invoice_date)) as days_overdue
          FROM invoices
          WHERE record_status = 1 AND status != 'cancelled'
            AND (total_amount - amount_received) > 0
            AND invoice_date < NOW() - INTERVAL '30 days'
          ORDER BY invoice_date ASC
          LIMIT 20
        `);
        
        (overduePayments.rows as any[]).forEach(inv => {
          alerts.push({
            type: 'overdue_payment',
            severity: parseInt(inv.days_overdue) > 60 ? 'high' : 'medium',
            title: `Overdue Payment: ${inv.invoice_number}`,
            description: `${inv.buyer_name} - ₹${(inv.pending_amount / 100).toFixed(2)} pending for ${Math.floor(inv.days_overdue)} days`,
            entityType: 'invoice',
            entityId: inv.id,
            amount: parseInt(inv.pending_amount),
            daysOverdue: Math.floor(parseInt(inv.days_overdue))
          });
        });
      } catch (e) { console.log('[MIS] alerts invoices query skipped:', (e as Error).message); }
      
      // Low stock raw materials (below reorder level)
      try {
        const lowStock = await db.execute(sql`
          SELECT id, material_code, material_name, current_stock, reorder_level
          FROM raw_materials
          WHERE record_status = 1 AND is_active = 'true'
            AND reorder_level IS NOT NULL
            AND current_stock <= reorder_level
          ORDER BY (reorder_level - current_stock) DESC
          LIMIT 10
        `);
        
        (lowStock.rows as any[]).forEach(mat => {
          alerts.push({
            type: 'low_stock',
            severity: mat.current_stock <= 0 ? 'high' : 'medium',
            title: `Low Stock: ${mat.material_name}`,
            description: `Current: ${mat.current_stock || 0}, Reorder Level: ${mat.reorder_level}`,
            entityType: 'raw_material',
            entityId: mat.id,
            currentStock: mat.current_stock,
            reorderLevel: mat.reorder_level
          });
        });
      } catch (e) { console.log('[MIS] alerts raw_materials query skipped:', (e as Error).message); }
      
      // Pending gatepasses (not yet dispatched)
      try {
        const pendingGatepasses = await db.execute(sql`
          SELECT g.id, g.gatepass_number, g.gatepass_date, g.customer_name, g.destination,
                 EXTRACT(DAY FROM (NOW() - g.gatepass_date)) as days_pending
          FROM gatepasses g
          WHERE g.record_status = 1 AND g.status = 'generated'
            AND g.gatepass_date < NOW() - INTERVAL '2 days'
          ORDER BY g.gatepass_date ASC
          LIMIT 10
        `);
        
        (pendingGatepasses.rows as any[]).forEach(gp => {
          alerts.push({
            type: 'pending_dispatch',
            severity: parseInt(gp.days_pending) > 5 ? 'high' : 'low',
            title: `Pending Dispatch: ${gp.gatepass_number}`,
            description: `To ${gp.customer_name || gp.destination} - pending for ${Math.floor(gp.days_pending)} days`,
            entityType: 'gatepass',
            entityId: gp.id,
            daysPending: Math.floor(parseInt(gp.days_pending))
          });
        });
      } catch (e) { console.log('[MIS] alerts gatepasses query skipped:', (e as Error).message); }
      
      // Expiring documents (within 30 days)
      try {
        const expiringDocs = await db.execute(sql`
          SELECT id, filename, category, expiry_date,
                 EXTRACT(DAY FROM (expiry_date - NOW())) as days_to_expiry
          FROM documents
          WHERE record_status = 1 AND expiry_date IS NOT NULL
            AND expiry_date <= NOW() + INTERVAL '30 days'
            AND expiry_date >= NOW()
          ORDER BY expiry_date ASC
          LIMIT 10
        `);
        
        (expiringDocs.rows as any[]).forEach(doc => {
          const daysLeft = Math.floor(parseInt(doc.days_to_expiry));
          alerts.push({
            type: 'expiring_document',
            severity: daysLeft <= 7 ? 'high' : daysLeft <= 14 ? 'medium' : 'low',
            title: `Expiring: ${doc.filename}`,
            description: `${doc.category} expires in ${daysLeft} days`,
            entityType: 'document',
            entityId: doc.id,
            daysToExpiry: daysLeft
          });
        });
      } catch (e) { console.log('[MIS] alerts documents query skipped:', (e as Error).message); }
      
      // Quality issues (NOK checklists in last 7 days)
      try {
        const qualityIssues = await db.execute(sql`
          SELECT cs.id, ct.name as checklist_name, cs.submission_date, m.name as machine_name
          FROM checklist_submissions cs
          JOIN checklist_templates ct ON cs.template_id = ct.id
          LEFT JOIN machines m ON cs.machine_id = m.id
          WHERE cs.record_status = 1 AND cs.overall_status = 'NOK'
            AND cs.submission_date >= NOW() - INTERVAL '7 days'
          ORDER BY cs.submission_date DESC
          LIMIT 10
        `);
        
        (qualityIssues.rows as any[]).forEach(issue => {
          alerts.push({
            type: 'quality_issue',
            severity: 'medium',
            title: `Quality Issue: ${issue.checklist_name}`,
            description: `Machine: ${issue.machine_name || 'N/A'}`,
            entityType: 'checklist_submission',
            entityId: issue.id
          });
        });
      } catch (e) { console.log('[MIS] alerts checklist_submissions query skipped:', (e as Error).message); }
      
      // Sort by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]);
      
      res.json({
        totalAlerts: alerts.length,
        bySeverity: {
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        },
        byType: {
          overdue_payment: alerts.filter(a => a.type === 'overdue_payment').length,
          low_stock: alerts.filter(a => a.type === 'low_stock').length,
          pending_dispatch: alerts.filter(a => a.type === 'pending_dispatch').length,
          expiring_document: alerts.filter(a => a.type === 'expiring_document').length,
          quality_issue: alerts.filter(a => a.type === 'quality_issue').length
        },
        alerts
      });
    } catch (error: any) {
      console.error('[MIS] Error fetching alerts:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch alerts' });
    }
  });
  
  // MIS Production Analytics
  app.get('/api/mis/production-analytics', requireRole('admin', 'manager'), async (req: any, res: Response) => {
    try {
      const { period = '30' } = req.query;
      const daysBack = parseInt(period as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      let dailyProductionRows: any[] = [];
      let byProductRows: any[] = [];
      let varianceRows: any[] = [];
      let byShiftRows: any[] = [];
      
      // Daily production trend
      try {
        const dailyProduction = await db.execute(sql`
          SELECT 
            DATE(production_date) as date,
            COUNT(*) as entries,
            COALESCE(SUM(CAST(produced_quantity AS numeric)), 0) as produced,
            COALESCE(SUM(CAST(rejected_quantity AS numeric)), 0) as rejected,
            COALESCE(SUM(CAST(derived_units AS numeric)), 0) as derived_units
          FROM production_entries
          WHERE record_status = 1 AND production_date >= ${startDateStr}
          GROUP BY DATE(production_date)
          ORDER BY date DESC
        `);
        dailyProductionRows = dailyProduction.rows as any[];
      } catch (e) { console.log('[MIS] production daily query skipped:', (e as Error).message); }
      
      // Production by product
      try {
        const byProduct = await db.execute(sql`
          SELECT 
            p.name as product_name,
            COUNT(*) as entries,
            COALESCE(SUM(CAST(pe.produced_quantity AS numeric)), 0) as total_produced,
            COALESCE(SUM(CAST(pe.rejected_quantity AS numeric)), 0) as total_rejected
          FROM production_entries pe
          LEFT JOIN products p ON pe.product_id = p.id
          WHERE pe.record_status = 1 AND pe.production_date >= ${startDateStr}
          GROUP BY p.id, p.name
          ORDER BY total_produced DESC
          LIMIT 10
        `);
        byProductRows = byProduct.rows as any[];
      } catch (e) { console.log('[MIS] production by product query skipped:', (e as Error).message); }
      
      // BOM Variance analysis (from reconciliations)
      try {
        const varianceData = await db.execute(sql`
          SELECT 
            p.name as product_name,
            COUNT(*) as reconciliation_count,
            COALESCE(AVG(CAST(pr.variance_percent AS numeric)), 0) as avg_variance,
            COALESCE(MIN(CAST(pr.variance_percent AS numeric)), 0) as min_variance,
            COALESCE(MAX(CAST(pr.variance_percent AS numeric)), 0) as max_variance
          FROM production_reconciliations pr
          JOIN raw_material_issuance rmi ON pr.issuance_id = rmi.id
          LEFT JOIN products p ON rmi.product_id = p.id
          WHERE pr.record_status = 1 AND pr.reconciliation_date >= ${startDateStr}
          GROUP BY p.id, p.name
          ORDER BY avg_variance DESC
          LIMIT 10
        `);
        varianceRows = varianceData.rows as any[];
      } catch (e) { console.log('[MIS] production variance query skipped:', (e as Error).message); }
      
      // Shift-wise production
      try {
        const byShift = await db.execute(sql`
          SELECT 
            shift,
            COUNT(*) as entries,
            COALESCE(SUM(CAST(produced_quantity AS numeric)), 0) as total_produced,
            COALESCE(SUM(CAST(rejected_quantity AS numeric)), 0) as total_rejected
          FROM production_entries
          WHERE record_status = 1 AND production_date >= ${startDateStr}
          GROUP BY shift
          ORDER BY shift
        `);
        byShiftRows = byShift.rows as any[];
      } catch (e) { console.log('[MIS] production by shift query skipped:', (e as Error).message); }
      
      res.json({
        period: daysBack,
        dailyTrend: dailyProductionRows.map(d => ({
          date: d.date,
          entries: parseInt(d.entries),
          produced: parseFloat(d.produced),
          rejected: parseFloat(d.rejected),
          derivedUnits: parseFloat(d.derived_units),
          yield: d.produced > 0 ? ((d.produced - d.rejected) / d.produced * 100).toFixed(1) : 100
        })),
        byProduct: byProductRows.map(p => ({
          productName: p.product_name || 'Unknown',
          entries: parseInt(p.entries),
          totalProduced: parseFloat(p.total_produced),
          totalRejected: parseFloat(p.total_rejected),
          yield: p.total_produced > 0 ? ((p.total_produced - p.total_rejected) / p.total_produced * 100).toFixed(1) : 100
        })),
        bomVariance: varianceRows.map(v => ({
          productName: v.product_name || 'Unknown',
          reconciliationCount: parseInt(v.reconciliation_count),
          avgVariance: parseFloat(v.avg_variance).toFixed(2),
          minVariance: parseFloat(v.min_variance).toFixed(2),
          maxVariance: parseFloat(v.max_variance).toFixed(2)
        })),
        byShift: byShiftRows.map(s => ({
          shift: s.shift,
          entries: parseInt(s.entries),
          totalProduced: parseFloat(s.total_produced),
          totalRejected: parseFloat(s.total_rejected)
        }))
      });
    } catch (error: any) {
      console.error('[MIS] Error fetching production analytics:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch production analytics' });
    }
  });
  
  // MIS Inventory Intelligence
  app.get('/api/mis/inventory-analytics', requireRole('admin', 'manager'), async (req: any, res: Response) => {
    try {
      let rawMaterialRows: any[] = [];
      let finishedGoodsRows: any[] = [];
      let slowMoversRows: any[] = [];
      let summary: any = {};
      
      // Raw material inventory with aging
      try {
        const rawMaterialInventory = await db.execute(sql`
          SELECT 
            rm.id, rm.material_code, rm.material_name, rm.current_stock,
            rm.unit_cost, rm.reorder_level, rm.received_date,
            COALESCE((rm.current_stock * rm.unit_cost), 0) as stock_value,
            CASE 
              WHEN rm.received_date IS NULL THEN 'unknown'
              WHEN rm.received_date < NOW() - INTERVAL '90 days' THEN 'aged_90+'
              WHEN rm.received_date < NOW() - INTERVAL '60 days' THEN 'aged_60_90'
              WHEN rm.received_date < NOW() - INTERVAL '30 days' THEN 'aged_30_60'
              ELSE 'fresh'
            END as aging_bucket
          FROM raw_materials rm
          WHERE rm.record_status = 1 AND rm.is_active = 'true'
          ORDER BY rm.current_stock DESC
        `);
        rawMaterialRows = rawMaterialInventory.rows as any[];
      } catch (e) { console.log('[MIS] inventory raw materials query skipped:', (e as Error).message); }
      
      // Finished goods inventory
      try {
        const finishedGoodsInventory = await db.execute(sql`
          SELECT 
            p.name as product_name,
            COUNT(*) as batch_count,
            COALESCE(SUM(fg.quantity), 0) as total_quantity,
            MIN(fg.production_date) as oldest_batch,
            MAX(fg.production_date) as newest_batch
          FROM finished_goods fg
          JOIN products p ON fg.product_id = p.id
          WHERE fg.record_status = 1 AND fg.quality_status = 'approved'
          GROUP BY p.id, p.name
          ORDER BY total_quantity DESC
        `);
        finishedGoodsRows = finishedGoodsInventory.rows as any[];
      } catch (e) { console.log('[MIS] inventory finished goods query skipped:', (e as Error).message); }
      
      // Slow moving items (no issuance in 30 days)
      try {
        const slowMovers = await db.execute(sql`
          SELECT 
            rm.id, rm.material_code, rm.material_name, rm.current_stock,
            MAX(rmi.issuance_date) as last_issued
          FROM raw_materials rm
          LEFT JOIN raw_material_issuance_items rmii ON rmii.raw_material_id = rm.id
          LEFT JOIN raw_material_issuance rmi ON rmii.issuance_id = rmi.id AND rmi.record_status = 1
          WHERE rm.record_status = 1 AND rm.is_active = 'true' AND rm.current_stock > 0
          GROUP BY rm.id, rm.material_code, rm.material_name, rm.current_stock
          HAVING MAX(rmi.issuance_date) IS NULL OR MAX(rmi.issuance_date) < NOW() - INTERVAL '30 days'
          ORDER BY rm.current_stock DESC
          LIMIT 20
        `);
        slowMoversRows = slowMovers.rows as any[];
      } catch (e) { console.log('[MIS] inventory slow movers query skipped:', (e as Error).message); }
      
      // Inventory value summary
      try {
        const inventorySummary = await db.execute(sql`
          SELECT 
            COALESCE(SUM(current_stock * unit_cost), 0) as total_raw_material_value,
            COUNT(*) as total_raw_materials,
            COALESCE(SUM(CASE WHEN current_stock <= COALESCE(reorder_level, 0) THEN 1 ELSE 0 END), 0) as below_reorder
          FROM raw_materials
          WHERE record_status = 1 AND is_active = 'true'
        `);
        summary = (inventorySummary.rows[0] as any) || {};
      } catch (e) { console.log('[MIS] inventory summary query skipped:', (e as Error).message); }
      
      // Aging buckets summary
      const agingBuckets = {
        fresh: 0,
        aged_30_60: 0,
        aged_60_90: 0,
        'aged_90+': 0,
        unknown: 0
      };
      
      rawMaterialRows.forEach(rm => {
        const bucket = rm.aging_bucket as keyof typeof agingBuckets;
        agingBuckets[bucket] = (agingBuckets[bucket] || 0) + parseInt(rm.stock_value || 0);
      });
      
      res.json({
        summary: {
          totalRawMaterialValue: parseInt(summary.total_raw_material_value) || 0,
          totalRawMaterials: parseInt(summary.total_raw_materials) || 0,
          belowReorder: parseInt(summary.below_reorder) || 0
        },
        agingBuckets,
        rawMaterials: rawMaterialRows.slice(0, 20).map(rm => ({
          id: rm.id,
          materialCode: rm.material_code,
          materialName: rm.material_name,
          currentStock: rm.current_stock,
          unitCost: rm.unit_cost,
          stockValue: parseInt(rm.stock_value) || 0,
          reorderLevel: rm.reorder_level,
          agingBucket: rm.aging_bucket
        })),
        finishedGoods: finishedGoodsRows.map(fg => ({
          productName: fg.product_name,
          batchCount: parseInt(fg.batch_count),
          totalQuantity: parseInt(fg.total_quantity),
          oldestBatch: fg.oldest_batch,
          newestBatch: fg.newest_batch
        })),
        slowMovers: slowMoversRows.map(sm => ({
          id: sm.id,
          materialCode: sm.material_code,
          materialName: sm.material_name,
          currentStock: sm.current_stock,
          lastIssued: sm.last_issued
        }))
      });
    } catch (error: any) {
      console.error('[MIS] Error fetching inventory analytics:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch inventory analytics' });
    }
  });
  
  // MIS Sales & Margin Analysis
  app.get('/api/mis/sales-analytics', requireRole('admin', 'manager', 'AccountsManager'), async (req: any, res: Response) => {
    try {
      const { period = '30' } = req.query;
      const daysBack = parseInt(period as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      let dailySalesRows: any[] = [];
      let topCustomersRows: any[] = [];
      let topProductsRows: any[] = [];
      let paymentMethodsRows: any[] = [];
      let receivablesAgingRows: any[] = [];
      
      // Daily sales trend
      try {
        const dailySales = await db.execute(sql`
          SELECT 
            DATE(invoice_date) as date,
            COUNT(*) as invoice_count,
            COALESCE(SUM(subtotal), 0) as revenue,
            COALESCE(SUM(total_amount), 0) as total_with_tax,
            COALESCE(SUM(amount_received), 0) as collected
          FROM invoices
          WHERE record_status = 1 AND status != 'cancelled' AND invoice_date >= ${startDateStr}
          GROUP BY DATE(invoice_date)
          ORDER BY date DESC
        `);
        dailySalesRows = dailySales.rows as any[];
      } catch (e) { console.log('[MIS] sales daily query skipped:', (e as Error).message); }
      
      // Top customers by revenue
      try {
        const topCustomers = await db.execute(sql`
          SELECT 
            buyer_name,
            COUNT(*) as invoice_count,
            COALESCE(SUM(subtotal), 0) as total_revenue,
            COALESCE(SUM(amount_received), 0) as total_collected,
            COALESCE(SUM(total_amount - amount_received), 0) as pending
          FROM invoices
          WHERE record_status = 1 AND status != 'cancelled' AND invoice_date >= ${startDateStr}
          GROUP BY buyer_name
          ORDER BY total_revenue DESC
          LIMIT 10
        `);
        topCustomersRows = topCustomers.rows as any[];
      } catch (e) { console.log('[MIS] sales top customers query skipped:', (e as Error).message); }
      
      // Top products by revenue
      try {
        const topProducts = await db.execute(sql`
          SELECT 
            COALESCE(p.product_name, ii.description) as product_name,
            COALESCE(SUM(ii.quantity), 0) as total_quantity,
            COALESCE(SUM(ii.taxable_amount), 0) as total_revenue
          FROM invoice_items ii
          JOIN invoices i ON ii.invoice_id = i.id
          LEFT JOIN products p ON ii.product_id = p.id
          WHERE i.record_status = 1 AND i.status != 'cancelled' AND i.invoice_date >= ${startDateStr}
          GROUP BY COALESCE(p.product_name, ii.description)
          ORDER BY total_revenue DESC
          LIMIT 10
        `);
        topProductsRows = topProducts.rows as any[];
      } catch (e) { console.log('[MIS] sales top products query skipped:', (e as Error).message); }
      
      // Payment collection by method
      try {
        const paymentMethods = await db.execute(sql`
          SELECT 
            payment_method,
            COUNT(*) as payment_count,
            COALESCE(SUM(amount), 0) as total_amount
          FROM invoice_payments
          WHERE record_status = 1 AND payment_date >= ${startDateStr}
          GROUP BY payment_method
          ORDER BY total_amount DESC
        `);
        paymentMethodsRows = paymentMethods.rows as any[];
      } catch (e) { console.log('[MIS] sales payment methods query skipped:', (e as Error).message); }
      
      // Receivables aging
      try {
        const receivablesAging = await db.execute(sql`
          SELECT 
            CASE 
              WHEN invoice_date >= NOW() - INTERVAL '30 days' THEN '0-30 days'
              WHEN invoice_date >= NOW() - INTERVAL '60 days' THEN '31-60 days'
              WHEN invoice_date >= NOW() - INTERVAL '90 days' THEN '61-90 days'
              ELSE '90+ days'
            END as aging_bucket,
            COUNT(*) as invoice_count,
            COALESCE(SUM(total_amount - amount_received), 0) as pending_amount
          FROM invoices
          WHERE record_status = 1 AND status != 'cancelled' 
            AND (total_amount - amount_received) > 0
          GROUP BY 
            CASE 
              WHEN invoice_date >= NOW() - INTERVAL '30 days' THEN '0-30 days'
              WHEN invoice_date >= NOW() - INTERVAL '60 days' THEN '31-60 days'
              WHEN invoice_date >= NOW() - INTERVAL '90 days' THEN '61-90 days'
              ELSE '90+ days'
            END
          ORDER BY aging_bucket
        `);
        receivablesAgingRows = receivablesAging.rows as any[];
      } catch (e) { console.log('[MIS] sales receivables aging query skipped:', (e as Error).message); }
      
      res.json({
        period: daysBack,
        dailyTrend: dailySalesRows.map(d => ({
          date: d.date,
          invoiceCount: parseInt(d.invoice_count),
          revenue: parseInt(d.revenue),
          totalWithTax: parseInt(d.total_with_tax),
          collected: parseInt(d.collected)
        })),
        topCustomers: topCustomersRows.map(c => ({
          buyerName: c.buyer_name,
          invoiceCount: parseInt(c.invoice_count),
          totalRevenue: parseInt(c.total_revenue),
          totalCollected: parseInt(c.total_collected),
          pending: parseInt(c.pending)
        })),
        topProducts: topProductsRows.map(p => ({
          productName: p.product_name || 'Unknown',
          totalQuantity: parseInt(p.total_quantity),
          totalRevenue: parseInt(p.total_revenue)
        })),
        paymentMethods: paymentMethodsRows.map(pm => ({
          method: pm.payment_method,
          count: parseInt(pm.payment_count),
          amount: parseInt(pm.total_amount)
        })),
        receivablesAging: receivablesAgingRows.map(ra => ({
          bucket: ra.aging_bucket,
          invoiceCount: parseInt(ra.invoice_count),
          pendingAmount: parseInt(ra.pending_amount)
        }))
      });
    } catch (error: any) {
      console.error('[MIS] Error fetching sales analytics:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch sales analytics' });
    }
  });
  
  // MIS Delivery Performance (OTIF - On Time In Full)
  app.get('/api/mis/delivery-performance', requireRole('admin', 'manager'), async (req: any, res: Response) => {
    try {
      const { period = '30' } = req.query;
      const daysBack = parseInt(period as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      let statusRows: any[] = [];
      let deliveryTimesRows: any[] = [];
      let dailyDispatchRows: any[] = [];
      let transporterRows: any[] = [];
      
      // Gatepass status summary
      try {
        const statusSummary = await db.execute(sql`
          SELECT 
            status,
            COUNT(*) as count
          FROM gatepasses
          WHERE record_status = 1 AND gatepass_date >= ${startDateStr}
          GROUP BY status
        `);
        statusRows = statusSummary.rows as any[];
      } catch (e) { console.log('[MIS] delivery status query skipped:', (e as Error).message); }
      
      // Delivery time analysis (generated to delivered/completed)
      try {
        const deliveryTimes = await db.execute(sql`
          SELECT 
            id, gatepass_number, gatepass_date, out_time, pod_date, status,
            CASE 
              WHEN pod_date IS NOT NULL AND gatepass_date IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (pod_date - gatepass_date)) / 3600
              ELSE NULL
            END as delivery_hours
          FROM gatepasses
          WHERE record_status = 1 AND gatepass_date >= ${startDateStr}
            AND status IN ('delivered', 'completed')
          ORDER BY gatepass_date DESC
          LIMIT 50
        `);
        deliveryTimesRows = deliveryTimes.rows as any[];
      } catch (e) { console.log('[MIS] delivery times query skipped:', (e as Error).message); }
      
      // Calculate average delivery time
      const completedDeliveries = deliveryTimesRows.filter(d => d.delivery_hours !== null);
      const avgDeliveryHours = completedDeliveries.length > 0
        ? completedDeliveries.reduce((sum, d) => sum + parseFloat(d.delivery_hours), 0) / completedDeliveries.length
        : 0;
      
      // Daily dispatch volume
      try {
        const dailyDispatch = await db.execute(sql`
          SELECT 
            DATE(gatepass_date) as date,
            COUNT(*) as total_dispatched,
            COUNT(CASE WHEN status IN ('delivered', 'completed') THEN 1 END) as completed
          FROM gatepasses
          WHERE record_status = 1 AND gatepass_date >= ${startDateStr}
          GROUP BY DATE(gatepass_date)
          ORDER BY date DESC
        `);
        dailyDispatchRows = dailyDispatch.rows as any[];
      } catch (e) { console.log('[MIS] delivery daily dispatch query skipped:', (e as Error).message); }
      
      // Transporters performance
      try {
        const transporterPerformance = await db.execute(sql`
          SELECT 
            COALESCE(transporter_name, 'Direct') as transporter,
            COUNT(*) as total_dispatches,
            COUNT(CASE WHEN status IN ('delivered', 'completed') THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'generated' THEN 1 END) as pending
          FROM gatepasses
          WHERE record_status = 1 AND gatepass_date >= ${startDateStr}
          GROUP BY transporter_name
          ORDER BY total_dispatches DESC
          LIMIT 10
        `);
        transporterRows = transporterPerformance.rows as any[];
      } catch (e) { console.log('[MIS] delivery transporter query skipped:', (e as Error).message); }
      
      // Summary calculations
      const statusMap = Object.fromEntries(statusRows.map(s => [s.status, parseInt(s.count)]));
      const totalDispatches = Object.values(statusMap).reduce((sum: number, count) => sum + (count as number), 0);
      const completedCount = (statusMap['delivered'] || 0) + (statusMap['completed'] || 0);
      const otifRate = totalDispatches > 0 ? ((completedCount / totalDispatches) * 100).toFixed(1) : 0;
      
      res.json({
        period: daysBack,
        summary: {
          totalDispatches,
          completed: completedCount,
          inTransit: statusMap['vehicle_out'] || 0,
          pending: statusMap['generated'] || 0,
          otifRate,
          avgDeliveryHours: avgDeliveryHours.toFixed(1)
        },
        statusBreakdown: statusRows.map(s => ({
          status: s.status,
          count: parseInt(s.count)
        })),
        dailyTrend: dailyDispatchRows.map(d => ({
          date: d.date,
          totalDispatched: parseInt(d.total_dispatched),
          completed: parseInt(d.completed),
          completionRate: d.total_dispatched > 0 ? ((d.completed / d.total_dispatched) * 100).toFixed(1) : 0
        })),
        transporterPerformance: transporterRows.map(t => ({
          transporter: t.transporter,
          totalDispatches: parseInt(t.total_dispatches),
          completed: parseInt(t.completed),
          pending: parseInt(t.pending),
          completionRate: t.total_dispatches > 0 ? ((t.completed / t.total_dispatches) * 100).toFixed(1) : 0
        }))
      });
    } catch (error: any) {
      console.error('[MIS] Error fetching delivery performance:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch delivery performance' });
    }
  });

  // HPCL Vendor Migration - Move current vendor details to ship-to, set HPCL corporate as main vendor
  app.post('/api/admin/migrate-hpcl-vendors', requireRole('admin'), async (req: any, res: Response) => {
    try {
      // HPCL Corporate Details (provided by user)
      const hpclCorporate = {
        vendorName: 'VISAKH RETAIL RO Petronilayam, HPCL',
        address: 'Opp AU IN Gate, China Waltair, Visakhapatnam',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        pincode: '530003',
        gstNumber: '37AAACH1118B1ZB'
      };

      // Find HPPani vendor type
      const hpPaniType = await db
        .select()
        .from(vendorTypes)
        .where(eq(vendorTypes.code, 'HPPANI'))
        .limit(1);

      if (hpPaniType.length === 0) {
        return res.status(404).json({ message: "HPPani vendor type not found" });
      }

      // Get all HPPani vendors where HPPani is their PRIMARY vendor type
      const hpPaniVendorIds = await db
        .select({ vendorId: vendorVendorTypes.vendorId })
        .from(vendorVendorTypes)
        .where(
          and(
            eq(vendorVendorTypes.vendorTypeId, hpPaniType[0].id),
            eq(vendorVendorTypes.isPrimary, 1),
            eq(vendorVendorTypes.recordStatus, 1)
          )
        );

      if (hpPaniVendorIds.length === 0) {
        return res.status(404).json({ message: "No HPPani vendors found" });
      }

      const vendorIds = hpPaniVendorIds.map(v => v.vendorId);
      let migratedCount = 0;
      const migrationLog: any[] = [];

      // Wrap entire migration in a transaction for atomicity
      await db.transaction(async (tx) => {
        for (const vendorId of vendorIds) {
          // Get current vendor data
          const [currentVendor] = await tx
            .select()
            .from(vendors)
            .where(eq(vendors.id, vendorId));

          if (!currentVendor || currentVendor.recordStatus !== 1) continue;

          // Skip if already migrated (ship_to_name is set)
          if (currentVendor.shipToName) {
            migrationLog.push({
              vendorCode: currentVendor.vendorCode,
              vendorName: currentVendor.vendorName,
              status: 'skipped',
              reason: 'Already has ship-to address'
            });
            continue;
          }

          // Migrate: move current details to ship-to, set HPCL corporate as main
          await tx.update(vendors)
            .set({
              // Move current to ship-to
              shipToName: currentVendor.vendorName,
              shipToAddress: currentVendor.address,
              shipToCity: currentVendor.city,
              shipToState: currentVendor.state,
              shipToPincode: currentVendor.pincode,
              shipToGstin: currentVendor.gstNumber,
              // Set HPCL corporate as main vendor
              vendorName: hpclCorporate.vendorName,
              address: hpclCorporate.address,
              city: hpclCorporate.city,
              state: hpclCorporate.state,
              pincode: hpclCorporate.pincode,
              gstNumber: hpclCorporate.gstNumber,
              updatedAt: new Date().toISOString()
            })
            .where(eq(vendors.id, vendorId));

          migratedCount++;
          migrationLog.push({
            vendorCode: currentVendor.vendorCode,
            originalName: currentVendor.vendorName,
            originalGst: currentVendor.gstNumber,
            status: 'migrated',
            newShipTo: currentVendor.vendorName
          });
        }
      });

      console.log(`[AUDIT] HPCL vendor migration completed by ${req.user?.username}. Migrated: ${migratedCount}/${vendorIds.length}`);
      
      res.json({
        success: true,
        message: `Migrated ${migratedCount} HPPani vendors to HPCL corporate structure`,
        totalVendors: vendorIds.length,
        migratedCount,
        hpclCorporate,
        migrationLog
      });
    } catch (error: any) {
      console.error('[HPCL Migration] Error:', error);
      res.status(500).json({ message: error.message || 'Failed to migrate HPCL vendors' });
    }
  });

  // Preview HPCL Vendor Migration (dry run)
  app.get('/api/admin/preview-hpcl-migration', requireRole('admin'), async (req: any, res: Response) => {
    try {
      // Find HPPani vendor type
      const hpPaniType = await db
        .select()
        .from(vendorTypes)
        .where(eq(vendorTypes.code, 'HPPANI'))
        .limit(1);

      if (hpPaniType.length === 0) {
        return res.status(404).json({ message: "HPPani vendor type not found" });
      }

      // Get all HPPani vendors with details (only where HPPani is PRIMARY type)
      const hpPaniVendors = await db.execute(sql`
        SELECT v.id, v.vendor_code, v.vendor_name, v.address, v.city, v.state, v.pincode, v.gst_number,
               v.ship_to_name, v.ship_to_address
        FROM vendors v
        JOIN vendor_vendor_types vvt ON v.id = vvt.vendor_id
        WHERE vvt.vendor_type_id = ${hpPaniType[0].id}
          AND vvt.is_primary = 1
          AND v.record_status = 1
          AND vvt.record_status = 1
        ORDER BY v.vendor_name
      `);

      const vendors = hpPaniVendors.rows as any[];
      const alreadyMigrated = vendors.filter(v => v.ship_to_name);
      const toMigrate = vendors.filter(v => !v.ship_to_name);

      res.json({
        totalHPPaniVendors: vendors.length,
        alreadyMigrated: alreadyMigrated.length,
        toMigrate: toMigrate.length,
        hpclCorporate: {
          vendorName: 'VISAKH RETAIL RO Petronilayam, HPCL',
          address: 'Opp AU IN Gate, China Waltair, Visakhapatnam',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pincode: '530003',
          gstNumber: '37AAACH1118B1ZB'
        },
        vendorsToMigrate: toMigrate.map(v => ({
          vendorCode: v.vendor_code,
          currentName: v.vendor_name,
          currentAddress: v.address,
          currentGst: v.gst_number,
          willBecome: {
            shipToName: v.vendor_name,
            shipToAddress: v.address
          }
        }))
      });
    } catch (error: any) {
      console.error('[HPCL Migration Preview] Error:', error);
      res.status(500).json({ message: error.message || 'Failed to preview migration' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
