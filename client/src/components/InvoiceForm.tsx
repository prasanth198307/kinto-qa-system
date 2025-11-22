import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, X, Printer, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Gatepass, Product, Vendor, GatepassItem, FinishedGood, Bank, Invoice, InvoiceTemplate, TermsConditions, VendorType, VendorVendorType } from "@shared/schema";

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
  
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    description: z.string().min(1, "Description is required"),
    hsnCode: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Price must be positive"),
    gstRate: z.number().min(0).max(100, "GST rate must be 0-100%"),
  })).min(1, "At least one item is required"),
  
  remarks: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  gatepass?: Gatepass;
  invoice?: Invoice;
  onClose: () => void;
}

export default function InvoiceForm({ gatepass, invoice, onClose }: InvoiceFormProps) {
  const { toast } = useToast();
  const [isIntrastateSupply, setIsIntrastateSupply] = useState(true);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(invoice?.templateId || "");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [shipToDifferentAddress, setShipToDifferentAddress] = useState(false);
  
  // Vendor filtering state
  const [vendorTypeFilter, setVendorTypeFilter] = useState<string>('all');
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: vendorTypes = [], isLoading: isLoadingVendorTypes } = useQuery<VendorType[]>({
    queryKey: ['/api/vendor-types'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: vendorVendorTypes = [], isLoading: isLoadingVendorVendorTypes } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendor-vendor-types'],
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

  const { data: finishedGoodsInventory = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: gatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: gatepass ? [`/api/gatepass-items/${gatepass.id}`] : [],
    enabled: !!gatepass,
  });

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
    enabled: !!gatepass,
  });

  const { data: invoiceItems = [] } = useQuery<any[]>({
    queryKey: invoice ? [`/api/invoice-items/${invoice.id}`] : [],
    enabled: !!invoice,
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

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice ? {
      gatepassId: gatepass?.id || "",
      invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      invoiceTemplateId: invoice.templateId || "",
      termsConditionsId: invoice.termsConditionsId || "",
      sellerName: invoice.sellerName || "KINTO Manufacturing",
      sellerAddress: invoice.sellerAddress || "Industrial Area, Phase 1",
      sellerState: invoice.sellerState || "Karnataka",
      sellerStateCode: invoice.sellerStateCode || "29",
      sellerGstin: invoice.sellerGstin || "29AAAAA0000A1Z5",
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
      buyerState: invoice.buyerState || "Karnataka",
      buyerStateCode: invoice.buyerStateCode || "29",
      isCluster: invoice.isCluster || 0,
      items: [{
        productId: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: 0,
        gstRate: 18,
      }],
      bankName: invoice.bankName || "",
      bankAccountNumber: invoice.bankAccountNumber || "",
      bankIfscCode: invoice.bankIfscCode || "",
      accountHolderName: invoice.accountHolderName || "",
      branchName: invoice.branchName || "",
      upiId: invoice.upiId || "",
    } : {
      gatepassId: gatepass?.id || "",
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceTemplateId: "",
      termsConditionsId: "",
      sellerName: "KINTO Manufacturing",
      sellerAddress: "Industrial Area, Phase 1",
      sellerState: "Karnataka",
      sellerStateCode: "29",
      sellerGstin: "29AAAAA0000A1Z5",
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
      buyerState: "Karnataka",
      buyerStateCode: "29",
      isCluster: 0,
      items: [{
        productId: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: 0,
        gstRate: 18,
      }],
      bankName: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      accountHolderName: "",
      branchName: "",
      upiId: "",
    },
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
    form.setValue("buyerState", vendor.state || "Karnataka");
    form.setValue("buyerStateCode", "29"); // Default state code
    form.setValue("isCluster", vendor.isCluster || 0);
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    // Look up vendor in filteredVendors to ensure it matches current filter
    const vendor = filteredVendors.find(v => v.id === vendorId);
    if (vendor) {
      populateBuyerFromVendor(vendor);
    }
  };

  // Clear selected vendor when filter changes if vendor is no longer in filtered list
  useEffect(() => {
    if (selectedVendorId && !filteredVendors.find(v => v.id === selectedVendorId)) {
      setSelectedVendorId('');
      // Clear buyer details when vendor selection is cleared
      form.setValue("buyerName", "");
      form.setValue("buyerGstin", "");
      form.setValue("buyerAddress", "");
      form.setValue("buyerState", "Karnataka");
      form.setValue("buyerStateCode", "29");
      form.setValue("isCluster", 0);
    }
  }, [vendorTypeFilter, filteredVendors, selectedVendorId, form]);

  // Pre-populate invoice items from gatepass items or existing invoice
  useEffect(() => {
    if (invoice && invoiceItems.length > 0) {
      // Edit mode - populate from existing invoice items
      const formItems = invoiceItems.map(item => ({
        productId: item.productId || "",
        description: item.description || "",
        hsnCode: item.hsnCode || "",
        quantity: item.quantity || 1,
        unitPrice: (item.unitPrice || 0) / 100, // Convert from paise
        gstRate: isIntrastateSupply 
          ? ((item.cgstRate || 0) / 50) // Convert from basis points, cgst+sgst = full rate
          : ((item.igstRate || 0) / 100), // Convert from basis points
      }));
      form.setValue("items", formItems);
    } else if (gatepassItems.length > 0 && products.length > 0) {
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
  }, [invoice, invoiceItems, gatepassItems, products, finishedGoods, form, isIntrastateSupply]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchBuyerState = form.watch("buyerStateCode");
  const watchSellerState = form.watch("sellerStateCode");
  const watchItems = form.watch("items");

  useEffect(() => {
    setIsIntrastateSupply(watchBuyerState === watchSellerState);
  }, [watchBuyerState, watchSellerState]);

  const calculateTaxes = () => {
    let subtotal = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    watchItems.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      const taxAmount = (itemTotal * item.gstRate) / 100;
      
      if (isIntrastateSupply) {
        cgstAmount += taxAmount / 2;
        sgstAmount += taxAmount / 2;
      } else {
        igstAmount += taxAmount;
      }
    });

    const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount;

    return {
      subtotal: Math.round(subtotal * 100), // Convert to paise
      cgstAmount: Math.round(cgstAmount * 100),
      sgstAmount: Math.round(sgstAmount * 100),
      igstAmount: Math.round(igstAmount * 100),
      totalAmount: Math.round(totalAmount * 100),
    };
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const taxes = calculateTaxes();
      
      const invoiceHeader = {
        gatepassId: data.gatepassId || null,
        invoiceDate: new Date(data.invoiceDate),
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
        isCluster: data.isCluster || 0,
        subtotal: taxes.subtotal,
        cgstAmount: taxes.cgstAmount,
        sgstAmount: taxes.sgstAmount,
        igstAmount: taxes.igstAmount,
        cessAmount: 0,
        roundOff: 0,
        totalAmount: taxes.totalAmount,
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankIfscCode: data.bankIfscCode || null,
        upiId: data.upiId || null,
        remarks: data.remarks || null,
      };

      const invoiceItems = data.items.map((item) => {
        const taxableAmount = item.quantity * item.unitPrice;
        const taxAmount = (taxableAmount * item.gstRate) / 100;
        
        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;

        if (isIntrastateSupply) {
          cgstRate = (item.gstRate / 2) * 100; // Convert to basis points
          sgstRate = (item.gstRate / 2) * 100;
          cgstAmount = Math.round((taxAmount / 2) * 100); // Convert to paise
          sgstAmount = Math.round((taxAmount / 2) * 100);
        } else {
          igstRate = item.gstRate * 100;
          igstAmount = Math.round(taxAmount * 100);
        }

        return {
          productId: item.productId,
          hsnCode: item.hsnCode || null,
          sacCode: null,
          description: item.description,
          quantity: item.quantity,
          uomId: null,
          unitPrice: Math.round(item.unitPrice * 100), // Convert to paise
          discount: 0,
          taxableAmount: Math.round(taxableAmount * 100),
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          cessRate: 0,
          cessAmount: 0,
          totalAmount: Math.round((taxableAmount + taxAmount) * 100),
        };
      });

      if (invoice) {
        // Edit mode - update existing invoice
        return await apiRequest('PATCH', `/api/invoices/${invoice.id}`, invoiceHeader);
      } else {
        // Create mode
        return await apiRequest('POST', '/api/invoices', {
          header: invoiceHeader,
          items: invoiceItems,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: invoice ? "Invoice updated successfully" : "Invoice created successfully",
      });
      onClose();
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

        <div style="margin-top: 60px; text-align: right;">
          <p>For ${data.sellerName || 'KINTO Manufacturing'}</p>
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
    <Card className="p-4 max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-3">
            {/* Vendor Type Filter */}
            <div>
              <Label htmlFor="vendorTypeFilter">Filter by Vendor Type</Label>
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
              <Label htmlFor="vendorSelect">Select Customer/Vendor</Label>
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
                      : "Search and select vendor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search vendors by name or GST..." 
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
          </div>
          <p className="text-xs text-muted-foreground">
            Filter by vendor type and search by name or GST. Auto-fills buyer details from selected vendor.
          </p>
        </div>

        {/* Buyer Details (Bill To) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Buyer Details (Bill To)</h3>
          <div className="grid grid-cols-2 gap-4">
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
            <div className="col-span-2">
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
                placeholder="29"
                maxLength={2}
                data-testid="input-buyer-state-code"
              />
            </div>
          </div>
        </div>

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
            <div className="grid grid-cols-2 gap-3">
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
              <div className="col-span-2">
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className="col-span-2">
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
                placeholder="29"
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
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Invoice Items</h3>
            <Button
              type="button"
              size="sm"
              onClick={() => append({ productId: "", description: "", hsnCode: "", quantity: 1, unitPrice: 0, gstRate: 18 })}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
            <div className="col-span-3">Product *</div>
            <div className="col-span-1">HSN</div>
            <div className="col-span-3">Description *</div>
            <div className="col-span-1">Qty *</div>
            <div className="col-span-2">Price (₹) *</div>
            <div className="col-span-1">GST % *</div>
            <div className="col-span-1"></div>
          </div>

          {/* Items */}
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-1.5 border rounded-md hover-elevate">
              {/* Product */}
              <div className="col-span-3">
                <Select
                  value={form.watch(`items.${index}.productId`)}
                  onValueChange={(value) => {
                    const availableFG = finishedGoodsInventory.filter(fg => fg.productId === value);
                    const totalAvailable = availableFG.reduce((sum, fg) => sum + (fg.quantity || 0), 0);
                    
                    if (availableFG.length === 0 || totalAvailable === 0) {
                      toast({
                        title: "No Stock Available",
                        description: "This product has no finished goods in inventory.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    form.setValue(`items.${index}.productId`, value);
                    const product = products.find(p => p.id === value);
                    if (product) {
                      form.setValue(`items.${index}.description`, product.productName);
                      // Auto-fill base price from Product Master (convert from paise to rupees)
                      if (product.basePrice) {
                        form.setValue(`items.${index}.unitPrice`, product.basePrice / 100);
                      }
                      // Auto-fill HSN code if available
                      if (product.hsnCode) {
                        form.setValue(`items.${index}.hsnCode`, product.hsnCode);
                      }
                      toast({
                        title: "Stock Available",
                        description: `Available: ${totalAvailable} units${product.basePrice ? ` | Price: ₹${(product.basePrice / 100).toFixed(2)}` : ''}`,
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid={`select-product-${index}`} className="h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => {
                      const availableFG = finishedGoodsInventory.filter(fg => fg.productId === product.id);
                      const totalAvailable = availableFG.reduce((sum, fg) => sum + (fg.quantity || 0), 0);
                      
                      return (
                        <SelectItem key={product.id} value={product.id}>
                          {product.productName} {totalAvailable > 0 ? `(${totalAvailable})` : '(0)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* HSN Code */}
              <div className="col-span-1">
                <Input
                  {...form.register(`items.${index}.hsnCode`)}
                  placeholder="8471"
                  className="h-9 text-sm"
                  data-testid={`input-hsn-${index}`}
                />
              </div>

              {/* Description */}
              <div className="col-span-3">
                <Input
                  {...form.register(`items.${index}.description`)}
                  placeholder="Description"
                  className="h-9 text-sm"
                  data-testid={`input-description-${index}`}
                />
              </div>

              {/* Quantity */}
              <div className="col-span-1">
                <Input
                  type="number"
                  {...form.register(`items.${index}.quantity`, { 
                    valueAsNumber: true,
                    onChange: (e) => {
                      const enteredQty = parseInt(e.target.value) || 0;
                      const productId = form.watch(`items.${index}.productId`);
                      
                      if (productId && enteredQty > 0) {
                        const availableFG = finishedGoodsInventory.filter(fg => fg.productId === productId);
                        const totalAvailable = availableFG.reduce((sum, fg) => sum + (fg.quantity || 0), 0);
                        
                        if (enteredQty > totalAvailable) {
                          toast({
                            title: "Insufficient Stock",
                            description: `Only ${totalAvailable} units available`,
                            variant: "destructive",
                          });
                          form.setValue(`items.${index}.quantity`, totalAvailable);
                        }
                      }
                    }
                  })}
                  className="h-9 text-sm"
                  data-testid={`input-quantity-${index}`}
                />
              </div>

              {/* Unit Price */}
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  placeholder="0.00"
                  className="h-9 text-sm"
                  data-testid={`input-unit-price-${index}`}
                />
              </div>

              {/* GST Rate */}
              <div className="col-span-1">
                <Select
                  value={form.watch(`items.${index}.gstRate`)?.toString()}
                  onValueChange={(value) => form.setValue(`items.${index}.gstRate`, parseFloat(value))}
                >
                  <SelectTrigger data-testid={`select-gst-rate-${index}`} className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Remove Button */}
              <div className="col-span-1 flex justify-center">
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
            <div className="flex justify-between text-base font-bold border-t pt-1.5">
              <span>Total Amount:</span>
              <span>{formatCurrency(taxes.totalAmount)}</span>
            </div>
          </div>
        </Card>

        {/* Payment Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Payment Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
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
                  <div className="col-span-2">
                    <Label>UPI ID</Label>
                    <Input value={form.watch("upiId")} disabled data-testid="input-upi-id" />
                  </div>
                )}
              </>
            )}
          </div>
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
            {createInvoiceMutation.isPending ? "Saving..." : (invoice ? "Update Invoice" : "Create Invoice")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
