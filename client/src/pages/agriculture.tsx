import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Leaf, BarChart3, ShoppingBag, Tractor, X, IndianRupee } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  sown: "bg-yellow-100 text-yellow-700", growing: "bg-green-100 text-green-700",
  harvested: "bg-blue-100 text-blue-700", failed: "bg-red-100 text-red-700",
  received: "bg-green-100 text-green-700", processed: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
};

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}

// ── Farms Tab ─────────────────────────────────────────────────────────────────
function FarmsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: farms = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farms"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/agriculture/farms/${editing.id}`, data) : apiRequest("POST", "/api/agriculture/farms", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/farms"] }); setShowForm(false); setEditing(null); toast({ title: "Farm saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agriculture/farms/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/farms"] }); toast({ title: "Farm removed" }); },
  });

  const openForm = (f?: any) => { setEditing(f || null); setForm(f || {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-farm"><Plus className="h-4 w-4 mr-1" />Add Farm</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {farms.map(f => (
          <Card key={f.id} data-testid={`card-farm-${f.id}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-sm text-muted-foreground">{f.location || "No location"}</p>
                  <p className="text-sm mt-1">{f.area_acres ? `${f.area_acres} acres` : "—"} · {f.owner_name || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.soil_type && `Soil: ${f.soil_type}`} {f.water_source && `· Water: ${f.water_source}`}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openForm(f)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(f.id)}><X className="h-3 w-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {farms.length === 0 && <div className="col-span-3 text-center py-8 text-muted-foreground">No farms registered</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Farm" : "Add Farm"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Farm Name *</Label><Input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="col-span-2"><Label>Location</Label><Input value={form.location || ""} onChange={e => setForm({...form, location: e.target.value})} placeholder="Village, District" /></div>
              <div><Label>Area (Acres)</Label><Input type="number" value={form.area_acres || ""} onChange={e => setForm({...form, area_acres: e.target.value})} /></div>
              <div><Label>Owner Name</Label><Input value={form.owner_name || ""} onChange={e => setForm({...form, owner_name: e.target.value})} /></div>
              <div><Label>Contact Phone</Label><Input value={form.contact_phone || ""} onChange={e => setForm({...form, contact_phone: e.target.value})} /></div>
              <div><Label>Soil Type</Label><Input value={form.soil_type || ""} onChange={e => setForm({...form, soil_type: e.target.value})} placeholder="Black, Red, Sandy..." /></div>
              <div className="col-span-2"><Label>Water Source</Label><Input value={form.water_source || ""} onChange={e => setForm({...form, water_source: e.target.value})} placeholder="Borewell, Canal, Rain-fed..." /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} data-testid="button-save-farm">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Crop Cycles Tab ───────────────────────────────────────────────────────────
function CropCyclesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: cycles = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/crop-cycles"] });
  const { data: farms = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farms"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/agriculture/crop-cycles/${editing.id}`, data) : apiRequest("POST", "/api/agriculture/crop-cycles", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/crop-cycles"] }); setShowForm(false); setEditing(null); toast({ title: "Crop cycle saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const openForm = (c?: any) => { setEditing(c || null); setForm(c ? {...c} : { status: "sown" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-crop-cycle"><Plus className="h-4 w-4 mr-1" />New Crop Cycle</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Crop</th><th className="text-left p-3">Farm</th><th className="text-left p-3">Season</th><th className="text-left p-3">Sowing</th><th className="text-left p-3">Harvest</th><th className="text-right p-3">Area (ac)</th><th className="text-right p-3">Yield (t)</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {cycles.map(c => {
                const totalCost = Number(c.fertilizer_cost || 0) + Number(c.labor_cost || 0) + Number(c.other_cost || 0);
                const revenue = Number(c.yield_qty_tons || 0) * Number(c.selling_price_per_ton || 0);
                return (
                  <tr key={c.id} className="border-b hover-elevate" data-testid={`row-cycle-${c.id}`}>
                    <td className="p-3 font-medium">{c.crop_name}{c.variety && <span className="text-muted-foreground ml-1 text-xs">({c.variety})</span>}</td>
                    <td className="p-3 text-muted-foreground">{c.farm_name || "—"}</td>
                    <td className="p-3">{c.season || "—"}</td>
                    <td className="p-3">{c.sowing_date || "—"}</td>
                    <td className="p-3">{c.actual_harvest_date || c.expected_harvest_date || "—"}</td>
                    <td className="p-3 text-right">{c.area_acres || "—"}</td>
                    <td className="p-3 text-right">{c.yield_qty_tons || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[c.status] || "bg-gray-100"}`}>{c.status}</span></td>
                    <td className="p-3"><Button size="sm" variant="outline" onClick={() => openForm(c)}>Edit</Button></td>
                  </tr>
                );
              })}
              {cycles.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No crop cycles yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Crop Cycle" : "New Crop Cycle"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Farm</Label>
                <Select value={form.farm_id || ""} onValueChange={v => setForm({...form, farm_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select farm" /></SelectTrigger>
                  <SelectContent>{farms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Crop Name *</Label><Input value={form.crop_name || ""} onChange={e => setForm({...form, crop_name: e.target.value})} placeholder="Wheat, Rice, Cotton..." /></div>
              <div><Label>Variety</Label><Input value={form.variety || ""} onChange={e => setForm({...form, variety: e.target.value})} /></div>
              <div><Label>Season</Label><Input value={form.season || ""} onChange={e => setForm({...form, season: e.target.value})} placeholder="Kharif, Rabi..." /></div>
              <div><Label>Sowing Date</Label><Input type="date" value={form.sowing_date || ""} onChange={e => setForm({...form, sowing_date: e.target.value})} /></div>
              <div><Label>Expected Harvest</Label><Input type="date" value={form.expected_harvest_date || ""} onChange={e => setForm({...form, expected_harvest_date: e.target.value})} /></div>
              {editing && <><div><Label>Actual Harvest</Label><Input type="date" value={form.actual_harvest_date || ""} onChange={e => setForm({...form, actual_harvest_date: e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={form.status || "sown"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sown">Sown</SelectItem><SelectItem value="growing">Growing</SelectItem><SelectItem value="harvested">Harvested</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
                </Select>
              </div></>}
              <div><Label>Area (Acres)</Label><Input type="number" value={form.area_acres || ""} onChange={e => setForm({...form, area_acres: e.target.value})} /></div>
              <div><Label>Seed Qty (kg)</Label><Input type="number" value={form.seed_qty_kg || ""} onChange={e => setForm({...form, seed_qty_kg: e.target.value})} /></div>
              <div><Label>Fertilizer Cost (₹)</Label><Input type="number" value={form.fertilizer_cost || ""} onChange={e => setForm({...form, fertilizer_cost: e.target.value})} /></div>
              <div><Label>Labour Cost (₹)</Label><Input type="number" value={form.labor_cost || ""} onChange={e => setForm({...form, labor_cost: e.target.value})} /></div>
              <div><Label>Other Cost (₹)</Label><Input type="number" value={form.other_cost || ""} onChange={e => setForm({...form, other_cost: e.target.value})} /></div>
              {editing && <><div><Label>Yield (Tons)</Label><Input type="number" value={form.yield_qty_tons || ""} onChange={e => setForm({...form, yield_qty_tons: e.target.value})} /></div>
              <div><Label>Selling Price/Ton (₹)</Label><Input type="number" value={form.selling_price_per_ton || ""} onChange={e => setForm({...form, selling_price_per_ton: e.target.value})} /></div></>}
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.crop_name} data-testid="button-save-crop-cycle">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Commodity Prices Tab ──────────────────────────────────────────────────────
function CommodityPricesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: prices = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/commodity-prices"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agriculture/commodity-prices", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/commodity-prices"] }); setShowForm(false); toast({ title: "Price added" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agriculture/commodity-prices/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/commodity-prices"] }); toast({ title: "Price removed" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ price_date: new Date().toISOString().split("T")[0] }); setShowForm(true); }} data-testid="button-add-price"><Plus className="h-4 w-4 mr-1" />Add Price</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Commodity</th><th className="text-left p-3">Market</th><th className="text-right p-3">Price/Quintal (₹)</th><th className="text-right p-3">Min</th><th className="text-right p-3">Max</th><th className="text-left p-3">Date</th><th className="p-3"></th></tr></thead>
            <tbody>
              {prices.map(p => (
                <tr key={p.id} className="border-b hover-elevate" data-testid={`row-price-${p.id}`}>
                  <td className="p-3 font-medium">{p.commodity_name}{p.variety && <span className="text-muted-foreground ml-1 text-xs">({p.variety})</span>}</td>
                  <td className="p-3">{p.market_name || "—"}</td>
                  <td className="p-3 text-right font-semibold">₹{Number(p.price_per_quintal).toLocaleString()}</td>
                  <td className="p-3 text-right text-muted-foreground">{p.min_price ? `₹${Number(p.min_price).toLocaleString()}` : "—"}</td>
                  <td className="p-3 text-right text-muted-foreground">{p.max_price ? `₹${Number(p.max_price).toLocaleString()}` : "—"}</td>
                  <td className="p-3">{p.price_date}</td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}><X className="h-3 w-3" /></Button></td>
                </tr>
              ))}
              {prices.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No commodity prices recorded</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Commodity Price</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Commodity *</Label><Input value={form.commodity_name || ""} onChange={e => setForm({...form, commodity_name: e.target.value})} placeholder="Wheat, Rice..." /></div>
              <div><Label>Variety</Label><Input value={form.variety || ""} onChange={e => setForm({...form, variety: e.target.value})} /></div>
              <div><Label>Market Name</Label><Input value={form.market_name || ""} onChange={e => setForm({...form, market_name: e.target.value})} placeholder="APMC Pune..." /></div>
              <div><Label>Date *</Label><Input type="date" value={form.price_date || ""} onChange={e => setForm({...form, price_date: e.target.value})} /></div>
              <div><Label>Price/Quintal (₹) *</Label><Input type="number" value={form.price_per_quintal || ""} onChange={e => setForm({...form, price_per_quintal: e.target.value})} data-testid="input-commodity-price" /></div>
              <div><Label>Min Price</Label><Input type="number" value={form.min_price || ""} onChange={e => setForm({...form, min_price: e.target.value})} /></div>
              <div><Label>Max Price</Label><Input type="number" value={form.max_price || ""} onChange={e => setForm({...form, max_price: e.target.value})} /></div>
              <div><Label>Source</Label><Input value={form.source || ""} onChange={e => setForm({...form, source: e.target.value})} placeholder="Agmarknet, APMC..." /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.commodity_name || !form.price_per_quintal} data-testid="button-save-price">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Procurement Tab ───────────────────────────────────────────────────────────
function ProcurementTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: procurement = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/procurement"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/agriculture/procurement/${editing.id}`, data) : apiRequest("POST", "/api/agriculture/procurement", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/procurement"] }); setShowForm(false); setEditing(null); toast({ title: "Procurement saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const openForm = (p?: any) => { setEditing(p || null); setForm(p ? {...p} : { status: "received", procurement_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-procurement"><Plus className="h-4 w-4 mr-1" />New Procurement</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">No.</th><th className="text-left p-3">Farmer</th><th className="text-left p-3">Commodity</th><th className="text-right p-3">Qty (t)</th><th className="text-right p-3">Rate/t (₹)</th><th className="text-right p-3">Total (₹)</th><th className="text-left p-3">Date</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {procurement.map(p => (
                <tr key={p.id} className="border-b hover-elevate" data-testid={`row-procurement-${p.id}`}>
                  <td className="p-3 font-mono text-xs">{p.procurement_no}</td>
                  <td className="p-3 font-medium">{p.farmer_name}</td>
                  <td className="p-3">{p.commodity}{p.variety && ` (${p.variety})`}</td>
                  <td className="p-3 text-right">{p.quantity_tons}</td>
                  <td className="p-3 text-right">₹{Number(p.rate_per_ton).toLocaleString()}</td>
                  <td className="p-3 text-right font-semibold">₹{Number(p.total_amount || 0).toLocaleString()}</td>
                  <td className="p-3">{p.procurement_date}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[p.status] || "bg-gray-100"}`}>{p.status}</span></td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => openForm(p)}>Edit</Button></td>
                </tr>
              ))}
              {procurement.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No procurement records</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Procurement" : "New Procurement"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Farmer Name *</Label><Input value={form.farmer_name || ""} onChange={e => setForm({...form, farmer_name: e.target.value})} /></div>
              <div><Label>Farmer Phone</Label><Input value={form.farmer_phone || ""} onChange={e => setForm({...form, farmer_phone: e.target.value})} /></div>
              <div><Label>Commodity *</Label><Input value={form.commodity || ""} onChange={e => setForm({...form, commodity: e.target.value})} placeholder="Wheat, Cotton..." /></div>
              <div><Label>Variety</Label><Input value={form.variety || ""} onChange={e => setForm({...form, variety: e.target.value})} /></div>
              <div><Label>Date *</Label><Input type="date" value={form.procurement_date || ""} onChange={e => setForm({...form, procurement_date: e.target.value})} /></div>
              <div><Label>Quality Grade</Label><Input value={form.quality_grade || ""} onChange={e => setForm({...form, quality_grade: e.target.value})} placeholder="A, B, C..." /></div>
              <div><Label>Quantity (Tons) *</Label><Input type="number" value={form.quantity_tons || ""} onChange={e => setForm({...form, quantity_tons: e.target.value})} /></div>
              <div><Label>Rate/Ton (₹) *</Label><Input type="number" value={form.rate_per_ton || ""} onChange={e => setForm({...form, rate_per_ton: e.target.value})} /></div>
              <div><Label>Moisture %</Label><Input type="number" value={form.moisture_pct || ""} onChange={e => setForm({...form, moisture_pct: e.target.value})} /></div>
              {editing && <div><Label>Status</Label>
                <Select value={form.status || "received"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="received">Received</SelectItem><SelectItem value="processed">Processed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>}
              {form.quantity_tons && form.rate_per_ton && (
                <div className="col-span-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Total Amount: ₹{(Number(form.quantity_tons) * Number(form.rate_per_ton)).toLocaleString()}</p>
                </div>
              )}
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.farmer_name || !form.commodity || !form.quantity_tons} data-testid="button-save-procurement">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgriculturePage() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/agriculture/stats"] });
  const { data: farms = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farms"] });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agriculture & Agri-processing</h1>
        <p className="text-muted-foreground mt-1">Manage farms, crop cycles, commodity prices, and procurement</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Farms" value={stats?.totalFarms ?? farms.length} icon={Tractor} color="bg-green-100 text-green-600" />
        <StatCard title="Active Crop Cycles" value={stats?.activeCycles ?? 0} icon={Leaf} color="bg-lime-100 text-lime-600" />
        <StatCard title="Monthly Procurement" value={`₹${Number(stats?.monthlyProcurement || 0).toLocaleString()}`} icon={IndianRupee} color="bg-orange-100 text-orange-600" />
      </div>

      <Tabs defaultValue="crops">
        <TabsList className="flex-wrap">
          <TabsTrigger value="crops" data-testid="tab-crops">Crop Cycles</TabsTrigger>
          <TabsTrigger value="farms" data-testid="tab-farms">Farms</TabsTrigger>
          <TabsTrigger value="procurement" data-testid="tab-procurement">Procurement</TabsTrigger>
          <TabsTrigger value="prices" data-testid="tab-commodity-prices">Commodity Prices</TabsTrigger>
        </TabsList>
        <TabsContent value="crops" className="mt-4"><CropCyclesTab /></TabsContent>
        <TabsContent value="farms" className="mt-4"><FarmsTab /></TabsContent>
        <TabsContent value="procurement" className="mt-4"><ProcurementTab /></TabsContent>
        <TabsContent value="prices" className="mt-4"><CommodityPricesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
