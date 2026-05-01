import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Trash2, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InlineAttachments } from "@/components/inline-attachments";
import { CustomFieldsSection } from "@/components/custom-fields-section";

interface GRN {
  id: number;
  grn_number: string;
  po_id: string | null;
  vendor_id: string | null;
  received_date: string;
  status: string;
  remarks: string;
  created_at: string;
}

const STATUS_BADGE: Record<string, any> = {
  draft: "secondary",
  received: "default",
  inspected: "default",
  accepted: "default",
  rejected: "destructive",
};

export default function GoodsReceiptNotesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<GRN | null>(null);
  const [form, setForm] = useState({ po_id: "", vendor_id: "", received_date: new Date().toISOString().split("T")[0], remarks: "" });
  const [items, setItems] = useState([{ item_name: "", ordered_qty: 0, received_qty: 0, unit: "Nos", unit_price: 0 }]);

  const { data: grns = [], isLoading } = useQuery<GRN[]>({
    queryKey: ["/api/generic/grns"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/generic/grns", { ...form, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/grns"] });
      toast({ title: "GRN created" });
      setOpen(false);
      setForm({ po_id: "", vendor_id: "", received_date: new Date().toISOString().split("T")[0], remarks: "" });
      setItems([{ item_name: "", ordered_qty: 0, received_qty: 0, unit: "Nos", unit_price: 0 }]);
    },
    onError: () => toast({ title: "Error creating GRN", variant: "destructive" }),
  });

  function addItem() {
    setItems(prev => [...prev, { item_name: "", ordered_qty: 0, received_qty: 0, unit: "Nos", unit_price: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

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
                    <TableCell className="font-mono text-sm">{grn.po_id || "—"}</TableCell>
                    <TableCell>{grn.received_date ? new Date(grn.received_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[grn.status] || "secondary"}>{grn.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{grn.remarks || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setViewing(grn)} data-testid={`button-view-grn-${grn.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewing.grn_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={STATUS_BADGE[viewing.status] || "secondary"} className="mt-1">{viewing.status}</Badge>
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
                {viewing.remarks && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Remarks</p>
                    <p>{viewing.remarks}</p>
                  </div>
                )}
              </div>
              <InlineAttachments entityType="grn" entityId={viewing.id} label="GRN Attachments" />
              <CustomFieldsSection entityType="grn" entityId={viewing.id} />
            </div>
          </DialogContent>
        </Dialog>
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
              <div className="text-xs text-muted-foreground grid grid-cols-12 gap-2 px-1">
                <span className="col-span-3">Item Name</span>
                <span className="col-span-2">Ordered Qty</span>
                <span className="col-span-2">Received Qty</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-2">Unit Price</span>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center" data-testid={`item-row-${idx}`}>
                  <Input className="col-span-3" placeholder="Item name" value={item.item_name} onChange={e => updateItem(idx, "item_name", e.target.value)} />
                  <Input className="col-span-2" type="number" min={0} placeholder="0" value={item.ordered_qty} onChange={e => updateItem(idx, "ordered_qty", Number(e.target.value))} />
                  <Input className="col-span-2" type="number" min={0} placeholder="0" value={item.received_qty} onChange={e => updateItem(idx, "received_qty", Number(e.target.value))} />
                  <Input className="col-span-2" placeholder="Nos" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} />
                  <Input className="col-span-2" type="number" min={0} placeholder="0" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", Number(e.target.value))} />
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1} data-testid={`button-remove-item-${idx}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
