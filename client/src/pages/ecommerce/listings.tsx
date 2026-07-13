import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, Edit2, Trash2, Package } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

type Listing = {
  id: number; channel_name: string; sku: string; product_name: string;
  category: string; mrp: number; selling_price: number; stock_qty: number;
  listing_url: string; is_active: boolean; channel_id?: number;
};
type Channel = { id: number; channel_name: string };

const emptyForm = { channel_id: "", sku: "", product_name: "", category: "", mrp: "", selling_price: "", stock_qty: "", listing_url: "", is_active: true };

export default function ListingsPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Listing | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [stockModal, setStockModal] = useState<Listing | null>(null);
  const [newQty, setNewQty] = useState("");

  const { data: listings = [], isLoading } = useQuery<Listing[]>({ queryKey: ["/api/ecommerce/listings"], queryFn: () => apiRequest("GET", "/api/ecommerce/listings").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: channels = [] } = useQuery<Channel[]>({ queryKey: ["/api/ecommerce/channels"], queryFn: () => apiRequest("GET", "/api/ecommerce/channels").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => editItem
      ? apiRequest("PUT", `/api/ecommerce/listings/${editItem.id}`, data).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); })
      : apiRequest("POST", "/api/ecommerce/listings", data).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/listings"] }); setModalOpen(false); toast({ title: editItem ? "Listing updated" : "Listing created" }); },
    onError: () => toast({ title: "Error saving listing", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ecommerce/listings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/listings"] }); toast({ title: "Listing deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (l: Listing) => apiRequest("PUT", `/api/ecommerce/listings/${l.id}`, { is_active: !l.is_active }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ecommerce/listings"] }),
    onError: () => toast({ title: "Toggle failed", variant: "destructive" }),
  });

  const syncAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ecommerce/inventory/sync-push").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => toast({ title: "Stock synced to all marketplaces" }),
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });

  const stockSyncMutation = useMutation({
    mutationFn: (l: Listing) => apiRequest("POST", "/api/ecommerce/inventory-sync", { channel_id: l.channel_id, listing_id: l.id, sku: l.sku, qty_before: l.stock_qty, qty_after: Number(newQty), sync_type: "manual" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/listings"] }); setStockModal(null); setNewQty(""); toast({ title: "Stock updated" }); },
    onError: () => toast({ title: "Stock update failed", variant: "destructive" }),
  });

  function openAdd() { setEditItem(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(l: Listing) { setEditItem(l); setForm({ channel_id: String(l.channel_id ?? ""), sku: l.sku, product_name: l.product_name, category: l.category, mrp: String(l.mrp), selling_price: String(l.selling_price), stock_qty: String(l.stock_qty), listing_url: l.listing_url, is_active: l.is_active }); setModalOpen(true); }
  function handleSave() { saveMutation.mutate({ ...form, mrp: Number(form.mrp), selling_price: Number(form.selling_price), stock_qty: Number(form.stock_qty), channel_id: Number(form.channel_id) }); }
  function f(field: string, val: string | boolean) { setForm(p => ({ ...p, [field]: val })); }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Product Listings</h1>
          <p style={{ color: "#6b7280", marginTop: "4px", fontSize: "14px" }}>Manage listings across all marketplaces</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="outline" onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending}>
            <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} /> Sync All to Marketplaces
          </Button>
          <Button onClick={openAdd}><Plus style={{ width: 14, height: 14, marginRight: 6 }} /> Add Listing</Button>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead><TableHead>Product Name</TableHead><TableHead>Channel</TableHead>
              <TableHead>Category</TableHead><TableHead>MRP</TableHead><TableHead>Price</TableHead>
              <TableHead>Discount %</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Loading...</TableCell></TableRow>
            ) : listings.length === 0 ? (
              <TableRow><TableCell colSpan={10} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>No listings found</TableCell></TableRow>
            ) : listings.map(l => {
              const disc = l.mrp > 0 ? ((l.mrp - l.selling_price) / l.mrp * 100).toFixed(1) : "0.0";
              return (
                <TableRow key={l.id}>
                  <TableCell style={{ fontFamily: "monospace", fontSize: "13px" }}>{l.sku}</TableCell>
                  <TableCell style={{ fontWeight: 500 }}>{l.product_name}</TableCell>
                  <TableCell><Badge variant="outline">{l.channel_name}</Badge></TableCell>
                  <TableCell>{l.category}</TableCell>
                  <TableCell>{sym}{l.mrp.toLocaleString()}</TableCell>
                  <TableCell>{sym}{l.selling_price.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary">{disc}% off</Badge></TableCell>
                  <TableCell>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: l.stock_qty < 10 ? "#dc2626" : "#111827", fontWeight: 500 }}>{l.stock_qty}</span>
                      {l.stock_qty < 10 && <Badge variant="destructive" style={{ fontSize: "10px", padding: "1px 5px" }}>Low</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleMutation.mutate(l)} style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 500, cursor: "pointer", border: "none", background: l.is_active ? "#d1fae5" : "#fee2e2", color: l.is_active ? "#065f46" : "#991b1b" }}>
                      {l.is_active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button size="sm" variant="ghost" onClick={() => { setStockModal(l); setNewQty(String(l.stock_qty)); }}><Package style={{ width: 13, height: 13 }} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(l)}><Edit2 style={{ width: 13, height: 13 }} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(l.id)}><Trash2 style={{ width: 13, height: 13, color: "#dc2626" }} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent style={{ maxWidth: 540 }}>
          <DialogHeader><DialogTitle>{editItem ? "Edit Listing" : "Add Listing"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", padding: "4px 0" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <Label>Channel</Label>
              <Select value={form.channel_id} onValueChange={v => f("channel_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>{channels.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.channel_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {([["sku", "SKU"], ["product_name", "Product Name"], ["category", "Category"], ["listing_url", "Listing URL"]] as [string, string][]).map(([key, lbl]) => (
              <div key={key} style={key === "listing_url" || key === "product_name" ? { gridColumn: "1/-1" } : {}}>
                <Label>{lbl}</Label><Input value={String(form[key as keyof typeof form])} onChange={e => f(key, e.target.value)} />
              </div>
            ))}
            <div><Label>MRP (${sym})</Label><Input type="number" value={form.mrp} onChange={e => f("mrp", e.target.value)} /></div>
            <div><Label>Selling Price (${sym})</Label><Input type="number" value={form.selling_price} onChange={e => f("selling_price", e.target.value)} /></div>
            <div><Label>Stock Qty</Label><Input type="number" value={form.stock_qty} onChange={e => f("stock_qty", e.target.value)} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
              <input type="checkbox" id="is_active" checked={!!form.is_active} onChange={e => f("is_active", e.target.checked)} />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjust Modal */}
      <Dialog open={!!stockModal} onOpenChange={o => { if (!o) { setStockModal(null); setNewQty(""); } }}>
        <DialogContent style={{ maxWidth: 360 }}>
          <DialogHeader><DialogTitle>Adjust Stock — {stockModal?.sku}</DialogTitle></DialogHeader>
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: 12 }}>Current quantity: <strong>{stockModal?.stock_qty}</strong></p>
            <Label>New Quantity</Label>
            <Input type="number" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="Enter new qty" style={{ marginTop: 6 }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStockModal(null); setNewQty(""); }}>Cancel</Button>
            <Button onClick={() => stockModal && stockSyncMutation.mutate(stockModal)} disabled={stockSyncMutation.isPending || !newQty}>
              {stockSyncMutation.isPending ? "Updating..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
