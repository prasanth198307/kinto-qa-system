import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Trash2, Eye, SendHorizontal, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InlineAttachments } from "@/components/inline-attachments";
import { CustomFieldsSection } from "@/components/custom-fields-section";

interface GRN {
  id: number;
  grn_number: string;
  po_id: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  received_date: string;
  status: string;
  remarks: string;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft:      { label: "Draft",      variant: "secondary"  },
  received:   { label: "Received",   variant: "default"    },
  submitted:  { label: "Submitted",  variant: "outline"    },
  inspected:  { label: "Inspected",  variant: "default"    },
  posted:     { label: "Posted",     variant: "default"    },
  rejected:   { label: "Rejected",   variant: "destructive"},
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "secondary" as const };
  return (
    <Badge variant={meta.variant} className="flex items-center gap-1 w-fit">
      {status === "submitted" && <Clock className="h-3 w-3" />}
      {status === "posted"    && <CheckCircle2 className="h-3 w-3" />}
      {meta.label}
    </Badge>
  );
}

function GRNViewDialog({ viewing, onClose, onSubmit, onApprove }: {
  viewing: GRN;
  onClose: () => void;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
}) {
  const { data: detail } = useQuery<any>({
    queryKey: [`/api/generic/grn/${viewing.id}`],
    enabled: !!viewing.id,
  });
  const viewingItems: any[] = detail?.items ?? [];

  return (
    <Dialog open={!!viewing} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{viewing.grn_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <StatusBadge status={viewing.status} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Received Date</p>
              <p className="font-medium">{viewing.received_date ? new Date(viewing.received_date).toLocaleDateString() : "—"}</p>
            </div>
            {viewing.po_id && (
              <div>
                <p className="text-muted-foreground text-xs">PO Reference</p>
                <p className="font-mono font-medium">{viewing.po_id}</p>
              </div>
            )}
            {viewing.vendor_name && (
              <div>
                <p className="text-muted-foreground text-xs">Vendor</p>
                <p className="font-medium">{viewing.vendor_name}</p>
              </div>
            )}
            {viewing.remarks && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Remarks</p>
                <p>{viewing.remarks}</p>
              </div>
            )}
          </div>

          {/* Items with expiry badges */}
          {viewingItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Items Received</p>
              <div className="space-y-1.5">
                {viewingItems.map((item: any, idx: number) => {
                  const expiry = item.expiry_date ? new Date(item.expiry_date) : null;
                  const daysLeft = expiry ? Math.ceil((expiry.getTime() - Date.now()) / 86400000) : null;
                  const isExpired = daysLeft !== null && daysLeft <= 0;
                  const isNearExpiry = daysLeft !== null && daysLeft <= 30;
                  return (
                    <div key={idx} className="flex items-start justify-between rounded-md border p-2.5 gap-3 text-sm" data-testid={`view-item-${idx}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.description || `Item ${idx + 1}`}</p>
                        <p className="text-xs text-muted-foreground">
                          Rcv: {item.received_qty} {item.unit_label || ''}
                          {item.batch_number ? ` · Batch: ${item.batch_number}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-0.5">
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs" data-testid={`badge-expired-${idx}`}>
                            Expired
                          </Badge>
                        )}
                        {!isExpired && isNearExpiry && (
                          <Badge variant="destructive" className="text-xs" data-testid={`badge-near-expiry-${idx}`}>
                            <AlertTriangle className="h-3 w-3 mr-1" />{daysLeft}d left
                          </Badge>
                        )}
                        {expiry && !isNearExpiry && (
                          <p className="text-xs text-muted-foreground">{expiry.toLocaleDateString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <InlineAttachments entityType="grn" entityId={viewing.id} label="GRN Attachments" />
          <CustomFieldsSection entityType="grn" entityId={viewing.id} />
        </div>
        <DialogFooter className="gap-2 pt-2">
          {(viewing.status === "received" || viewing.status === "draft") && (
            <Button variant="outline" onClick={() => onSubmit(viewing.id)}
              data-testid={`button-submit-grn-detail-${viewing.id}`}>
              <SendHorizontal className="h-4 w-4 mr-2" />Submit for Approval
            </Button>
          )}
          {viewing.status === "submitted" && (
            <Button onClick={() => onApprove(viewing.id)}
              data-testid={`button-approve-grn-detail-${viewing.id}`}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Approve & Update Stock
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GoodsReceiptNotesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<GRN | null>(null);
  const [form, setForm] = useState({ po_id: "", vendor_id: "", received_date: new Date().toISOString().split("T")[0], remarks: "" });
  const [items, setItems] = useState([{ item_name: "", ordered_qty: 0, received_qty: 0, unit: "Nos", unit_price: 0, batch_number: "", lot_number: "", manufactured_date: "", expiry_date: "" }]);

  const { data: grns = [], isLoading } = useQuery<GRN[]>({
    queryKey: ["/api/generic/grns"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/generic/grns", { ...form, items }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/grns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/generic/grn-expiry-alerts"] });
      toast({ title: "GRN created" });
      // GSTIN warning — surface after success so the GRN is saved but user is alerted
      if (data?.gstin_warning) {
        setTimeout(() => toast({
          title: "Vendor GSTIN Warning",
          description: data.gstin_warning,
          variant: "destructive",
        }), 400);
      }
      setOpen(false);
      setForm({ po_id: "", vendor_id: "", received_date: new Date().toISOString().split("T")[0], remarks: "" });
      setItems([{ item_name: "", ordered_qty: 0, received_qty: 0, unit: "Nos", unit_price: 0, batch_number: "", lot_number: "", manufactured_date: "", expiry_date: "" }]);
    },
    onError: () => toast({ title: "Error creating GRN", variant: "destructive" }),
  });

  const submitMut = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/generic/grn/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/grns"] });
      toast({ title: "GRN submitted", description: "Sent for Purchase Manager approval." });
    },
    onError: (e: any) => toast({ title: "Submit failed", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/generic/grn/${id}/approve`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/grns"] });
      toast({ title: "GRN approved", description: `Stock updated for ${data.items_stocked ?? 0} item(s).` });
    },
    onError: (e: any) => toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  function addItem() {
    setItems(prev => [...prev, { item_name: "", ordered_qty: 0, received_qty: 0, unit: "Nos", unit_price: 0, batch_number: "", lot_number: "", manufactured_date: "", expiry_date: "" }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  const pendingCount = grns.filter(g => g.status === "submitted").length;

  const { data: expiryAlerts = [] } = useQuery<any[]>({
    queryKey: ["/api/generic/grn-expiry-alerts"],
    queryFn: async () => {
      const r = await fetch("/api/generic/grn-expiry-alerts?days=30", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Goods Receipt Notes</h1>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-new-grn">
          <Plus className="h-4 w-4 mr-1" /> New GRN
        </Button>
      </div>

      {/* Pending approval banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-200">
          <Clock className="h-4 w-4 shrink-0" />
          <span><strong>{pendingCount}</strong> GRN{pendingCount > 1 ? "s" : ""} pending approval. Purchase Manager must approve to update stock.</span>
        </div>
      )}

      {/* Expiry alerts banner */}
      {expiryAlerts.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 text-sm text-red-800 dark:text-red-200 p-3 space-y-2" data-testid="banner-expiry-alerts">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {expiryAlerts.length} item{expiryAlerts.length > 1 ? "s" : ""} expiring within 30 days
          </div>
          <div className="space-y-1">
            {expiryAlerts.slice(0, 5).map((a: any) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-red-700 dark:text-red-300">
                <span className="font-medium">{a.description || `Product #${a.product_id}`}</span>
                {a.batch_number && <span>Batch: {a.batch_number}</span>}
                <span>GRN: {a.grn_number}</span>
                <span className={Number(a.days_to_expiry) <= 7 ? "font-bold" : ""}>
                  {Number(a.days_to_expiry) <= 0
                    ? "Expired"
                    : `${a.days_to_expiry} day${Number(a.days_to_expiry) === 1 ? "" : "s"} left`}
                  {" "}({new Date(a.expiry_date).toLocaleDateString()})
                </span>
              </div>
            ))}
            {expiryAlerts.length > 5 && (
              <p className="text-xs text-red-600 dark:text-red-400">+{expiryAlerts.length - 5} more items…</p>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : grns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No goods receipt notes yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Reference</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grns.map((grn) => (
                  <TableRow key={grn.id} data-testid={`row-grn-${grn.id}`}>
                    <TableCell className="font-mono text-sm font-medium">{grn.grn_number}</TableCell>
                    <TableCell className="text-sm">{grn.vendor_name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{grn.po_id || "—"}</TableCell>
                    <TableCell>{grn.received_date ? new Date(grn.received_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><StatusBadge status={grn.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{grn.remarks || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewing(grn)} data-testid={`button-view-grn-${grn.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(grn.status === "received" || grn.status === "draft") && (
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => submitMut.mutate(grn.id)}
                            disabled={submitMut.isPending}
                            data-testid={`button-submit-grn-${grn.id}`}>
                            <SendHorizontal className="h-3 w-3 mr-1" />Submit
                          </Button>
                        )}
                        {grn.status === "submitted" && (
                          <Button size="sm" variant="default" className="text-xs"
                            onClick={() => approveMut.mutate(grn.id)}
                            disabled={approveMut.isPending}
                            data-testid={`button-approve-grn-${grn.id}`}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View GRN + Attachments Dialog */}
      {viewing && (
        <GRNViewDialog
          viewing={viewing}
          onClose={() => setViewing(null)}
          onSubmit={(id) => { submitMut.mutate(id); setViewing(null); }}
          onApprove={(id) => { approveMut.mutate(id); setViewing(null); }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Goods Receipt Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>PO Reference (optional)</Label>
                <Input data-testid="input-po-id" value={form.po_id} onChange={e => setForm(f => ({ ...f, po_id: e.target.value }))} placeholder="PO number" />
              </div>
              <div className="space-y-1.5">
                <Label>Received Date</Label>
                <Input type="date" data-testid="input-received-date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea data-testid="input-remarks" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Remarks or inspection notes" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items Received</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="rounded-md border p-3 space-y-2" data-testid={`item-row-${idx}`}>
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-4" placeholder="Item name" value={item.item_name} onChange={e => updateItem(idx, "item_name", e.target.value)} data-testid={`input-item-name-${idx}`} />
                    <Input className="col-span-2" type="number" min={0} placeholder="Ord. Qty" value={item.ordered_qty} onChange={e => updateItem(idx, "ordered_qty", Number(e.target.value))} />
                    <Input className="col-span-2" type="number" min={0} placeholder="Rcv. Qty" value={item.received_qty} onChange={e => updateItem(idx, "received_qty", Number(e.target.value))} />
                    <Input className="col-span-1" placeholder="Unit" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} />
                    <Input className="col-span-2" type="number" min={0} placeholder="Price" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", Number(e.target.value))} />
                    <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1} data-testid={`button-remove-item-${idx}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Batch No.</Label>
                      <Input className="h-8 text-xs" placeholder="e.g. B2406" value={item.batch_number} onChange={e => updateItem(idx, "batch_number", e.target.value)} data-testid={`input-batch-${idx}`} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Lot No.</Label>
                      <Input className="h-8 text-xs" placeholder="e.g. L001" value={item.lot_number} onChange={e => updateItem(idx, "lot_number", e.target.value)} data-testid={`input-lot-${idx}`} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Mfg. Date</Label>
                      <Input className="h-8 text-xs" type="date" value={item.manufactured_date} onChange={e => updateItem(idx, "manufactured_date", e.target.value)} data-testid={`input-mfg-date-${idx}`} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                      <Input className="h-8 text-xs" type="date" value={item.expiry_date} onChange={e => updateItem(idx, "expiry_date", e.target.value)} data-testid={`input-expiry-${idx}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-submit-grn">
                {createMutation.isPending ? "Saving..." : "Create GRN"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
