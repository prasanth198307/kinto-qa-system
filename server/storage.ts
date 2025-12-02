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
  productCategories,
  productTypes,
  products,
  productBomConfigurations,
  productBom,
  vendors,
  vendorTypes,
  vendorVendorTypes,
  rawMaterialTypes,
  rawMaterials,
  rawMaterialTransactions,
  finishedGoods,
  rawMaterialIssuance,
  rawMaterialIssuanceItems,
  productionEntries,
  productionReconciliations,
  productionReconciliationItems,
  gatepasses,
  gatepassItems,
  invoices,
  invoiceItems,
  invoicePayments,
  invoiceTemplates,
  termsConditions,
  banks,
  salesReturns,
  salesReturnItems,
  creditNotes,
  creditNoteItems,
  debitNotes,
  debitNoteItems,
  manualCreditNoteRequests,
  checklistAssignments,
  checklistSubmissions,
  submissionTasks,
  partialTaskAnswers,
  machineStartupTasks,
  notificationConfig,
  type User,
  type UpsertUser,
  type InsertUser,
  type Machine,
  type InsertMachine,
  type ChecklistTemplate,
  type TemplateTask,
  type PartialTaskAnswer,
  type InsertPartialTaskAnswer,
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
  type ProductCategory,
  type InsertProductCategory,
  type ProductType,
  type InsertProductType,
  type Product,
  type InsertProduct,
  type ProductBomConfiguration,
  type InsertProductBomConfiguration,
  type ProductBom,
  type InsertProductBom,
  type Vendor,
  type InsertVendor,
  type VendorType,
  type InsertVendorType,
  type VendorVendorType,
  type InsertVendorVendorType,
  type RawMaterialType,
  type InsertRawMaterialType,
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
  type ProductionEntry,
  type InsertProductionEntry,
  type ProductionReconciliation,
  type InsertProductionReconciliation,
  type ProductionReconciliationItem,
  type InsertProductionReconciliationItem,
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
  type SalesReturn,
  type InsertSalesReturn,
  type SalesReturnItem,
  type InsertSalesReturnItem,
  type CreditNote,
  type InsertCreditNote,
  type CreditNoteItem,
  type InsertCreditNoteItem,
  type DebitNote,
  type InsertDebitNote,
  type DebitNoteItem,
  type InsertDebitNoteItem,
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
  documentCategories,
  documents,
  expenseCategories,
  expenseVouchers,
  expenseItems,
  expenseAttachments,
  type DocumentCategory,
  type InsertDocumentCategory,
  type Document,
  type InsertDocument,
  type ExpenseCategory,
  type InsertExpenseCategory,
  type ExpenseVoucher,
  type InsertExpenseVoucher,
  type ExpenseItem,
  type InsertExpenseItem,
  type ExpenseAttachment,
  type InsertExpenseAttachment,
  cashRegisterDays,
  cashRegisterTransactions,
  cashRegisterExpenseItems,
  salespersonMappings,
  type CashRegisterDay,
  type InsertCashRegisterDay,
  type CashRegisterTransaction,
  type InsertCashRegisterTransaction,
  type CashRegisterExpenseItem,
  type InsertCashRegisterExpenseItem,
  type SalespersonMapping,
  type InsertSalespersonMapping,
  paymentEvidence,
  type PaymentEvidence,
  type InsertPaymentEvidence,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNotNull, notInArray, inArray, gte, lte, sql, desc } from "drizzle-orm";
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
  
  // Product Category Master
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  getAllProductCategories(): Promise<ProductCategory[]>;
  getProductCategory(id: string): Promise<ProductCategory | undefined>;
  updateProductCategory(id: string, category: Partial<InsertProductCategory>): Promise<ProductCategory | undefined>;
  deleteProductCategory(id: string): Promise<void>;
  
  // Product Type Master
  createProductType(type: InsertProductType): Promise<ProductType>;
  getAllProductTypes(): Promise<ProductType[]>;
  getProductType(id: string): Promise<ProductType | undefined>;
  updateProductType(id: string, type: Partial<InsertProductType>): Promise<ProductType | undefined>;
  deleteProductType(id: string): Promise<void>;
  
  // Product Master
  createProduct(product: InsertProduct): Promise<Product>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  
  // Product BOM Configurations (Multiple BOM variants per product)
  createBomConfiguration(config: InsertProductBomConfiguration): Promise<ProductBomConfiguration>;
  getBomConfigurations(productId: string): Promise<ProductBomConfiguration[]>;
  getBomConfiguration(id: string): Promise<ProductBomConfiguration | undefined>;
  updateBomConfiguration(id: string, config: Partial<InsertProductBomConfiguration>): Promise<ProductBomConfiguration | undefined>;
  deleteBomConfiguration(id: string): Promise<void>;
  setDefaultBomConfiguration(productId: string, configId: string): Promise<void>;
  
  // Product Bill of Materials (BOM)
  createProductBomItem(bomItem: InsertProductBom): Promise<ProductBom>;
  getProductBom(productId: string): Promise<any[]>; // Returns enriched data with raw material details
  getProductBomWithTypes(productId: string, configurationId?: string): Promise<{
    items: Array<{
      bom: typeof productBom.$inferSelect;
      material: (typeof rawMaterials.$inferSelect) | null;
      type: (typeof rawMaterialTypes.$inferSelect) | null;
      typeId: string | null;
      effectiveUomId: string | null;
      baseUnitHint: string | null;
      availableRawMaterials: Array<{
        id: string;
        materialCode: string | null;
        materialName: string | null;
        currentStock: number;
        receivedDate: string | null;
        batchCode: string | null;
      }>;
    }>;
    metadata: {
      productId: string;
      productName: string | null;
      totalItems: number;
      lastUpdatedAt: Date | null;
      configurationId: string | null;
      configurationName: string | null;
    };
  }>;
  getProductBomItem(id: string): Promise<ProductBom | undefined>;
  updateProductBomItem(id: string, bomItem: Partial<InsertProductBom>): Promise<ProductBom | undefined>;
  deleteProductBomItem(id: string): Promise<void>;
  bulkReplaceProductBom(productId: string, bomItems: InsertProductBom[], configurationId?: string): Promise<ProductBom[]>;
  
  // Vendor Master
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getAllVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;
  
  // Vendor Type Master
  createVendorType(vendorType: InsertVendorType): Promise<VendorType>;
  getAllVendorTypes(): Promise<VendorType[]>;
  getVendorType(id: string): Promise<VendorType | undefined>;
  updateVendorType(id: string, vendorType: Partial<InsertVendorType>): Promise<VendorType | undefined>;
  deleteVendorType(id: string): Promise<void>;
  
  // Vendor-VendorType Assignments
  assignVendorType(vendorId: string, vendorTypeId: string, isPrimary?: boolean): Promise<VendorVendorType>;
  getVendorTypes(vendorId: string): Promise<VendorType[]>;
  removeVendorType(vendorId: string, vendorTypeId: string): Promise<void>;
  
  // Raw Material Type Master
  createRawMaterialType(type: InsertRawMaterialType): Promise<RawMaterialType>;
  getAllRawMaterialTypes(): Promise<RawMaterialType[]>;
  getRawMaterialType(id: string): Promise<RawMaterialType | undefined>;
  updateRawMaterialType(id: string, type: Partial<InsertRawMaterialType>): Promise<RawMaterialType | undefined>;
  deleteRawMaterialType(id: string): Promise<void>;
  
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
  
  // Production Entries
  createProductionEntry(entry: InsertProductionEntry): Promise<ProductionEntry>;
  getAllProductionEntries(): Promise<ProductionEntry[]>;
  getProductionEntry(id: string): Promise<ProductionEntry | undefined>;
  getProductionEntriesByIssuance(issuanceId: string): Promise<ProductionEntry[]>;
  updateProductionEntry(id: string, updates: Partial<InsertProductionEntry>): Promise<ProductionEntry | undefined>;
  deleteProductionEntry(id: string): Promise<void>;
  
  // Production Reconciliations
  createProductionReconciliation(reconciliation: InsertProductionReconciliation): Promise<ProductionReconciliation>;
  getAllProductionReconciliations(): Promise<ProductionReconciliation[]>;
  getProductionReconciliation(id: string): Promise<ProductionReconciliation | undefined>;
  getProductionReconciliationByNumber(reconciliationNumber: string): Promise<ProductionReconciliation | undefined>;
  getReconciliationsByIssuance(issuanceId: string): Promise<ProductionReconciliation[]>;
  getReconciliationsByProduction(productionEntryId: string): Promise<ProductionReconciliation[]>;
  updateProductionReconciliation(id: string, updates: Partial<InsertProductionReconciliation>): Promise<ProductionReconciliation | undefined>;
  deleteProductionReconciliation(id: string): Promise<void>;
  
  // Production Reconciliation Items
  createProductionReconciliationItem(item: InsertProductionReconciliationItem): Promise<ProductionReconciliationItem>;
  getReconciliationItems(reconciliationId: string): Promise<ProductionReconciliationItem[]>;
  updateProductionReconciliationItem(id: string, updates: Partial<InsertProductionReconciliationItem>): Promise<ProductionReconciliationItem | undefined>;
  deleteProductionReconciliationItem(id: string): Promise<void>;
  
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
  
  // Payment Evidence (Payments.xlsx child records linked to VY- payments)
  createPaymentEvidence(evidence: InsertPaymentEvidence): Promise<PaymentEvidence>;
  getPaymentEvidenceByPayment(parentPaymentId: string): Promise<PaymentEvidence[]>;
  getPaymentEvidenceByInvoice(invoiceId: string): Promise<PaymentEvidence[]>;
  getPaymentEvidenceByVendor(vendorId: string): Promise<PaymentEvidence[]>;
  getAllOrphanEvidence(): Promise<PaymentEvidence[]>;
  updatePaymentEvidence(id: string, updates: Partial<InsertPaymentEvidence>): Promise<PaymentEvidence | undefined>;
  deletePaymentEvidence(id: string): Promise<void>;
  
  // Enriched Payment Report (payments with evidence metadata for reporting)
  getPaymentsWithEvidence(options?: {
    vendorId?: string;
    invoiceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>;
  
  // Sales Returns
  createSalesReturn(salesReturn: InsertSalesReturn): Promise<SalesReturn>;
  getAllSalesReturns(): Promise<(SalesReturn & { invoiceNumber: string | null })[]>;
  getSalesReturn(id: string): Promise<(SalesReturn & { invoiceNumber: string | null }) | undefined>;
  getSalesReturnByNumber(returnNumber: string): Promise<SalesReturn | undefined>;
  getSalesReturnsByInvoice(invoiceId: string): Promise<SalesReturn[]>;
  updateSalesReturn(id: string, updates: Partial<InsertSalesReturn>): Promise<SalesReturn | undefined>;
  deleteSalesReturn(id: string): Promise<void>;
  
  // Sales Return Items
  createSalesReturnItem(item: InsertSalesReturnItem): Promise<SalesReturnItem>;
  getSalesReturnItems(returnId: string): Promise<SalesReturnItem[]>;
  updateSalesReturnItem(id: string, updates: Partial<InsertSalesReturnItem>): Promise<SalesReturnItem | undefined>;
  deleteSalesReturnItem(id: string): Promise<void>;
  
  // Credit Notes
  createCreditNote(creditNote: InsertCreditNote): Promise<CreditNote>;
  getAllCreditNotes(): Promise<CreditNote[]>;
  getCreditNote(id: string): Promise<CreditNote | undefined>;
  getCreditNoteByNumber(noteNumber: string): Promise<CreditNote | undefined>;
  getCreditNotesByInvoice(invoiceId: string): Promise<CreditNote[]>;
  updateCreditNote(id: string, updates: Partial<InsertCreditNote>): Promise<CreditNote | undefined>;
  deleteCreditNote(id: string): Promise<void>;
  
  // Credit Note Items
  createCreditNoteItem(item: InsertCreditNoteItem): Promise<CreditNoteItem>;
  getCreditNoteItems(creditNoteId: string): Promise<CreditNoteItem[]>;
  updateCreditNoteItem(id: string, updates: Partial<InsertCreditNoteItem>): Promise<CreditNoteItem | undefined>;
  deleteCreditNoteItem(id: string): Promise<void>;
  
  // Debit Notes
  createDebitNote(debitNote: InsertDebitNote): Promise<DebitNote>;
  getAllDebitNotes(): Promise<DebitNote[]>;
  getDebitNote(id: string): Promise<DebitNote | undefined>;
  getDebitNoteByNumber(noteNumber: string): Promise<DebitNote | undefined>;
  getDebitNotesByInvoice(invoiceId: string): Promise<DebitNote[]>;
  updateDebitNote(id: string, updates: Partial<InsertDebitNote>): Promise<DebitNote | undefined>;
  deleteDebitNote(id: string): Promise<void>;
  
  // Debit Note Items
  createDebitNoteItem(item: InsertDebitNoteItem): Promise<DebitNoteItem>;
  getDebitNoteItems(debitNoteId: string): Promise<DebitNoteItem[]>;
  updateDebitNoteItem(id: string, updates: Partial<InsertDebitNoteItem>): Promise<DebitNoteItem | undefined>;
  deleteDebitNoteItem(id: string): Promise<void>;
  
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
  
  // Document Categories
  createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory>;
  getAllDocumentCategories(): Promise<DocumentCategory[]>;
  getDocumentCategory(id: string): Promise<DocumentCategory | undefined>;
  updateDocumentCategory(id: string, category: Partial<InsertDocumentCategory>): Promise<DocumentCategory | undefined>;
  deleteDocumentCategory(id: string): Promise<void>;
  
  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByCategory(categoryId: string): Promise<Document[]>;
  getDocumentsByEntity(entityType: string, entityId: string): Promise<Document[]>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;
  getDocumentsNearingExpiry(daysBeforeExpiry: number): Promise<Document[]>;
  markDocumentAlertSent(documentId: string): Promise<void>;
  resetDocumentAlertStatus(documentId: string): Promise<void>;
  
  // Expense Categories
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  getAllExpenseCategories(): Promise<ExpenseCategory[]>;
  getExpenseCategory(id: string): Promise<ExpenseCategory | undefined>;
  updateExpenseCategory(id: string, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: string): Promise<void>;
  
  // Expense Vouchers
  createExpenseVoucher(voucher: InsertExpenseVoucher): Promise<ExpenseVoucher>;
  getAllExpenseVouchers(): Promise<ExpenseVoucher[]>;
  getExpenseVoucher(id: string): Promise<ExpenseVoucher | undefined>;
  getExpenseVoucherByNumber(voucherNumber: string): Promise<ExpenseVoucher | undefined>;
  updateExpenseVoucher(id: string, voucher: Partial<InsertExpenseVoucher>): Promise<ExpenseVoucher | undefined>;
  deleteExpenseVoucher(id: string): Promise<void>;
  
  // Expense Items
  createExpenseItem(item: InsertExpenseItem): Promise<ExpenseItem>;
  getExpenseItems(voucherId: string): Promise<ExpenseItem[]>;
  updateExpenseItem(id: string, item: Partial<InsertExpenseItem>): Promise<ExpenseItem | undefined>;
  deleteExpenseItem(id: string): Promise<void>;
  
  // Expense Attachments
  createExpenseAttachment(attachment: InsertExpenseAttachment): Promise<ExpenseAttachment>;
  getExpenseAttachments(voucherId: string): Promise<ExpenseAttachment[]>;
  deleteExpenseAttachment(id: string): Promise<void>;
  
  // Cash Register Days
  createCashRegisterDay(day: InsertCashRegisterDay): Promise<CashRegisterDay>;
  getCashRegisterDays(filters?: { startDate?: string; endDate?: string; salespersonName?: string; status?: string }): Promise<CashRegisterDay[]>;
  getCashRegisterDay(id: string): Promise<CashRegisterDay | undefined>;
  getCashRegisterDayByDateAndPerson(date: string, salespersonName: string): Promise<CashRegisterDay | undefined>;
  updateCashRegisterDay(id: string, day: Partial<InsertCashRegisterDay>): Promise<CashRegisterDay | undefined>;
  deleteCashRegisterDay(id: string): Promise<void>;
  
  // Cash Register Transactions
  createCashRegisterTransaction(transaction: InsertCashRegisterTransaction): Promise<CashRegisterTransaction>;
  getCashRegisterTransactions(dayId: string): Promise<CashRegisterTransaction[]>;
  getCashRegisterTransaction(id: string): Promise<CashRegisterTransaction | undefined>;
  updateCashRegisterTransaction(id: string, transaction: Partial<InsertCashRegisterTransaction>): Promise<CashRegisterTransaction | undefined>;
  deleteCashRegisterTransaction(id: string): Promise<void>;
  
  // Cash Register Expense Items
  createCashRegisterExpenseItem(item: InsertCashRegisterExpenseItem): Promise<CashRegisterExpenseItem>;
  getCashRegisterExpenseItem(id: string): Promise<CashRegisterExpenseItem | undefined>;
  getCashRegisterExpenseItems(transactionId: string): Promise<CashRegisterExpenseItem[]>;
  updateCashRegisterExpenseItem(id: string, item: Partial<InsertCashRegisterExpenseItem>): Promise<CashRegisterExpenseItem | undefined>;
  deleteCashRegisterExpenseItem(id: string): Promise<void>;
  
  // Salesperson Mappings
  createSalespersonMapping(mapping: InsertSalespersonMapping): Promise<SalespersonMapping>;
  getAllSalespersonMappings(): Promise<SalespersonMapping[]>;
  getSalespersonMappingByName(excelName: string): Promise<SalespersonMapping | undefined>;
  updateSalespersonMapping(id: string, mapping: Partial<InsertSalespersonMapping>): Promise<SalespersonMapping | undefined>;
  deleteSalespersonMapping(id: string): Promise<void>;
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
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, roleId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ roleId, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUser(id: string, data: { firstName?: string; lastName?: string; email?: string; password?: string }): Promise<User | undefined> {
    const updateData: any = {
      ...data,
      updatedAt: new Date().toISOString()
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
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ resetToken: token, resetTokenExpiry: expiry.toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId));
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        resetToken: null, 
        resetTokenExpiry: null,
        updatedAt: new Date().toISOString() 
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
      .set({ ...machine, updatedAt: new Date().toISOString() })
      .where(and(eq(machines.id, id), eq(machines.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteMachine(id: string): Promise<void> {
    await db
      .update(machines)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...sparePart, updatedAt: new Date().toISOString() })
      .where(and(eq(sparePartsCatalog.id, id), eq(sparePartsCatalog.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteSparePart(id: string): Promise<void> {
    await db
      .update(sparePartsCatalog)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(sparePartsCatalog.id, id));
  }

  async searchSparePartsByName(searchTerm: string): Promise<SparePartCatalog[]> {
    return await db.select().from(sparePartsCatalog)
      .where(and(
        sql`LOWER(${sparePartsCatalog.partName}) LIKE LOWER(${`%${searchTerm}%`})`,
        eq(sparePartsCatalog.recordStatus, 1)
      ))
      .limit(10);
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
      .set({ ...machineType, updatedAt: new Date().toISOString() })
      .where(and(eq(machineTypes.id, id), eq(machineTypes.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteMachineType(id: string): Promise<void> {
    await db
      .update(machineTypes)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...purchaseOrder, updatedAt: new Date().toISOString() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db
      .update(purchaseOrders)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...plan, updatedAt: new Date().toISOString() })
      .where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteMaintenancePlan(id: string): Promise<void> {
    await db
      .update(maintenancePlans)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...template, updatedAt: new Date().toISOString() })
      .where(and(eq(pmTaskListTemplates.id, id), eq(pmTaskListTemplates.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deletePMTaskListTemplate(id: string): Promise<void> {
    await db
      .update(pmTaskListTemplates)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...uomData, updatedAt: new Date().toISOString() })
      .where(and(eq(uom.id, id), eq(uom.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteUom(id: string): Promise<void> {
    await db
      .update(uom)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(uom.id, id));
  }

  // Product Category Master
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const [created] = await db.insert(productCategories).values(category).returning();
    return created;
  }

  async getAllProductCategories(): Promise<ProductCategory[]> {
    return await db.select().from(productCategories).where(eq(productCategories.recordStatus, 1));
  }

  async getProductCategory(id: string): Promise<ProductCategory | undefined> {
    const [result] = await db.select().from(productCategories).where(and(eq(productCategories.id, id), eq(productCategories.recordStatus, 1)));
    return result;
  }

  async updateProductCategory(id: string, categoryData: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    const [updated] = await db
      .update(productCategories)
      .set({ ...categoryData, updatedAt: new Date().toISOString() })
      .where(and(eq(productCategories.id, id), eq(productCategories.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProductCategory(id: string): Promise<void> {
    await db
      .update(productCategories)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(productCategories.id, id));
  }

  // Product Type Master
  async createProductType(type: InsertProductType): Promise<ProductType> {
    const [created] = await db.insert(productTypes).values(type).returning();
    return created;
  }

  async getAllProductTypes(): Promise<ProductType[]> {
    return await db.select().from(productTypes).where(eq(productTypes.recordStatus, 1));
  }

  async getProductType(id: string): Promise<ProductType | undefined> {
    const [result] = await db.select().from(productTypes).where(and(eq(productTypes.id, id), eq(productTypes.recordStatus, 1)));
    return result;
  }

  async updateProductType(id: string, typeData: Partial<InsertProductType>): Promise<ProductType | undefined> {
    const [updated] = await db
      .update(productTypes)
      .set({ ...typeData, updatedAt: new Date().toISOString() })
      .where(and(eq(productTypes.id, id), eq(productTypes.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProductType(id: string): Promise<void> {
    await db
      .update(productTypes)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(productTypes.id, id));
  }

  // Product Master
  async createProduct(product: InsertProduct): Promise<Product> {
    const productData = {
      ...product,
      defaultLossPercent: product.defaultLossPercent !== undefined ? product.defaultLossPercent?.toString() : undefined,
      usableDerivedUnits: product.usableDerivedUnits !== undefined ? product.usableDerivedUnits?.toString() : undefined,
    };
    const [created] = await db.insert(products).values([productData]).returning();
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
      .set({ 
        ...productData, 
        defaultLossPercent: productData.defaultLossPercent !== undefined ? productData.defaultLossPercent?.toString() : undefined,
        usableDerivedUnits: productData.usableDerivedUnits !== undefined ? productData.usableDerivedUnits?.toString() : undefined,
        updatedAt: new Date().toISOString() 
      })
      .where(and(eq(products.id, id), eq(products.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await db
      .update(products)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id));
  }

  // Product BOM Configurations (Multiple BOM variants per product)
  async createBomConfiguration(config: InsertProductBomConfiguration): Promise<ProductBomConfiguration> {
    // Validate product exists
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, config.productId), eq(products.recordStatus, 1)));
    
    if (!product) {
      throw new Error("Product not found");
    }

    // If this is set as default, unset any existing default for this product
    if (config.isDefault === 1) {
      await db
        .update(productBomConfigurations)
        .set({ isDefault: 0, updatedAt: new Date().toISOString() })
        .where(and(
          eq(productBomConfigurations.productId, config.productId),
          eq(productBomConfigurations.recordStatus, 1)
        ));
    }

    const [created] = await db.insert(productBomConfigurations).values(config).returning();
    return created;
  }

  async getBomConfigurations(productId: string): Promise<ProductBomConfiguration[]> {
    return await db
      .select()
      .from(productBomConfigurations)
      .where(and(
        eq(productBomConfigurations.productId, productId),
        eq(productBomConfigurations.recordStatus, 1)
      ))
      .orderBy(productBomConfigurations.createdAt);
  }

  async getBomConfiguration(id: string): Promise<ProductBomConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(productBomConfigurations)
      .where(and(
        eq(productBomConfigurations.id, id),
        eq(productBomConfigurations.recordStatus, 1)
      ));
    return config;
  }

  async updateBomConfiguration(id: string, config: Partial<InsertProductBomConfiguration>): Promise<ProductBomConfiguration | undefined> {
    // If setting as default, unset existing default first
    if (config.isDefault === 1) {
      const existing = await this.getBomConfiguration(id);
      if (existing) {
        await db
          .update(productBomConfigurations)
          .set({ isDefault: 0, updatedAt: new Date().toISOString() })
          .where(and(
            eq(productBomConfigurations.productId, existing.productId),
            eq(productBomConfigurations.recordStatus, 1),
            sql`${productBomConfigurations.id} != ${id}`
          ));
      }
    }

    const [updated] = await db
      .update(productBomConfigurations)
      .set({ ...config, updatedAt: new Date().toISOString() })
      .where(and(
        eq(productBomConfigurations.id, id),
        eq(productBomConfigurations.recordStatus, 1)
      ))
      .returning();
    return updated;
  }

  async deleteBomConfiguration(id: string): Promise<void> {
    // Soft delete the configuration and its BOM items
    await db
      .update(productBomConfigurations)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(productBomConfigurations.id, id));
    
    // Also soft delete associated BOM items
    await db
      .update(productBom)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(productBom.configurationId, id));
  }

  async setDefaultBomConfiguration(productId: string, configId: string): Promise<void> {
    // Unset all defaults for this product
    await db
      .update(productBomConfigurations)
      .set({ isDefault: 0, updatedAt: new Date().toISOString() })
      .where(and(
        eq(productBomConfigurations.productId, productId),
        eq(productBomConfigurations.recordStatus, 1)
      ));
    
    // Set the new default
    await db
      .update(productBomConfigurations)
      .set({ isDefault: 1, updatedAt: new Date().toISOString() })
      .where(and(
        eq(productBomConfigurations.id, configId),
        eq(productBomConfigurations.recordStatus, 1)
      ));
  }

  // Product Bill of Materials (BOM)
  async createProductBomItem(bomItem: InsertProductBom): Promise<ProductBom> {
    // Validate that productId exists
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, bomItem.productId), eq(products.recordStatus, 1)));
    
    if (!product) {
      throw new Error("Product not found");
    }
    
    // Validate that rawMaterialId exists
    const [rawMaterial] = await db
      .select()
      .from(rawMaterials)
      .where(and(eq(rawMaterials.id, bomItem.rawMaterialId), eq(rawMaterials.recordStatus, 1)));
    
    if (!rawMaterial) {
      throw new Error("Raw material not found");
    }
    
    const [created] = await db.insert(productBom).values(bomItem).returning();
    return created;
  }

  async getProductBom(productId: string): Promise<any[]> {
    // Return enriched data with raw material details (code, name, UOM)
    const bomItems = await db
      .select()
      .from(productBom)
      .leftJoin(rawMaterials, eq(productBom.rawMaterialId, rawMaterials.id))
      .where(and(eq(productBom.productId, productId), eq(productBom.recordStatus, 1)))
      .orderBy(productBom.createdAt);
    
    // Transform the joined data into a flatter structure
    return bomItems.map(item => ({
      id: item.product_bom.id,
      productId: item.product_bom.productId,
      rawMaterialId: item.product_bom.rawMaterialId,
      quantityRequired: item.product_bom.quantityRequired,  // Fixed: match schema field name
      uom: item.product_bom.uom,  // Fixed: match schema field name
      notes: item.product_bom.notes,
      // Raw material details (will be null if material not found)
      materialCode: item.raw_materials?.materialCode || null,
      materialName: item.raw_materials?.materialName || null,
      materialCategory: item.raw_materials?.category || null,
    }));
  }

  async getProductBomWithTypes(productId: string, configurationId?: string) {
    // Validate product exists and get metadata
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.recordStatus, 1)));
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Get BOM configuration details if specified
    let configName: string | null = null;
    let effectiveConfigId: string | null = configurationId || null;
    
    if (configurationId) {
      const [config] = await db
        .select()
        .from(productBomConfigurations)
        .where(and(
          eq(productBomConfigurations.id, configurationId),
          eq(productBomConfigurations.recordStatus, 1)
        ));
      if (config) {
        configName = config.configName;
      }
    } else {
      // If no configurationId provided, try to find default configuration
      const [defaultConfig] = await db
        .select()
        .from(productBomConfigurations)
        .where(and(
          eq(productBomConfigurations.productId, productId),
          eq(productBomConfigurations.isDefault, 1),
          eq(productBomConfigurations.recordStatus, 1)
        ));
      if (defaultConfig) {
        effectiveConfigId = defaultConfig.id;
        configName = defaultConfig.configName;
      }
    }

    // Build query conditions for BOM items
    const bomConditions = [
      eq(productBom.productId, productId),
      eq(productBom.recordStatus, 1)
    ];
    
    // Filter by configuration if specified (or if we found a default)
    if (effectiveConfigId) {
      bomConditions.push(eq(productBom.configurationId, effectiveConfigId));
    } else {
      // If no configuration specified and no default, get items without configuration (legacy)
      bomConditions.push(sql`${productBom.configurationId} IS NULL`);
    }

    // Get BOM items
    const bomItems = await db
      .select()
      .from(productBom)
      .where(and(...bomConditions))
      .orderBy(productBom.createdAt);

    // Collect all type IDs and raw material IDs needed from BOM
    const neededTypeIds = new Set<string>();
    const neededRawMaterialIds = new Set<string>();
    
    for (const bomItem of bomItems) {
      if (bomItem.materialTypeId) {
        neededTypeIds.add(bomItem.materialTypeId);
      }
      if (bomItem.rawMaterialId) {
        neededRawMaterialIds.add(bomItem.rawMaterialId);
      }
    }

    // Fetch only needed raw materials (by ID or by type)
    let relevantRawMaterials: (typeof rawMaterials.$inferSelect)[] = [];
    if (neededRawMaterialIds.size > 0 || neededTypeIds.size > 0) {
      relevantRawMaterials = await db
        .select()
        .from(rawMaterials)
        .where(and(
          eq(rawMaterials.recordStatus, 1),
          or(
            neededRawMaterialIds.size > 0 ? inArray(rawMaterials.id, Array.from(neededRawMaterialIds)) : undefined,
            neededTypeIds.size > 0 ? inArray(rawMaterials.typeId, Array.from(neededTypeIds)) : undefined
          )
        ));
    }
    
    // Get types for referenced materials (for legacy entries)
    const legacyTypeIds = new Set<string>();
    for (const rm of relevantRawMaterials) {
      if (rm.typeId && !neededTypeIds.has(rm.typeId)) {
        legacyTypeIds.add(rm.typeId);
      }
    }
    
    // Fetch only needed types
    const allNeededTypeIds = [...neededTypeIds, ...legacyTypeIds];
    let relevantTypes: (typeof rawMaterialTypes.$inferSelect)[] = [];
    if (allNeededTypeIds.length > 0) {
      relevantTypes = await db
        .select()
        .from(rawMaterialTypes)
        .where(and(
          eq(rawMaterialTypes.recordStatus, 1),
          inArray(rawMaterialTypes.id, allNeededTypeIds)
        ));
    }

    // Fetch all UOMs for lookup by name (needed to resolve baseUnit text to UOM ID)
    const allUoms = await db
      .select()
      .from(uom)
      .where(eq(uom.recordStatus, 1));

    // Create lookup maps
    const rawMaterialMap = new Map(relevantRawMaterials.map(rm => [rm.id, rm]));
    const typeMap = new Map(relevantTypes.map(t => [t.id, t]));
    // UOM lookup by lowercase name for case-insensitive matching
    const uomByNameMap = new Map(allUoms.map(u => [u.name?.toLowerCase(), u.id]));

    // Transform into structured format
    const items = bomItems.map(bomItem => {
      // Resolve material type ID: use materialTypeId (new) or get from rawMaterialId (legacy)
      let resolvedTypeId: string | null = null;
      let material: typeof rawMaterials.$inferSelect | null = null;
      
      if (bomItem.materialTypeId) {
        // New approach: materialTypeId directly
        resolvedTypeId = bomItem.materialTypeId;
      } else if (bomItem.rawMaterialId) {
        // Legacy: get type from raw material
        material = rawMaterialMap.get(bomItem.rawMaterialId) || null;
        resolvedTypeId = material?.typeId || null;
      }
      
      // Get type details
      const typeData = resolvedTypeId ? typeMap.get(resolvedTypeId) || null : null;
      
      // Get effective UOM ID:
      // 1. From raw material's uomId if set
      // 2. From material type's baseUnit (look up UOM by name from database)
      // 3. From first available raw material of this type
      const firstMaterialOfType = resolvedTypeId 
        ? relevantRawMaterials.find(rm => rm.typeId === resolvedTypeId && rm.uomId)
        : null;
      
      // The baseUnit is the issuance unit (e.g., "Bag" for preforms)
      const baseUnitHint = typeData?.baseUnit || null;
      
      // Look up UOM ID by baseUnit name if raw material doesn't have uomId set
      const uomIdFromBaseUnit = baseUnitHint 
        ? uomByNameMap.get(baseUnitHint.toLowerCase()) || null
        : null;
      
      // Priority: material's uomId > UOM from baseUnit lookup > first material's uomId
      const effectiveUomId = material?.uomId || uomIdFromBaseUnit || firstMaterialOfType?.uomId || null;
      
      // Find all available raw materials of this type with stock
      // Sort by receivedDate (oldest first) for FIFO policy
      const availableRawMaterials = resolvedTypeId 
        ? relevantRawMaterials
            .filter(rm => rm.typeId === resolvedTypeId && (Number(rm.currentStock) > 0 || Number(rm.closingStock) > 0))
            .sort((a, b) => {
              // Sort by receivedDate (oldest first), null dates at end
              const dateA = a.receivedDate ? new Date(a.receivedDate).getTime() : Infinity;
              const dateB = b.receivedDate ? new Date(b.receivedDate).getTime() : Infinity;
              return dateA - dateB;
            })
            .map(rm => ({
              id: rm.id,
              materialCode: rm.materialCode,
              materialName: rm.materialName,
              currentStock: Number(rm.currentStock) || Number(rm.closingStock) || 0,
              receivedDate: rm.receivedDate,
              batchCode: rm.batchCode,
            }))
        : [];
      
      return {
        bom: bomItem,
        material: material,
        type: typeData,
        typeId: resolvedTypeId,
        effectiveUomId,
        baseUnitHint,
        availableRawMaterials,
      };
    });

    // Get latest update timestamp from BOM items
    const lastUpdatedAt = bomItems.length > 0
      ? new Date(Math.max(...bomItems.map(i => {
          const dateStr = i.updatedAt || i.createdAt;
          return dateStr ? new Date(dateStr).getTime() : 0;
        })))
      : null;

    return {
      items,
      metadata: {
        productId: product.id,
        productName: product.productName,
        totalItems: items.length,
        lastUpdatedAt,
        configurationId: effectiveConfigId,
        configurationName: configName,
      },
    };
  }

  async getProductBomItem(id: string): Promise<ProductBom | undefined> {
    const [bomItem] = await db
      .select()
      .from(productBom)
      .where(and(eq(productBom.id, id), eq(productBom.recordStatus, 1)));
    return bomItem;
  }

  async updateProductBomItem(id: string, bomItemData: Partial<InsertProductBom>): Promise<ProductBom | undefined> {
    // Validate rawMaterialId if it's being updated
    if (bomItemData.rawMaterialId) {
      const [rawMaterial] = await db
        .select()
        .from(rawMaterials)
        .where(and(eq(rawMaterials.id, bomItemData.rawMaterialId), eq(rawMaterials.recordStatus, 1)));
      
      if (!rawMaterial) {
        throw new Error("Raw material not found");
      }
    }
    
    const [updated] = await db
      .update(productBom)
      .set({ ...bomItemData, updatedAt: new Date().toISOString() })
      .where(and(eq(productBom.id, id), eq(productBom.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProductBomItem(id: string): Promise<void> {
    await db
      .update(productBom)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(productBom.id, id));
  }

  async replaceProductBom(productId: string, bomItems: Omit<InsertProductBom, 'productId'>[]): Promise<ProductBom[]> {
    // Validate product exists
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.recordStatus, 1)));
    
    if (!product) {
      throw new Error("Product not found");
    }

    // Validate all raw materials exist BEFORE any database modifications
    for (const bomItem of bomItems) {
      const [rawMaterial] = await db
        .select()
        .from(rawMaterials)
        .where(and(eq(rawMaterials.id, bomItem.rawMaterialId), eq(rawMaterials.recordStatus, 1)));
      
      if (!rawMaterial) {
        throw new Error(`Raw material not found: ${bomItem.rawMaterialId}`);
      }
    }

    // Check for duplicate raw materials in the input
    const rawMaterialIds = bomItems.map(item => item.rawMaterialId);
    const uniqueRawMaterialIds = [...new Set(rawMaterialIds)];
    if (rawMaterialIds.length !== uniqueRawMaterialIds.length) {
      throw new Error("Duplicate raw materials found in BOM. Each raw material can only be added once.");
    }

    // Use transaction for atomic delete + insert
    return await db.transaction(async (tx) => {
      // Step 1: PHYSICALLY delete all existing BOM items for this product
      // (not soft-delete, because unique index includes soft-deleted records)
      await tx
        .delete(productBom)
        .where(eq(productBom.productId, productId));

      // Step 2: Insert all new BOM items
      if (bomItems.length === 0) {
        return [];
      }

      const bomItemsWithProductId = bomItems.map(item => ({
        ...item,
        productId,
      }));

      const created = await tx.insert(productBom).values(bomItemsWithProductId).returning();
      return created;
    });
  }

  async bulkReplaceProductBom(productId: string, bomItems: InsertProductBom[], configurationId?: string): Promise<ProductBom[]> {
    // Validate that productId exists
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.recordStatus, 1)));
    
    if (!product) {
      throw new Error("Product not found");
    }

    // If configurationId provided, validate it exists
    if (configurationId) {
      const [config] = await db
        .select()
        .from(productBomConfigurations)
        .where(and(
          eq(productBomConfigurations.id, configurationId),
          eq(productBomConfigurations.recordStatus, 1)
        ));
      if (!config) {
        throw new Error("BOM configuration not found");
      }
    }

    // Check for duplicate material types in the input
    const materialTypeIds = bomItems.filter(item => item.materialTypeId).map(item => item.materialTypeId);
    const uniqueMaterialTypeIds = [...new Set(materialTypeIds)];
    if (materialTypeIds.length !== uniqueMaterialTypeIds.length) {
      throw new Error("Duplicate material types found in BOM. Each material type can only be added once per configuration.");
    }
    
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // PHYSICALLY delete existing BOM items for this product and configuration
      if (configurationId) {
        await tx
          .delete(productBom)
          .where(and(
            eq(productBom.productId, productId),
            eq(productBom.configurationId, configurationId)
          ));
      } else {
        // Delete items without configuration (legacy)
        await tx
          .delete(productBom)
          .where(and(
            eq(productBom.productId, productId),
            sql`${productBom.configurationId} IS NULL`
          ));
      }
      
      // Insert new BOM items
      if (bomItems.length === 0) {
        return [];
      }
      
      const bomItemsWithConfig = bomItems.map(item => ({
        ...item,
        productId,
        configurationId: configurationId || null,
      }));
      
      const created = await tx.insert(productBom).values(bomItemsWithConfig).returning();
      return created;
    });
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
      .set({ ...vendorData, updatedAt: new Date().toISOString() })
      .where(and(eq(vendors.id, id), eq(vendors.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteVendor(id: string): Promise<void> {
    await db
      .update(vendors)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(vendors.id, id));
  }

  // Vendor Type Master
  async createVendorType(vendorType: InsertVendorType): Promise<VendorType> {
    const [created] = await db.insert(vendorTypes).values(vendorType).returning();
    return created;
  }

  async getAllVendorTypes(): Promise<VendorType[]> {
    return await db.select().from(vendorTypes).where(eq(vendorTypes.recordStatus, 1));
  }

  async getVendorType(id: string): Promise<VendorType | undefined> {
    const [type] = await db.select().from(vendorTypes).where(and(eq(vendorTypes.id, id), eq(vendorTypes.recordStatus, 1)));
    return type;
  }

  async updateVendorType(id: string, vendorTypeData: Partial<InsertVendorType>): Promise<VendorType | undefined> {
    const [updated] = await db
      .update(vendorTypes)
      .set({ ...vendorTypeData, updatedAt: new Date().toISOString() })
      .where(and(eq(vendorTypes.id, id), eq(vendorTypes.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteVendorType(id: string): Promise<void> {
    await db
      .update(vendorTypes)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(vendorTypes.id, id));
  }

  // Vendor-VendorType Assignments
  async assignVendorType(vendorId: string, vendorTypeId: string, isPrimary: boolean = false): Promise<VendorVendorType> {
    const [created] = await db.insert(vendorVendorTypes).values({
      vendorId,
      vendorTypeId,
      isPrimary: isPrimary ? 1 : 0,
    }).returning();
    return created;
  }

  async getVendorTypes(vendorId: string): Promise<VendorType[]> {
    const results = await db
      .select({
        vendorType: vendorTypes,
      })
      .from(vendorVendorTypes)
      .innerJoin(vendorTypes, eq(vendorVendorTypes.vendorTypeId, vendorTypes.id))
      .where(and(
        eq(vendorVendorTypes.vendorId, vendorId),
        eq(vendorVendorTypes.recordStatus, 1),
        eq(vendorTypes.recordStatus, 1)
      ));
    
    return results.map(r => r.vendorType);
  }

  async removeVendorType(vendorId: string, vendorTypeId: string): Promise<void> {
    await db
      .update(vendorVendorTypes)
      .set({ recordStatus: 0 })
      .where(and(
        eq(vendorVendorTypes.vendorId, vendorId),
        eq(vendorVendorTypes.vendorTypeId, vendorTypeId)
      ));
  }

  // Raw Material Type Master
  async createRawMaterialType(type: InsertRawMaterialType): Promise<RawMaterialType> {
    const [created] = await db.insert(rawMaterialTypes).values([type]).returning();
    return created;
  }

  async getAllRawMaterialTypes(): Promise<RawMaterialType[]> {
    return await db.select().from(rawMaterialTypes).where(eq(rawMaterialTypes.recordStatus, 1));
  }

  async getRawMaterialType(id: string): Promise<RawMaterialType | undefined> {
    const [type] = await db.select().from(rawMaterialTypes).where(and(eq(rawMaterialTypes.id, id), eq(rawMaterialTypes.recordStatus, 1)));
    return type;
  }

  async updateRawMaterialType(id: string, typeData: Partial<InsertRawMaterialType>): Promise<RawMaterialType | undefined> {
    const [updated] = await db
      .update(rawMaterialTypes)
      .set({ ...typeData, updatedAt: new Date().toISOString() })
      .where(and(eq(rawMaterialTypes.id, id), eq(rawMaterialTypes.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRawMaterialType(id: string): Promise<void> {
    await db
      .update(rawMaterialTypes)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(rawMaterialTypes.id, id));
  }

  // Raw Materials/Inventory
  async createRawMaterial(material: InsertRawMaterial): Promise<RawMaterial> {
    const [created] = await db.insert(rawMaterials).values([material]).returning();
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
      .set({ ...materialData, updatedAt: new Date().toISOString() })
      .where(and(eq(rawMaterials.id, id), eq(rawMaterials.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRawMaterial(id: string): Promise<void> {
    await db
      .update(rawMaterials)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
    const finishedGoodData = {
      ...finishedGood,
      productionDate: finishedGood.productionDate ? new Date(finishedGood.productionDate).toISOString() : finishedGood.productionDate,
    };
    const [created] = await db.insert(finishedGoods).values([finishedGoodData]).returning();
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
      .set({ 
        ...finishedGoodData, 
        productionDate: finishedGoodData.productionDate ? new Date(finishedGoodData.productionDate).toISOString() : undefined,
        inspectionDate: finishedGoodData.inspectionDate ? new Date(finishedGoodData.inspectionDate).toISOString() : undefined,
        updatedAt: new Date().toISOString() 
      })
      .where(and(eq(finishedGoods.id, id), eq(finishedGoods.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteFinishedGood(id: string): Promise<void> {
    await db
      .update(finishedGoods)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(finishedGoods.id, id));
  }

  async getFinishedGoodsByProduct(productId: string): Promise<FinishedGood[]> {
    return await db.select().from(finishedGoods).where(and(eq(finishedGoods.productId, productId), eq(finishedGoods.recordStatus, 1)));
  }

  // Raw Material Issuance
  async createRawMaterialIssuance(issuance: InsertRawMaterialIssuance): Promise<RawMaterialIssuance> {
    const [created] = await db.insert(rawMaterialIssuance).values([issuance]).returning();
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
    const [updated] = await db.update(rawMaterialIssuance).set({
      ...updates,
      issuanceDate: updates.issuanceDate ? new Date(updates.issuanceDate).toISOString() : undefined,
      plannedOutput: updates.plannedOutput !== undefined ? updates.plannedOutput?.toString() : undefined,
    }).where(and(eq(rawMaterialIssuance.id, id), eq(rawMaterialIssuance.recordStatus, 1))).returning();
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
    const [created] = await db.insert(gatepasses).values([gatepass]).returning();
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
    const [updated] = await db.update(gatepasses).set({
      ...updates,
      gatepassDate: updates.gatepassDate ? new Date(updates.gatepassDate).toISOString() : undefined
    }).where(and(eq(gatepasses.id, id), eq(gatepasses.recordStatus, 1))).returning();
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
    const itemData = {
      ...item,
      quantityIssued: item.quantityIssued.toString(),
      suggestedQuantity: item.suggestedQuantity !== undefined ? item.suggestedQuantity?.toString() : undefined,
    };
    const [created] = await db.insert(rawMaterialIssuanceItems).values([itemData]).returning();
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
      .set({ 
        ...updates, 
        quantityIssued: updates.quantityIssued !== undefined ? updates.quantityIssued?.toString() : undefined,
        suggestedQuantity: updates.suggestedQuantity !== undefined ? updates.suggestedQuantity?.toString() : undefined,
        updatedAt: new Date().toISOString() 
      })
      .where(and(eq(rawMaterialIssuanceItems.id, id), eq(rawMaterialIssuanceItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRawMaterialIssuanceItem(id: string): Promise<void> {
    await db.update(rawMaterialIssuanceItems).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(rawMaterialIssuanceItems.id, id));
  }

  // Production Entries
  async createProductionEntry(entry: InsertProductionEntry): Promise<ProductionEntry> {
    // Explicitly handle all fields to ensure proper type conversion
    const entryData = {
      issuanceId: entry.issuanceId,
      productId: entry.productId || null, // Explicitly handle productId
      productionDate: entry.productionDate ? new Date(entry.productionDate).toISOString() : new Date().toISOString(),
      shift: entry.shift,
      producedQuantity: entry.producedQuantity?.toString(),
      rejectedQuantity: entry.rejectedQuantity?.toString() || '0',
      emptyBottlesOpening: entry.emptyBottlesOpening?.toString() || '0',
      emptyBottlesProduced: entry.emptyBottlesProduced?.toString() || '0',
      emptyBottlesUsed: entry.emptyBottlesUsed?.toString() || '0',
      emptyBottlesPending: entry.emptyBottlesPending?.toString() || '0',
      derivedUnits: entry.derivedUnits?.toString() || null,
      remarks: entry.remarks || null,
      createdBy: entry.createdBy || null,
    };
    console.log("[STORAGE] Creating production entry with data:", JSON.stringify(entryData));
    const [created] = await db.insert(productionEntries).values([entryData]).returning();
    return created;
  }

  async getAllProductionEntries(): Promise<ProductionEntry[]> {
    const results = await db
      .select({
        id: productionEntries.id,
        issuanceId: productionEntries.issuanceId,
        issuanceNumber: rawMaterialIssuance.issuanceNumber,
        productionDate: productionEntries.productionDate,
        shift: productionEntries.shift,
        producedQuantity: productionEntries.producedQuantity,
        rejectedQuantity: productionEntries.rejectedQuantity,
        emptyBottlesProduced: productionEntries.emptyBottlesProduced,
        emptyBottlesUsed: productionEntries.emptyBottlesUsed,
        emptyBottlesPending: productionEntries.emptyBottlesPending,
        remarks: productionEntries.remarks,
        recordStatus: productionEntries.recordStatus,
        createdAt: productionEntries.createdAt,
        updatedAt: productionEntries.updatedAt,
      })
      .from(productionEntries)
      .leftJoin(rawMaterialIssuance, eq(productionEntries.issuanceId, rawMaterialIssuance.id))
      .where(eq(productionEntries.recordStatus, 1));
    
    return results as any;
  }

  async getProductionEntry(id: string): Promise<ProductionEntry | undefined> {
    const [result] = await db.select().from(productionEntries).where(and(eq(productionEntries.id, id), eq(productionEntries.recordStatus, 1)));
    return result;
  }

  async getProductionEntriesByIssuance(issuanceId: string): Promise<ProductionEntry[]> {
    return await db.select().from(productionEntries).where(
      and(
        eq(productionEntries.issuanceId, issuanceId),
        eq(productionEntries.recordStatus, 1)
      )
    );
  }

  async updateProductionEntry(id: string, updates: Partial<InsertProductionEntry>): Promise<ProductionEntry | undefined> {
    const [updated] = await db
      .update(productionEntries)
      .set({ 
        ...updates, 
        productionDate: updates.productionDate ? new Date(updates.productionDate).toISOString() : undefined,
        producedQuantity: updates.producedQuantity !== undefined ? updates.producedQuantity?.toString() : undefined,
        rejectedQuantity: updates.rejectedQuantity !== undefined ? updates.rejectedQuantity?.toString() : undefined,
        emptyBottlesProduced: updates.emptyBottlesProduced !== undefined ? updates.emptyBottlesProduced?.toString() : undefined,
        emptyBottlesUsed: updates.emptyBottlesUsed !== undefined ? updates.emptyBottlesUsed?.toString() : undefined,
        emptyBottlesPending: updates.emptyBottlesPending !== undefined ? updates.emptyBottlesPending?.toString() : undefined,
        derivedUnits: updates.derivedUnits !== undefined ? updates.derivedUnits?.toString() : undefined,
        updatedAt: new Date().toISOString() 
      })
      .where(and(eq(productionEntries.id, id), eq(productionEntries.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProductionEntry(id: string): Promise<void> {
    await db.update(productionEntries).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(productionEntries.id, id));
  }

  // Production Reconciliations
  async createProductionReconciliation(reconciliation: InsertProductionReconciliation): Promise<ProductionReconciliation> {
    const [created] = await db.insert(productionReconciliations).values([reconciliation]).returning();
    return created;
  }

  async getAllProductionReconciliations(): Promise<ProductionReconciliation[]> {
    return await db.select().from(productionReconciliations).where(eq(productionReconciliations.recordStatus, 1));
  }

  async getProductionReconciliation(id: string): Promise<ProductionReconciliation | undefined> {
    const [result] = await db.select().from(productionReconciliations).where(and(eq(productionReconciliations.id, id), eq(productionReconciliations.recordStatus, 1)));
    return result;
  }

  async getProductionReconciliationByNumber(reconciliationNumber: string): Promise<ProductionReconciliation | undefined> {
    const [result] = await db.select().from(productionReconciliations).where(and(eq(productionReconciliations.reconciliationNumber, reconciliationNumber), eq(productionReconciliations.recordStatus, 1)));
    return result;
  }

  async getReconciliationsByIssuance(issuanceId: string): Promise<ProductionReconciliation[]> {
    return await db.select().from(productionReconciliations).where(
      and(
        eq(productionReconciliations.issuanceId, issuanceId),
        eq(productionReconciliations.recordStatus, 1)
      )
    );
  }

  async getReconciliationsByProduction(productionEntryId: string): Promise<ProductionReconciliation[]> {
    return await db.select().from(productionReconciliations).where(
      and(
        eq(productionReconciliations.productionEntryId, productionEntryId),
        eq(productionReconciliations.recordStatus, 1)
      )
    );
  }

  async updateProductionReconciliation(id: string, updates: Partial<InsertProductionReconciliation>): Promise<ProductionReconciliation | undefined> {
    const [updated] = await db
      .update(productionReconciliations)
      .set({ 
        ...updates, 
        reconciliationDate: updates.reconciliationDate ? new Date(updates.reconciliationDate).toISOString() : undefined,
        updatedAt: new Date().toISOString() 
      })
      .where(and(eq(productionReconciliations.id, id), eq(productionReconciliations.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProductionReconciliation(id: string): Promise<void> {
    await db.update(productionReconciliations).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(productionReconciliations.id, id));
  }

  // Production Reconciliation Items
  async createProductionReconciliationItem(item: InsertProductionReconciliationItem): Promise<ProductionReconciliationItem> {
    const [created] = await db.insert(productionReconciliationItems).values(item).returning();
    return created;
  }

  async getReconciliationItems(reconciliationId: string): Promise<ProductionReconciliationItem[]> {
    return await db.select().from(productionReconciliationItems).where(
      and(
        eq(productionReconciliationItems.reconciliationId, reconciliationId),
        eq(productionReconciliationItems.recordStatus, 1)
      )
    );
  }

  async updateProductionReconciliationItem(id: string, updates: Partial<InsertProductionReconciliationItem>): Promise<ProductionReconciliationItem | undefined> {
    const [updated] = await db
      .update(productionReconciliationItems)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(productionReconciliationItems.id, id), eq(productionReconciliationItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteProductionReconciliationItem(id: string): Promise<void> {
    await db.update(productionReconciliationItems).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(productionReconciliationItems.id, id));
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
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(gatepassItems.id, id), eq(gatepassItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteGatepassItem(id: string): Promise<void> {
    await db.update(gatepassItems).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(gatepassItems.id, id));
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
    const [updated] = await db.update(invoiceTemplates).set({ ...updates, updatedAt: new Date().toISOString() }).where(eq(invoiceTemplates.id, id)).returning();
    return updated;
  }

  async deleteInvoiceTemplate(id: string): Promise<void> {
    await db.update(invoiceTemplates).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(invoiceTemplates.id, id));
  }

  async setDefaultInvoiceTemplate(id: string): Promise<void> {
    // First, unset all defaults
    await db.update(invoiceTemplates).set({ isDefault: 0, updatedAt: new Date().toISOString() });
    // Then set the new default
    await db.update(invoiceTemplates).set({ isDefault: 1, updatedAt: new Date().toISOString() }).where(eq(invoiceTemplates.id, id));
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
    const [updated] = await db.update(termsConditions).set({ ...updates, updatedAt: new Date().toISOString() }).where(eq(termsConditions.id, id)).returning();
    return updated;
  }

  async deleteTermsConditions(id: string): Promise<void> {
    await db.update(termsConditions).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(termsConditions.id, id));
  }

  async setDefaultTermsConditions(id: string): Promise<void> {
    // First, unset all defaults
    await db.update(termsConditions).set({ isDefault: 0, updatedAt: new Date().toISOString() });
    // Then set the new default
    await db.update(termsConditions).set({ isDefault: 1, updatedAt: new Date().toISOString() }).where(eq(termsConditions.id, id));
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
    // AND have status "ready_for_gatepass" to prevent reusing dispatched/delivered invoices
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
      // No active gatepasses using any invoices - return only invoices with "ready_for_gatepass" status
      return await db.select().from(invoices).where(
        and(
          eq(invoices.recordStatus, 1),
          eq(invoices.status, 'ready_for_gatepass')
        )
      );
    }
    
    return await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.recordStatus, 1),
          eq(invoices.status, 'ready_for_gatepass'),
          notInArray(invoices.id, usedIds)
        )
      );
  }

  async getInvoice(id: string, includeCancelled: boolean = false): Promise<Invoice | undefined> {
    if (includeCancelled) {
      // Include cancelled invoices (recordStatus = 0 or 1)
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      return invoice;
    }
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.recordStatus, 1)));
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ ...updates, updatedAt: new Date().toISOString() }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.update(invoices).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(invoices.id, id));
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

  async getInvoiceItems(invoiceId: string, includeCancelled: boolean = false): Promise<InvoiceItem[]> {
    if (includeCancelled) {
      // Include cancelled items (recordStatus = 0 or 1)
      return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    }
    return await db.select().from(invoiceItems).where(and(eq(invoiceItems.invoiceId, invoiceId), eq(invoiceItems.recordStatus, 1)));
  }

  async updateInvoiceItem(id: string, updates: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const [updated] = await db.update(invoiceItems).set({ ...updates, updatedAt: new Date().toISOString() }).where(eq(invoiceItems.id, id)).returning();
    return updated;
  }

  async deleteInvoiceItem(id: string): Promise<void> {
    await db.update(invoiceItems).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(invoiceItems.id, id));
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
    const [updated] = await db.update(banks).set({ ...updates, updatedAt: new Date().toISOString() }).where(eq(banks.id, id)).returning();
    return updated;
  }

  async deleteBank(id: string): Promise<void> {
    await db.update(banks).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(banks.id, id));
  }

  async getDefaultBank(): Promise<Bank | undefined> {
    const [bank] = await db.select().from(banks).where(and(eq(banks.isDefault, 1), eq(banks.recordStatus, 1)));
    return bank;
  }

  async setDefaultBank(id: string): Promise<void> {
    // Reset all banks to non-default
    await db.update(banks).set({ isDefault: 0, updatedAt: new Date().toISOString() }).where(eq(banks.recordStatus, 1));
    // Set the selected bank as default
    await db.update(banks).set({ isDefault: 1, updatedAt: new Date().toISOString() }).where(eq(banks.id, id));
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
    await db.update(invoicePayments).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(invoicePayments.id, id));
  }

  // Payment Evidence (Payments.xlsx child records linked to VY- payments)
  async createPaymentEvidence(evidence: InsertPaymentEvidence): Promise<PaymentEvidence> {
    const [created] = await db.insert(paymentEvidence).values(evidence).returning();
    return created;
  }

  async getPaymentEvidenceByPayment(parentPaymentId: string): Promise<PaymentEvidence[]> {
    return await db
      .select()
      .from(paymentEvidence)
      .where(and(eq(paymentEvidence.parentPaymentId, parentPaymentId), eq(paymentEvidence.recordStatus, 1)));
  }

  async getPaymentEvidenceByInvoice(invoiceId: string): Promise<PaymentEvidence[]> {
    return await db
      .select()
      .from(paymentEvidence)
      .where(and(
        or(
          eq(paymentEvidence.invoiceId, invoiceId),
          sql`${paymentEvidence.parentPaymentId} IN (SELECT id FROM invoice_payments WHERE invoice_id = ${invoiceId})`
        ),
        eq(paymentEvidence.recordStatus, 1)
      ));
  }

  async getPaymentEvidenceByVendor(vendorId: string): Promise<PaymentEvidence[]> {
    return await db
      .select()
      .from(paymentEvidence)
      .where(and(eq(paymentEvidence.vendorId, vendorId), eq(paymentEvidence.recordStatus, 1)));
  }

  async getAllOrphanEvidence(): Promise<PaymentEvidence[]> {
    return await db
      .select()
      .from(paymentEvidence)
      .where(and(eq(paymentEvidence.matchStatus, 'orphan'), eq(paymentEvidence.recordStatus, 1)));
  }

  async updatePaymentEvidence(id: string, updates: Partial<InsertPaymentEvidence>): Promise<PaymentEvidence | undefined> {
    const [updated] = await db
      .update(paymentEvidence)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(paymentEvidence.id, id))
      .returning();
    return updated;
  }

  async deletePaymentEvidence(id: string): Promise<void> {
    await db.update(paymentEvidence).set({ recordStatus: 0 }).where(eq(paymentEvidence.id, id));
  }

  // Enriched Payment Report - combines payments with evidence metadata
  async getPaymentsWithEvidence(options?: {
    vendorId?: string;
    invoiceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const offset = (page - 1) * pageSize;
    
    // Build conditions
    const conditions: any[] = [eq(invoicePayments.recordStatus, 1)];
    
    if (options?.invoiceId) {
      conditions.push(eq(invoicePayments.invoiceId, options.invoiceId));
    }
    
    if (options?.dateFrom) {
      conditions.push(sql`${invoicePayments.paymentDate}::date >= ${options.dateFrom}::date`);
    }
    
    if (options?.dateTo) {
      conditions.push(sql`${invoicePayments.paymentDate}::date <= ${options.dateTo}::date`);
    }
    
    if (options?.vendorId) {
      conditions.push(eq(invoices.vendorId, options.vendorId));
    }
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(invoicePayments)
      .leftJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(...conditions));
    
    const total = countResult[0]?.count || 0;
    
    // Get payments with invoice info
    const payments = await db
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
        createdAt: invoicePayments.createdAt,
        invoiceNumber: invoices.invoiceNumber,
        buyerName: invoices.buyerName,
        vendorId: invoices.vendorId,
      })
      .from(invoicePayments)
      .leftJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(...conditions))
      .orderBy(desc(invoicePayments.paymentDate))
      .limit(pageSize)
      .offset(offset);
    
    // Get evidence for these payments in batch
    const paymentIds = payments.map(p => p.id);
    
    let evidenceByPayment: Map<string, any[]> = new Map();
    
    if (paymentIds.length > 0) {
      const allEvidence = await db
        .select()
        .from(paymentEvidence)
        .where(and(
          inArray(paymentEvidence.parentPaymentId, paymentIds),
          eq(paymentEvidence.recordStatus, 1)
        ));
      
      // Group evidence by parent payment ID
      for (const ev of allEvidence) {
        if (ev.parentPaymentId) {
          if (!evidenceByPayment.has(ev.parentPaymentId)) {
            evidenceByPayment.set(ev.parentPaymentId, []);
          }
          evidenceByPayment.get(ev.parentPaymentId)!.push(ev);
        }
      }
    }
    
    // Enrich payments with evidence
    const enrichedPayments = payments.map(payment => {
      const evidence = evidenceByPayment.get(payment.id) || [];
      
      // Aggregate evidence metadata
      const evidenceCount = evidence.length;
      const evidenceTotalAmount = evidence.reduce((sum, e) => sum + (e.amount || 0), 0);
      const evidenceReferences = evidence
        .map(e => e.referenceNumber)
        .filter(Boolean)
        .join(', ');
      const evidenceModes = [...new Set(evidence.map(e => e.paymentMode).filter(Boolean))].join(', ');
      
      return {
        ...payment,
        // Evidence summary for reporting
        evidenceCount,
        evidenceTotalAmount,
        evidenceReferences: evidenceReferences || null,
        evidencePaymentModes: evidenceModes || null,
        // Full evidence records if needed
        evidenceRecords: evidence.map(e => ({
          id: e.id,
          amount: e.amount,
          receivedOn: e.receivedOn,
          paymentMode: e.paymentMode,
          referenceNumber: e.referenceNumber,
          matchStatus: e.matchStatus,
          matchConfidence: e.matchConfidence,
        })),
      };
    });
    
    return {
      data: enrichedPayments,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // Sales Returns
  async createSalesReturn(salesReturnData: InsertSalesReturn): Promise<SalesReturn> {
    const returnNumber = `RET-${Date.now()}`;
    const [created] = await db.insert(salesReturns).values({
      ...salesReturnData,
      returnNumber,
    }).returning();
    return created;
  }

  async getAllSalesReturns(): Promise<(SalesReturn & { invoiceNumber: string | null })[]> {
    const results = await db
      .select({
        id: salesReturns.id,
        returnNumber: salesReturns.returnNumber,
        returnDate: salesReturns.returnDate,
        invoiceId: salesReturns.invoiceId,
        gatepassId: salesReturns.gatepassId,
        returnReason: salesReturns.returnReason,
        returnType: salesReturns.returnType,
        status: salesReturns.status,
        receivedDate: salesReturns.receivedDate,
        inspectedDate: salesReturns.inspectedDate,
        inspectedBy: salesReturns.inspectedBy,
        creditNoteNumber: salesReturns.creditNoteNumber,
        creditNoteDate: salesReturns.creditNoteDate,
        totalCreditAmount: salesReturns.totalCreditAmount,
        creditNoteStatus: salesReturns.creditNoteStatus,
        remarks: salesReturns.remarks,
        recordStatus: salesReturns.recordStatus,
        createdBy: salesReturns.createdBy,
        createdAt: salesReturns.createdAt,
        updatedAt: salesReturns.updatedAt,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(salesReturns)
      .leftJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
      .where(eq(salesReturns.recordStatus, 1));
    
    return results as (SalesReturn & { invoiceNumber: string | null })[];
  }

  async getSalesReturn(id: string): Promise<(SalesReturn & { invoiceNumber: string | null }) | undefined> {
    const results = await db
      .select({
        id: salesReturns.id,
        returnNumber: salesReturns.returnNumber,
        returnDate: salesReturns.returnDate,
        invoiceId: salesReturns.invoiceId,
        gatepassId: salesReturns.gatepassId,
        returnReason: salesReturns.returnReason,
        returnType: salesReturns.returnType,
        status: salesReturns.status,
        receivedDate: salesReturns.receivedDate,
        inspectedDate: salesReturns.inspectedDate,
        inspectedBy: salesReturns.inspectedBy,
        creditNoteNumber: salesReturns.creditNoteNumber,
        creditNoteDate: salesReturns.creditNoteDate,
        totalCreditAmount: salesReturns.totalCreditAmount,
        creditNoteStatus: salesReturns.creditNoteStatus,
        remarks: salesReturns.remarks,
        recordStatus: salesReturns.recordStatus,
        createdBy: salesReturns.createdBy,
        createdAt: salesReturns.createdAt,
        updatedAt: salesReturns.updatedAt,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(salesReturns)
      .leftJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
      .where(and(eq(salesReturns.id, id), eq(salesReturns.recordStatus, 1)));
    
    return results[0] as (SalesReturn & { invoiceNumber: string | null }) | undefined;
  }

  async getSalesReturnByNumber(returnNumber: string): Promise<SalesReturn | undefined> {
    const [salesReturn] = await db.select().from(salesReturns).where(and(eq(salesReturns.returnNumber, returnNumber), eq(salesReturns.recordStatus, 1)));
    return salesReturn;
  }

  async getSalesReturnsByInvoice(invoiceId: string): Promise<SalesReturn[]> {
    return await db.select().from(salesReturns).where(
      and(
        eq(salesReturns.invoiceId, invoiceId),
        eq(salesReturns.recordStatus, 1)
      )
    );
  }

  async updateSalesReturn(id: string, updates: Partial<InsertSalesReturn>): Promise<SalesReturn | undefined> {
    const [updated] = await db
      .update(salesReturns)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(salesReturns.id, id), eq(salesReturns.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteSalesReturn(id: string): Promise<void> {
    await db.update(salesReturns).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(salesReturns.id, id));
  }

  // Sales Return Items
  async createSalesReturnItem(item: InsertSalesReturnItem): Promise<SalesReturnItem> {
    const [created] = await db.insert(salesReturnItems).values(item).returning();
    return created;
  }

  async getSalesReturnItems(returnId: string): Promise<SalesReturnItem[]> {
    return await db.select().from(salesReturnItems).where(
      and(
        eq(salesReturnItems.returnId, returnId),
        eq(salesReturnItems.recordStatus, 1)
      )
    );
  }

  async updateSalesReturnItem(id: string, updates: Partial<InsertSalesReturnItem>): Promise<SalesReturnItem | undefined> {
    const [updated] = await db
      .update(salesReturnItems)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(salesReturnItems.id, id), eq(salesReturnItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteSalesReturnItem(id: string): Promise<void> {
    await db.update(salesReturnItems).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(salesReturnItems.id, id));
  }

  // Credit Notes
  async createCreditNote(creditNoteData: InsertCreditNote): Promise<CreditNote> {
    const [created] = await db.insert(creditNotes).values(creditNoteData).returning();
    return created;
  }

  async getAllCreditNotes(): Promise<CreditNote[]> {
    return await db.select().from(creditNotes).where(eq(creditNotes.recordStatus, 1));
  }

  async getCreditNote(id: string): Promise<CreditNote | undefined> {
    const [creditNote] = await db.select().from(creditNotes).where(and(eq(creditNotes.id, id), eq(creditNotes.recordStatus, 1)));
    return creditNote;
  }

  async getCreditNoteByNumber(noteNumber: string): Promise<CreditNote | undefined> {
    const [creditNote] = await db.select().from(creditNotes).where(and(eq(creditNotes.noteNumber, noteNumber), eq(creditNotes.recordStatus, 1)));
    return creditNote;
  }

  async getCreditNotesByInvoice(invoiceId: string): Promise<CreditNote[]> {
    return await db.select().from(creditNotes).where(
      and(
        eq(creditNotes.invoiceId, invoiceId),
        eq(creditNotes.recordStatus, 1)
      )
    );
  }

  async updateCreditNote(id: string, updates: Partial<InsertCreditNote>): Promise<CreditNote | undefined> {
    const [updated] = await db
      .update(creditNotes)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(creditNotes.id, id), eq(creditNotes.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteCreditNote(id: string): Promise<void> {
    await db.update(creditNotes).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(creditNotes.id, id));
  }

  // Credit Note Items
  async createCreditNoteItem(item: InsertCreditNoteItem): Promise<CreditNoteItem> {
    const [created] = await db.insert(creditNoteItems).values(item).returning();
    return created;
  }

  async getCreditNoteItems(creditNoteId: string): Promise<CreditNoteItem[]> {
    return await db.select().from(creditNoteItems).where(
      and(
        eq(creditNoteItems.creditNoteId, creditNoteId),
        eq(creditNoteItems.recordStatus, 1)
      )
    );
  }

  async updateCreditNoteItem(id: string, updates: Partial<InsertCreditNoteItem>): Promise<CreditNoteItem | undefined> {
    const [updated] = await db
      .update(creditNoteItems)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(creditNoteItems.id, id), eq(creditNoteItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteCreditNoteItem(id: string): Promise<void> {
    await db.update(creditNoteItems).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(creditNoteItems.id, id));
  }

  // Debit Notes
  async createDebitNote(debitNoteData: InsertDebitNote): Promise<DebitNote> {
    const [created] = await db.insert(debitNotes).values(debitNoteData).returning();
    return created;
  }

  async getAllDebitNotes(): Promise<DebitNote[]> {
    return await db.select().from(debitNotes).where(eq(debitNotes.recordStatus, 1));
  }

  async getDebitNote(id: string): Promise<DebitNote | undefined> {
    const [debitNote] = await db.select().from(debitNotes).where(and(eq(debitNotes.id, id), eq(debitNotes.recordStatus, 1)));
    return debitNote;
  }

  async getDebitNoteByNumber(noteNumber: string): Promise<DebitNote | undefined> {
    const [debitNote] = await db.select().from(debitNotes).where(and(eq(debitNotes.noteNumber, noteNumber), eq(debitNotes.recordStatus, 1)));
    return debitNote;
  }

  async getDebitNotesByInvoice(invoiceId: string): Promise<DebitNote[]> {
    return await db.select().from(debitNotes).where(
      and(
        eq(debitNotes.invoiceId, invoiceId),
        eq(debitNotes.recordStatus, 1)
      )
    );
  }

  async updateDebitNote(id: string, updates: Partial<InsertDebitNote>): Promise<DebitNote | undefined> {
    const [updated] = await db
      .update(debitNotes)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(debitNotes.id, id), eq(debitNotes.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteDebitNote(id: string): Promise<void> {
    await db.update(debitNotes).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(debitNotes.id, id));
  }

  // Debit Note Items
  async createDebitNoteItem(item: InsertDebitNoteItem): Promise<DebitNoteItem> {
    const [created] = await db.insert(debitNoteItems).values(item).returning();
    return created;
  }

  async getDebitNoteItems(debitNoteId: string): Promise<DebitNoteItem[]> {
    return await db.select().from(debitNoteItems).where(
      and(
        eq(debitNoteItems.debitNoteId, debitNoteId),
        eq(debitNoteItems.recordStatus, 1)
      )
    );
  }

  async updateDebitNoteItem(id: string, updates: Partial<InsertDebitNoteItem>): Promise<DebitNoteItem | undefined> {
    const [updated] = await db
      .update(debitNoteItems)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(debitNoteItems.id, id), eq(debitNoteItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteDebitNoteItem(id: string): Promise<void> {
    await db.update(debitNoteItems).set({ recordStatus: 0, updatedAt: new Date().toISOString() }).where(eq(debitNoteItems.id, id));
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
      .set({ ...roleData, updatedAt: new Date().toISOString() })
      .where(and(eq(roles.id, id), eq(roles.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    await db
      .update(roles)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...permissionData, updatedAt: new Date().toISOString() })
      .where(and(eq(rolePermissions.id, id), eq(rolePermissions.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteRolePermission(id: string): Promise<void> {
    await db
      .update(rolePermissions)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(rolePermissions.id, id));
  }

  async upsertRolePermissions(roleId: string, permissions: InsertRolePermission[]): Promise<void> {
    // Soft delete existing permissions for this role
    await db
      .update(rolePermissions)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(checklistAssignments.id, id), eq(checklistAssignments.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteChecklistAssignment(id: string): Promise<void> {
    await db
      .update(checklistAssignments)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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

  async getChecklistAssignmentByReference(taskReferenceId: string): Promise<ChecklistAssignment | undefined> {
    const [assignment] = await db.select().from(checklistAssignments)
      .where(and(
        eq(checklistAssignments.taskReferenceId, taskReferenceId),
        eq(checklistAssignments.recordStatus, 1)
      ));
    return assignment;
  }

  async createChecklistSubmissionWithTasks(
    submissionData: {
      templateId: string;
      machineId: string;
      operatorId: string;
      reviewerId: string | null;
      status: string;
      date: Date;
      shift: string;
      submittedAt: Date;
    },
    tasks: Array<{
      taskName: string;
      result: string;
      remarks?: string;
    }>
  ): Promise<{ submission: any; tasks: any[] }> {
    return await db.transaction(async (tx) => {
      // Create submission
      const [submission] = await tx.insert(checklistSubmissions)
        .values(submissionData)
        .returning();

      // Create submission tasks
      const tasksData = tasks.map(task => ({
        submissionId: submission.id,
        taskName: task.taskName,
        result: task.result,
        remarks: task.remarks || null
      }));

      const createdTasks = await tx.insert(submissionTasks)
        .values(tasksData)
        .returning();

      return { submission, tasks: createdTasks };
    });
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

  // Partial Task Answers (for incremental WhatsApp completion)
  async upsertPartialTaskAnswer(data: InsertPartialTaskAnswer): Promise<PartialTaskAnswer> {
    // Check if answer already exists for this assignment and task order
    const existing = await db.select().from(partialTaskAnswers)
      .where(and(
        eq(partialTaskAnswers.assignmentId, data.assignmentId),
        eq(partialTaskAnswers.taskOrder, data.taskOrder)
      ))
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing answer
      const [updated] = await db.update(partialTaskAnswers)
        .set({
          status: data.status,
          remarks: data.remarks,
          answeredAt: new Date(),
        })
        .where(eq(partialTaskAnswers.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Insert new answer
      const [created] = await db.insert(partialTaskAnswers)
        .values(data)
        .returning();
      return created;
    }
  }

  async getPartialTaskAnswers(assignmentId: string): Promise<PartialTaskAnswer[]> {
    return await db.select().from(partialTaskAnswers)
      .where(eq(partialTaskAnswers.assignmentId, assignmentId))
      .orderBy(partialTaskAnswers.taskOrder);
  }

  async getPartialTaskProgress(assignmentId: string, totalTasks: number): Promise<{
    completed: number;
    total: number;
    percentage: number;
    answers: PartialTaskAnswer[];
  }> {
    const answers = await this.getPartialTaskAnswers(assignmentId);
    const completed = answers.length;
    const percentage = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
    
    return {
      completed,
      total: totalTasks,
      percentage,
      answers
    };
  }

  async deletePartialTaskAnswers(assignmentId: string): Promise<void> {
    await db.delete(partialTaskAnswers)
      .where(eq(partialTaskAnswers.assignmentId, assignmentId));
  }

  async updatePartialTaskPhoto(assignmentId: string, taskOrder: number, photoUrl: string): Promise<void> {
    await db.update(partialTaskAnswers)
      .set({ 
        photoUrl, 
        waitingForPhoto: 0,
        waitingForSparePart: 1 // Now waiting for spare part response
      })
      .where(and(
        eq(partialTaskAnswers.assignmentId, assignmentId),
        eq(partialTaskAnswers.taskOrder, taskOrder)
      ));
  }

  async updatePartialTaskSparePart(assignmentId: string, taskOrder: number, sparePartId: string | null, sparePartText: string): Promise<void> {
    await db.update(partialTaskAnswers)
      .set({ 
        sparePartId,
        sparePartRequestText: sparePartText,
        waitingForSparePart: 0
      })
      .where(and(
        eq(partialTaskAnswers.assignmentId, assignmentId),
        eq(partialTaskAnswers.taskOrder, taskOrder)
      ));
  }

  async getPendingPhotoTask(assignmentId: string): Promise<PartialTaskAnswer | null> {
    const [task] = await db.select().from(partialTaskAnswers)
      .where(and(
        eq(partialTaskAnswers.assignmentId, assignmentId),
        eq(partialTaskAnswers.waitingForPhoto, 1)
      ))
      .limit(1);
    return task || null;
  }

  async getPendingSparePartTask(assignmentId: string): Promise<PartialTaskAnswer | null> {
    const [task] = await db.select().from(partialTaskAnswers)
      .where(and(
        eq(partialTaskAnswers.assignmentId, assignmentId),
        eq(partialTaskAnswers.waitingForSparePart, 1)
      ))
      .limit(1);
    return task || null;
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
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(...conditions))
      .returning();
    return updated;
  }

  async deleteMachineStartupTask(id: string): Promise<void> {
    await db
      .update(machineStartupTasks)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
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
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(and(eq(notificationConfig.id, id), eq(notificationConfig.recordStatus, 1)))
      .returning();
    return updated;
  }

  // ==================== DOCUMENT MANAGEMENT ====================
  
  // Document Categories
  async createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory> {
    const [created] = await db.insert(documentCategories).values(category).returning();
    return created;
  }

  async getAllDocumentCategories(): Promise<DocumentCategory[]> {
    return await db.select().from(documentCategories).where(eq(documentCategories.recordStatus, 1));
  }

  async getDocumentCategory(id: string): Promise<DocumentCategory | undefined> {
    const [category] = await db.select().from(documentCategories)
      .where(and(eq(documentCategories.id, id), eq(documentCategories.recordStatus, 1)));
    return category;
  }

  async updateDocumentCategory(id: string, category: Partial<InsertDocumentCategory>): Promise<DocumentCategory | undefined> {
    const [updated] = await db.update(documentCategories)
      .set({ ...category, updatedAt: new Date().toISOString() })
      .where(and(eq(documentCategories.id, id), eq(documentCategories.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteDocumentCategory(id: string): Promise<void> {
    await db.update(documentCategories)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(documentCategories.id, id));
  }

  // Documents
  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.recordStatus, 1));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.recordStatus, 1)));
    return doc;
  }

  async getDocumentsByCategory(categoryId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(eq(documents.categoryId, categoryId), eq(documents.recordStatus, 1)));
  }

  async getDocumentsByEntity(entityType: string, entityId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(
        eq(documents.relatedEntityType, entityType),
        eq(documents.relatedEntityId, entityId),
        eq(documents.recordStatus, 1)
      ));
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined> {
    // If expiry date is being changed, reset the alert status so a new alert can be sent
    const updateData: any = { ...document, updatedAt: new Date().toISOString() };
    
    if ('expiryDate' in document) {
      // Get current document to check if expiry date is changing
      const [current] = await db.select().from(documents)
        .where(and(eq(documents.id, id), eq(documents.recordStatus, 1)));
      
      if (current && current.expiryDate !== document.expiryDate) {
        // Expiry date changed - reset alert status so notification can be sent again
        updateData.expiryAlertSent = 0;
        updateData.expiryAlertSentAt = null;
      }
    }
    
    const [updated] = await db.update(documents)
      .set(updateData)
      .where(and(eq(documents.id, id), eq(documents.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.update(documents)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, id));
  }

  async getDocumentsNearingExpiry(daysBeforeExpiry: number): Promise<Document[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysBeforeExpiry);
    
    // Get documents that:
    // 1. Have an expiry date
    // 2. Are expiring within the specified days
    // 3. Haven't had an alert sent yet
    // 4. Are active (recordStatus = 1)
    return await db.select().from(documents)
      .where(and(
        eq(documents.recordStatus, 1),
        isNotNull(documents.expiryDate),
        lte(documents.expiryDate, futureDate.toISOString().split('T')[0]),
        gte(documents.expiryDate, today.toISOString().split('T')[0]),
        eq(documents.expiryAlertSent, 0)
      ))
      .orderBy(documents.expiryDate);
  }

  async markDocumentAlertSent(documentId: string): Promise<void> {
    await db.update(documents)
      .set({ 
        expiryAlertSent: 1, 
        expiryAlertSentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      })
      .where(eq(documents.id, documentId));
  }

  async resetDocumentAlertStatus(documentId: string): Promise<void> {
    await db.update(documents)
      .set({ 
        expiryAlertSent: 0, 
        expiryAlertSentAt: null,
        updatedAt: new Date().toISOString() 
      })
      .where(eq(documents.id, documentId));
  }

  // ==================== EXPENSE TRACKING ====================

  // Expense Categories
  async createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [created] = await db.insert(expenseCategories).values(category).returning();
    return created;
  }

  async getAllExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).where(eq(expenseCategories.recordStatus, 1));
  }

  async getExpenseCategory(id: string): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(expenseCategories)
      .where(and(eq(expenseCategories.id, id), eq(expenseCategories.recordStatus, 1)));
    return category;
  }

  async updateExpenseCategory(id: string, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [updated] = await db.update(expenseCategories)
      .set({ ...category, updatedAt: new Date().toISOString() })
      .where(and(eq(expenseCategories.id, id), eq(expenseCategories.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    await db.update(expenseCategories)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(expenseCategories.id, id));
  }

  // Expense Vouchers
  async createExpenseVoucher(voucher: InsertExpenseVoucher): Promise<ExpenseVoucher> {
    const [created] = await db.insert(expenseVouchers).values(voucher).returning();
    return created;
  }

  async getAllExpenseVouchers(): Promise<ExpenseVoucher[]> {
    return await db.select().from(expenseVouchers).where(eq(expenseVouchers.recordStatus, 1));
  }

  async getExpenseVoucher(id: string): Promise<ExpenseVoucher | undefined> {
    const [voucher] = await db.select().from(expenseVouchers)
      .where(and(eq(expenseVouchers.id, id), eq(expenseVouchers.recordStatus, 1)));
    return voucher;
  }

  async getExpenseVoucherByNumber(voucherNumber: string): Promise<ExpenseVoucher | undefined> {
    const [voucher] = await db.select().from(expenseVouchers)
      .where(and(eq(expenseVouchers.voucherNumber, voucherNumber), eq(expenseVouchers.recordStatus, 1)));
    return voucher;
  }

  async updateExpenseVoucher(id: string, voucher: Partial<InsertExpenseVoucher>): Promise<ExpenseVoucher | undefined> {
    const [updated] = await db.update(expenseVouchers)
      .set({ ...voucher, updatedAt: new Date().toISOString() })
      .where(and(eq(expenseVouchers.id, id), eq(expenseVouchers.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteExpenseVoucher(id: string): Promise<void> {
    await db.update(expenseVouchers)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(expenseVouchers.id, id));
  }

  // Expense Items
  async createExpenseItem(item: InsertExpenseItem): Promise<ExpenseItem> {
    const [created] = await db.insert(expenseItems).values(item).returning();
    return created;
  }

  async getExpenseItems(voucherId: string): Promise<ExpenseItem[]> {
    return await db.select().from(expenseItems)
      .where(and(eq(expenseItems.voucherId, voucherId), eq(expenseItems.recordStatus, 1)));
  }

  async updateExpenseItem(id: string, item: Partial<InsertExpenseItem>): Promise<ExpenseItem | undefined> {
    const [updated] = await db.update(expenseItems)
      .set({ ...item, updatedAt: new Date().toISOString() })
      .where(and(eq(expenseItems.id, id), eq(expenseItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteExpenseItem(id: string): Promise<void> {
    await db.update(expenseItems)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(expenseItems.id, id));
  }

  // Expense Attachments
  async createExpenseAttachment(attachment: InsertExpenseAttachment): Promise<ExpenseAttachment> {
    const [created] = await db.insert(expenseAttachments).values(attachment).returning();
    return created;
  }

  async getExpenseAttachments(voucherId: string): Promise<ExpenseAttachment[]> {
    return await db.select().from(expenseAttachments)
      .where(and(eq(expenseAttachments.voucherId, voucherId), eq(expenseAttachments.recordStatus, 1)));
  }

  async deleteExpenseAttachment(id: string): Promise<void> {
    await db.update(expenseAttachments)
      .set({ recordStatus: 0 })
      .where(eq(expenseAttachments.id, id));
  }

  // Cash Register Days
  async createCashRegisterDay(day: InsertCashRegisterDay): Promise<CashRegisterDay> {
    const [created] = await db.insert(cashRegisterDays).values(day).returning();
    return created;
  }

  async getCashRegisterDays(filters?: { startDate?: string; endDate?: string; salespersonName?: string; status?: string }): Promise<CashRegisterDay[]> {
    const conditions = [eq(cashRegisterDays.recordStatus, 1)];
    
    if (filters?.startDate) {
      conditions.push(gte(cashRegisterDays.registerDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(cashRegisterDays.registerDate, filters.endDate));
    }
    if (filters?.salespersonName) {
      conditions.push(eq(cashRegisterDays.salespersonName, filters.salespersonName));
    }
    if (filters?.status) {
      conditions.push(eq(cashRegisterDays.status, filters.status));
    }
    
    return await db.select().from(cashRegisterDays)
      .where(and(...conditions))
      .orderBy(sql`${cashRegisterDays.registerDate} DESC`);
  }

  async getCashRegisterDay(id: string): Promise<CashRegisterDay | undefined> {
    const [day] = await db.select().from(cashRegisterDays)
      .where(and(eq(cashRegisterDays.id, id), eq(cashRegisterDays.recordStatus, 1)));
    return day;
  }

  async getCashRegisterDayByDateAndPerson(date: string, salespersonName: string): Promise<CashRegisterDay | undefined> {
    const [day] = await db.select().from(cashRegisterDays)
      .where(and(
        eq(cashRegisterDays.registerDate, date),
        eq(cashRegisterDays.salespersonName, salespersonName),
        eq(cashRegisterDays.recordStatus, 1)
      ));
    return day;
  }

  async updateCashRegisterDay(id: string, day: Partial<InsertCashRegisterDay>): Promise<CashRegisterDay | undefined> {
    const [updated] = await db.update(cashRegisterDays)
      .set({ ...day, updatedAt: new Date().toISOString() })
      .where(and(eq(cashRegisterDays.id, id), eq(cashRegisterDays.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteCashRegisterDay(id: string): Promise<void> {
    await db.update(cashRegisterDays)
      .set({ recordStatus: 0, updatedAt: new Date().toISOString() })
      .where(eq(cashRegisterDays.id, id));
  }

  // Cash Register Transactions
  async createCashRegisterTransaction(transaction: InsertCashRegisterTransaction): Promise<CashRegisterTransaction> {
    const [created] = await db.insert(cashRegisterTransactions).values(transaction).returning();
    return created;
  }

  async getCashRegisterTransactions(dayId: string): Promise<CashRegisterTransaction[]> {
    return await db.select().from(cashRegisterTransactions)
      .where(and(eq(cashRegisterTransactions.dayId, dayId), eq(cashRegisterTransactions.recordStatus, 1)));
  }

  async getCashRegisterTransaction(id: string): Promise<CashRegisterTransaction | undefined> {
    const [transaction] = await db.select().from(cashRegisterTransactions)
      .where(and(eq(cashRegisterTransactions.id, id), eq(cashRegisterTransactions.recordStatus, 1)));
    return transaction;
  }

  async updateCashRegisterTransaction(id: string, transaction: Partial<InsertCashRegisterTransaction>): Promise<CashRegisterTransaction | undefined> {
    const [updated] = await db.update(cashRegisterTransactions)
      .set(transaction)
      .where(and(eq(cashRegisterTransactions.id, id), eq(cashRegisterTransactions.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteCashRegisterTransaction(id: string): Promise<void> {
    await db.update(cashRegisterTransactions)
      .set({ recordStatus: 0 })
      .where(eq(cashRegisterTransactions.id, id));
  }

  // Cash Register Expense Items
  async createCashRegisterExpenseItem(item: InsertCashRegisterExpenseItem): Promise<CashRegisterExpenseItem> {
    const [created] = await db.insert(cashRegisterExpenseItems).values(item).returning();
    return created;
  }

  async getCashRegisterExpenseItem(id: string): Promise<CashRegisterExpenseItem | undefined> {
    const [item] = await db.select().from(cashRegisterExpenseItems)
      .where(and(eq(cashRegisterExpenseItems.id, id), eq(cashRegisterExpenseItems.recordStatus, 1)));
    return item;
  }

  async getCashRegisterExpenseItems(transactionId: string): Promise<CashRegisterExpenseItem[]> {
    return await db.select().from(cashRegisterExpenseItems)
      .where(and(eq(cashRegisterExpenseItems.transactionId, transactionId), eq(cashRegisterExpenseItems.recordStatus, 1)));
  }

  async updateCashRegisterExpenseItem(id: string, item: Partial<InsertCashRegisterExpenseItem>): Promise<CashRegisterExpenseItem | undefined> {
    const [updated] = await db.update(cashRegisterExpenseItems)
      .set(item)
      .where(and(eq(cashRegisterExpenseItems.id, id), eq(cashRegisterExpenseItems.recordStatus, 1)))
      .returning();
    return updated;
  }

  async deleteCashRegisterExpenseItem(id: string): Promise<void> {
    await db.update(cashRegisterExpenseItems)
      .set({ recordStatus: 0 })
      .where(eq(cashRegisterExpenseItems.id, id));
  }

  // Salesperson Mappings
  async createSalespersonMapping(mapping: InsertSalespersonMapping): Promise<SalespersonMapping> {
    const [created] = await db.insert(salespersonMappings).values(mapping).returning();
    return created;
  }

  async getAllSalespersonMappings(): Promise<SalespersonMapping[]> {
    return await db.select().from(salespersonMappings)
      .where(eq(salespersonMappings.isActive, 1));
  }

  async getSalespersonMappingByName(excelName: string): Promise<SalespersonMapping | undefined> {
    const [mapping] = await db.select().from(salespersonMappings)
      .where(and(eq(salespersonMappings.excelName, excelName), eq(salespersonMappings.isActive, 1)));
    return mapping;
  }

  async updateSalespersonMapping(id: string, mapping: Partial<InsertSalespersonMapping>): Promise<SalespersonMapping | undefined> {
    const [updated] = await db.update(salespersonMappings)
      .set(mapping)
      .where(and(eq(salespersonMappings.id, id), eq(salespersonMappings.isActive, 1)))
      .returning();
    return updated;
  }

  async deleteSalespersonMapping(id: string): Promise<void> {
    await db.update(salespersonMappings)
      .set({ isActive: 0 })
      .where(eq(salespersonMappings.id, id));
  }
}

export const storage = new DatabaseStorage();
