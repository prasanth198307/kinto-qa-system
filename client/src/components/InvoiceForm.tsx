import { useState, useEffect, useMemo } from "react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, X, Printer, FileText, AlertCircle, CreditCard, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Gatepass, Product, Vendor, GatepassItem, FinishedGood, Bank, Invoice, InvoiceTemplate, TermsConditions, VendorType, VendorVendorType } from "@shared/schema";
import InvoiceItemRow from "./InvoiceItemRow";
import InvoiceTaxSummary from "./InvoiceTaxSummary";
import { CustomFieldsSection } from "@/components/custom-fields-section";

// Type for available stock API response
interface AvailableStockItem extends FinishedGood {
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

interface AvailableStockResponse {
  items: AvailableStockItem[];
  summary: {
    productId: string;
    totalPhysical: number;
    reserved: number;
    available: number;
  }[];
}

const invoiceFormSchema = z.object({
  salesOrderId: z.string().optional(),
  gatepassId: z.string().optional(),
  invoiceDate: z.string(),
  invoiceTemplateId: z.string().optional(),
  termsConditionsId: z.string().optional(),
  
  // Seller details
  sellerGstin: z.string().optional(),
  sellerName: z.string().optional(),
  sellerAddress: z.string().optional(),
  sellerState: z.string().optional(),
  sellerStateCode: z.string().optional(),
  sellerPhone: z.string().optional(),
  sellerEmail: z.string().optional(),
  
  // Ship-to address
  shipToName: z.string().optional(),
  shipToAddress: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToPincode: z.string().optional(),
  shipToGstin: z.string().optional(),
  
  // Buyer details
  buyerGstin: z.string().optional(),
  buyerName: z.string().min(1, "Buyer name is required"),
  buyerAddress: z.string().optional(),
  buyerState: z.string().optional(),
  buyerStateCode: z.string().optional(),
  isCluster: z.number().optional(),
  
  // Payment details
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  accountHolderName: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
  
  // Signature settings
  includeSignature: z.number().optional(),
  signatureType: z.string().optional(), // 'default', 'hpcl', 'alternate'
  
  // Invoice type and currency
  invoiceType: z.string().optional(),
  currencyCode: z.string().optional(),
  exchangeRate: z.number().optional(),

  // Invoice status
  status: z.string().optional(),
  
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    description: z.string().min(1, "Description is required"),
    hsnCode: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Price must be positive"),
    discount: z.number().min(0).optional(), // Discount amount
    discountMode: z.string().optional(), // '%' (percentage) or sym (flat rupees)
    gstRate: z.number().min(0).max(100, "GST rate must be 0-100%"),
    transportRatePerCase: z.number().min(0).optional(), // Transport rate per case (rupees)
    batchNumber: z.string().optional(),
  })).min(1, "At least one item is required"),
  
  remarks: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  gatepass?: Gatepass;
  invoice?: Invoice;
  isReissueMode?: boolean;
  onClose: () => void;
}

