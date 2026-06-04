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
  AlertTriangle, Plus, Search, ClipboardList, ArrowDown, ArrowUp, RotateCcw, Trash2, PackageX, CheckCircle2
} from "lucide-react";

const ADJUSTMENT_TYPES = [
  { value: "damaged",    label: "Damaged",         icon: AlertTriangle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", sign: -1 },
  { value: "expired",    label: "Expired",          icon: PackageX,     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             sign: -1 },
  { value: "theft",      label: "Theft / Shrinkage",icon: AlertTriangle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             sign: -1 },
  { value: "wastage",    label: "Wastage",          icon: Trash2,       color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",  sign: -1 },
  { value: "found",      label: "Found / Surplus",  icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",      sign: +1 },
  { value: "correction", label: "Stock Correction", icon: RotateCcw,    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",          sign: 0  },
];

function typeMeta(type: string) {
  return ADJUSTMENT_TYPES.find(t => t.value === type) ?? ADJUSTMENT_TYPES[0];
}

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—";

interface Product { id: number; product_name: string; sku_code: string | null; barcode: string | null; unit_label: string | null; }
interface Adjustment {
  id: number; product_name: string; sku_code: string | null; barcode: string | null;
  adjustment_type: string; qty_change: string; unit_label: string | null;
  reason_notes: string | null; adjusted_by: string | null; reference_no: string | null; created_at: string;
}

export default function InventoryStockAdjustments() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [form, setForm] = useState({
    product_id: "",
    adjustment_type: "",
    qty_change: "",
    unit_label: "",
    reason_notes: "",
    reference_no: "",
  });

  const { data: adjustments = [], isLoading } = useQuery<Adjustment[]>({
    queryKey: ["/api/inventory/stock-adjustments"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/inventory/products"],
  });

  const createMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/inventory/stock-adjustments", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stock-adjustments"] });
      toast({ title: "Adjustment recorded", description: "Stock ledger updated." });
      setOpen(false);
      setForm({ product_id: "", adjustment_type: "", qty_change: "", unit_label: "", reason_notes: "", reference_no: "" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const filtered = adjustments.filter(a => {
    const matchSearch = !search ||
      a.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.sku_code ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.reference_no ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.adjustment_type === typeFilter;
    return matchSearch && matchType;
  });

  const selectedProduct = products.find(p => String(p.id) === form.product_id);

  function handleSubmit() {
    if (!form.product_id) return toast({ title: "Select a product", variant: "destructive" });
    if (!form.adjustment_type) return toast({ title: "Select adjustment type", variant: "destructive" });
    if (!form.qty_change || isNaN(Number(form.qty_change)) || Number(form.qty_change) <= 0)
      return toast({ title: "Enter a valid quantity", variant: "destructive" });
    createMut.mutate({
      ...form,
      product_id: Number(form.product_id),
      qty_change: Number(form.qty_change),
      unit_label: form.unit_label || selectedProduct?.unit_label || null,
    });
  }

  const totalDeductions = adjustments.filter(a => typeMeta(a.adjustment_type).sign === -1)
    .reduce((s, a) => s + Math.abs(Number(a.qty_change)), 0);
  const totalSurplus = adjustments.filter(a => typeMeta(a.adjustment_type).sign === 1)
    .reduce((s, a) => s + Number(a.qty_change), 0);

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-muted-foreground mb-1">Total Write-offs</div>
            <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{adjustments.filter(a => typeMeta(a.adjustment_type).sign === -1).length}</div>
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
            <div className="text-xs text-muted-foreground mb-1">Total Entries</div>
            <div className="text-2xl font-semibold">{adjustments.length}</div>
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
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ADJUSTMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
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
                    <TableHead className="text-right">Qty Change</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => {
                    const meta = typeMeta(a.adjustment_type);
                    const sign = meta.sign;
                    const qty = Number(a.qty_change);
                    return (
                      <TableRow key={a.id} data-testid={`row-adjustment-${a.id}`}>
                        <TableCell>
                          <div className="font-medium text-sm">{a.product_name}</div>
                          {a.sku_code && <div className="text-xs text-muted-foreground">{a.sku_code}</div>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                            <meta.icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          <span className={sign === 1 ? "text-green-600 dark:text-green-400" : sign === -1 ? "text-red-600 dark:text-red-400" : ""}>
                            {sign === 1 ? "+" : sign === -1 ? "−" : "±"}{fmt(Math.abs(qty))} {a.unit_label || ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{a.reason_notes || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.reference_no || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.adjusted_by || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(a.created_at)}</TableCell>
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
                    {meta.sign === 0  && "Enter a positive number; it will be treated as a net correction (deduct if stock is over, add if under — backend calculates)."}
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <Input type="number" min="0.001" step="0.001" placeholder="e.g. 5"
                  value={form.qty_change} onChange={e => setForm(f => ({ ...f, qty_change: e.target.value }))}
                  data-testid="input-qty-change" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input placeholder={selectedProduct?.unit_label || "kg / pcs / box"}
                  value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
                  data-testid="input-unit-label" />
              </div>
            </div>

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
              {createMut.isPending ? "Saving…" : "Record Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
