import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2, Plus, CheckCircle2, XCircle, Package, AlertTriangle, Loader2, IndianRupee } from "lucide-react";
import type { ScrapInventory } from "@shared/schema";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const DAMAGE_REASONS = ["transport", "handling", "manufacturing_defect", "customer_misuse", "expired", "other"];
const DISPOSAL_METHODS = ["recycled", "disposed", "sold_as_scrap", "repaired"];

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Pending Approval", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "secondary" },
};

const PROCESSED_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  processed: { label: "Processed", variant: "default" },
  disposed: { label: "Disposed", variant: "secondary" },
};

export default function ScrapManagementPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [selected, setSelected] = useState<ScrapInventory | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [disposeForm, setDisposeForm] = useState({ disposalMethod: "", disposalValue: "", remarks: "" });

  const { data: scraps = [], isLoading, refetch } = useQuery<ScrapInventory[]>({ queryKey: ["/api/scrap-inventory"] });
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/products"] });

  const [form, setForm] = useState({
    scrapDate: format(new Date(), "yyyy-MM-dd"),
    productId: "", productName: "", quantity: "",
    unitCost: "", sellingPrice: "",
    damageReason: "", conditionDescription: "", remarks: "",
  });

  const pending = scraps.filter(s => s.approvalStatus === "pending");
  const approved = scraps.filter(s => s.approvalStatus === "approved");
  const all = scraps;

  const fmt = (paise: number | null | undefined) => paise != null ? `${sym}${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-";

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const qty = parseInt(data.quantity);
      const unitCost = Math.round(parseFloat(data.unitCost) * 100);
      const sellingPrice = Math.round(parseFloat(data.sellingPrice) * 100);
      const res = await apiRequest("POST", "/api/scrap-inventory/direct", {
        ...data,
        quantity: qty,
        unitCost,
        sellingPrice,
        totalCostValue: qty * unitCost,
        totalSellingValue: qty * sellingPrice,
        lossAmount: qty * unitCost,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scrap-inventory"] });
      toast({ title: "Scrap entry created" });
      setAddOpen(false);
      setForm({ scrapDate: format(new Date(), "yyyy-MM-dd"), productId: "", productName: "", quantity: "", unitCost: "", sellingPrice: "", damageReason: "", conditionDescription: "", remarks: "" });
    },
    onError: (e: any) => toast({ title: "Failed to create scrap entry", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/scrap-inventory/${id}/approve`, { action: status, remarks: approvalRemarks });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scrap-inventory"] });
      toast({ title: "Scrap record updated" });
      setApproveOpen(false);
      setSelected(null);
      setApprovalRemarks("");
    },
    onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const disposeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/scrap-inventory/${id}/dispose`, {
        disposalMethod: disposeForm.disposalMethod,
        disposalValue: disposeForm.disposalValue ? Math.round(parseFloat(disposeForm.disposalValue) * 100) : 0,
        remarks: disposeForm.remarks,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scrap-inventory"] });
      toast({ title: "Disposal recorded" });
      setDisposeOpen(false);
      setSelected(null);
    },
    onError: (e: any) => toast({ title: "Failed to record disposal", description: e.message, variant: "destructive" }),
  });

  const ScrapTable = ({ items }: { items: ScrapInventory[] }) => (
    items.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground text-sm"><Trash2 className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No records found.</p></div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scrap No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Loss</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Processed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(s => {
            const approvalBadge = STATUS_BADGE[s.approvalStatus] ?? STATUS_BADGE.pending;
            const processedBadge = PROCESSED_BADGE[s.processedStatus] ?? PROCESSED_BADGE.pending;
            return (
              <TableRow key={s.id} data-testid={`row-scrap-${s.id}`}>
                <TableCell className="font-medium">{s.scrapNumber}</TableCell>
                <TableCell>{s.scrapDate ? format(new Date(s.scrapDate), "dd MMM yyyy") : "-"}</TableCell>
                <TableCell>{s.productName}</TableCell>
                <TableCell className="text-right">{s.quantity}</TableCell>
                <TableCell className="capitalize">{(s.damageReason ?? "").replace(/_/g, " ")}</TableCell>
                <TableCell className="text-right text-destructive">{fmt(s.lossAmount)}</TableCell>
                <TableCell><Badge variant={approvalBadge.variant}>{approvalBadge.label}</Badge></TableCell>
                <TableCell><Badge variant={processedBadge.variant}>{processedBadge.label}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {s.approvalStatus === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => { setSelected(s); setApprovalRemarks(""); setApproveOpen(true); }} data-testid={`button-review-${s.id}`}>
                        Review
                      </Button>
                    )}
                    {s.approvalStatus === "approved" && s.processedStatus !== "disposed" && (
                      <Button size="sm" variant="outline" onClick={() => { setSelected(s); setDisposeForm({ disposalMethod: "", disposalValue: "", remarks: "" }); setDisposeOpen(true); }} data-testid={`button-dispose-${s.id}`}>
                        Dispose
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Trash2 className="h-6 w-6 text-primary" />Scrap Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Record, approve and dispose of scrapped finished goods</p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="button-add-scrap"><Plus className="h-4 w-4 mr-2" />New Scrap Entry</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: all.length, icon: <Package className="h-5 w-5" /> },
          { label: "Pending Approval", value: pending.length, icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
          { label: "Approved", value: approved.length, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
          { label: "Total Loss", value: all.filter(s => s.approvalStatus === "approved").reduce((sum, s) => sum + (s.lossAmount ?? 0), 0), isAmount: true, icon: <IndianRupee className="h-5 w-5 text-destructive" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.isAmount ? fmt(s.value as number) : s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-scrap-pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-scrap-approved">Approved</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-scrap-all">All Records</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4"><Card><CardContent className="p-0">{isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : <ScrapTable items={pending} />}</CardContent></Card></TabsContent>
        <TabsContent value="approved" className="mt-4"><Card><CardContent className="p-0"><ScrapTable items={approved} /></CardContent></Card></TabsContent>
        <TabsContent value="all" className="mt-4"><Card><CardContent className="p-0"><ScrapTable items={all} /></CardContent></Card></TabsContent>
      </Tabs>

      {/* Add Scrap Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-scrap">
          <DialogHeader><DialogTitle>New Scrap Entry</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Scrap Date *</Label>
                <Input type="date" value={form.scrapDate} onChange={e => setForm(f => ({ ...f, scrapDate: e.target.value }))} data-testid="input-scrap-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} data-testid="input-scrap-qty" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={v => {
                const p = products.find((pr: any) => pr.id === v);
                setForm(f => ({ ...f, productId: v, productName: p?.name || "" }));
              }}>
                <SelectTrigger data-testid="select-scrap-product"><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Cost (${sym}) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} data-testid="input-scrap-cost" />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price (${sym}) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} data-testid="input-scrap-sp" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Damage Reason *</Label>
              <Select value={form.damageReason} onValueChange={v => setForm(f => ({ ...f, damageReason: v }))}>
                <SelectTrigger data-testid="select-damage-reason"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>{DAMAGE_REASONS.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condition Description</Label>
              <Textarea rows={2} placeholder="Describe the damage or condition..." value={form.conditionDescription} onChange={e => setForm(f => ({ ...f, conditionDescription: e.target.value }))} data-testid="input-scrap-condition" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(form)} disabled={!form.productId || !form.quantity || !form.unitCost || !form.sellingPrice || !form.damageReason || addMutation.isPending} data-testid="button-save-scrap">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent data-testid="dialog-approve-scrap">
          <DialogHeader><DialogTitle>Review Scrap — {selected?.scrapNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Product:</span><p className="font-medium">{selected?.productName}</p></div>
              <div><span className="text-muted-foreground">Quantity:</span><p className="font-medium">{selected?.quantity}</p></div>
              <div><span className="text-muted-foreground">Loss Amount:</span><p className="font-medium text-destructive">{fmt(selected?.lossAmount)}</p></div>
              <div><span className="text-muted-foreground">Reason:</span><p className="font-medium capitalize">{(selected?.damageReason ?? "").replace(/_/g, " ")}</p></div>
            </div>
            {selected?.conditionDescription && <p className="text-sm text-muted-foreground">{selected.conditionDescription}</p>}
            <div className="space-y-1.5">
              <Label>Approval Remarks</Label>
              <Textarea rows={2} value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)} placeholder="Optional remarks..." data-testid="input-approval-remarks" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => approveMutation.mutate({ id: selected!.id, status: "reject" })} disabled={approveMutation.isPending} className="border-destructive text-destructive" data-testid="button-reject-scrap">
              <XCircle className="h-4 w-4 mr-1" />Reject
            </Button>
            <Button onClick={() => approveMutation.mutate({ id: selected!.id, status: "approve" })} disabled={approveMutation.isPending} data-testid="button-approve-scrap">
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispose Dialog */}
      <Dialog open={disposeOpen} onOpenChange={setDisposeOpen}>
        <DialogContent data-testid="dialog-dispose-scrap">
          <DialogHeader><DialogTitle>Record Disposal — {selected?.scrapNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Disposal Method *</Label>
              <Select value={disposeForm.disposalMethod} onValueChange={v => setDisposeForm(f => ({ ...f, disposalMethod: v }))}>
                <SelectTrigger data-testid="select-disposal-method"><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>{DISPOSAL_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recovery Value (${sym})</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={disposeForm.disposalValue} onChange={e => setDisposeForm(f => ({ ...f, disposalValue: e.target.value }))} data-testid="input-disposal-value" />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea rows={2} value={disposeForm.remarks} onChange={e => setDisposeForm(f => ({ ...f, remarks: e.target.value }))} data-testid="input-disposal-remarks" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeOpen(false)}>Cancel</Button>
            <Button onClick={() => disposeMutation.mutate(selected!.id)} disabled={!disposeForm.disposalMethod || disposeMutation.isPending} data-testid="button-save-disposal">
              {disposeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Disposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