export default function InvoiceForm({ gatepass, invoice, isReissueMode = false, onClose }: InvoiceFormProps) {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [, navigate] = useLocation();
  const [isIntrastateSupply, setIsIntrastateSupply] = useState(() => {
    // For existing invoices, derive from stored igstAmount
    if (invoice && (invoice.igstAmount || 0) > 0) return false;
    return true;
  });
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(invoice?.templateId || "");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [soPickerOpen, setSoPickerOpen] = useState(false);
  const [shipToDifferentAddress, setShipToDifferentAddress] = useState(
    !!(invoice?.shipToName || invoice?.shipToAddress || invoice?.shipToCity || invoice?.shipToState || invoice?.shipToPincode)
  );
  
  // Vendor filtering state
  const [vendorTypeFilter, setVendorTypeFilter] = useState<string>('all');
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [shipToSearchOpen, setShipToSearchOpen] = useState(false);
  
  // GST Inclusive mode - when ON, user enters total amount and system calculates base + GST
  const [gstInclusiveMode, setGstInclusiveMode] = useState(false);
  // Track total amounts per item for inclusive mode calculation
  const [itemTotalAmounts, setItemTotalAmounts] = useState<{ [index: number]: number }>({});

  // Customer advance application
  const [advanceToApply, setAdvanceToApply] = useState<number>(0);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ['/api/uom'],
  });

  // Find the default UOM for invoices (Cases)
  const defaultUomId = useMemo(() => {
    // Look for "Cases" or "Case" UOM - prioritize "Cases"
    const casesUom = uoms.find(u => u.code === 'CASES' || u.name === 'Cases');
    if (casesUom) return casesUom.id;
    const caseUom = uoms.find(u => u.code === 'Case' || u.name === 'Case');
    return caseUom?.id || null;
  }, [uoms]);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: vendorTypes = [], isLoading: isLoadingVendorTypes } = useQuery<VendorType[]>({
    queryKey: ['/api/vendor-types'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: vendorVendorTypes = [], isLoading: isLoadingVendorVendorTypes } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendor-vendor-types/batch'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes  
  });

  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['/api/banks'],
  });

  const { data: templates = [] } = useQuery<InvoiceTemplate[]>({
    queryKey: ['/api/invoice-templates/active'],
  });

  const { data: termsConditionsList = [] } = useQuery<TermsConditions[]>({
    queryKey: ['/api/terms-conditions'],
  });

  const { data: confirmedSalesOrders = [] } = useQuery<any[]>({
    queryKey: ['/api/sales-orders', { status: 'confirmed,partially_invoiced', pageSize: 100 }],
    queryFn: async () => {
      const res = await fetch('/api/sales-orders?status=confirmed,partially_invoiced&pageSize=100', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch sales orders');
      const json = await res.json();
      return json.data || [];
    },
    enabled: !invoice, // Only for new invoices
  });

  // Find default template and terms & conditions
  const defaultTemplate = templates.find(t => t.isDefault === 1);
  const defaultTermsConditions = termsConditionsList.find(tc => tc.isDefault === 1);

  // Use available stock endpoint that deducts reserved quantities from pending invoices
  // When editing an existing invoice, exclude its own reservations so we get accurate available stock
  const { data: availableStockData } = useQuery<AvailableStockResponse>({
    queryKey: ['/api/finished-goods/available-stock', { excludeInvoiceId: invoice?.id }],
  });
  
  // For compatibility with existing code, extract items as finishedGoodsInventory
  const finishedGoodsInventory = availableStockData?.items || [];
  const stockSummary = availableStockData?.summary || [];

  const { data: gatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: gatepass ? [`/api/gatepass-items/${gatepass.id}`] : [],
    enabled: !!gatepass,
  });

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
    enabled: !!gatepass,
  });

  const { data: invoiceItems, isSuccess: itemsLoaded } = useQuery<any[]>({
    queryKey: invoice?.id ? [`/api/invoice-items/${invoice.id}`] : [],
    enabled: !!invoice?.id, // Only fetch items when editing an existing invoice (not for reissue mode)
    staleTime: 0, // Always refetch when the form opens to ensure fresh data after edits
    refetchOnMount: 'always', // Force refetch every time component mounts
  });

  // Filter vendors based on vendor type
  const filteredVendors = useMemo(() => {
    const activeVendors = vendors.filter(v => v.isActive === 'true');
    
    if (vendorTypeFilter === 'all') {
      return activeVendors;
    }
    
    // Get vendor IDs that have the selected vendor type (use Set for O(1) lookup)
    const vendorIdsWithType = new Set(
      vendorVendorTypes
        .filter(vvt => vvt.vendorTypeId === vendorTypeFilter)
        .map(vvt => vvt.vendorId)
    );
    
    // Filter vendors by type using Set for faster lookup
    return activeVendors.filter(v => vendorIdsWithType.has(v.id));
  }, [vendors, vendorTypeFilter, vendorVendorTypes]);

  // Filter vendors that have ship-to names (for HP Pani and similar scenarios)
  const vendorsWithShipTo = useMemo(() => {
    return vendors.filter(v => v.isActive === 'true' && v.shipToName && v.shipToName.trim() !== '');
  }, [vendors]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice ? {
      salesOrderId: (invoice as any).salesOrderId || "",
      gatepassId: gatepass?.id || "",
      invoiceDate: (invoice.invoiceDate || '').replace('T', ' ').split(' ')[0].split('T')[0] || new Date().toISOString().split('T')[0],
      invoiceTemplateId: invoice.templateId || "",
      termsConditionsId: invoice.termsConditionsId || "",
      sellerName: invoice.sellerName || "MicroGrid",
      sellerAddress: invoice.sellerAddress || "356-2, Chintalapalem, Kothavalasa",
      sellerState: invoice.sellerState || "Andhra Pradesh",
      sellerStateCode: invoice.sellerStateCode || "37",
      sellerGstin: invoice.sellerGstin || "37AAHCI5047B1ZR",
      sellerPhone: invoice.sellerPhone || "",
      sellerEmail: invoice.sellerEmail || "",
      shipToName: invoice.shipToName || "",
      shipToAddress: invoice.shipToAddress || "",
      shipToCity: invoice.shipToCity || "",
      shipToState: invoice.shipToState || "",
      shipToPincode: invoice.shipToPincode || "",
      buyerName: invoice.buyerName || "",
      buyerGstin: invoice.buyerGstin || "",
      buyerAddress: invoice.buyerAddress || "",
      buyerState: invoice.buyerState || "Andhra Pradesh",
      buyerStateCode: invoice.buyerStateCode || "37",
      isCluster: invoice.isCluster || 0,
      items: [{
        productId: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: 0,
        gstRate: 18,
        transportRatePerCase: 0,
        batchNumber: "",
      }],
      bankName: invoice.bankName || "",
      bankAccountNumber: invoice.bankAccountNumber || "",
      bankIfscCode: invoice.bankIfscCode || "",
      accountHolderName: invoice.accountHolderName || "",
      branchName: invoice.branchName || "",
      upiId: invoice.upiId || "",
      includeSignature: invoice.includeSignature ?? 1,
      signatureType: (invoice as any).signatureType || 'default',
      invoiceType: (invoice as any).invoiceType || 'tax_invoice',
      currencyCode: (invoice as any).currencyCode || 'INR',
      exchangeRate: (invoice as any).exchangeRate ? Number((invoice as any).exchangeRate) : 1,
    } : {
      salesOrderId: "",
      gatepassId: gatepass?.id || "",
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceTemplateId: "",
      termsConditionsId: "",
      sellerName: "MicroGrid",
      sellerAddress: "356-2, Chintalapalem, Kothavalasa",
      sellerState: "Andhra Pradesh",
      sellerStateCode: "37",
      sellerGstin: "37AAHCI4057B1ZR",
      sellerPhone: "",
      sellerEmail: "",
      shipToName: "",
      shipToAddress: "",
      shipToCity: "",
      shipToState: "",
      shipToPincode: "",
      buyerName: "",
      buyerGstin: "",
      buyerAddress: "",
      buyerState: "Andhra Pradesh",
      buyerStateCode: "37",
      isCluster: 0,
      items: [{
        productId: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: 0,
        gstRate: 18,
        transportRatePerCase: 0,
        batchNumber: "",
      }],
      bankName: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      accountHolderName: "",
      branchName: "",
      upiId: "",
      includeSignature: 1,
      signatureType: 'default',
      invoiceType: 'tax_invoice',
      currencyCode: 'INR',
      exchangeRate: 1,
    },
  });



  // Reset form when invoice prop changes (critical for reissue mode)
  // Helper to normalize a raw DB item row into form shape
  const normalizeItem = (item: any) => {
    let rawGstRate = 0;
    if (item.cgstRate && item.cgstRate > 0) {
      rawGstRate = (item.cgstRate * 2) / 100;
    } else if (item.igstRate && item.igstRate > 0) {
      rawGstRate = item.igstRate / 100;
    }
    const validRates = [0, 5, 12, 18, 28];
    const gstRate = rawGstRate > 0
      ? validRates.reduce((prev, curr) => Math.abs(curr - rawGstRate) < Math.abs(prev - rawGstRate) ? curr : prev)
      : 18;
    return {
      productId: item.productId || "",
      description: item.description || "",
      hsnCode: item.hsnCode || "",
      quantity: item.quantity || 1,
      unitPrice: (item.unitPrice || 0) / 100,
      discount: (item.discount || 0) / 100,
      discountMode: item.discountMode || "%",
      gstRate,
      transportRatePerCase: (item.transportRatePerCase || 0) / 100,
      batchNumber: item.batchNumber || "",
    };
  };

  // Single effect: wait until invoice items are loaded, then do ONE form.reset() with full data.
  // Including items directly in form.reset() avoids any replace()/setValue() timing issues with
  // useFieldArray's internal _fields map, which are the root cause of "g is not iterable" crashes.
  useEffect(() => {
    if (!invoice) return;
    // Wait for the items query to resolve before resetting — avoids a follow-up replace() call.
    // itemsLoaded (isSuccess) goes false→true once per invoice load; this effect fires once.
    if (invoice.id && !itemsLoaded) return;

    const safeItems = Array.isArray(invoiceItems) ? invoiceItems : [];
    const embeddedItems = Array.isArray((invoice as any)?.items) ? (invoice as any).items : [];
    const source = safeItems.length > 0 ? safeItems : embeddedItems;
    const normalizedItems = source.length > 0 ? source.map(normalizeItem) : [{
      productId: "", description: "", hsnCode: "", quantity: 1,
      unitPrice: 0, discount: 0, discountMode: "%", gstRate: 18,
      transportRatePerCase: 0, batchNumber: "",
    }];

    console.log('[InvoiceForm] Resetting form with items:', normalizedItems.length);
    const totalAmounts: { [index: number]: number } = {};
    normalizedItems.forEach((item: any, index: number) => {
      totalAmounts[index] = parseFloat((item.unitPrice * (1 + item.gstRate / 100)).toFixed(2));
    });
    setItemTotalAmounts(totalAmounts);

    form.reset({
      salesOrderId: (invoice as any).salesOrderId || "",
      gatepassId: gatepass?.id || "",
      invoiceDate: (invoice.invoiceDate || '').replace('T', ' ').split(' ')[0].split('T')[0] || new Date().toISOString().split('T')[0],
      invoiceTemplateId: invoice.templateId || "",
      termsConditionsId: invoice.termsConditionsId || "",
      sellerName: invoice.sellerName || "MicroGrid",
      sellerAddress: invoice.sellerAddress || "356-2, Chintalapalem, Kothavalasa",
      sellerState: invoice.sellerState || "Andhra Pradesh",
      sellerStateCode: invoice.sellerStateCode || "37",
      sellerGstin: invoice.sellerGstin || "37AAHCI5047B1ZR",
      sellerPhone: invoice.sellerPhone || "",
      sellerEmail: invoice.sellerEmail || "",
      shipToName: invoice.shipToName || "",
      shipToAddress: invoice.shipToAddress || "",
      shipToCity: invoice.shipToCity || "",
      shipToState: invoice.shipToState || "",
      shipToPincode: invoice.shipToPincode || "",
      buyerName: invoice.buyerName || "",
      buyerGstin: invoice.buyerGstin || "",
      buyerAddress: invoice.buyerAddress || "",
      buyerState: invoice.buyerState || "Andhra Pradesh",
      buyerStateCode: invoice.buyerStateCode || "37",
      isCluster: invoice.isCluster || 0,
      items: normalizedItems,
      bankName: invoice.bankName || "",
      bankAccountNumber: invoice.bankAccountNumber || "",
      bankIfscCode: invoice.bankIfscCode || "",
      accountHolderName: invoice.accountHolderName || "",
      branchName: invoice.branchName || "",
      upiId: invoice.upiId || "",
      includeSignature: invoice.includeSignature ?? 1,
      signatureType: (invoice as any).signatureType || 'default',
      status: isReissueMode ? 'draft' : (invoice.status || 'draft'),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, gatepass?.id, isReissueMode, itemsLoaded]);

  // Watch buyer name for adjustments lookup
  const watchedBuyerName = form.watch("buyerName");
  
  // Fetch pending credit/debit notes for the selected buyer
  interface BuyerAdjustments {
    buyerName: string;
    pendingCredits: Array<{
      id: string;
      noteNumber: string;
      invoiceNumber?: string;
      creditDate: string;
      reason: string;
      grandTotal: number;
    }>;
    pendingDebits: Array<{
      id: string;
      noteNumber: string;
      invoiceNumber?: string;
      debitDate: string;
      reason: string;
      grandTotal: number;
    }>;
    totalCreditAmount: number;
    totalDebitAmount: number;
    netAdjustment: number;
    totalOutstanding: number;
    invoiceCount: number;
  }
  
  const { data: buyerAdjustments } = useQuery<BuyerAdjustments>({
    queryKey: ['/api/buyer-adjustments', watchedBuyerName],
    queryFn: async () => {
      if (!watchedBuyerName) return null;
      const encodedName = encodeURIComponent(watchedBuyerName);
      const res = await fetch(`/api/buyer-adjustments/${encodedName}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch buyer adjustments');
      return res.json();
    },
    enabled: !!watchedBuyerName && watchedBuyerName.length > 0,
  });

  // Fetch available customer advances for the selected vendor
  const { data: availableAdvancesData } = useQuery<{ advances: any[]; totalAvailable: number; count: number }>({
    queryKey: ['/api/customer-advances/available', selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return { advances: [], totalAvailable: 0, count: 0 };
      const res = await fetch(`/api/customer-advances/available/${selectedVendorId}`, { credentials: 'include' });
      if (!res.ok) return { advances: [], totalAvailable: 0, count: 0 };
      return res.json();
    },
    enabled: !!selectedVendorId && !invoice, // only for new invoices
  });
  const totalAvailableAdvance = availableAdvancesData?.totalAvailable ?? 0; // in paise

  // Credit limit check
  const selectedVendor = vendors.find(v => v.id === selectedVendorId);
  const vendorCreditLimit = selectedVendor ? Number((selectedVendor as any).creditLimit || 0) : 0;
  const { data: outstandingData } = useQuery<{ totalOutstanding: number }>({
    queryKey: ['/api/customer-outstanding', selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return { totalOutstanding: 0 };
      const res = await fetch(`/api/customer-outstanding-report?vendorId=${selectedVendorId}`, { credentials: 'include' });
      if (!res.ok) return { totalOutstanding: 0 };
      const rows = await res.json();
      const outstanding = Array.isArray(rows) ? rows.reduce((sum: number, r: any) => sum + Number(r.outstanding_amount || r.outstandingAmount || 0), 0) : 0;
      return { totalOutstanding: outstanding };
    },
    enabled: !!selectedVendorId && vendorCreditLimit > 0,
  });
  const creditLimitExceeded = vendorCreditLimit > 0 && (outstandingData?.totalOutstanding ?? 0) > vendorCreditLimit;

  // Auto-select default template and terms & conditions on load
  useEffect(() => {
    if (templates.length > 0 && !invoice) {
      const defaultTemplate = templates.find(t => t.isDefault === 1);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        form.setValue("invoiceTemplateId", defaultTemplate.id);
        applyTemplate(defaultTemplate);
      }
    }
  }, [templates, invoice, form]);

  useEffect(() => {
    if (termsConditionsList.length > 0 && !invoice) {
      const defaultTC = termsConditionsList.find(tc => tc.isDefault === 1);
      if (defaultTC) {
        form.setValue("termsConditionsId", defaultTC.id);
      }
    }
  }, [termsConditionsList, invoice, form]);

  // Auto-select default bank on load
  useEffect(() => {
    if (banks.length > 0 && !invoice) {
      const defaultBank = banks.find(b => b.isDefault === 1) || banks[0];
      if (defaultBank) {
        setSelectedBankId(defaultBank.id);
        form.setValue("bankName", defaultBank.bankName);
        form.setValue("bankAccountNumber", defaultBank.accountNumber);
        form.setValue("bankIfscCode", defaultBank.ifscCode);
        form.setValue("accountHolderName", defaultBank.accountHolderName);
        form.setValue("branchName", defaultBank.branchName || "");
        form.setValue("upiId", defaultBank.upiId || "");
      }
    }
  }, [banks, invoice, form]);

  // Apply template to form
  const applyTemplate = (template: InvoiceTemplate) => {
    if (template.defaultSellerName) form.setValue("sellerName", template.defaultSellerName);
    if (template.defaultSellerGstin) form.setValue("sellerGstin", template.defaultSellerGstin);
    if (template.defaultSellerAddress) form.setValue("sellerAddress", template.defaultSellerAddress);
    if (template.defaultSellerState) form.setValue("sellerState", template.defaultSellerState);
    if (template.defaultSellerStateCode) form.setValue("sellerStateCode", template.defaultSellerStateCode);
    if (template.defaultSellerPhone) form.setValue("sellerPhone", template.defaultSellerPhone);
    if (template.defaultSellerEmail) form.setValue("sellerEmail", template.defaultSellerEmail);
    if (template.defaultBankName) form.setValue("bankName", template.defaultBankName);
    if (template.defaultBankAccountNumber) form.setValue("bankAccountNumber", template.defaultBankAccountNumber);
    if (template.defaultBankIfscCode) form.setValue("bankIfscCode", template.defaultBankIfscCode);
    if (template.defaultAccountHolderName) form.setValue("accountHolderName", template.defaultAccountHolderName);
    if (template.defaultBranchName) form.setValue("branchName", template.defaultBranchName);
  };

  // Handle template selection change
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const selected = templates.find(t => t.id === templateId);
    if (selected) {
      applyTemplate(selected);
    }
  };

  // Pre-populate buyer details from vendor/customer when data loads
  useEffect(() => {
    if (gatepass && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === gatepass.vendorId);
      if (vendor) {
        setSelectedVendorId(vendor.id);
        populateBuyerFromVendor(vendor);
      } else if (gatepass.customerName) {
        form.setValue("buyerName", gatepass.customerName);
        form.setValue("isCluster", gatepass.isCluster || 0);
      }
    }
  }, [gatepass, vendors, form]);

  // Populate buyer details from selected vendor
  const populateBuyerFromVendor = (vendor: Vendor) => {
    form.setValue("buyerName", vendor.vendorName || "");
    form.setValue("buyerGstin", vendor.gstNumber || "");
    form.setValue("buyerAddress", vendor.address || "");
    form.setValue("buyerState", vendor.state || "Andhra Pradesh");
    // Extract state code from GSTIN (first 2 digits) or use default
    const stateCode = vendor.gstNumber?.substring(0, 2) || "37";
    form.setValue("buyerStateCode", stateCode);
    form.setValue("isCluster", vendor.isCluster || 0);
    
    // Auto-fill ship-to fields if vendor has default shipping address (e.g., HPCL vendors)
    if (vendor.shipToName || vendor.shipToAddress) {
      form.setValue("shipToName", vendor.shipToName || "");
      form.setValue("shipToAddress", vendor.shipToAddress || "");
      form.setValue("shipToCity", vendor.shipToCity || "");
      form.setValue("shipToState", vendor.shipToState || "");
      form.setValue("shipToPincode", vendor.shipToPincode || "");
      form.setValue("shipToGstin", vendor.shipToGstin || "");
      // Expand the ship-to section if it has data
      setShipToDifferentAddress(true);
    } else {
      // Clear ship-to fields when selecting vendor without default shipping address
      form.setValue("shipToName", "");
      form.setValue("shipToAddress", "");
      form.setValue("shipToCity", "");
      form.setValue("shipToState", "");
      form.setValue("shipToPincode", "");
      form.setValue("shipToGstin", "");
      setShipToDifferentAddress(false);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    // Look up vendor in filteredVendors to ensure it matches current filter
    const vendor = filteredVendors.find(v => v.id === vendorId);
    if (vendor) {
      populateBuyerFromVendor(vendor);
    }
  };

  // Handle ship-to selection - auto-populates both buyer and ship-to fields
  const handleShipToSelect = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      populateBuyerFromVendor(vendor);
    }
    setShipToSearchOpen(false);
  };

  // Pre-select vendor based on buyer name (for reissue/edit mode)
  useEffect(() => {
    if (invoice && invoice.buyerName && !selectedVendorId) {
      const matchingVendor = vendors.find(v => v.vendorName === invoice.buyerName);
      if (matchingVendor) {
        setSelectedVendorId(matchingVendor.id);
      }
    }
  }, [invoice, vendors, selectedVendorId]);

  // Clear selected vendor when filter changes if vendor is no longer in filtered list
  // BUT keep the vendor if it was selected via Ship-To search (exists in vendorsWithShipTo)
  useEffect(() => {
    if (selectedVendorId) {
      const isFilteredVendor = filteredVendors.find(v => v.id === selectedVendorId);
      const isShipToVendor = vendorsWithShipTo.find(v => v.id === selectedVendorId);
      
      // If vendor is not in current filter AND not a ship-to vendor, clear it
      if (!isFilteredVendor && !isShipToVendor) {
        setSelectedVendorId('');
        // Only clear buyer details if not in edit/reissue mode (no invoice prop)
        if (!invoice) {
          form.setValue("buyerName", "");
          form.setValue("buyerGstin", "");
          form.setValue("buyerAddress", "");
          form.setValue("buyerState", "Andhra Pradesh");
          form.setValue("buyerStateCode", "37");
          form.setValue("isCluster", 0);
        }
      }
    }
  }, [vendorTypeFilter, filteredVendors, selectedVendorId, form, invoice, vendorsWithShipTo]);

  // Pre-populate invoice items from gatepass items (create mode only)
  // NOTE: Reissue/edit mode items are handled by the earlier form.reset() useEffect
  useEffect(() => {
    // Skip if invoice exists (handled by form.reset() useEffect above)
    if (invoice) return;
    
    if (gatepassItems.length > 0 && products.length > 0) {
      // Create mode - populate from gatepass items
      const formItems = gatepassItems.map(item => {
        const fg = finishedGoods.find(f => f.id === item.finishedGoodId);
        const product = fg 
          ? products.find(p => p.id === fg.productId)
          : products.find(p => p.id === item.productId);
        
        return {
          productId: product?.id || item.productId || "",
          description: product?.productName || item.productId || "",
          hsnCode: "", // HSN code to be entered manually
          quantity: item.quantityDispatched || 1,
          unitPrice: 0, // User needs to fill price
          gstRate: 18,
        };
      });
      
      form.setValue("items", formItems);
    }
  }, [invoice, gatepassItems, products, finishedGoods, form]);

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedSalesOrderId = form.watch("salesOrderId");
  const linkedSO = useMemo(() => {
    if (!watchedSalesOrderId) return null;
    return confirmedSalesOrders.find((so: any) => so.id === watchedSalesOrderId);
  }, [watchedSalesOrderId, confirmedSalesOrders]);

  const handleSOSelection = async (soId: string) => {
    const so = confirmedSalesOrders.find((s: any) => s.id === soId);
    if (!so) return;

    try {
      // Fetch full SO with items
      const res = await fetch(`/api/sales-orders/${soId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch sales order details');
      const soDetail = await res.json();

      form.setValue("salesOrderId", soId);
      form.setValue("buyerName", soDetail.buyerName || "");
      form.setValue("buyerGstin", soDetail.buyerGstin || "");
      form.setValue("buyerAddress", soDetail.buyerAddress || "");
      form.setValue("buyerState", soDetail.buyerState || "");
      form.setValue("buyerContact", soDetail.buyerContact || "");

      form.setValue("shipToName", soDetail.shipToName || "");
      form.setValue("shipToAddress", soDetail.shipToAddress || "");
      form.setValue("shipToCity", soDetail.shipToCity || "");
      form.setValue("shipToState", soDetail.shipToState || "");
      form.setValue("shipToPincode", soDetail.shipToPin || "");

      if (soDetail.items && soDetail.items.length > 0) {
        const invoiceItems = soDetail.items.map((item: any) => {
          const igstRate = Number(item.igstRate) || 0;
          const cgstRate = Number(item.cgstRate) || 0;
          const sgstRate = Number(item.sgstRate) || 0;
          const gstRate = igstRate > 0 ? igstRate : (cgstRate + sgstRate);
          
          return {
            productId: item.productId,
            description: item.description || "",
            hsnCode: item.hsnCode || "",
            quantity: item.quantity,
            unitPrice: (item.unitPrice || 0) / 100, // Convert from paise
            discount: (item.discount || 0) / 100,   // Convert from stored ×100
            discountMode: item.discountMode || '%',
            gstRate: Number(gstRate), // numeric in DB is percentage (e.g. 18.00)
            transportRatePerCase: 0,
            batchNumber: "",
          };
        });
        replace(invoiceItems);
      }

      toast({
        title: "Sales Order Linked",
        description: `Pre-filled form with data from ${soDetail.soNumber}`,
      });
    } catch (error) {
      console.error("Error pre-filling from SO:", error);
      toast({
        title: "Error",
        description: "Failed to load sales order details",
        variant: "destructive",
      });
    }
  };

  const clearSOLink = () => {
    form.setValue("salesOrderId", "");
    toast({
      description: "Sales order link removed",
    });
  };

  // Sync field array when pending items exist (needed for reissue mode)
  // This ensures useFieldArray picks up items after form.reset()
  const watchBuyerState = form.watch("buyerStateCode");
  const watchSellerState = form.watch("sellerStateCode");
  const watchItems = form.watch("items");

  useEffect(() => {
    // Only auto-detect when both state codes are actually filled in
    if (watchBuyerState && watchSellerState) {
      setIsIntrastateSupply(watchBuyerState === watchSellerState);
    }
  }, [watchBuyerState, watchSellerState]);

  // Reverse GST calculation: Calculate base price from total (inclusive) amount
  const calculateBaseFromTotal = (totalAmount: number, gstRate: number): number => {
    // Total = Base + (Base * GST/100) = Base * (1 + GST/100)
    // Base = Total / (1 + GST/100)
    const divisor = 1 + (gstRate / 100);
    return Math.round((totalAmount / divisor) * 100) / 100; // Round to 2 decimals
  };
  
  // Calculate GST breakdown from total amount
  const calculateGstSplit = (totalAmount: number, gstRate: number) => {
    const baseAmount = calculateBaseFromTotal(totalAmount, gstRate);
    const totalGst = totalAmount - baseAmount;
    const halfGst = Math.round((totalGst / 2) * 100) / 100;
    
    return {
      baseAmount,
      totalGst,
      cgst: halfGst,
      sgst: halfGst,
      igst: totalGst,
    };
  };
  
  // Handle total amount change in GST Inclusive mode
  // totalValue = price per unit INCLUDING GST (e.g., 106.72 per case)
  const handleTotalAmountChange = (index: number, totalValue: number) => {
    setItemTotalAmounts(prev => ({ ...prev, [index]: totalValue }));
    
    const gstRate = form.watch(`items.${index}.gstRate`) || 18;
    
    // totalValue is the per-unit inclusive price, calculate base per unit directly
    const basePerUnit = calculateBaseFromTotal(totalValue, gstRate);
    
    form.setValue(`items.${index}.unitPrice`, basePerUnit);
  };

  const calculateTaxes = () => {
    let grossTotal = 0;
    let totalDiscountAmount = 0;
    let subtotal = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalQuantity = 0;
    let totalTransportCharges = 0;

    watchItems.forEach((item) => {
      const grossLine = item.quantity * item.unitPrice;
      const discountVal = item.discount || 0;
      const discountMode = item.discountMode || '%';
      let discountAmount = 0;
      if (discountMode === '%') {
        discountAmount = (grossLine * discountVal) / 100;
      } else {
        discountAmount = discountVal * item.quantity; // ${sym} per case × qty
      }
      grossTotal += grossLine;
      totalDiscountAmount += discountAmount;
      const itemTotal = grossLine - discountAmount;
      subtotal += itemTotal;
      totalQuantity += item.quantity;

      const taxAmount = (itemTotal * item.gstRate) / 100;
      
      if (isIntrastateSupply) {
        cgstAmount += taxAmount / 2;
        sgstAmount += taxAmount / 2;
      } else {
        igstAmount += taxAmount;
      }
      
      // Transport charges per item (calculated AFTER GST, not taxable)
      const itemTransport = (item.transportRatePerCase || 0) * item.quantity;
      totalTransportCharges += itemTransport;
    });

    const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount + totalTransportCharges;

    return {
      grossTotal: Math.round(grossTotal * 100),
      totalDiscount: Math.round(totalDiscountAmount * 100),
      subtotal: Math.round(subtotal * 100), // Convert to paise
      cgstAmount: Math.round(cgstAmount * 100),
      sgstAmount: Math.round(sgstAmount * 100),
      igstAmount: Math.round(igstAmount * 100),
      transportCharges: Math.round(totalTransportCharges * 100), // Total transport in paise
      totalQuantity,
      totalAmount: Math.round(totalAmount * 100),
    };
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const taxes = calculateTaxes();
      
      const invoiceHeader = {
        gatepassId: data.gatepassId || null,
        invoiceDate: new Date(data.invoiceDate),
        templateId: data.invoiceTemplateId || null,
        termsConditionsId: data.termsConditionsId || null,
        sellerGstin: data.sellerGstin || null,
        sellerName: data.sellerName || null,
        sellerAddress: data.sellerAddress || null,
        sellerState: data.sellerState || null,
        sellerStateCode: data.sellerStateCode || null,
        buyerGstin: data.buyerGstin || null,
        buyerName: data.buyerName,
        buyerAddress: data.buyerAddress || null,
        buyerState: data.buyerState || null,
        buyerStateCode: data.buyerStateCode || null,
        // Ship-to address fields
        shipToName: data.shipToName || null,
        shipToAddress: data.shipToAddress || null,
        shipToCity: data.shipToCity || null,
        shipToState: data.shipToState || null,
        shipToPincode: data.shipToPincode || null,
        isCluster: data.isCluster || 0,
        subtotal: taxes.subtotal,
        cgstAmount: taxes.cgstAmount,
        sgstAmount: taxes.sgstAmount,
        igstAmount: taxes.igstAmount,
        cessAmount: 0,
        transportCharges: taxes.transportCharges,
        roundOff: 0,
        totalAmount: taxes.totalAmount,
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankIfscCode: data.bankIfscCode || null,
        upiId: data.upiId || null,
        remarks: data.remarks || null,
        includeSignature: data.includeSignature ?? 1,
        signatureType: data.signatureType || 'default',
        invoiceType: data.invoiceType || 'tax_invoice',
        currencyCode: data.currencyCode || 'INR',
        exchangeRate: data.exchangeRate || 1,
        // Include original invoice ID for reissue tracking
        // In reissue mode, the cancelled invoice's ID is stored as originalInvoiceId on the invoice prop
        originalInvoiceId: isReissueMode ? (invoice?.id || (invoice as any)?.originalInvoiceId) : null,
        // Link to sales order if created from SO
        salesOrderId: data.salesOrderId || null,
        // Ensure status is correctly set
        status: data.status || 'draft',
      };
      
      console.log('[InvoiceForm] Invoice header being sent:', {
        buyerName: invoiceHeader.buyerName,
        salesOrderId: invoiceHeader.salesOrderId,
        originalInvoiceId: invoiceHeader.originalInvoiceId,
        status: invoiceHeader.status,
        isReissueMode,
        invoiceId: invoice?.id,
        shipToName: invoiceHeader.shipToName,
        shipToAddress: invoiceHeader.shipToAddress,
        shipToCity: invoiceHeader.shipToCity,
        shipToState: invoiceHeader.shipToState,
        shipToPincode: invoiceHeader.shipToPincode,
      });

      console.log('[InvoiceForm] Form data.items gstRates:', data.items.map(item => ({
        description: item.description,
        gstRate: item.gstRate,
        gstRateType: typeof item.gstRate
      })));
      
      const invoiceItems = data.items.map((item) => {
        // Ensure gstRate is a number (form might pass it as string from Select)
        const gstRate = typeof item.gstRate === 'string' ? parseFloat(item.gstRate) : (item.gstRate || 0);
        const grossLine = item.quantity * item.unitPrice;
        const discountVal = item.discount || 0;
        const discountMode = item.discountMode || '%';
        let discountAmount = 0;
        if (discountMode === '%') {
          discountAmount = (grossLine * discountVal) / 100;
        } else {
          discountAmount = discountVal * item.quantity; // ${sym} per case × qty
        }
        const taxableAmount = grossLine - discountAmount;
        const taxAmount = (taxableAmount * gstRate) / 100;
        
        let cgstRateValue = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRateValue = 0;
        let igstAmount = 0;

        if (isIntrastateSupply) {
          cgstRateValue = (gstRate / 2) * 100; // Convert to basis points
          sgstRate = (gstRate / 2) * 100;
          cgstAmount = Math.round((taxAmount / 2) * 100); // Convert to paise
          sgstAmount = Math.round((taxAmount / 2) * 100);
        } else {
          igstRateValue = gstRate * 100;
          igstAmount = Math.round(taxAmount * 100);
        }
        
        console.log(`[InvoiceForm] Item ${item.description}: gstRate=${gstRate}, isIntrastate=${isIntrastateSupply}, cgst=${cgstRateValue}, igst=${igstRateValue}`);

        // Transport charges for this item (calculated after GST)
        const transportRate = item.transportRatePerCase || 0;
        const itemTransportCharges = transportRate * item.quantity;
        
        return {
          productId: item.productId,
          hsnCode: item.hsnCode || null,
          sacCode: null,
          description: item.description,
          quantity: item.quantity,
          uomId: defaultUomId, // Use default UOM (Cases) for invoice items
          unitPrice: Math.round(item.unitPrice * 100), // Convert to paise
          discount: Math.round(discountVal * 100), // stored as value × 100
          discountMode: discountMode,
          taxableAmount: Math.round(taxableAmount * 100),
          cgstRate: cgstRateValue,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate: igstRateValue,
          igstAmount,
          cessRate: 0,
          cessAmount: 0,
          transportRatePerCase: Math.round(transportRate * 100), // Convert to paise
          transportCharges: Math.round(itemTransportCharges * 100), // Convert to paise
          totalAmount: Math.round((taxableAmount + taxAmount + itemTransportCharges) * 100),
        };
      });

      console.log('[InvoiceForm] Creating invoice with items:', invoiceItems.map(item => ({
        productId: item.productId,
        gstRate: `cgst=${item.cgstRate}, igst=${item.igstRate}`,
        taxableAmount: item.taxableAmount,
        totalAmount: item.totalAmount
      })));
      
      // In reissue mode, always create a NEW invoice (POST) even if invoice prop exists
      if (isReissueMode || !invoice || !invoice.id) {
        // Create mode - new invoice
        const response = await apiRequest('POST', '/api/invoices', {
          header: invoiceHeader,
          items: invoiceItems,
        });
        const result = await response.json();
        console.log('[InvoiceForm] Invoice created successfully:', result);
        return result;
      } else {
        // Edit mode - update existing invoice with header AND items
        const response = await apiRequest('PATCH', `/api/invoices/${invoice.id}`, {
          header: invoiceHeader,
          items: invoiceItems,
        });
        const result = await response.json();
        return result;
      }
    },
    onSuccess: async (response: any) => {
      console.log('[InvoiceForm] Mutation success, response:', response);

      // Apply customer advance if user requested it (new invoices only)
      const newInvoiceId = response?.invoice?.id;
      if (newInvoiceId && advanceToApply > 0 && availableAdvancesData?.advances?.length) {
        const amountPaise = Math.round(advanceToApply * 100);
        let remaining = amountPaise;
        for (const adv of availableAdvancesData.advances) {
          if (remaining <= 0) break;
          const canApply = Math.min(remaining, adv.availableBalance);
          if (canApply <= 0) continue;
          try {
            await apiRequest('POST', `/api/customer-advances/${adv.id}/apply`, {
              invoiceId: newInvoiceId,
              amount: canApply,
              remarks: 'Applied during invoice creation',
            });
            remaining -= canApply;
          } catch (err) {
            console.error('[InvoiceForm] Failed to apply advance:', err);
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      }

      // Force clear cache and refetch of invoices list
      // Use invalidateQueries to mark as stale, then refetch to get fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      
      // Also invalidate and refetch invoice items cache for this specific invoice
      // This is critical for subsequent edits to load the latest items
      if (invoice?.id) {
        await queryClient.invalidateQueries({ queryKey: [`/api/invoice-items/${invoice.id}`] });
        await queryClient.refetchQueries({ queryKey: [`/api/invoice-items/${invoice.id}`] });
        console.log('[InvoiceForm] Invoice items cache invalidated and refetched for:', invoice.id);
      }
      
      console.log('[InvoiceForm] Cache invalidated, now refetching...');
      await queryClient.refetchQueries({ queryKey: ['/api/invoices'] });
      console.log('[InvoiceForm] Refetch complete');
      
      // Clear reissue data from sessionStorage
      if (isReissueMode) {
        // Clear all reissue-related sessionStorage items
        sessionStorage.removeItem('reissue-invoice-data');
        sessionStorage.removeItem('is-reissue');
        sessionStorage.removeItem('reissueInvoiceData');
        
        toast({
          title: "Invoice Reissued Successfully",
          description: `New invoice ${response?.invoice?.invoiceNumber || ''} created.`,
        });
        
        // Close dialog after refetch completes
        onClose();
      } else {
        toast({
          title: "Success",
          description: invoice ? "Invoice updated successfully" : "Invoice created successfully",
        });
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    console.log("Invoice form submitted with data:", data);
    console.log("Form validation errors:", form.formState.errors);
    
    // When editing an invoice, don't send gatepassId (relationship already exists in gatepass table)
    // When creating, gatepassId is used to link the new invoice to the gatepass
    const submitData = invoice ? {
      ...data,
      gatepassId: undefined, // Don't update gatepass relationship when editing
    } : data;
    
    createInvoiceMutation.mutate(submitData);
  };
  
  // Log validation errors on form submission attempt
  const handleFormSubmit = form.handleSubmit(onSubmit, (errors) => {
    console.error("Form validation failed:", errors);
    toast({
      title: "Validation Error",
      description: "Please check all required fields and try again.",
      variant: "destructive",
    });
  });

  const handlePrintPreview = () => {
    setShowPrintPreview(true);
    // Open print preview in new window
    const formData = form.getValues();
    const taxes = calculateTaxes();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(formData, taxes));
      printWindow.document.close();
    }
  };

  const generatePrintHTML = (data: InvoiceFormData, taxes: ReturnType<typeof calculateTaxes>) => {
    const formatCurrency = (amountInPaise: number) => fmtCur(amountInPaise / 100, tenantConfig);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice Preview</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            body { margin: 0; }
            .no-print { display: none; }
          }
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .section { border: 1px solid #ddd; padding: 10px; }
          .section h3 { margin: 0 0 10px 0; font-size: 14px; background: #f5f5f5; padding: 5px; }
          .section p { margin: 5px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; float: right; width: 300px; }
          .totals table { margin: 0; }
          .total-row { font-weight: bold; font-size: 14px; }
          .print-btn { margin: 20px 0; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; font-size: 16px; }
          .print-btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <button onclick="window.print()" class="print-btn no-print">Print Invoice</button>
        
        <div class="header">
          <h1>GST INVOICE</h1>
          <p>Date: ${new Date(data.invoiceDate).toLocaleDateString()}</p>
        </div>

        <div class="invoice-info">
          <div class="section">
            <h3>Seller Details</h3>
            <p><strong>${data.sellerName || 'N/A'}</strong></p>
            <p>${data.sellerAddress || 'N/A'}</p>
            <p>${data.sellerState || 'N/A'} - ${data.sellerStateCode || 'N/A'}</p>
            <p>GSTIN: ${data.sellerGstin || 'N/A'}</p>
          </div>
          
          <div class="section">
            <h3>Buyer Details</h3>
            <p><strong>${data.buyerName}</strong></p>
            <p>${data.buyerAddress || 'N/A'}</p>
            <p>${data.buyerState || 'N/A'} - ${data.buyerStateCode || 'N/A'}</p>
            <p>GSTIN: ${data.buyerGstin || 'N/A'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>HSN</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Rate</th>
              <th class="text-right">GST %</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item, index) => {
              const qty = Number(item.quantity) || 0;
              const price = Number(item.unitPrice) || 0;
              const gst = Number(item.gstRate) || 0;
              const amount = qty * price;
              return `
              <tr>
                <td>${index + 1}</td>
                <td>${item.description}</td>
                <td>${item.hsnCode || '-'}</td>
                <td class="text-right">${qty}</td>
                <td class="text-right">${sym}${price.toFixed(2)}</td>
                <td class="text-right">${gst}%</td>
                <td class="text-right">${sym}${amount.toFixed(2)}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">${formatCurrency(taxes.subtotal)}</td>
            </tr>
            ${isIntrastateSupply ? `
              <tr>
                <td>CGST:</td>
                <td class="text-right">${formatCurrency(taxes.cgstAmount)}</td>
              </tr>
              <tr>
                <td>SGST:</td>
                <td class="text-right">${formatCurrency(taxes.sgstAmount)}</td>
              </tr>
            ` : `
              <tr>
                <td>IGST:</td>
                <td class="text-right">${formatCurrency(taxes.igstAmount)}</td>
              </tr>
            `}
            <tr class="total-row">
              <td>Total Amount:</td>
              <td class="text-right">${formatCurrency(taxes.totalAmount)}</td>
            </tr>
          </table>
        </div>

        <div style="clear: both; margin-top: 40px;">
          ${data.bankName ? `
            <div class="section">
              <h3>Payment Details</h3>
              <p>Bank: ${data.bankName}</p>
              <p>Account: ${data.bankAccountNumber || 'N/A'}</p>
              <p>IFSC: ${data.bankIfscCode || 'N/A'}</p>
              ${data.upiId ? `<p>UPI: ${data.upiId}</p>` : ''}
            </div>
          ` : ''}
        </div>

        ${defaultTermsConditions && defaultTermsConditions.terms && defaultTermsConditions.terms.length > 0 ? `
          <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px;">Terms & Conditions:</h3>
            <ol style="margin: 0; padding-left: 20px; font-size: 11px;">
              ${defaultTermsConditions.terms.map((term: string) => `<li style="margin-bottom: 5px;">${term}</li>`).join('')}
            </ol>
          </div>
        ` : ''}

        <div style="margin-top: 60px; text-align: right;">
          <p>For ${data.sellerName || 'MicroGrid'}</p>
          <br><br>
          <p>_______________________</p>
          <p>Authorized Signatory</p>
        </div>
      </body>
      </html>
    `;
  };

  const taxes = calculateTaxes();
  const formatCurrency = (amountInPaise: number) => fmtCur(amountInPaise / 100, tenantConfig);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Generate GST Invoice</h2>
        <div className="flex gap-2">
          {/* Sales Order Link Status */}
          {!invoice && linkedSO && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 flex items-center h-8">
              <FileText className="w-3 h-3" />
              Linked to {linkedSO.soNumber}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 p-0 hover:bg-transparent"
                onClick={clearSOLink}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintPreview} 
            type="button"
            data-testid="button-print-preview"
          >
            <Printer className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-invoice-form">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Sales Order Picker (New Invoices Only) */}
        {!invoice && (
          <div className="bg-muted/30 p-3 rounded-md border border-dashed border-muted-foreground/30">
            <Label className="text-xs font-medium uppercase text-muted-foreground mb-2 block">
              Link to Sales Order (Optional)
            </Label>
            {confirmedSalesOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No confirmed or partially-invoiced sales orders available. Create and confirm a Sales Order first to link it here.
              </p>
            ) : (
              <Popover open={soPickerOpen} onOpenChange={setSoPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={soPickerOpen}
                    className="w-full justify-between h-9 text-sm"
                    data-testid="button-so-picker"
                  >
                    {watchedSalesOrderId
                      ? confirmedSalesOrders.find((so: any) => so.id === watchedSalesOrderId)?.soNumber
                      : "Select a sales order to import buyer & items..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search SO number or buyer..." />
                    <CommandList>
                      <CommandEmpty>No matching sales orders found.</CommandEmpty>
                      <CommandGroup>
                        {confirmedSalesOrders.map((so: any) => (
                          <CommandItem
                            key={so.id}
                            value={`${so.soNumber} ${so.buyerName}`}
                            onSelect={() => {
                              handleSOSelection(so.id);
                              setSoPickerOpen(false);
                            }}
                            data-testid={`so-option-${so.id}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                watchedSalesOrderId === so.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{so.soNumber}</span>
                                {so.status === 'partially_invoiced' && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Partial</span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{so.buyerName} — {sym}{(so.totalAmount / 100).toLocaleString()}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {/* System automatically uses default template and terms & conditions */}
        {/* Hidden info display */}
        {defaultTemplate && (
          <div className="bg-muted/50 p-3 rounded-md text-sm">
            <p className="font-medium">Invoice Configuration:</p>
            <p className="text-muted-foreground">Template: {defaultTemplate.templateName}</p>
            {defaultTermsConditions && (
              <p className="text-muted-foreground">Terms & Conditions: {defaultTermsConditions.tcName}</p>
            )}
          </div>
        )}

        {/* Invoice Date + Type + Currency + Supply Type row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Input
              id="invoiceDate"
              type="date"
              {...form.register("invoiceDate")}
              className="h-9 text-sm"
              data-testid="input-invoice-date"
            />
            {form.formState.errors.invoiceDate && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.invoiceDate.message}</p>
            )}
          </div>
          <div>
            <Label>Invoice Type</Label>
            <Select value={form.watch("invoiceType") || 'tax_invoice'} onValueChange={v => form.setValue("invoiceType", v)}>
              <SelectTrigger data-testid="select-invoice-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tax_invoice">Tax Invoice</SelectItem>
                <SelectItem value="proforma">Proforma Invoice</SelectItem>
                <SelectItem value="credit_note">Credit Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={form.watch("currencyCode") || 'INR'} onValueChange={v => form.setValue("currencyCode", v)}>
              <SelectTrigger data-testid="select-currency-code">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR – Indian Rupee</SelectItem>
                <SelectItem value="USD">USD – US Dollar</SelectItem>
                <SelectItem value="EUR">EUR – Euro</SelectItem>
                <SelectItem value="GBP">GBP – British Pound</SelectItem>
                <SelectItem value="AED">AED – UAE Dirham</SelectItem>
                <SelectItem value="SGD">SGD – Singapore Dollar</SelectItem>
              </SelectContent>
            </Select>
            {form.watch("currencyCode") && form.watch("currencyCode") !== 'INR' && (
              <div className="mt-1.5">
                <Label className="text-xs text-muted-foreground">Exchange Rate (1 {form.watch("currencyCode")} = ${sym})</Label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="83.5"
                  value={form.watch("exchangeRate") || ''}
                  onChange={e => form.setValue("exchangeRate", parseFloat(e.target.value) || 1)}
                  data-testid="input-exchange-rate"
                />
              </div>
            )}
          </div>
          <div>
            <Label>Supply Type</Label>
            <div className="flex rounded-md border overflow-hidden h-9 mt-1">
              <button
                type="button"
                onClick={() => setIsIntrastateSupply(true)}
                className={`flex-1 text-xs font-medium transition-colors ${isIntrastateSupply ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                data-testid="button-supply-intrastate"
              >
                Intra-state
              </button>
              <button
                type="button"
                onClick={() => setIsIntrastateSupply(false)}
                className={`flex-1 text-xs font-medium transition-colors ${!isIntrastateSupply ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                data-testid="button-supply-interstate"
              >
                Inter-state
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isIntrastateSupply ? 'CGST + SGST applied' : 'IGST applied'}
            </p>
          </div>
        </div>

        {/* Vendor/Customer Selection */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Vendor Type Filter */}
            <div>
              <Label htmlFor="vendorTypeFilter">Filter by Type</Label>
              <Select 
                value={vendorTypeFilter} 
                onValueChange={setVendorTypeFilter}
              >
                <SelectTrigger data-testid="select-vendor-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {isLoadingVendorTypes ? (
                    <SelectItem value="_loading" disabled>Loading types...</SelectItem>
                  ) : (
                    vendorTypes
                      .filter(vt => vt.isActive === 1)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((type) => (
                        <SelectItem key={type.id} value={type.id} data-testid={`vendor-type-option-${type.id}`}>
                          {type.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor Search with Combobox */}
            <div>
              <Label htmlFor="vendorSelect">Search by Buyer Name</Label>
              <Popover open={vendorSearchOpen} onOpenChange={setVendorSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={vendorSearchOpen}
                    className="w-full justify-between"
                    data-testid="button-vendor-combobox"
                  >
                    {selectedVendorId
                      ? filteredVendors.find((vendor) => vendor.id === selectedVendorId)?.vendorName
                      : "Select vendor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] md:w-[400px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search by buyer name or GST..." 
                      data-testid="input-vendor-search"
                    />
                    <CommandEmpty>
                      {isLoadingVendorVendorTypes ? "Loading vendors..." : "No vendor found."}
                    </CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandGroup>
                        {isLoadingVendorVendorTypes ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading vendor data...
                          </div>
                        ) : (
                          filteredVendors.map((vendor) => (
                            <CommandItem
                              key={vendor.id}
                              value={vendor.vendorName}
                              keywords={[vendor.gstNumber || '', vendor.vendorCode || '']}
                              onSelect={() => {
                                handleVendorChange(vendor.id);
                                setVendorSearchOpen(false);
                              }}
                              data-testid={`vendor-option-${vendor.id}`}
                              className="flex items-center gap-2 px-2 py-1.5"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  selectedVendorId === vendor.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1 flex flex-col">
                                <span className="font-medium">{vendor.vendorName}</span>
                                {vendor.gstNumber && (
                                  <span className="text-xs text-muted-foreground">{vendor.gstNumber}</span>
                                )}
                              </span>
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ship-To Search with Combobox */}
            <div>
              <Label htmlFor="shipToSelect">Search by Ship To</Label>
              <Popover open={shipToSearchOpen} onOpenChange={setShipToSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={shipToSearchOpen}
                    className="w-full justify-between"
                    data-testid="button-ship-to-combobox"
                  >
                    {selectedVendorId && vendors.find((v) => v.id === selectedVendorId)?.shipToName
                      ? vendors.find((v) => v.id === selectedVendorId)?.shipToName
                      : "Search shipper..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] md:w-[400px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search by shipper name or city..." 
                      data-testid="input-ship-to-search"
                    />
                    <CommandEmpty>
                      {vendorsWithShipTo.length === 0 ? "No vendors with ship-to addresses." : "No match found."}
                    </CommandEmpty>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandGroup>
                        {vendorsWithShipTo.map((vendor) => (
                          <CommandItem
                            key={vendor.id}
                            value={vendor.shipToName || ''}
                            keywords={[vendor.vendorName, vendor.shipToCity || '', vendor.shipToAddress || '', vendor.shipToGstin || '']}
                            onSelect={() => handleShipToSelect(vendor.id)}
                            data-testid={`ship-to-option-${vendor.id}`}
                            className="flex items-center gap-2 px-2 py-1.5"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                selectedVendorId === vendor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="flex-1 flex flex-col">
                              <span className="font-medium">{vendor.shipToName}</span>
                              <span className="text-xs text-muted-foreground">
                                {vendor.shipToCity}{vendor.shipToCity && vendor.vendorName ? ' • ' : ''}{vendor.vendorName}
                              </span>
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Search by buyer name, shipper name, or filter by type. Selecting fills buyer and ship-to details.
          </p>
        </div>

        {/* Buyer Details (Bill To) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Buyer Details (Bill To)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyerName">Buyer Name *</Label>
              <Input
                id="buyerName"
                {...form.register("buyerName")}
                className="h-9 text-sm"
                data-testid="input-buyer-name"
              />
              {form.formState.errors.buyerName && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.buyerName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="buyerGstin">Buyer GSTIN</Label>
              <Input
                id="buyerGstin"
                {...form.register("buyerGstin")}
                placeholder="29AAAAA0000A1Z5"
                className="h-9 text-sm"
                data-testid="input-buyer-gstin"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="buyerAddress">Buyer Address</Label>
              <Input
                id="buyerAddress"
                {...form.register("buyerAddress")}
                data-testid="input-buyer-address"
              />
            </div>
            <div>
              <Label htmlFor="buyerState">Buyer State</Label>
              <Input
                id="buyerState"
                {...form.register("buyerState")}
                data-testid="input-buyer-state"
              />
            </div>
            <div>
              <Label htmlFor="buyerStateCode">State Code</Label>
              <Input
                id="buyerStateCode"
                {...form.register("buyerStateCode")}
                placeholder="37"
                maxLength={2}
                data-testid="input-buyer-state-code"
              />
            </div>
          </div>
        </div>

        {/* Pending Credit/Debit Notes Banner */}
        {buyerAdjustments && (buyerAdjustments.totalCreditAmount > 0 || buyerAdjustments.totalDebitAmount > 0) && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950" data-testid="alert-buyer-adjustments">
            <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">
              Pending Adjustments for {buyerAdjustments.buyerName}
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <div className="mt-2 space-y-2 text-sm">
                {buyerAdjustments.totalCreditAmount > 0 && (
                  <div className="flex items-center gap-2" data-testid="pending-credits-info">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Credit Notes: {(buyerAdjustments.totalCreditAmount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </span>
                    <span className="text-muted-foreground">
                      ({buyerAdjustments.pendingCredits.length} note{buyerAdjustments.pendingCredits.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}
                {buyerAdjustments.totalDebitAmount > 0 && (
                  <div className="flex items-center gap-2" data-testid="pending-debits-info">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-700 dark:text-orange-400">
                      Debit Notes: {(buyerAdjustments.totalDebitAmount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </span>
                    <span className="text-muted-foreground">
                      ({buyerAdjustments.pendingDebits.length} note{buyerAdjustments.pendingDebits.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}
                <div className="pt-1 border-t border-blue-200 dark:border-blue-700 mt-2">
                  <span className="font-semibold">
                    Net: {buyerAdjustments.netAdjustment >= 0 ? '+' : ''}
                    {(buyerAdjustments.netAdjustment / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {buyerAdjustments.netAdjustment >= 0 
                      ? '(Customer owes this additional amount)' 
                      : '(Customer has credit balance)'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Outstanding: {(buyerAdjustments.totalOutstanding / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} 
                  {' '}from {buyerAdjustments.invoiceCount} invoice{buyerAdjustments.invoiceCount !== 1 ? 's' : ''}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Ship to Different Address Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="shipToDifferent"
            checked={shipToDifferentAddress}
            onChange={(e) => setShipToDifferentAddress(e.target.checked)}
            className="rounded border-gray-300"
            data-testid="checkbox-ship-to-different"
          />
          <Label htmlFor="shipToDifferent" className="cursor-pointer">
            Ship to different address?
          </Label>
        </div>

        {/* Ship-To Address (Conditional) */}
        {shipToDifferentAddress && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Ship-To Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="shipToName">Ship-To Name</Label>
                <Input
                  id="shipToName"
                  {...form.register("shipToName")}
                  data-testid="input-ship-to-name"
                />
              </div>
              <div>
                <Label htmlFor="shipToCity">Ship-To City</Label>
                <Input
                  id="shipToCity"
                  {...form.register("shipToCity")}
                  data-testid="input-ship-to-city"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="shipToAddress">Ship-To Address</Label>
                <Input
                  id="shipToAddress"
                  {...form.register("shipToAddress")}
                  data-testid="input-ship-to-address"
                />
              </div>
              <div>
                <Label htmlFor="shipToState">Ship-To State</Label>
                <Input
                  id="shipToState"
                  {...form.register("shipToState")}
                  data-testid="input-ship-to-state"
                />
              </div>
              <div>
                <Label htmlFor="shipToPincode">Ship-To Pincode</Label>
                <Input
                  id="shipToPincode"
                  {...form.register("shipToPincode")}
                  placeholder="560001"
                  maxLength={6}
                  data-testid="input-ship-to-pincode"
                />
              </div>
            </div>
          </div>
        )}

        {/* Seller Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Seller Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sellerName">Seller Name</Label>
              <Input
                id="sellerName"
                {...form.register("sellerName")}
                data-testid="input-seller-name"
              />
            </div>
            <div>
              <Label htmlFor="sellerGstin">Seller GSTIN</Label>
              <Input
                id="sellerGstin"
                {...form.register("sellerGstin")}
                placeholder="29AAAAA0000A1Z5"
                data-testid="input-seller-gstin"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="sellerAddress">Seller Address</Label>
              <Input
                id="sellerAddress"
                {...form.register("sellerAddress")}
                data-testid="input-seller-address"
              />
            </div>
            <div>
              <Label htmlFor="sellerState">Seller State</Label>
              <Input
                id="sellerState"
                {...form.register("sellerState")}
                data-testid="input-seller-state"
              />
            </div>
            <div>
              <Label htmlFor="sellerStateCode">State Code</Label>
              <Input
                id="sellerStateCode"
                {...form.register("sellerStateCode")}
                placeholder="37"
                maxLength={2}
                data-testid="input-seller-state-code"
              />
            </div>
            <div>
              <Label htmlFor="sellerPhone">Seller Phone</Label>
              <Input
                id="sellerPhone"
                {...form.register("sellerPhone")}
                placeholder="+91 1234567890"
                data-testid="input-seller-phone"
              />
            </div>
            <div>
              <Label htmlFor="sellerEmail">Seller Email</Label>
              <Input
                id="sellerEmail"
                type="email"
                {...form.register("sellerEmail")}
                placeholder="sales@company.com"
                data-testid="input-seller-email"
              />
            </div>
          </div>
        </div>

        {/* Items - Single Line Layout */}
        <div className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-semibold text-lg">Invoice Items</h3>
            <div className="flex items-center gap-3">
              {/* GST Inclusive Mode Toggle */}
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
                <Label htmlFor="gstInclusiveToggle" className="text-sm cursor-pointer whitespace-nowrap">
                  {gstInclusiveMode ? "GST Inclusive Mode (Total Price)" : "GST Exclusive Mode (Base + GST)"}
                </Label>
                <input
                  type="checkbox"
                  id="gstInclusiveToggle"
                  checked={gstInclusiveMode}
                  onChange={(e) => setGstInclusiveMode(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                  data-testid="toggle-gst-inclusive"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => append({ productId: "", description: "", hsnCode: "", quantity: 1, unitPrice: 0, discount: 0, discountMode: "%", gstRate: 18, transportRatePerCase: 0 })}
                data-testid="button-add-item"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
          </div>
          
          {/* GST Inclusive Mode Info */}
          {gstInclusiveMode && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm p-2 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Enter <strong>Price per Case (incl. GST)</strong> and the system will auto-calculate Base Price + GST split</span>
            </div>
          )}

          {/* Items table — horizontally scrollable so it never stacks */}
          {fields.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
              No items added yet. Click "Add Item" to add products.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground">
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">Product *</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">HSN</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">Description *</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">Qty *</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">{gstInclusiveMode ? `Base ${sym}` : `Price ${sym}`}</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">Discount</th>
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">GST %</th>
                    {gstInclusiveMode && <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">Price/Case (incl. GST)</th>}
                    <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">Transport</th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <InvoiceItemRow
                      key={field.id}
                      field={field}
                      index={index}
                      fieldsCount={fields.length}
                      form={form}
                      gstInclusiveMode={gstInclusiveMode}
                      isIntrastateSupply={isIntrastateSupply}
                      isReissueMode={isReissueMode}
                      invoice={invoice}
                      products={products}
                      stockSummary={stockSummary}
                      itemTotalAmounts={itemTotalAmounts}
                      handleTotalAmountChange={handleTotalAmountChange}
                      calculateBaseFromTotal={calculateBaseFromTotal}
                      remove={remove}
                      toast={toast}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Credit Limit Warning */}
        {creditLimitExceeded && (
          <Alert variant="destructive" data-testid="alert-credit-limit">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Credit Limit Exceeded</AlertTitle>
            <AlertDescription>
              {selectedVendor?.vendorName} has an outstanding balance of {sym}{((outstandingData?.totalOutstanding ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} which exceeds their credit limit of {sym}{(vendorCreditLimit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Please review before creating this invoice.
            </AlertDescription>
          </Alert>
        )}

        {/* Tax Summary */}
        <InvoiceTaxSummary taxes={taxes} isIntrastateSupply={isIntrastateSupply} />

        {/* Customer Advance — shown only for new invoices when vendor has advance balance */}
        {!invoice && totalAvailableAdvance > 0 && (
          <div className="rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">
                Customer has {sym}{(totalAvailableAdvance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} in advance payments
                {availableAdvancesData!.count > 1 ? ` (across ${availableAdvancesData!.count} records)` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-green-800 dark:text-green-300 whitespace-nowrap shrink-0">
                Apply towards this invoice (${sym}):
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={totalAvailableAdvance / 100}
                value={advanceToApply || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAdvanceToApply(Math.min(val, totalAvailableAdvance / 100));
                }}
                placeholder="0.00"
                className="h-8 w-36 text-sm"
                data-testid="input-advance-to-apply"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setAdvanceToApply(totalAvailableAdvance / 100)}
                data-testid="button-apply-full-advance"
              >
                Apply Full
              </Button>
              {advanceToApply > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => setAdvanceToApply(0)}
                >
                  Clear
                </Button>
              )}
            </div>
            {advanceToApply > 0 && (
              <p className="text-xs text-green-700 dark:text-green-400">
                {sym}{advanceToApply.toLocaleString('en-IN', { minimumFractionDigits: 2 })} will be applied automatically after invoice is created.
                Remaining due: {sym}{Math.max(0, (taxes.totalAmount / 100) - advanceToApply).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        )}

        {/* Payment Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Payment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Select Bank Account</Label>
              <Select
                value={selectedBankId}
                onValueChange={(value) => {
                  setSelectedBankId(value);
                  const bank = banks.find(b => b.id === value);
                  if (bank) {
                    form.setValue("bankName", bank.bankName);
                    form.setValue("bankAccountNumber", bank.accountNumber);
                    form.setValue("bankIfscCode", bank.ifscCode);
                    form.setValue("accountHolderName", bank.accountHolderName);
                    form.setValue("branchName", bank.branchName || "");
                    form.setValue("upiId", bank.upiId || "");
                  }
                }}
              >
                  <SelectTrigger data-testid="select-bank" className="h-9">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bankName} - {bank.accountNumber}
                      {bank.isDefault === 1 && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBankId && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Account Holder Name</Label>
                  <Input value={form.watch("accountHolderName")} disabled className="h-9 text-sm bg-muted/50" data-testid="input-account-holder-name" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Bank Account Number</Label>
                  <Input value={form.watch("bankAccountNumber")} disabled className="h-9 text-sm bg-muted/50" data-testid="input-bank-account-number" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">IFSC Code</Label>
                  <Input value={form.watch("bankIfscCode")} disabled className="h-9 text-sm bg-muted/50" data-testid="input-bank-ifsc-code" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Branch Name</Label>
                  <Input value={form.watch("branchName")} disabled className="h-9 text-sm bg-muted/50" data-testid="input-bank-branch-name" />
                </div>
                {form.watch("upiId") && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1">UPI ID</Label>
                    <Input value={form.watch("upiId")} disabled className="h-9 text-sm bg-muted/50" data-testid="input-upi-id" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Signature Settings */}
        <div className="border rounded-md px-3 py-2 bg-muted/30 space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeSignature"
              checked={form.watch("includeSignature") === 1}
              onChange={(e) => form.setValue("includeSignature", e.target.checked ? 1 : 0)}
              className="rounded border-gray-300 h-4 w-4"
              data-testid="checkbox-include-signature"
            />
            <Label htmlFor="includeSignature" className="cursor-pointer text-sm">
              Include digital signature on printed invoice
            </Label>
          </div>
          
          {form.watch("includeSignature") === 1 && (
            <div className="flex items-center gap-4 pl-6">
              <Label className="text-sm text-muted-foreground">Use:</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="signatureType"
                    value="default"
                    checked={form.watch("signatureType") === 'default' || !form.watch("signatureType")}
                    onChange={() => form.setValue("signatureType", 'default')}
                    className="h-4 w-4"
                    data-testid="radio-signature-default"
                  />
                  <span className="text-sm">Signature 1</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="signatureType"
                    value="alternate"
                    checked={form.watch("signatureType") === 'alternate'}
                    onChange={() => form.setValue("signatureType", 'alternate')}
                    className="h-4 w-4"
                    data-testid="radio-signature-alternate"
                  />
                  <span className="text-sm">Signature 2</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <Label htmlFor="remarks">Remarks</Label>
          <Input
            id="remarks"
            {...form.register("remarks")}
            placeholder="Optional notes..."
            data-testid="input-remarks"
          />
        </div>

        {/* Custom Fields */}
        <CustomFieldsSection
          entityType="invoice"
          entityId={invoice?.id ?? null}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-3">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={createInvoiceMutation.isPending} data-testid="button-submit-invoice">
            {createInvoiceMutation.isPending ? "Saving..." : (invoice && !isReissueMode ? "Update Invoice" : "Create Invoice")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
