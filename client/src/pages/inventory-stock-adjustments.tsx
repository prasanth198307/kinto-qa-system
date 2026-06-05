import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, Plus, Search, ClipboardList, ArrowDown, ArrowUp, RotateCcw,
  Trash2, PackageX, CheckCircle2, Clock, ShieldAlert, ThumbsDown,
} from "lucide-react";

const ADJUSTMENT_TYPES = [
  { value: "damaged",    label: "Damaged",          icon: AlertTriangle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", sign: -1 },
  { value: "expired",    label: "Expired",           icon: PackageX,      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             sign: -1 },
  { value: "theft",      label: "Theft / Shrinkage", icon: AlertTriangle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             sign: -1 },
  { value: "wastage",    label: "Wastage",           icon: Trash2,        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",  sign: -1 },
  { value: "found",      label: "Found / Surplus",   icon: CheckCircle2,  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",      sign: +1 },
  { value: "correction", label: "Stock Correction",  icon: RotateCcw,     color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",          sign: 0  },
];

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved:          { label: "Approved",         variant: "default" },
  pending_approval:  { label: "Pending Approval", variant: "secondary" },
  rejected:          { label: "Rejected",         variant: "destructive" },
};

const APPROVAL_THRESHOLD = 500;

function typeMeta(type: string) {
  return ADJUSTMENT_TYPES.find(t => t.value === type) ?? ADJUSTMENT_TYPES[0];
}

const fmtRs = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmt    = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—";

interface Product { id: number; product_name: string; sku_code: string | null; barcode: string | null; unit_label: string | null; }
interface Adjustment {
  id: number; product_name: string; sku_code: string | null; barcode: string | null;
  adjustment_type: string; qty_change: string; unit_label: string | null;
  reason_notes: string | null; adjusted_by: string | null; reference_no: string | null;
  created_at: string; status: string; unit_price: string | null; total_value: string | null;
  approved_by: string | null; approved_at: string | null; rejected_reason: string | null;
}

export default function InventoryStockAdjustments() {
  const { toast } = useToast();
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [form, setForm] = useState({
    product_id: "", adjustment_type: "", qty_change: "",
    unit_label: "", reason_notes: "", reference_no: "", unit_price: "",
  });

  const { data: adjustments = [], isLoading } = useQuery<Adjustment[]>({
    queryKey: ["/api/inventory/stock-adjustments"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/inventory/products"],
  });

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/inventory/stock-adjustments", d),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock-adjustments"] });
      if (data?.requires_approval) {
        toast({ title: "Pending Approval", description: `Value ₹${fmtRs(data.total_value)} exceeds ₹${APPROVAL_THRESHOLD} — sent for supervisor approval.` });
      } else {
        toast({ title: "Adjustment recorded", description: "Stock ledger updated." });
      }
      setOpen(false);
      setForm({ product_id: "", adjustment_type: "", qty_change: "", unit_label: "", reason_notes: "", reference_no: "", unit_price: "" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/inventory/stock-adjustments/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock-adjustments"] });
      toast({ title: "Approved", description: "Stock has been updated." });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiRequest("PATCH", `/api/inventory/stock-adjustments/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock-adjustments"] });
      toast({ title: "Rejected", description: "Adjustment has been rejected." });
      setRejectDialog(null);
      setRejectReason("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const filtered = adjustments.filter(a => {
    const matchSearch = !search ||
      a.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.sku_code ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.reference_no ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === "all"   || a.adjustment_type === typeFilter;
    const matchStatus = statusFilter === "all" || (a.status ?? "approved") === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const selectedProduct = products.find(p => String(p.id) === form.product_id);
  const estimatedValue  = Number(form.unit_price || 0) * Number(form.qty_change || 0);
  const willNeedApproval = estimatedValue > APPROVAL_THRESHOLD;

  const pendingCount = adjustments.filter(a => a.status === "pending_approval").length;
  const totalDeductions = adjustments.filter(a => typeMeta(a.adjustment_type).sign === -1 && a.status !== "rejected")
    .reduce((s, a) => s + Math.abs(Number(a.qty_change)), 0);
  const totalSurplus = adjustments.filter(a => typeMeta(a.adjustment_type).sign === 1 && a.status !== "rejected")
    .reduce((s, a) => s + Number(a.qty_change), 0);

  function handleSubmit() {
    if (!form.product_id)   return toast({ title: "Select a product", variant: "destructive" });
    if (!form.adjustment_type) return toast({ title: "Select adjustment type", variant: "destructive" });
    if (!form.qty_change || isNaN(Number(form.qty_change)) || Number(form.qty_change) <= 0)
      return toast({ title: "Enter a valid quantity", variant: "destructive" });
    createMut.mutate({
      ...form,
      product_id: Number(form.product_id),
      qty_change: Number(form.qty_change),
      unit_price: Number(form.unit_price || 0),
      unit_label: form.unit_label || selectedProduct?.unit_label || null,
    });
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground">Record shrinkage, damage, expiry, and write-offs</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-new-adjustment">
          <Plus className="h-4 w-4 mr-2" />New Adjustment
        </Button>
      </div>

      {/* Pending approval alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span><strong>{pendingCount}</strong> adjustment{pendingCount > 1 ? "s" : ""} pending supervisor approval — value exceeds ₹{APPROVAL_THRESHOLD}.</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setStatusFilter("pending_approval")}>
            Review
          </Button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">Total Write-offs</div>
            <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {adjustments.filter(a => typeMeta(a.adjustment_type).sign === -1 && a.status !== "rejected").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">Units Written Off</div>
            <div className="flex items-center gap-1 text-2xl font-semibold text-orange-600 dark:text-orange-400">
              <ArrowDown className="h-4 w-4" />{fmt(totalDeductions)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">Surplus Found</div>
            <div className="flex items-center gap-1 text-2xl font-semibold text-green-600 dark:text-green-400">
              <ArrowUp className="h-4 w-4" />{fmt(totalSurplus)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">Pending Approval</div>
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />Adjustment History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search product, SKU, ref…" value={search}
                onChange={e => setSearch(e.target.value)} data-testid="input-search-adjustments" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ADJUSTMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]" data-testid="select-status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <div className="text-sm">No adjustments found</div>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => {
                    const meta   = typeMeta(a.adjustment_type);
                    const sign   = meta.sign;
                    const qty    = Number(a.qty_change);
                    const status = a.status ?? "approved";
                    const sMeta  = STATUS_META[status] ?? STATUS_META["approved"];
                    return (
                      <TableRow key={a.id} data-testid={`row-adjustment-${a.id}`}>
                        <TableCell>
                          <div className="font-medium text-sm">{a.product_name}</div>
                          {a.sku_code && <div className="text-xs text-muted-foreground">{a.sku_code}</div>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                            <meta.icon className="h-3 w-3" />{meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          <span className={sign === 1 ? "text-green-600 dark:text-green-400" : sign === -1 ? "text-red-600 dark:text-red-400" : ""}>
                            {sign === 1 ? "+" : sign === -1 ? "−" : "±"}{fmt(Math.abs(qty))} {a.unit_label || ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Number(a.total_value || 0) > 0 ? `₹${fmtRs(a.total_value)}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sMeta.variant} className="text-xs whitespace-nowrap">
                            {status === "pending_approval" && <Clock className="h-3 w-3 mr-1" />}
                            {sMeta.label}
                          </Badge>
                          {status === "approved" && a.approved_by && (
                            <div className="text-xs text-muted-foreground mt-0.5">{a.approved_by}</div>
                          )}
                          {status === "rejected" && a.rejected_reason && (
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-[140px] truncate">{a.rejected_reason}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate">{a.reason_notes || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.adjusted_by || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(a.created_at)}</TableCell>
                        <TableCell>
                          {status === "pending_approval" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                                onClick={() => approveMut.mutate(a.id)}
                                disabled={approveMut.isPending}
                                data-testid={`button-approve-adj-${a.id}`}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />OK
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                                onClick={() => { setRejectDialog({ id: a.id }); setRejectReason(""); }}
                                data-testid={`button-reject-adj-${a.id}`}>
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Adjustment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Stock Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Product <span className="text-destructive">*</span></Label>
              <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v, unit_label: products.find(p => String(p.id) === v)?.unit_label || "" }))}>
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.product_name}{p.sku_code ? ` — ${p.sku_code}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Adjustment Type <span className="text-destructive">*</span></Label>
              <Select value={form.adjustment_type} onValueChange={v => setForm(f => ({ ...f, adjustment_type: v }))}>
                <SelectTrigger data-testid="select-adjustment-type">
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                        {t.sign === -1 && <span className="text-xs text-muted-foreground">(removes stock)</span>}
                        {t.sign === 1  && <span className="text-xs text-muted-foreground">(adds stock)</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.adjustment_type && (() => {
                const meta = typeMeta(form.adjustment_type);
                return (
                  <p className={`text-xs px-2 py-1 rounded-md ${meta.color}`}>
                    {meta.sign === -1 && "This will deduct quantity from warehouse stock."}
                    {meta.sign === 1  && "This will add quantity to warehouse stock."}
                    {meta.sign === 0  && "Positive number — treated as net correction."}
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <Input type="number" min="0.001" step="0.001" placeholder="e.g. 5"
                  value={form.qty_change} onChange={e => setForm(f => ({ ...f, qty_change: e.target.value }))}
                  data-testid="input-qty-change" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input placeholder={selectedProduct?.unit_label || "kg / pcs"}
                  value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
                  data-testid="input-unit-label" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (₹)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  data-testid="input-unit-price" />
              </div>
            </div>

            {/* Approval warning */}
            {estimatedValue > 0 && (
              <div className={`flex items-start gap-2 p-2.5 rounded-md text-xs ${
                willNeedApproval
                  ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200"
                  : "bg-muted/50 text-muted-foreground"
              }`}>
                {willNeedApproval
                  ? <><ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Estimated value ₹{fmtRs(estimatedValue)} exceeds ₹{APPROVAL_THRESHOLD} — will require supervisor approval before stock is updated.</span></>
                  : <><CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Estimated value ₹{fmtRs(estimatedValue)} — within auto-approval limit.</span></>
                }
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Reason / Notes</Label>
              <Textarea rows={2} placeholder="Describe the reason in detail…"
                value={form.reason_notes} onChange={e => setForm(f => ({ ...f, reason_notes: e.target.value }))}
                data-testid="input-reason-notes" />
            </div>

            <div className="space-y-1.5">
              <Label>Reference No. <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="e.g. WRITE-OFF-001 or GRN-42"
                value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))}
                data-testid="input-reference-no" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending} data-testid="button-save-adjustment">
              {createMut.isPending ? "Saving…" : willNeedApproval ? "Submit for Approval" : "Record Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={v => { if (!v) setRejectDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason for rejection</Label>
            <Textarea rows={3} placeholder="Enter reason…" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} data-testid="input-reject-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectDialog && rejectMut.mutate({ id: rejectDialog.id, reason: rejectReason })}
              disabled={rejectMut.isPending} data-testid="button-confirm-reject">
              {rejectMut.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
