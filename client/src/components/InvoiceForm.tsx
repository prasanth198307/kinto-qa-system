import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, X, Printer, FileText, AlertCircle, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Gatepass, Product, Vendor, GatepassItem, FinishedGood, Bank, Invoice, InvoiceTemplate, TermsConditions, VendorType, VendorVendorType } from "@shared/schema";

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
  
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    description: z.string().min(1, "Description is required"),
    hsnCode: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Price must be positive"),
    gstRate: z.number().min(0).max(100, "GST rate must be 0-100%"),
    transportRatePerCase: z.number().min(0).optional(), // Transport rate per case (rupees)
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
  const [, navigate] = useLocation();
  const [isIntrastateSupply, setIsIntrastateSupply] = useState(true);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(invoice?.templateId || "");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
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

  const { data: invoiceItems = [] } = useQuery<any[]>({
    queryKey: invoice?.id ? [`/api/invoice-items/${invoice.id}`] : [],
    enabled: !!invoice?.id, // Only fetch items when editing an existing invoice (not for reissue mode)
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
      gatepassId: gatepass?.id || "",
      invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      invoiceTemplateId: invoice.templateId || "",
      termsConditionsId: invoice.termsConditionsId || "",
      sellerName: invoice.sellerName || "Inmoisture Private Limited",
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
      }],
      bankName: invoice.bankName || "",
      bankAccountNumber: invoice.bankAccountNumber || "",
      bankIfscCode: invoice.bankIfscCode || "",
      accountHolderName: invoice.accountHolderName || "",
      branchName: invoice.branchName || "",
      upiId: invoice.upiId || "",
      includeSignature: invoice.includeSignature ?? 1,
      signatureType: (invoice as any).signatureType || 'default',
    } : {
      gatepassId: gatepass?.id || "",
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceTemplateId: "",
      termsConditionsId: "",
      sellerName: "Inmoisture Private Limited",
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
      }],
      bankName: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      accountHolderName: "",
      branchName: "",
      upiId: "",
      includeSignature: 1,
      signatureType: 'default',
    },
  });

  // State to track if we need to sync field array after reset
  const [pendingItemsSync, setPendingItemsSync] = useState<any[] | null>(null);

  // Reset form when invoice prop changes (critical for reissue mode)
  // React Hook Form only applies defaultValues on first mount, so we need to reset
  // when invoice changes to make the form editable with the new data
  useEffect(() => {
    if (invoice) {
      // Compute the isIntrastate value for GST calculation
      const isIntrastate = invoice.buyerStateCode === invoice.sellerStateCode;
      
      // Use fetched invoiceItems (from separate query) OR embedded items OR empty array
      const itemsSource = invoiceItems.length > 0 ? invoiceItems : ((invoice as any)?.items || []);
      const normalizedItems = itemsSource.length > 0 
        ? itemsSource.map((item: any) => {
            // Calculate GST rate from basis points
            // cgstRate/sgstRate are each half of total rate (for intrastate)
            // igstRate is full rate (for interstate)
            // All stored in basis points (900 = 9%, 1800 = 18%)
            // Try both - use whichever has a non-zero value
            let rawGstRate = 0;
            if (item.cgstRate && item.cgstRate > 0) {
              // Intrastate: cgstRate is half, so multiply by 2
              rawGstRate = (item.cgstRate * 2) / 100;
            } else if (item.igstRate && item.igstRate > 0) {
              // Interstate: igstRate is full rate
              rawGstRate = item.igstRate / 100;
            }
            
            // Round to nearest valid GST rate (0, 5, 12, 18, 28)
            const validRates = [0, 5, 12, 18, 28];
            const gstRate = rawGstRate > 0 
              ? validRates.reduce((prev, curr) => 
                  Math.abs(curr - rawGstRate) < Math.abs(prev - rawGstRate) ? curr : prev)
              : 18; // Default to 18% if no rate found
            
            console.log(`[InvoiceForm] Item GST conversion: cgstRate=${item.cgstRate}, igstRate=${item.igstRate}, raw=${rawGstRate}, final=${gstRate}`);
            
            return {
              productId: item.productId || "",
              description: item.description || "",
              hsnCode: item.hsnCode || "",
              quantity: item.quantity || 1,
              unitPrice: (item.unitPrice || 0) / 100, // Convert from paise to rupees
              gstRate,
              transportRatePerCase: (item.transportRatePerCase || 0) / 100, // Convert from paise to rupees
            };
          })
        : [{
            productId: "",
            description: "",
            hsnCode: "",
            quantity: 1,
            unitPrice: 0,
            gstRate: 18,
            transportRatePerCase: 0,
          }];
      
      console.log('[InvoiceForm] Resetting form with invoice data, items:', normalizedItems);

      // Ensure GST Inclusive mode is OFF when loading invoice data (edit/reissue)
      // This allows direct editing of base prices
      setGstInclusiveMode(false);
      
      form.reset({
        gatepassId: gatepass?.id || "",
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
        invoiceTemplateId: invoice.templateId || "",
        termsConditionsId: invoice.termsConditionsId || "",
        sellerName: invoice.sellerName || "Inmoisture Private Limited",
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
      });
      
      // Schedule items sync for next render cycle to ensure useFieldArray picks it up
      setPendingItemsSync(normalizedItems);
    }
  }, [invoice, gatepass, form, invoiceItems]);

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
  useEffect(() => {
    if (selectedVendorId && !filteredVendors.find(v => v.id === selectedVendorId)) {
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
  }, [vendorTypeFilter, filteredVendors, selectedVendorId, form, invoice]);

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

  // Sync field array when pending items exist (needed for reissue mode)
  // This ensures useFieldArray picks up items after form.reset()
  useEffect(() => {
    if (pendingItemsSync && pendingItemsSync.length > 0) {
      console.log('[InvoiceForm] Syncing field array with replace(), items:', pendingItemsSync.length);
      replace(pendingItemsSync);
      setPendingItemsSync(null);
    }
  }, [pendingItemsSync, replace]);

  const watchBuyerState = form.watch("buyerStateCode");
  const watchSellerState = form.watch("sellerStateCode");
  const watchItems = form.watch("items");

  useEffect(() => {
    setIsIntrastateSupply(watchBuyerState === watchSellerState);
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
    let subtotal = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalQuantity = 0;
    let totalTransportCharges = 0;

    watchItems.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
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
        // Include original invoice ID for reissue tracking
        // In reissue mode, the cancelled invoice's ID is stored as originalInvoiceId on the invoice prop
        originalInvoiceId: isReissueMode ? (invoice?.id || (invoice as any)?.originalInvoiceId) : null,
        // For reissued invoices, inherit the status from the original invoice (typically "delivered")
        // For new invoices, default to "draft"
        status: isReissueMode ? (invoice?.status || 'delivered') : 'draft',
      };
      
      console.log('[InvoiceForm] Invoice header being sent:', {
        buyerName: invoiceHeader.buyerName,
        originalInvoiceId: invoiceHeader.originalInvoiceId,
        status: invoiceHeader.status,
        isReissueMode,
        invoiceId: invoice?.id,
        // Ship-to debugging
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
        const taxableAmount = item.quantity * item.unitPrice;
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
          discount: 0,
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
      
      // Force clear cache and refetch of invoices list
      // Use invalidateQueries to mark as stale, then refetch to get fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
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
    const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toFixed(2)}`;
    
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
                <td class="text-right">₹${price.toFixed(2)}</td>
                <td class="text-right">${gst}%</td>
                <td class="text-right">₹${amount.toFixed(2)}</td>
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
          <p>For ${data.sellerName || 'Inmoisture Private Limited'}</p>
          <br><br>
          <p>_______________________</p>
          <p>Authorized Signatory</p>
        </div>
      </body>
      </html>
    `;
  };

  const taxes = calculateTaxes();
  const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toFixed(2)}`;

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Generate GST Invoice</h2>
        <div className="flex gap-2">
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

        {/* Invoice Date */}
        <div>
          <Label htmlFor="invoiceDate">Invoice Date *</Label>
          <Input
            id="invoiceDate"
            type="date"
            {...form.register("invoiceDate")}
            data-testid="input-invoice-date"
          />
          {form.formState.errors.invoiceDate && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.invoiceDate.message}</p>
          )}
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
                            keywords={[vendor.vendorName, vendor.shipToCity || '', vendor.shipToAddress || '']}
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
                  {gstInclusiveMode ? "Total → Split GST" : "Base + GST"}
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
                onClick={() => append({ productId: "", description: "", hsnCode: "", quantity: 1, unitPrice: 0, gstRate: 18, transportRatePerCase: 0 })}
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

          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
            <div className="col-span-2">Product *</div>
            <div className="col-span-1">HSN</div>
            <div className={gstInclusiveMode ? "col-span-1" : "col-span-2"}>Description *</div>
            <div className="col-span-1">Qty *</div>
            <div className="col-span-1">{gstInclusiveMode ? 'Base ₹' : 'Price ₹'}</div>
            <div className="col-span-1">GST %</div>
            {gstInclusiveMode && <div className="col-span-2">Price/Case (incl. GST)</div>}
            <div className="col-span-1">Transport</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items - Show message if empty */}
          {fields.length === 0 && (
            <div className="p-4 border rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
              No items added yet. Click "Add Item" to add products.
            </div>
          )}
          
          {/* Items */}
          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-md p-3 md:p-1.5 hover-elevate">
              {/* Mobile: Stacked layout, Desktop: Grid layout */}
              <div className="flex flex-col gap-3 md:grid md:grid-cols-12 md:gap-2 md:items-start">
              {/* Product */}
              <div className="md:col-span-2">
                <Label className="md:hidden text-xs text-muted-foreground mb-1">Product *</Label>
                <Select
                  value={form.watch(`items.${index}.productId`)}
                  onValueChange={(value) => {
                    // Use stockSummary for accurate available counts (deducts reserved from pending invoices)
                    const productSummary = stockSummary.find(s => s.productId === value);
                    const totalAvailable = productSummary?.available || 0;
                    
                    // Skip stock check in reissue/edit mode - items already came from valid invoice
                    // Also skip if the current item already has this product selected (user is just viewing)
                    const currentProductId = form.watch(`items.${index}.productId`);
                    const isExistingItem = currentProductId === value;
                    const skipStockCheck = isReissueMode || !!invoice || isExistingItem;
                    
                    if (!skipStockCheck && totalAvailable === 0) {
                      const reserved = productSummary?.reserved || 0;
                      const physical = productSummary?.totalPhysical || 0;
                      
                      // Show specific message based on whether stock exists but is reserved
                      if (reserved > 0 && physical > 0) {
                        toast({
                          title: "⚠️ All Stock Reserved",
                          description: `This product has ${physical} units in stock, but all ${reserved} units are reserved for other pending invoices. Please dispatch those invoices first or choose a different product.`,
                          variant: "destructive",
                        });
                      } else {
                        toast({
                          title: "No Stock Available",
                          description: "This product has no available finished goods in inventory.",
                          variant: "destructive",
                        });
                      }
                      return;
                    }
                    
                    form.setValue(`items.${index}.productId`, value);
                    const product = products.find(p => p.id === value);
                    if (product) {
                      form.setValue(`items.${index}.description`, product.productName);
                      // Auto-fill base price from Product Master (convert from paise to rupees) - only for NEW items
                      const basePriceNum = product.basePrice ? parseFloat(String(product.basePrice)) : 0;
                      if (basePriceNum > 0 && !isExistingItem) {
                        form.setValue(`items.${index}.unitPrice`, basePriceNum / 100);
                      }
                      // Auto-fill HSN code if available - only for NEW items
                      if (product.hsnCode && !isExistingItem) {
                        form.setValue(`items.${index}.hsnCode`, product.hsnCode);
                      }
                      // Show stock info including reserved quantities
                      if (productSummary) {
                        const reserved = productSummary.reserved || 0;
                        const reservedInfo = reserved > 0 ? ` (${reserved} reserved)` : '';
                        toast({
                          title: "Stock Available",
                          description: `Available: ${totalAvailable} units${reservedInfo}${basePriceNum > 0 ? ` | Price: ₹${(basePriceNum / 100).toFixed(2)}` : ''}`,
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger data-testid={`select-product-${index}`} className="h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => {
                      // Use stockSummary for accurate available counts
                      const productSummary = stockSummary.find(s => s.productId === product.id);
                      const totalAvailable = productSummary?.available || 0;
                      const reserved = productSummary?.reserved || 0;
                      
                      // Format: "Product (50 / 20 rsv)" or "Product (0 / 70 rsv)" or "Product (50)" or "Product (0)"
                      const stockDisplay = reserved > 0 
                        ? `(${totalAvailable} / ${reserved} rsv)` 
                        : `(${totalAvailable})`;
                      
                      return (
                        <SelectItem key={product.id} value={product.id}>
                          {product.productName} {stockDisplay}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* HSN Code */}
              <div className="md:col-span-1">
                <Label className="md:hidden text-xs text-muted-foreground mb-1">HSN</Label>
                <Input
                  {...form.register(`items.${index}.hsnCode`)}
                  placeholder="8471"
                  className="h-9 text-sm"
                  data-testid={`input-hsn-${index}`}
                />
              </div>

              {/* Description */}
              <div className={gstInclusiveMode ? "md:col-span-1" : "md:col-span-2"}>
                <Label className="md:hidden text-xs text-muted-foreground mb-1">Description *</Label>
                <Input
                  {...form.register(`items.${index}.description`)}
                  placeholder="Description"
                  className="h-9 text-sm"
                  data-testid={`input-description-${index}`}
                />
              </div>

              {/* Quantity */}
              <div className="md:col-span-1">
                <Label className="md:hidden text-xs text-muted-foreground mb-1">Qty *</Label>
                <Input
                  type="number"
                  {...form.register(`items.${index}.quantity`, { 
                    valueAsNumber: true,
                    onChange: (e) => {
                      const enteredQty = parseInt(e.target.value) || 0;
                      const productId = form.watch(`items.${index}.productId`);
                      
                      // Skip strict validation in edit/reissue mode - API already excludes current invoice
                      // User can still see warnings but won't be blocked
                      const isEditMode = !!invoice || isReissueMode;
                      
                      if (productId && enteredQty > 0) {
                        // Use stockSummary for accurate available counts (deducts reserved)
                        const productSummary = stockSummary.find(s => s.productId === productId);
                        const totalAvailable = productSummary?.available || 0;
                        
                        if (enteredQty > totalAvailable) {
                          const reserved = productSummary?.reserved || 0;
                          toast({
                            title: isEditMode ? "Stock Warning" : "Insufficient Stock",
                            description: `Only ${totalAvailable} units available${reserved > 0 ? ` (${reserved} reserved for other invoices)` : ''}`,
                            variant: isEditMode ? "default" : "destructive",
                          });
                          // Only force-cap quantity for new invoices, not when editing
                          if (!isEditMode) {
                            form.setValue(`items.${index}.quantity`, totalAvailable);
                          }
                        }
                      }
                    }
                  })}
                  className="h-9 text-sm"
                  data-testid={`input-quantity-${index}`}
                />
              </div>

              {/* Unit Price (Base Price - calculated in inclusive mode, entered in exclusive mode) */}
              <div className="md:col-span-1">
                <Label className="md:hidden text-xs text-muted-foreground mb-1">{gstInclusiveMode ? 'Base ₹' : 'Price ₹'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  placeholder="0.00"
                  className={`h-9 text-sm ${gstInclusiveMode ? 'bg-muted/50' : ''}`}
                  readOnly={gstInclusiveMode}
                  data-testid={`input-unit-price-${index}`}
                />
              </div>

              {/* GST Rate */}
              <div className="md:col-span-1">
                <Label className="md:hidden text-xs text-muted-foreground mb-1">GST %</Label>
                <Select
                  value={(() => {
                    const watchedValue = form.watch(`items.${index}.gstRate`);
                    const fieldValue = (field as any).gstRate;
                    const finalValue = watchedValue ?? fieldValue ?? 18;
                    return String(finalValue);
                  })()}
                  onValueChange={(value) => form.setValue(`items.${index}.gstRate`, parseFloat(value))}
                >
                  <SelectTrigger data-testid={`select-gst-rate-${index}`} className="h-9">
                    <SelectValue placeholder="18%" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Total Amount per Case (GST Inclusive Mode) - Price per unit including GST */}
              {gstInclusiveMode && (
                <div className="md:col-span-2">
                  <Label className="md:hidden text-xs text-muted-foreground mb-1">Price/Case (incl. GST)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemTotalAmounts[index] || ''}
                      onChange={(e) => handleTotalAmountChange(index, parseFloat(e.target.value) || 0)}
                      placeholder="Price per case"
                      className="h-9 text-sm pr-20"
                      data-testid={`input-total-amount-${index}`}
                    />
                    {/* Show per-unit GST breakdown tooltip */}
                    {itemTotalAmounts[index] > 0 && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        GST: ₹{(itemTotalAmounts[index] - form.watch(`items.${index}.unitPrice`)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  {/* Show line total breakdown below */}
                  {itemTotalAmounts[index] > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                      <span>Base: ₹{(form.watch(`items.${index}.unitPrice`) * form.watch(`items.${index}.quantity`)).toFixed(2)}</span>
                      <span>|</span>
                      <span>
                        {isIntrastateSupply 
                          ? `CGST+SGST: ₹${((itemTotalAmounts[index] - form.watch(`items.${index}.unitPrice`)) * form.watch(`items.${index}.quantity`)).toFixed(2)}`
                          : `IGST: ₹${((itemTotalAmounts[index] - form.watch(`items.${index}.unitPrice`)) * form.watch(`items.${index}.quantity`)).toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Transport Rate (per case) - Always visible, separate from GST calculation */}
              <div className="md:col-span-1">
                <Label className="md:hidden text-xs text-muted-foreground mb-1">Transport</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register(`items.${index}.transportRatePerCase`, { valueAsNumber: true })}
                  placeholder="₹0"
                  className="h-9 text-sm"
                  data-testid={`input-transport-rate-${index}`}
                />
              </div>

              {/* Remove Button */}
              <div className="md:col-span-1 flex justify-center md:justify-center">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => remove(index)}
                    data-testid={`button-remove-item-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tax Summary */}
        <Card className="p-3 bg-muted">
          <h3 className="font-semibold text-sm mb-2">Tax Summary ({isIntrastateSupply ? "Intrastate" : "Interstate"} Supply)</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(taxes.subtotal)}</span>
            </div>
            {isIntrastateSupply ? (
              <>
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span>{formatCurrency(taxes.cgstAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span>{formatCurrency(taxes.sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>IGST:</span>
                <span>{formatCurrency(taxes.igstAmount)}</span>
              </div>
            )}
            
            {/* Transport Charges (After GST - summed from all line items) */}
            {taxes.transportCharges > 0 && (
              <div className="flex justify-between">
                <span>Transport Charges:</span>
                <span>{formatCurrency(taxes.transportCharges)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-base font-bold border-t pt-1.5">
              <span>Total Amount:</span>
              <span>{formatCurrency(taxes.totalAmount)}</span>
            </div>
          </div>
        </Card>

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
                <SelectTrigger data-testid="select-bank">
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
                  <Label>Account Holder Name</Label>
                  <Input value={form.watch("accountHolderName")} disabled data-testid="input-account-holder-name" />
                </div>
                <div>
                  <Label>Bank Account Number</Label>
                  <Input value={form.watch("bankAccountNumber")} disabled data-testid="input-bank-account-number" />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input value={form.watch("bankIfscCode")} disabled data-testid="input-bank-ifsc-code" />
                </div>
                <div>
                  <Label>Branch Name</Label>
                  <Input value={form.watch("branchName")} disabled data-testid="input-bank-branch-name" />
                </div>
                {form.watch("upiId") && (
                  <div className="md:col-span-2">
                    <Label>UPI ID</Label>
                    <Input value={form.watch("upiId")} disabled data-testid="input-upi-id" />
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
