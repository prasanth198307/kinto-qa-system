import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Printer, XCircle, Settings, CheckCircle2, AlertTriangle, Search, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

// NIC-compliant state codes
const STATE_CODES = [
  { code: "01", name: "Jammu and Kashmir" }, { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" }, { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" }, { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" }, { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" }, { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" }, { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" }, { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" }, { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" }, { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" }, { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" }, { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" }, { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" }, { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (New)" }, { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" }, { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" }, { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" }, { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" }, { code: "37", name: "Andhra Pradesh (Old)" },
  { code: "38", name: "Ladakh" }, { code: "97", name: "Other Territory" },
  { code: "99", name: "Other Country" },
];

const SUB_SUPPLY_TYPES = [
  { code: "1", name: "Supply" }, { code: "2", name: "Import" }, { code: "3", name: "Export" },
  { code: "4", name: "Job Work" }, { code: "5", name: "For Own Use" },
  { code: "6", name: "Job Work Returns" }, { code: "7", name: "Sales Return" },
  { code: "8", name: "Others" }, { code: "9", name: "SKD/CKD" },
  { code: "10", name: "Line Sales" }, { code: "11", name: "Recipient Not Known" },
  { code: "12", name: "Exhibition or Fairs" },
];

const DOC_TYPES = [
  { code: "INV", name: "Tax Invoice" }, { code: "BIL", name: "Bill of Supply" },
  { code: "BOE", name: "Bill of Entry" }, { code: "CHL", name: "Delivery Challan" },
  { code: "OTH", name: "Others" },
];

const GST_RATES = ["0", "0.1", "0.25", "1", "1.5", "3", "5", "6", "7.5", "12", "18", "28"];
const TRANSPORT_MODES = [{ code: "1", name: "Road" }, { code: "2", name: "Rail" }, { code: "3", name: "Air" }, { code: "4", name: "Ship" }];
const VEHICLE_TYPES = [{ code: "R", name: "Regular" }, { code: "O", name: "ODC (Over Dimensional Cargo)" }];

const emptyForm = {
  invoiceId: "" as string | undefined,
  // Document
  supplyType: "O", subSupplyType: "1", docType: "INV",
  docNo: "", docDate: new Date().toISOString().slice(0, 10),
  // From (Consignor/Supplier)
  fromGstin: "", fromTrdName: "", fromAddr1: "", fromAddr2: "",
  fromPlace: "", fromPincode: "", fromStateCode: "36",
  // To (Consignee/Recipient)
  toGstin: "", toTrdName: "", toAddr1: "", toAddr2: "",
  toPlace: "", toPincode: "", toStateCode: "36",
  isUrp: false, // Unregistered Person (no GST)
  // Item
  productName: "", hsnCode: "", quantity: "", qtyUnit: "NOS",
  taxableValue: "", cgstRate: "9", sgstRate: "9", igstRate: "0",
  cessRate: "0", totalInvoiceValue: "",
  // Transport
  transMode: "1", vehicleType: "R", vehicleNo: "",
  transId: "", transName: "", transDocNo: "", transDocDate: "",
  distanceKm: "",
};

export default function EWayBillPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [form, setForm] = useState({ ...emptyForm });
  const [credForm, setCredForm] = useState({ gstin: "", username: "", password: "", apiMode: "sandbox" });
  const [credOpen, setCredOpen] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePickerOpen, setInvoicePickerOpen] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const { data: ewbList = [] } = useQuery<any[]>({
    queryKey: ["manufacturing-eway-bills"],
    queryFn: () => api("GET", "/api/manufacturing/eway-bills").catch(() => []),
  });
  const { data: credentials } = useQuery<any>({
    queryKey: ["ewb-credentials"],
    queryFn: () => api("GET", "/api/manufacturing/eway-bills/credentials").catch(() => null),
  });
  const { data: invoiceResults = [] } = useQuery<any[]>({
    queryKey: ["ewb-invoice-search", invoiceSearch],
    queryFn: () => api("GET", `/api/manufacturing/eway-bills/invoices-search?q=${encodeURIComponent(invoiceSearch)}`).then(r => Array.isArray(r) ? r : []).catch(() => []),
    enabled: invoicePickerOpen,
  });

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const loadInvoice = async (invoiceId: string) => {
    setLoadingInvoice(true);
    try {
      const data = await api("GET", `/api/manufacturing/eway-bills/invoice-prefill/${invoiceId}`);
      setForm(p => ({
        ...p,
        invoiceId: data.invoice_id,
        docNo: data.invoice_number ?? p.docNo,
        docDate: data.invoice_date ? new Date(data.invoice_date).toISOString().slice(0, 10) : p.docDate,
        // From (Consignor)
        fromGstin: data.from_gstin ?? p.fromGstin,
        fromTrdName: data.from_name ?? p.fromTrdName,
        fromAddr1: data.from_addr1 ?? p.fromAddr1,
        fromPlace: data.from_place ?? p.fromPlace,
        fromPincode: data.from_pincode ?? p.fromPincode,
        fromStateCode: data.from_state_code ?? p.fromStateCode,
        // To (Consignee)
        toGstin: data.to_gstin ?? p.toGstin,
        isUrp: !data.to_gstin,
        toTrdName: data.to_name ?? p.toTrdName,
        toAddr1: data.to_addr1 ?? p.toAddr1,
        toPlace: data.to_place ?? p.toPlace,
        toPincode: data.to_pincode ?? p.toPincode,
        toStateCode: data.to_state_code ?? p.toStateCode,
        // Goods
        productName: data.product_name ?? p.productName,
        hsnCode: data.hsn_code ?? p.hsnCode,
        quantity: String(data.quantity ?? p.quantity),
        taxableValue: String(data.taxable_value ?? p.taxableValue),
        cgstRate: String(data.cgst_rate ?? p.cgstRate),
        sgstRate: String(data.sgst_rate ?? p.sgstRate),
        igstRate: String(data.igst_rate ?? p.igstRate),
        cessRate: String(data.cess_rate ?? p.cessRate),
        totalInvoiceValue: String(data.total_invoice_value ?? p.totalInvoiceValue),
        // Transport
        transMode: data.transport_mode ?? p.transMode,
        vehicleNo: data.vehicle_no ?? p.vehicleNo,
      }));
      setInvoicePickerOpen(false);
      toast({ title: `Invoice ${data.invoice_number} loaded`, description: "Review and fill any missing fields (seller pincode/city if needed), then submit." });
    } catch {
      toast({ title: "Failed to load invoice", variant: "destructive" });
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Auto-detect interstate: different state codes = IGST
  const isInterState = form.fromStateCode !== form.toStateCode;

  // When URP checked, clear GSTIN and disable it
  const handleUrp = (checked: boolean) => {
    setForm(p => ({ ...p, isUrp: checked, toGstin: checked ? "URP" : "" }));
  };

  const generateMutation = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/eway-bills/generate", {
      // Document
      supplyType: form.supplyType,
      subSupplyType: form.subSupplyType,
      docType: form.docType,
      docNo: form.docNo,
      docDate: form.docDate,
      // From
      fromGstin: form.fromGstin,
      fromTrdName: form.fromTrdName,
      fromAddr1: form.fromAddr1,
      fromAddr2: form.fromAddr2,
      fromPlace: form.fromPlace,
      fromPincode: form.fromPincode,
      fromStateCode: form.fromStateCode,
      // To
      toGstin: form.isUrp ? "URP" : form.toGstin,
      toTrdName: form.toTrdName,
      toAddr1: form.toAddr1,
      toAddr2: form.toAddr2,
      toPlace: form.toPlace,
      toPincode: form.toPincode,
      toStateCode: form.toStateCode,
      // Item
      productName: form.productName,
      hsnCode: form.hsnCode,
      quantity: form.quantity,
      qtyUnit: form.qtyUnit,
      taxableValue: form.taxableValue,
      cgstRate: isInterState ? "0" : form.cgstRate,
      sgstRate: isInterState ? "0" : form.sgstRate,
      igstRate: isInterState ? (form.cgstRate === "0" ? "0" : String(parseFloat(form.cgstRate) * 2)) : "0",
      cessRate: form.cessRate,
      totalInvoiceValue: form.totalInvoiceValue,
      // Transport
      transMode: form.transMode,
      vehicleType: form.vehicleType,
      vehicleNo: form.vehicleNo,
      transId: form.transId,
      transName: form.transName,
      transDocNo: form.transDocNo,
      transDocDate: form.transDocDate,
      distanceKm: form.distanceKm,
    }),
    onSuccess: (data) => {
      setGenerated(data?.eway_bill || data);
      qc.invalidateQueries({ queryKey: ["manufacturing-eway-bills"] });
      toast({ title: data?.live ? "E-Way Bill submitted to NIC!" : "EWB saved (connect NIC credentials to submit live)", description: data?.message });
    },
    onError: () => toast({ title: "Failed to generate E-Way Bill", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api("PATCH", `/api/manufacturing/eway-bills/${id}/cancel`, { cancelReason: 4, cancelRemarks: "Cancelled" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["manufacturing-eway-bills"] }); toast({ title: "E-Way Bill cancelled" }); },
  });

  const credMutation = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/eway-bills/credentials", credForm),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ewb-credentials"] });
      setCredOpen(false);
      toast({ title: data?.warning ? "Saved (check warning)" : "NIC EWB connected!", description: data?.message ?? data?.warning });
    },
  });

  const isConnected = credentials?.is_connected === true;

  const printEWB = (ewb: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
    w.document.write(`<html><body style="font-family:Arial;padding:40px;max-width:800px">
      <h2 style="border-bottom:2px solid #333;padding-bottom:8px">E-WAY BILL</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr>
          <td style="padding:6px 4px;font-weight:bold;width:20%">EWB No:</td>
          <td style="padding:6px 4px;width:30%">${ewb.ewb_no ?? "PENDING"}</td>
          <td style="padding:6px 4px;font-weight:bold;width:20%">Valid Upto:</td>
          <td style="padding:6px 4px">${fmtDate(ewb.valid_upto)}</td>
        </tr>
        <tr>
          <td style="padding:6px 4px;font-weight:bold">Doc No:</td>
          <td>${ewb.doc_no ?? ewb.invoice_no ?? "—"}</td>
          <td style="padding:6px 4px;font-weight:bold">Doc Date:</td>
          <td>${fmtDate(ewb.doc_date)}</td>
        </tr>
        <tr>
          <td style="padding:6px 4px;font-weight:bold">Status:</td>
          <td>${ewb.status ?? "—"}</td>
          <td style="padding:6px 4px;font-weight:bold">Transport Mode:</td>
          <td>${ewb.transport_mode === "1" ? "Road" : ewb.transport_mode === "2" ? "Rail" : ewb.transport_mode === "3" ? "Air" : ewb.transport_mode === "4" ? "Ship" : (ewb.transport_mode ?? "—")}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;border:1px solid #ccc">
        <tr style="background:#f5f5f5">
          <th style="padding:8px;border:1px solid #ccc;text-align:left">From (Consignor)</th>
          <th style="padding:8px;border:1px solid #ccc;text-align:left">To (Consignee)</th>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ccc;vertical-align:top">
            <b>GSTIN:</b> ${ewb.supplier_gstin ?? "—"}<br/>
            <b>Place:</b> ${ewb.from_place ?? "—"}<br/>
            <b>State:</b> ${ewb.from_state ?? "—"} &nbsp; <b>Pincode:</b> ${ewb.from_pincode ?? "—"}
          </td>
          <td style="padding:8px;border:1px solid #ccc;vertical-align:top">
            <b>GSTIN:</b> ${ewb.recipient_gstin ?? "URP"}<br/>
            <b>Place:</b> ${ewb.to_place ?? "—"}<br/>
            <b>State:</b> ${ewb.to_state ?? "—"} &nbsp; <b>Pincode:</b> ${ewb.to_pincode ?? "—"}
          </td>
        </tr>
      </table>
      <h3 style="margin-top:16px">Transport Details</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #ccc">
        <tr>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">Vehicle No</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${ewb.vehicle_number ?? "—"}</td>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">Distance</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${ewb.distance_km ?? "—"} km</td>
        </tr>
        <tr>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">Transporter</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${ewb.transporter_name ?? "—"}</td>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">Transporter ID</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${ewb.transporter_id ?? "—"}</td>
        </tr>
      </table>
      <h3 style="margin-top:16px">Value Summary</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #ccc">
        <tr>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">Total Invoice Value</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${sym}${Number(ewb.total_value ?? 0).toLocaleString("en-IN")}</td>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">CGST</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${sym}${Number(ewb.cgst ?? 0).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">SGST</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${sym}${Number(ewb.sgst ?? 0).toLocaleString("en-IN")}</td>
          <td style="padding:6px 8px;border:1px solid #ccc;font-weight:bold">IGST</td>
          <td style="padding:6px 8px;border:1px solid #ccc">${sym}${Number(ewb.igst ?? 0).toLocaleString("en-IN")}</td>
        </tr>
      </table>
      <p style="margin-top:24px;font-size:11px;color:#666">Generated by SwachERP — E-Way Bill Module</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  // Mandatory field check
  const canSubmit = form.docNo && form.docDate && form.fromGstin && form.fromTrdName &&
    form.fromAddr1 && form.fromPlace && form.fromPincode &&
    form.toTrdName && form.toAddr1 && form.toPlace && form.toPincode &&
    (form.isUrp || form.toGstin) &&
    form.productName && form.hsnCode && form.taxableValue && form.totalInvoiceValue;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">E-Way Bill Generator</h1>
          <p className="text-sm text-muted-foreground">NIC GST Portal Integration — Mandatory above ${sym}50,000</p>
        </div>
        <Dialog open={credOpen} onOpenChange={setCredOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              {isConnected ? <><CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />NIC Connected</> : <><AlertTriangle className="w-3 h-3 mr-1 text-yellow-500" />Connect NIC Portal</>}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>NIC EWB API Credentials</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <Alert><AlertDescription>Register at <strong>einvoice1.gst.gov.in → API Registration</strong>. Use Sandbox for testing.</AlertDescription></Alert>
              <div><Label>GSTIN</Label><Input value={credForm.gstin} onChange={e => setCredForm(p => ({ ...p, gstin: e.target.value }))} placeholder="27AAAAA0000A1Z5" /></div>
              <div><Label>NIC Username</Label><Input value={credForm.username} onChange={e => setCredForm(p => ({ ...p, username: e.target.value }))} /></div>
              <div><Label>NIC Password</Label><Input type="password" value={credForm.password} onChange={e => setCredForm(p => ({ ...p, password: e.target.value }))} /></div>
              <div><Label>API Mode</Label>
                <Select value={credForm.apiMode} onValueChange={v => setCredForm(p => ({ ...p, apiMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sandbox">Sandbox (Testing)</SelectItem><SelectItem value="production">Production (Live)</SelectItem></SelectContent>
                </Select>
              </div>
              {credentials?.gstin && <div className="text-xs text-muted-foreground bg-muted p-2 rounded">Saved: {credentials.gstin} / {credentials.username} ({credentials.api_mode}){isConnected && <span className="text-green-600 ml-2">● Connected</span>}</div>}
              <Button className="w-full" onClick={() => credMutation.mutate()} disabled={!credForm.gstin || !credForm.username || !credForm.password || credMutation.isPending}>Save & Test Connection</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isConnected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>NIC portal not connected — EWBs saved as <strong>pending</strong>. Click "Connect NIC Portal" to enable live submission.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate EWB</TabsTrigger>
          <TabsTrigger value="list">EWB List ({(ewbList as any[]).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="space-y-4">

            {/* Invoice Auto-Fill */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-blue-800 dark:text-blue-200">Auto-fill from Invoice</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Select an existing invoice to populate all fields automatically</p>
                  </div>
                  <Dialog open={invoicePickerOpen} onOpenChange={setInvoicePickerOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="default">
                        <Search className="w-4 h-4 mr-2" />
                        {form.invoiceId ? `Invoice: ${form.docNo}` : "Select Invoice"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader><DialogTitle>Select Invoice to Generate EWB</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Showing invoices ≥ ${sym}50,000 (EWB mandatory threshold). Search by invoice number or buyer name.</p>
                        <Input
                          placeholder="Search invoice no or buyer name..."
                          value={invoiceSearch}
                          onChange={e => setInvoiceSearch(e.target.value)}
                          autoFocus
                        />
                        <div className="max-h-72 overflow-y-auto space-y-1">
                          {(invoiceResults as any[]).length === 0 ? (
                            <p className="text-sm text-center text-muted-foreground py-6">No invoices found</p>
                          ) : (invoiceResults as any[]).map((inv: any) => (
                            <button
                              key={inv.id}
                              className="w-full text-left px-3 py-2 rounded hover:bg-muted border text-sm flex justify-between items-center gap-2"
                              onClick={() => loadInvoice(inv.id)}
                              disabled={loadingInvoice}
                            >
                              <div>
                                <span className="font-semibold">{inv.invoice_number}</span>
                                <span className="text-muted-foreground ml-2 text-xs">{inv.buyer_name}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-medium">{sym}{(Number(inv.total_amount) / 100).toLocaleString("en-IN")}</div>
                                <div className="text-xs text-muted-foreground">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-IN") : ""}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                        {form.invoiceId && (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => { setForm({ ...emptyForm }); setInvoicePickerOpen(false); }}>
                            Clear & Fill Manually
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Section 1: Document Details */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">1. Document Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Supply Type <span className="text-red-500">*</span></Label>
                  <Select value={form.supplyType} onValueChange={v => f("supplyType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="O">Outward (Sale/Transfer)</SelectItem>
                      <SelectItem value="I">Inward (Purchase/Returns)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sub Supply Type <span className="text-red-500">*</span></Label>
                  <Select value={form.subSupplyType} onValueChange={v => f("subSupplyType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUB_SUPPLY_TYPES.map(s => <SelectItem key={s.code} value={s.code}>{s.code}. {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Type <span className="text-red-500">*</span></Label>
                  <Select value={form.docType} onValueChange={v => f("docType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d.code} value={d.code}>{d.code} — {d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Document / Invoice No <span className="text-red-500">*</span></Label><Input value={form.docNo} onChange={e => f("docNo", e.target.value)} placeholder="INV/2024-25/001" /></div>
                <div><Label>Document Date <span className="text-red-500">*</span></Label><Input type="date" value={form.docDate} onChange={e => f("docDate", e.target.value)} /></div>
              </CardContent>
            </Card>

            {/* Section 2: From (Consignor) */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">2. From — Consignor / Supplier</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div><Label>GSTIN <span className="text-red-500">*</span></Label><Input value={form.fromGstin} onChange={e => f("fromGstin", e.target.value.toUpperCase())} placeholder="27AAAAA0000A1Z5" maxLength={15} /></div>
                <div><Label>Trade Name <span className="text-red-500">*</span></Label><Input value={form.fromTrdName} onChange={e => f("fromTrdName", e.target.value)} placeholder="Your Company Name" /></div>
                <div className="col-span-2"><Label>Address Line 1 <span className="text-red-500">*</span></Label><Input value={form.fromAddr1} onChange={e => f("fromAddr1", e.target.value)} placeholder="Plot No, Street, Area" /></div>
                <div><Label>Address Line 2</Label><Input value={form.fromAddr2} onChange={e => f("fromAddr2", e.target.value)} placeholder="Landmark (optional)" /></div>
                <div><Label>City / Place <span className="text-red-500">*</span></Label><Input value={form.fromPlace} onChange={e => f("fromPlace", e.target.value)} placeholder="Mumbai" /></div>
                <div><Label>Pincode <span className="text-red-500">*</span></Label><Input value={form.fromPincode} onChange={e => f("fromPincode", e.target.value)} maxLength={6} placeholder="400001" /></div>
                <div>
                  <Label>State <span className="text-red-500">*</span></Label>
                  <Select value={form.fromStateCode} onValueChange={v => f("fromStateCode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATE_CODES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: To (Consignee) */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">3. To — Consignee / Recipient</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox id="urp" checked={form.isUrp} onCheckedChange={handleUrp} />
                    <label htmlFor="urp" className="text-sm font-medium cursor-pointer">
                      URP — Unregistered Person (no GST)
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div>
                  <Label>GSTIN {form.isUrp ? <Badge variant="secondary" className="ml-1 text-xs">URP</Badge> : <span className="text-red-500">*</span>}</Label>
                  <Input value={form.isUrp ? "URP" : form.toGstin} onChange={e => f("toGstin", e.target.value.toUpperCase())}
                    placeholder={form.isUrp ? "URP (auto)" : "27BBBBB0000B1Z5"} maxLength={15} disabled={form.isUrp}
                    className={form.isUrp ? "bg-muted" : ""} />
                  {form.isUrp && <p className="text-xs text-muted-foreground mt-1">NIC accepts "URP" for unregistered buyers. Address below is still mandatory.</p>}
                </div>
                <div><Label>Trade Name <span className="text-red-500">*</span></Label><Input value={form.toTrdName} onChange={e => f("toTrdName", e.target.value)} placeholder="Buyer / Recipient Name" /></div>
                <div className="col-span-2"><Label>Address Line 1 <span className="text-red-500">*</span></Label><Input value={form.toAddr1} onChange={e => f("toAddr1", e.target.value)} placeholder="Plot No, Street, Area" /></div>
                <div><Label>Address Line 2</Label><Input value={form.toAddr2} onChange={e => f("toAddr2", e.target.value)} placeholder="Landmark (optional)" /></div>
                <div><Label>City / Place <span className="text-red-500">*</span></Label><Input value={form.toPlace} onChange={e => f("toPlace", e.target.value)} placeholder="Pune" /></div>
                <div><Label>Pincode <span className="text-red-500">*</span></Label><Input value={form.toPincode} onChange={e => f("toPincode", e.target.value)} maxLength={6} placeholder="411001" /></div>
                <div>
                  <Label>State <span className="text-red-500">*</span></Label>
                  <Select value={form.toStateCode} onValueChange={v => f("toStateCode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATE_CODES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {isInterState && (
                  <div className="col-span-2">
                    <Alert><AlertDescription className="text-xs">Interstate supply detected (from {form.fromStateCode} → {form.toStateCode}). <strong>IGST applies</strong> — CGST/SGST rates set to 0.</AlertDescription></Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Item / Goods */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">4. Goods Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div><Label>Product Name <span className="text-red-500">*</span></Label><Input value={form.productName} onChange={e => f("productName", e.target.value)} placeholder="Water Treatment Chemical" /></div>
                <div><Label>HSN Code <span className="text-red-500">*</span></Label><Input value={form.hsnCode} onChange={e => f("hsnCode", e.target.value)} placeholder="38220090" maxLength={8} /></div>
                <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => f("quantity", e.target.value)} /></div>
                <div>
                  <Label>Unit</Label>
                  <Select value={form.qtyUnit} onValueChange={v => f("qtyUnit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["NOS", "KGS", "LTR", "MTR", "BOX", "PCS", "SET", "BAG", "CAN", "TON", "OTH"].map(u =>
                        <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Taxable Value (${sym}) <span className="text-red-500">*</span></Label><Input type="number" value={form.taxableValue} onChange={e => f("taxableValue", e.target.value)} placeholder="Pre-tax amount" /></div>
                <div><Label>Total Invoice Value (${sym}) <span className="text-red-500">*</span></Label><Input type="number" value={form.totalInvoiceValue} onChange={e => f("totalInvoiceValue", e.target.value)} placeholder="With GST" /></div>

                {isInterState ? (
                  <div>
                    <Label>IGST Rate (%) <span className="text-red-500">*</span></Label>
                    <Select value={form.igstRate} onValueChange={v => f("igstRate", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>CGST Rate (%) <span className="text-red-500">*</span></Label>
                      <Select value={form.cgstRate} onValueChange={v => f("cgstRate", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>SGST Rate (%)</Label>
                      <Input value={form.cgstRate} disabled className="bg-muted" title="SGST = CGST for intrastate" />
                    </div>
                  </>
                )}
                <div>
                  <Label>CESS Rate (%)</Label>
                  <Select value={form.cessRate} onValueChange={v => f("cessRate", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["0", "1", "3", "5", "12", "22"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Transport */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">5. Transport Details (Part B)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Transport Mode <span className="text-red-500">*</span></Label>
                  <Select value={form.transMode} onValueChange={v => f("transMode", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TRANSPORT_MODES.map(m => <SelectItem key={m.code} value={m.code}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Select value={form.vehicleType} onValueChange={v => f("vehicleType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.transMode === "1" && (
                  <div><Label>Vehicle No {form.transMode === "1" && <span className="text-red-500">*</span>}</Label><Input value={form.vehicleNo} onChange={e => f("vehicleNo", e.target.value.toUpperCase())} placeholder="MH12AB1234" /></div>
                )}
                <div><Label>Distance (km)</Label><Input type="number" value={form.distanceKm} onChange={e => f("distanceKm", e.target.value)} placeholder="Auto-calculated by NIC if blank" /></div>
                <div><Label>Transporter ID (GSTIN)</Label><Input value={form.transId} onChange={e => f("transId", e.target.value.toUpperCase())} placeholder="If using registered transporter" /></div>
                <div><Label>Transporter Name</Label><Input value={form.transName} onChange={e => f("transName", e.target.value)} /></div>
                {form.transMode !== "1" && (
                  <>
                    <div><Label>Transport Doc No</Label><Input value={form.transDocNo} onChange={e => f("transDocNo", e.target.value)} placeholder="LR / RR / Airway Bill No" /></div>
                    <div><Label>Transport Doc Date</Label><Input type="date" value={form.transDocDate} onChange={e => f("transDocDate", e.target.value)} /></div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button onClick={() => generateMutation.mutate()} disabled={!canSubmit || generateMutation.isPending} className="min-w-48">
                <FileText className="w-4 h-4 mr-2" />
                {generateMutation.isPending ? "Submitting..." : isConnected ? "Generate & Submit to NIC Portal" : "Save EWB (Pending)"}
              </Button>
              {!canSubmit && <p className="text-xs text-muted-foreground">Fill all <span className="text-red-500">*</span> mandatory fields to submit</p>}
            </div>

            {generated && (
              <div className={`p-4 border rounded ${generated.status === "generated" ? "bg-green-50 border-green-200 dark:bg-green-950" : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950"}`}>
                <div className={`font-bold text-lg ${generated.status === "generated" ? "text-green-700 dark:text-green-300" : "text-yellow-700"}`}>
                  {generated.status === "generated" ? "✅ E-Way Bill Generated on NIC Portal!" : "⏳ EWB Saved as Pending"}
                </div>
                {generated.ewb_number && <div className="mt-1">EWB No: <strong className="font-mono">{generated.ewb_number}</strong></div>}
                {generated.ewb_valid_until && <div>Valid Upto: <strong>{new Date(generated.ewb_valid_until).toLocaleDateString("en-IN")}</strong></div>}
                <div className="text-sm text-muted-foreground mt-1">Status: {generated.status} | Doc: {generated.doc_number ?? form.docNo}</div>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => printEWB(generated)}>
                  <Printer className="w-3 h-3 mr-1" />Print EWB
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader><CardTitle>E-Way Bills</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>EWB No</TableHead><TableHead>Doc No</TableHead>
                    <TableHead>From</TableHead><TableHead>To (GSTIN)</TableHead>
                    <TableHead>Value</TableHead><TableHead>Valid Upto</TableHead>
                    <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ewbList as any[]).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No E-Way Bills yet.</TableCell></TableRow>
                  ) : (ewbList as any[]).map((ewb: any) => (
                    <TableRow key={ewb.id}>
                      <TableCell className="font-mono text-xs">{ewb.ewb_number ?? <span className="text-yellow-600">PENDING</span>}</TableCell>
                      <TableCell className="text-xs">{ewb.doc_number ?? "—"}</TableCell>
                      <TableCell className="text-xs">{ewb.from_gstin ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{ewb.to_gstin === "URP" ? <Badge variant="outline">URP</Badge> : ewb.to_gstin ?? "—"}</TableCell>
                      <TableCell>{ewb.total_value ? `${sym}${Number(ewb.total_value).toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell className="text-xs">{ewb.ewb_valid_until ? new Date(ewb.ewb_valid_until).toLocaleDateString("en-IN") : "—"}</TableCell>
                      <TableCell><Badge variant={ewb.status === "cancelled" ? "destructive" : ewb.status === "generated" ? "default" : "secondary"}>{ewb.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => printEWB(ewb)}><Printer className="w-3 h-3" /></Button>
                          {ewb.status === "generated" && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelMutation.mutate(ewb.id)}>
                              <XCircle className="w-3 h-3 mr-1" />Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
