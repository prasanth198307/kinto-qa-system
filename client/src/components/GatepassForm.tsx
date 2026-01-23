import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertGatepassSchema, insertGatepassItemSchema, type FinishedGood, type Product, type Uom, type Gatepass, type GatepassItem, type Vendor, type Invoice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Printer, Package, Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const headerSchema = insertGatepassSchema.extend({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  driverName: z.string().min(1, "Driver name is required"),
  driverContact: z.string().min(1, "Driver contact is required"),
  transporterName: z.string().min(1, "Transporter name is required"),
  destination: z.string().min(1, "Destination is required"),
  customerName: z.string().min(1, "Customer name is required"),
  casesCount: z.number().optional(), // Number of cases/boxes
  securitySealNo: z.string().optional(), // Security seal number
  remarks: z.string().optional(), // Remarks is optional
});

const itemSchema = insertGatepassItemSchema.omit({ gatepassId: true }).extend({
  finishedGoodId: z.string().min(1, "Finished good is required"),
  productId: z.string().min(1, "Product is required"),
  quantityDispatched: z.number().min(1, "Quantity must be at least 1"),
  uomId: z.string().min(1, "Unit of measurement is required"),
  remarks: z.string().optional(), // Item remarks is optional
});

const formSchema = z.object({
  header: headerSchema,
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface GatepassFormProps {
  gatepass: Gatepass | null;
  onClose: () => void;
}

// Extended item type to track FIFO allocation info for display
interface GatepassItemWithBatchInfo {
  finishedGoodId: string;
  productId: string;
  quantityDispatched: number;
  uomId: string;
  remarks: string;
  batchNumber?: string;
  productionDate?: string;
  availableStock?: number;
}

export default function GatepassForm({ gatepass, onClose }: GatepassFormProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<GatepassItemWithBatchInfo[]>([{ 
    finishedGoodId: "", 
    productId: "", 
    quantityDispatched: 0, 
    uomId: "", 
    remarks: "" 
  }]);
  const [isLoadingFifo, setIsLoadingFifo] = useState(false);
  
  // Move selectedInvoiceId state before queries that depend on it
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  const { data: gatepassItems = [], isLoading: isLoadingGatepassItems } = useQuery<GatepassItem[]>({
    queryKey: ['/api/gatepass-items', gatepass?.id],
    enabled: !!gatepass?.id,
  });

  // Type for available stock response
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

  // Use available-stock endpoint which deducts reserved quantities from pending invoices
  // Pass excludeInvoiceId so this invoice's own items aren't counted as reserved
  const { data: availableStockData } = useQuery<AvailableStockResponse>({
    queryKey: ['/api/finished-goods/available-stock', { excludeInvoiceId: selectedInvoiceId || '' }],
  });
  
  // Fetch the specific finished goods that are already assigned to this gatepass
  // These may not appear in the available stock list since they're "in use"
  const existingFinishedGoodIds = gatepassItems.map(item => item.finishedGoodId).filter(Boolean);
  const { data: existingFinishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods/by-ids', existingFinishedGoodIds],
    enabled: existingFinishedGoodIds.length > 0,
  });
  
  // Combine available stock with existing gatepass items' finished goods
  // This ensures the dropdown shows the currently assigned batches even if they have no available stock
  const availableItems = availableStockData?.items || [];
  const finishedGoods: AvailableStockItem[] = [
    ...availableItems,
    // Add existing finished goods that aren't already in the available list
    ...existingFinishedGoods
      .filter(fg => !availableItems.find(a => a.id === fg.id))
      .map(fg => ({
        ...fg,
        physicalQuantity: fg.quantity || 0,
        reservedQuantity: 0,
        availableQuantity: fg.quantity || 0,
      }))
  ];
  const stockSummary = availableStockData?.summary || [];

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  // Dispatch masters for quick selection
  interface Transporter {
    id: string;
    transporterCode: string;
    transporterName: string;
    phone: string | null;
    isActive: number;
  }
  
  interface Vehicle {
    id: string;
    vehicleNumber: string;
    vehicleType: string | null;
    transporterId: string | null;
    transporterName: string | null;
    isActive: number;
  }
  
  interface Driver {
    id: string;
    driverCode: string;
    driverName: string;
    phone: string;
    transporterId: string | null;
    transporterName: string | null;
    isActive: number;
  }

  const { data: transportersList = [] } = useQuery<Transporter[]>({
    queryKey: ['/api/transporters'],
  });

  const { data: vehiclesList = [] } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles'],
  });

  const { data: driversList = [] } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
  });

  // Handle master data selection - sets both the ID (for DB reference) and the text (for display/manual override)
  const handleVehicleSelect = (vehicleId: string) => {
    if (vehicleId === '__manual__') {
      // Clear the ID when switching to manual entry
      form.setValue('header.vehicleId', null);
      return;
    }
    const vehicle = vehiclesList.find(v => v.id === vehicleId);
    if (vehicle) {
      form.setValue('header.vehicleId', vehicle.id);
      form.setValue('header.vehicleNumber', vehicle.vehicleNumber);
      // If vehicle has transporter, auto-select it
      if (vehicle.transporterId && vehicle.transporterName) {
        form.setValue('header.transporterId', vehicle.transporterId);
        form.setValue('header.transporterName', vehicle.transporterName);
      }
    }
  };

  const handleDriverSelect = (driverId: string) => {
    if (driverId === '__manual__') {
      // Clear the ID when switching to manual entry
      form.setValue('header.driverId', null);
      return;
    }
    const driver = driversList.find(d => d.id === driverId);
    if (driver) {
      form.setValue('header.driverId', driver.id);
      form.setValue('header.driverName', driver.driverName);
      form.setValue('header.driverContact', driver.phone);
      // If driver has transporter, auto-select it
      if (driver.transporterId && driver.transporterName) {
        form.setValue('header.transporterId', driver.transporterId);
        form.setValue('header.transporterName', driver.transporterName);
      }
    }
  };

  const handleTransporterSelect = (transporterId: string) => {
    if (transporterId === '__manual__') {
      // Clear the ID when switching to manual entry
      form.setValue('header.transporterId', null);
      return;
    }
    const transporter = transportersList.find(t => t.id === transporterId);
    if (transporter) {
      form.setValue('header.transporterId', transporter.id);
      form.setValue('header.transporterName', transporter.transporterName);
    }
  };

  // Fetch available invoices (not yet linked to any gatepass)
  const { data: availableInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices/available'],
  });
  
  // Also fetch the linked invoice when editing an existing gatepass
  // This is needed because the linked invoice won't be in the "available" list
  const { data: linkedInvoice } = useQuery<Invoice>({
    queryKey: ['/api/invoices', gatepass?.invoiceId],
    enabled: !!gatepass?.invoiceId,
  });
  
  const { data: invoiceItems = [] } = useQuery<any[]>({
    queryKey: ['/api/invoice-items', selectedInvoiceId],
    enabled: !!selectedInvoiceId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      header: {
        gatepassDate: new Date(),
        vehicleNumber: "",
        driverName: "",
        driverContact: "",
        transporterName: "",
        destination: "",
        vendorId: "",
        customerName: "",
        isCluster: 0,
        invoiceId: "",
        casesCount: undefined,
        securitySealNo: "",
        remarks: "",
        // Master data IDs (optional - allows manual entry when not set)
        vehicleId: null,
        driverId: null,
        transporterId: null,
      },
      items: items,
    },
  });

  useEffect(() => {
    // Only populate form when we have both gatepass data AND items have finished loading
    if (gatepass && !isLoadingGatepassItems) {
      // Initialize selectedInvoiceId if gatepass has an invoice
      if (gatepass.invoiceId) {
        setSelectedInvoiceId(gatepass.invoiceId);
      }
      
      if (gatepassItems.length > 0) {
        // Map fetched items to form format
        const mappedItems = gatepassItems.map(item => ({
          finishedGoodId: item.finishedGoodId,
          productId: item.productId,
          quantityDispatched: item.quantityDispatched,
          uomId: item.uomId || "",
          remarks: item.remarks || "",
        }));
        
        setItems(mappedItems);
        
        form.reset({
          header: {
            gatepassDate: gatepass.gatepassDate ? new Date(gatepass.gatepassDate) : new Date(),
            vehicleNumber: gatepass.vehicleNumber,
            driverName: gatepass.driverName,
            driverContact: gatepass.driverContact || "",
            transporterName: gatepass.transporterName || "",
            destination: gatepass.destination || "",
            vendorId: gatepass.vendorId || "",
            customerName: gatepass.customerName || "",
            isCluster: gatepass.isCluster || 0,
            invoiceId: gatepass.invoiceId || "",
            remarks: gatepass.remarks || "",
            // Master data IDs from existing gatepass
            vehicleId: (gatepass as any).vehicleId || null,
            driverId: (gatepass as any).driverId || null,
            transporterId: (gatepass as any).transporterId || null,
          },
          items: mappedItems,
        });
      } else {
        // If no items returned (empty gatepass or data issue), only populate header
        // Keep items as empty array - don't show placeholder
        setItems([]);
        
        form.reset({
          header: {
            gatepassDate: gatepass.gatepassDate ? new Date(gatepass.gatepassDate) : new Date(),
            vehicleNumber: gatepass.vehicleNumber,
            driverName: gatepass.driverName,
            driverContact: gatepass.driverContact || "",
            transporterName: gatepass.transporterName || "",
            destination: gatepass.destination || "",
            vendorId: gatepass.vendorId || "",
            customerName: gatepass.customerName || "",
            isCluster: gatepass.isCluster || 0,
            invoiceId: gatepass.invoiceId || "",
            remarks: gatepass.remarks || "",
            // Master data IDs from existing gatepass
            vehicleId: (gatepass as any).vehicleId || null,
            driverId: (gatepass as any).driverId || null,
            transporterId: (gatepass as any).transporterId || null,
          },
          items: [],
        });
      }
    }
  }, [gatepass, gatepassItems, form, isLoadingGatepassItems]);

  // Auto-populate customer and items when invoice is selected
  useEffect(() => {
    if (selectedInvoiceId) {
      // Try to find the invoice in available list first, then fall back to linked invoice
      let selectedInvoice = availableInvoices.find(inv => inv.id === selectedInvoiceId);
      
      // If not in available list (editing existing gatepass), use the linked invoice
      if (!selectedInvoice && linkedInvoice && linkedInvoice.id === selectedInvoiceId) {
        selectedInvoice = linkedInvoice;
      }
      
      if (selectedInvoice) {
        // Auto-fill customer details from invoice buyer
        form.setValue("header.customerName", selectedInvoice.buyerName);
        form.setValue("header.isCluster", selectedInvoice.isCluster || 0);
        
        // Auto-fill destination from invoice address
        // Priority: Ship-To City > Ship-To Address > Buyer Address > Buyer State
        const destination = selectedInvoice.shipToCity 
          || selectedInvoice.shipToAddress 
          || selectedInvoice.buyerAddress 
          || selectedInvoice.buyerState 
          || "";
        if (destination) {
          form.setValue("header.destination", destination);
        }
        
        // Find vendor by buyer name (if exists)
        const matchingVendor = vendors.find(v => v.vendorName === selectedInvoice.buyerName);
        if (matchingVendor) {
          form.setValue("header.vendorId", matchingVendor.id);
          // If invoice doesn't have destination, use vendor's address
          if (!destination && matchingVendor.address) {
            form.setValue("header.destination", matchingVendor.address);
          }
        }
      }
    }
  }, [selectedInvoiceId, availableInvoices, linkedInvoice, vendors, form]);

  // FIFO allocation function - allocates batches from oldest production date first
  const performFifoAllocation = async () => {
    if (!invoiceItems.length || !selectedInvoiceId) return;
    
    setIsLoadingFifo(true);
    try {
      // Prepare items for FIFO allocation
      const allocationRequest = invoiceItems.map(invItem => ({
        productId: invItem.productId,
        quantity: invItem.quantity,
      }));
      
      // Pass excludeInvoiceId so this invoice's own reserved stock is available for allocation
      // Without this, the gatepass would see its own invoice's items as "reserved by others"
      const response = await apiRequest('POST', '/api/finished-goods/fifo-allocation', { 
        items: allocationRequest,
        excludeInvoiceId: selectedInvoiceId 
      });
      const data = await response.json();
      
      if (data.allocatedItems && data.allocatedItems.length > 0) {
        // Find default "Cases" UOM
        const casesUom = uoms.find(u => u.name?.toLowerCase() === 'cases' || u.name?.toLowerCase() === 'case');
        
        // Map FIFO allocated items to form items
        const fifoItems: GatepassItemWithBatchInfo[] = data.allocatedItems.map((alloc: any) => ({
          finishedGoodId: alloc.finishedGoodId,
          productId: alloc.productId,
          quantityDispatched: alloc.quantityAllocated,
          uomId: casesUom?.id || alloc.uomId || "",
          remarks: "",
          batchNumber: alloc.batchNumber,
          productionDate: alloc.productionDate,
          availableStock: alloc.availableStock,
        }));
        
        setItems(fifoItems);
        form.setValue("items", fifoItems);
        
        toast({
          title: "FIFO Allocation Complete",
          description: `${fifoItems.length} batch${fifoItems.length > 1 ? 'es' : ''} allocated based on oldest production date`,
        });
      } else {
        // Fallback - no stock available, create empty items from invoice
        const casesUom = uoms.find(u => u.name?.toLowerCase() === 'cases' || u.name?.toLowerCase() === 'case');
        const fallbackItems = invoiceItems.map(invItem => ({
          finishedGoodId: "",
          productId: invItem.productId,
          quantityDispatched: invItem.quantity,
          uomId: casesUom?.id || invItem.uomId || "",
          remarks: "",
        }));
        setItems(fallbackItems);
        form.setValue("items", fallbackItems);
        
        toast({
          title: "No Stock Available",
          description: "Please manually select batches or add inventory",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("FIFO allocation error:", error);
      // Fallback to basic mapping
      const casesUom = uoms.find(u => u.name?.toLowerCase() === 'cases' || u.name?.toLowerCase() === 'case');
      const fallbackItems = invoiceItems.map(invItem => ({
        finishedGoodId: "",
        productId: invItem.productId,
        quantityDispatched: invItem.quantity,
        uomId: casesUom?.id || invItem.uomId || "",
        remarks: "",
      }));
      setItems(fallbackItems);
      form.setValue("items", fallbackItems);
    } finally {
      setIsLoadingFifo(false);
    }
  };

  // Auto-populate finished goods items from invoice items using FIFO
  useEffect(() => {
    if (invoiceItems.length > 0 && selectedInvoiceId && uoms.length > 0 && !gatepass) {
      performFifoAllocation();
    }
  }, [invoiceItems, selectedInvoiceId, uoms]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (gatepass) {
        return await apiRequest('PATCH', `/api/gatepasses/${gatepass.id}`, data);
      } else {
        return await apiRequest('POST', '/api/gatepasses', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gatepass-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({
        title: "Success",
        description: gatepass ? "Gatepass updated successfully" : "Gatepass created successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || (gatepass ? "Failed to update gatepass" : "Failed to create gatepass"),
        variant: "destructive",
      });
    },
  });

  // Find default "Cases" UOM
  const defaultCasesUom = uoms.find(u => u.name?.toLowerCase() === 'cases' || u.name?.toLowerCase() === 'case');

  const addItem = () => {
    // Get current form values to preserve edits
    const currentFormItems = form.getValues('items') || [];
    const newItem = { 
      finishedGoodId: "", 
      productId: "", 
      quantityDispatched: 0, 
      uomId: defaultCasesUom?.id || "", 
      remarks: "" 
    };
    // Ensure all items have remarks as string (not undefined)
    const normalizedItems = currentFormItems.map(item => ({
      ...item,
      remarks: item.remarks || ""
    }));
    const newItems = [...normalizedItems, newItem];
    setItems(newItems);
    form.setValue('items', newItems);
  };

  // Handle finished good selection - auto-populate product, UOM, and batch info
  const handleFinishedGoodChange = (index: number, finishedGoodId: string) => {
    const fg = finishedGoods.find(f => f.id === finishedGoodId);
    if (fg) {
      // Get current items from form to preserve other edits
      const currentItems = form.getValues('items') || [];
      // Normalize to ensure remarks is always a string and include batch info
      const normalizedItems: GatepassItemWithBatchInfo[] = currentItems.map(item => ({
        ...item,
        remarks: item.remarks || ""
      }));
      normalizedItems[index] = {
        ...normalizedItems[index],
        finishedGoodId: finishedGoodId,
        productId: fg.productId,
        uomId: defaultCasesUom?.id || normalizedItems[index].uomId || "",
        batchNumber: fg.batchNumber,
        productionDate: fg.productionDate,
        availableStock: (fg as any).availableQuantity ?? fg.quantity,
      };
      setItems(normalizedItems);
      form.setValue('items', normalizedItems);
    }
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      // Get current form values to preserve edits
      const currentFormItems = form.getValues('items') || [];
      // Normalize to ensure remarks is always a string
      const normalizedItems = currentFormItems.map(item => ({
        ...item,
        remarks: item.remarks || ""
      }));
      const newItems = normalizedItems.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue('items', newItems);
    }
  };

  const handleClose = () => {
    form.reset();
    setItems([{ finishedGoodId: "", productId: "", quantityDispatched: 0, uomId: "", remarks: "" }]);
    onClose();
  };

  // Calculate quantity summary per product
  const getQuantitySummary = () => {
    const summary: Record<string, { productName: string; invoiceQty: number; dispatchedQty: number }> = {};
    
    // Get invoice quantities per product
    invoiceItems.forEach(invItem => {
      const product = products.find(p => p.id === invItem.productId);
      if (product) {
        summary[invItem.productId] = {
          productName: product.productName,
          invoiceQty: invItem.quantity,
          dispatchedQty: 0
        };
      }
    });
    
    // Sum up dispatched quantities per product from current items
    items.forEach(item => {
      if (item.productId && summary[item.productId]) {
        summary[item.productId].dispatchedQty += item.quantityDispatched || 0;
      }
    });
    
    return summary;
  };

  const quantitySummary = getQuantitySummary();
  const hasQuantityMismatch = Object.values(quantitySummary).some(
    s => s.dispatchedQty !== s.invoiceQty
  );

  const onSubmit = (data: FormData) => {
    // Alert if no invoice selected
    if (!selectedInvoiceId) {
      toast({
        title: "Invoice Required",
        description: "Please select an invoice to add items before creating the gatepass.",
        variant: "destructive",
      });
      return;
    }

    // Validate quantity match for each product
    const mismatches: string[] = [];
    Object.values(quantitySummary).forEach(s => {
      if (s.dispatchedQty !== s.invoiceQty) {
        mismatches.push(`${s.productName}: Invoice ${s.invoiceQty}, Dispatching ${s.dispatchedQty}`);
      }
    });

    if (mismatches.length > 0) {
      toast({
        title: "Quantity Mismatch",
        description: `The following products don't match invoice quantities:\n${mismatches.join('\n')}`,
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(data);
  };

  const handlePrintPreview = () => {
    const formData = form.getValues();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(formData));
      printWindow.document.close();
    }
  };

  const generatePrintHTML = (data: FormData) => {
    const vendor = vendors.find(v => v.id === data.header.vendorId);
    const formattedDate = new Date(data.header.gatepassDate).toLocaleDateString('en-IN');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gatepass - ${gatepass?.gatepassNumber || 'New'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #333; }
          .no-print { display: block; margin-bottom: 20px; padding: 10px; }
          @media print { .no-print { display: none; } }
          .print-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .gp-page { width: 210mm; padding: 12mm 15mm; margin: 0 auto; background: white; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 10px; }
          .company-name { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
          .subtitle { font-size: 12px; color: #555; margin-top: 3px; }
          .copy-label { text-align: center; font-size: 11px; font-weight: bold; background: #f5f5f5; border: 1px solid #ddd; padding: 4px 10px; display: block; width: fit-content; margin: 8px auto; }
          .gp-number { text-align: center; font-size: 13px; margin-bottom: 12px; }
          .details-grid { display: flex; gap: 15px; margin-bottom: 12px; }
          .left-col { flex: 1; }
          .right-col { flex: 1; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table td { padding: 4px 6px; border: 1px solid #ddd; }
          .info-table .label { font-weight: bold; width: 90px; background: #f9f9f9; }
          .customer-box { border: 1px solid #ddd; padding: 8px; height: 100%; background: #fafafa; }
          .box-title { font-weight: bold; font-size: 10px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
          .customer-name { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
          .customer-detail { font-size: 10px; margin-bottom: 2px; }
          .customer-address { font-size: 10px; color: #555; margin-top: 4px; word-wrap: break-word; overflow-wrap: break-word; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .items-table th, .items-table td { border: 1px solid #333; padding: 6px 8px; }
          .items-table th { background: #f0f0f0; font-weight: bold; font-size: 10px; }
          .items-table td { font-size: 11px; }
          .remarks-section { font-size: 10px; padding: 6px 8px; background: #f9f9f9; border: 1px solid #ddd; margin: 10px 0; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 10px; }
          .sig-box { text-align: center; width: 30%; }
          .sig-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }
          .sig-label { font-size: 10px; font-weight: bold; }
          .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #666; }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" class="print-btn">Print Gatepass</button>
        </div>
        
        <div class="gp-page">
          <div class="header">
            <div class="company-name">INMOISTURE PRIVATE LIMITED</div>
            <div class="subtitle">Gate Pass for Finished Goods Dispatch</div>
          </div>

          <div class="copy-label">PREVIEW</div>

          <div class="gp-number">Gate Pass No: <strong>${gatepass?.gatepassNumber || 'NEW'}</strong></div>

          <div class="details-grid">
            <div class="left-col">
              <table class="info-table">
                <tr><td class="label">Date:</td><td>${formattedDate}</td></tr>
                <tr><td class="label">Vehicle No:</td><td><strong>${data.header.vehicleNumber}</strong></td></tr>
                <tr><td class="label">Driver:</td><td>${data.header.driverName}</td></tr>
                <tr><td class="label">Contact:</td><td>${data.header.driverContact || '-'}</td></tr>
                <tr><td class="label">Transporter:</td><td>${data.header.transporterName || '-'}</td></tr>
              </table>
            </div>
            <div class="right-col">
              <div class="customer-box">
                <div class="box-title">Customer Details</div>
                <div class="customer-name">${vendor?.vendorName || data.header.customerName || '-'}</div>
                ${vendor?.mobileNumber ? `<div class="customer-detail">Mobile: ${vendor.mobileNumber}</div>` : ''}
                ${vendor?.gstNumber ? `<div class="customer-detail">GST: ${vendor.gstNumber}</div>` : ''}
                ${vendor?.address ? `<div class="customer-address">${vendor.address}</div>` : ''}
                ${data.header.destination ? `<div class="customer-detail"><strong>Destination:</strong> ${data.header.destination}</div>` : ''}
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th style="text-align:left;">Product Name</th>
                <th style="width:70px;">Qty</th>
                <th style="width:80px;">UOM</th>
                <th style="text-align:left;">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, index) => {
                const product = products.find(p => p.id === item.productId);
                const uom = uoms.find(u => u.id === item.uomId);
                return `
                <tr>
                  <td style="text-align:center;">${index + 1}</td>
                  <td>${product?.productName || 'N/A'}</td>
                  <td style="text-align:center;">${item.quantityDispatched}</td>
                  <td style="text-align:center;">${uom?.name || 'N/A'}</td>
                  <td>${item.remarks || '-'}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${data.header.remarks ? `
          <div class="remarks-section">
            <strong>Remarks:</strong> ${data.header.remarks}
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Receiver's Signature</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Security/Gate</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Authorized Signatory</div>
            </div>
          </div>

          <div class="footer">
            This is a computer-generated gate pass. Please verify all details before accepting goods.
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Card className="p-4 mb-4">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">
            {gatepass ? 'Edit Gatepass' : 'Create Gatepass'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {gatepass ? 'Update gatepass details and line items' : 'Dispatch multiple finished goods in one gatepass'}
          </p>
        </div>
        {gatepass && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintPreview} 
            type="button"
            data-testid="button-print-preview-gatepass"
          >
            <Printer className="w-4 h-4 mr-1" />
            Print Preview
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <>
          <Card className="p-4 space-y-4">
            <h4 className="font-semibold text-sm">Gatepass Details</h4>
            
            {gatepass && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Gatepass Number:</span> <span className="text-primary">{gatepass.gatepassNumber}</span>
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="header.gatepassDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gatepass Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-gatepass-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Vehicle (Quick Select)</FormLabel>
                <Select onValueChange={handleVehicleSelect}>
                  <SelectTrigger data-testid="select-vehicle-master">
                    <SelectValue placeholder="Select from master or enter below" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">-- Enter Manually --</SelectItem>
                    {vehiclesList.filter(v => v.isActive === 1).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.vehicleNumber} {v.vehicleType ? `(${v.vehicleType})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="header.vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="AP-09-AB-1234" data-testid="input-vehicle-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Driver (Quick Select)</FormLabel>
                <Select onValueChange={handleDriverSelect}>
                  <SelectTrigger data-testid="select-driver-master">
                    <SelectValue placeholder="Select from master or enter below" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">-- Enter Manually --</SelectItem>
                    {driversList.filter(d => d.isActive === 1).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.driverName} ({d.phone})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="header.driverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-driver-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.driverContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Contact</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-driver-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Transporter (Quick Select)</FormLabel>
                <Select onValueChange={handleTransporterSelect}>
                  <SelectTrigger data-testid="select-transporter-master">
                    <SelectValue placeholder="Select from master or enter below" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">-- Enter Manually --</SelectItem>
                    {transportersList.filter(t => t.isActive === 1).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.transporterName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="header.transporterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transporter Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-transporter-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-destination" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.casesCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Cases/Boxes (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 10" 
                        data-testid="input-cases-count" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.securitySealNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Seal Number (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="e.g., SEAL-12345" 
                        data-testid="input-security-seal-no" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer/Vendor</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedVendor = vendors.find(v => v.id === value);
                        if (selectedVendor) {
                          form.setValue("header.customerName", selectedVendor.vendorName);
                          form.setValue("header.isCluster", selectedVendor.isCluster || 0);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{vendor.vendorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {vendor.mobileNumber} • {vendor.gstNumber || vendor.aadhaarNumber || "No ID"}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} readOnly className="bg-muted" data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.invoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Invoice</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        // Alert when selecting "None"
                        if (value === "none" && selectedInvoiceId) {
                          toast({
                            title: "Warning",
                            description: "Selecting 'None' will remove all items. You won't be able to add items without an invoice.",
                            variant: "default",
                          });
                        }
                        field.onChange(value === "none" ? "" : value);
                        setSelectedInvoiceId(value === "none" ? "" : value);
                      }} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice">
                          <SelectValue placeholder="Select an invoice to add items" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None - No items can be added</SelectItem>
                        {/* Show linked invoice first when editing existing gatepass */}
                        {linkedInvoice && !availableInvoices.find(inv => inv.id === linkedInvoice.id) && (
                          <SelectItem key={linkedInvoice.id} value={linkedInvoice.id}>
                            {linkedInvoice.invoiceNumber} - {linkedInvoice.buyerName} - ₹{(linkedInvoice.totalAmount / 100).toFixed(2)} (Current)
                          </SelectItem>
                        )}
                        {availableInvoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} - {invoice.buyerName} - ₹{(invoice.totalAmount / 100).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoice must be selected to add items. Items will auto-populate from the selected invoice.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-header-remarks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {selectedInvoiceId && (
            <div className="space-y-3">
              {/* Quantity Summary Section */}
              {Object.keys(quantitySummary).length > 0 && (
                <Card className={`p-3 ${hasQuantityMismatch ? 'border-destructive bg-destructive/5' : 'border-green-500 bg-green-50 dark:bg-green-950/20'}`}>
                  <h4 className="font-semibold text-sm mb-2">
                    Quantity Summary
                    {hasQuantityMismatch ? (
                      <span className="ml-2 text-destructive text-xs">(Mismatch - Please adjust quantities)</span>
                    ) : (
                      <span className="ml-2 text-green-600 text-xs">(All quantities match)</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(quantitySummary).map(([productId, summary]) => {
                      const isMatch = summary.dispatchedQty === summary.invoiceQty;
                      return (
                        <div 
                          key={productId} 
                          className={`flex justify-between items-center p-2 rounded text-sm ${
                            isMatch ? 'bg-green-100 dark:bg-green-900/30' : 'bg-destructive/10'
                          }`}
                        >
                          <span className="font-medium">{summary.productName}</span>
                          <span className={isMatch ? 'text-green-700 dark:text-green-400' : 'text-destructive font-semibold'}>
                            {summary.dispatchedQty} / {summary.invoiceQty}
                            {isMatch ? ' ✓' : ` (${summary.dispatchedQty > summary.invoiceQty ? '+' : ''}${summary.dispatchedQty - summary.invoiceQty})`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm">
                    Finished Goods Items
                    <span className="ml-2 text-xs text-muted-foreground">(FIFO: oldest batches selected first)</span>
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={performFifoAllocation}
                      disabled={isLoadingFifo || !invoiceItems.length}
                      data-testid="button-rerun-fifo"
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingFifo ? 'animate-spin' : ''}`} />
                      {isLoadingFifo ? 'Allocating...' : 'Re-run FIFO'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                      data-testid="button-add-batch"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Batch
                    </Button>
                  </div>
                </div>
                {items.some(item => item.batchNumber) && (
                  <p className="text-xs text-muted-foreground">
                    Batches auto-assigned using FIFO (oldest production date first). You can manually change selections below.
                  </p>
                )}
              </div>

              {items.map((item, index) => {
                // Get already selected batch IDs (excluding current item) - use items state directly
                const selectedBatchIds = items
                  .filter((_, i) => i !== index)
                  .map(item => item.finishedGoodId)
                  .filter(id => id);
                
                // Get available quantity for current batch
                const currentBatchId = items[index]?.finishedGoodId;
                const currentBatch = finishedGoods.find(fg => fg.id === currentBatchId);
                const availableQty = (currentBatch as any)?.availableQuantity ?? currentBatch?.quantity ?? 0;
                
                return (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium">Item {index + 1}</h5>
                      {item.batchNumber && (
                        <Badge variant="secondary" className="text-xs">
                          <Package className="w-3 h-3 mr-1" />
                          {item.batchNumber}
                        </Badge>
                      )}
                      {item.productionDate && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(item.productionDate), 'dd/MM/yyyy')}
                        </Badge>
                      )}
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.finishedGoodId`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Finished Good (Product + Batch)</FormLabel>
                          <Select 
                            onValueChange={(value) => handleFinishedGoodChange(index, value)} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid={`select-finished-good-${index}`}>
                                <SelectValue placeholder="Select batch to dispatch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {finishedGoods
                                .filter(fg => ((fg as any).availableQuantity ?? fg.quantity) > 0)
                                .filter(fg => !selectedBatchIds.includes(fg.id) || fg.id === field.value)
                                .map((fg) => {
                                  const product = products.find(p => p.id === fg.productId);
                                  const available = (fg as any).availableQuantity ?? fg.quantity;
                                  return (
                                    <SelectItem key={fg.id} value={fg.id}>
                                      {product?.productName || 'Unknown'} - Batch: {fg.batchNumber} (Available: {available})
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hidden field for productId - auto-populated from finished good */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <Input type="hidden" {...field} />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityDispatched`}
                      render={({ field }) => {
                        const enteredQty = field.value || 0;
                        const exceedsAvailable = currentBatchId && enteredQty > availableQty;
                        
                        return (
                        <FormItem>
                          <FormLabel>Quantity Dispatched</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 0;
                                if (currentBatchId && newQty > availableQty) {
                                  toast({
                                    title: "Quantity Exceeds Available",
                                    description: `Only ${availableQty} available in this batch. Entered: ${newQty}`,
                                    variant: "destructive",
                                  });
                                }
                                field.onChange(newQty);
                              }}
                              className={exceedsAvailable ? "border-destructive" : ""}
                              data-testid={`input-quantity-${index}`}
                            />
                          </FormControl>
                          {exceedsAvailable && (
                            <p className="text-sm text-destructive">
                              Exceeds available: {availableQty}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.uomId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit of Measure</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-uom-${index}`}>
                                <SelectValue placeholder="Select UOM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {uoms.map((uom) => (
                                <SelectItem key={uom.id} value={uom.id}>
                                  {uom.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.remarks`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Item Remarks (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid={`input-item-remarks-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Card>
              );
            })}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-submit">
              {saveMutation.isPending ? "Saving..." : (gatepass ? "Update Gatepass" : "Create Gatepass")}
            </Button>
          </div>
          </>
        </form>
      </Form>
    </Card>
  );
}
