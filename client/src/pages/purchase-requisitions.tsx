import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingCart, ArrowRight, Trash2, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PR {
  id: number;
  pr_number: string;
  requested_by: string;
  required_date: string;
  status: string;
  notes: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, any> = {
  draft: "secondary",
  submitted: "default",
  approved: "default",
  converted: "outline",
  rejected: "destructive",
};

export default function PurchaseRequisitionsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<PR | null>(null);
  const [form, setForm] = useState({ requested_by: "", required_date: "", notes: "" });
  const [items, setItems] = useState([{ item_name: "", quantity: 1, unit: "Nos", estimated_price: 0 }]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: prs = [], isLoading } = useQuery<PR[]>({
    queryKey: ["/api/generic/purchase-requisitions"],
  });

  const draftPRs = prs.filter(p => p.status === "draft");

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/generic/purchase-requisitions", { ...form, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/purchase-requisitions"] });
      toast({ title: "Purchase Requisition created" });
      setOpen(false);
      setForm({ requested_by: "", required_date: "", notes: "" });
      setItems([{ item_name: "", quantity: 1, unit: "Nos", estimated_price: 0 }]);
    },
    onError: () => toast({ title: "Error creating requisition", variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/generic/purchase-requisitions/${id}/convert-to-po`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/purchase-requisitions"] });
      toast({ title: "Converted to Purchase Order" });
      setViewing(null);
    },
    onError: () => toast({ title: "Conversion failed", variant: "destructive" }),
  });

  const bulkSubmitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/generic/bulk/purchase-requisitions/submit", { ids: Array.from(selected) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/purchase-requisitions"] });
      toast({ title: `${data.updated || selected.size} requisition(s) submitted` });
      setSelected(new Set());
    },
    onError: () => toast({ title: "Bulk submit failed", variant: "destructive" }),
  });

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const draftIds = draftPRs.map(p => p.id);
    if (draftIds.every(id => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(draftIds));
    }
  }

  function addItem() {
    setItems(prev => [...prev, { item_name: "", quantity: 1, unit: "Nos", estimated_price: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  const allDraftSelected = draftPRs.length > 0 && draftPRs.every(p => selected.has(p.id));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Purchase Requisitions</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button variant="outline" onClick={() => bulkSubmitMutation.mutate()} disabled={bulkSubmitMutation.isPending} data-testid="button-bulk-submit">
              <Send className="h-4 w-4 mr-1" />
              Submit {selected.size} Selected
            </Button>
          )}
          <Button onClick={() => setOpen(true)} data-testid="button-new-pr">
            <Plus className="h-4 w-4 mr-1" /> New Requisition
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : prs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No purchase requisitions yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allDraftSelected}
                      onCheckedChange={toggleAll}
                      data-testid="checkbox-select-all"
                      aria-label="Select all draft PRs"
                    />
                  </TableHead>
                  <TableHead>PR Number</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Required Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prs.map((pr) => (
                  <TableRow key={pr.id} data-testid={`row-pr-${pr.id}`}>
                    <TableCell>
                      {pr.status === "draft" && (
                        <Checkbox
                          checked={selected.has(pr.id)}
                          onCheckedChange={() => toggleSelect(pr.id)}
                          data-testid={`checkbox-pr-${pr.id}`}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">{pr.pr_number}</TableCell>
                    <TableCell>{pr.requested_by}</TableCell>
                    <TableCell>{pr.required_date ? new Date(pr.required_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[pr.status] || "secondary"}>{pr.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{pr.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(pr)} data-testid={`button-view-${pr.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Requisition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Requested By</Label>
                <Input data-testid="input-requested-by" value={form.requested_by} onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))} placeholder="Employee name" />
              </div>
              <div className="space-y-1.5">
                <Label>Required Date</Label>
                <Input type="date" data-testid="input-required-date" value={form.required_date} onChange={e => setForm(f => ({ ...f, required_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea data-testid="input-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Justification or additional notes" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center" data-testid={`item-row-${idx}`}>
                  <Input className="col-span-4" placeholder="Item name" value={item.item_name} onChange={e => updateItem(idx, "item_name", e.target.value)} />
                  <Input className="col-span-2" type="number" min={1} placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                  <Input className="col-span-2" placeholder="Unit" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} />
                  <Input className="col-span-3" type="number" min={0} placeholder="Est. price" value={item.estimated_price} onChange={e => updateItem(idx, "estimated_price", Number(e.target.value))} />
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1} data-testid={`button-remove-item-${idx}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.requested_by} data-testid="button-submit-pr">
                {createMutation.isPending ? "Saving..." : "Submit Requisition"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Convert dialog */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewing.pr_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={STATUS_COLORS[viewing.status] || "secondary"}>{viewing.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested By</span>
                <span>{viewing.requested_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required Date</span>
                <span>{viewing.required_date ? new Date(viewing.required_date).toLocaleDateString() : "—"}</span>
              </div>
              {viewing.notes && <div className="text-muted-foreground">{viewing.notes}</div>}
              {(viewing.status === "approved" || viewing.status === "submitted") && (
                <Button className="w-full" onClick={() => convertMutation.mutate(viewing.id)} disabled={convertMutation.isPending} data-testid="button-convert-to-po">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  {convertMutation.isPending ? "Converting..." : "Convert to Purchase Order"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
