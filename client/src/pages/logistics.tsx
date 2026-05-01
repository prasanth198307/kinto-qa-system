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
import { Plus, Search, Truck, Route, FileText, X, IndianRupee } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700", in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
  in_transit: "bg-orange-100 text-orange-700", delivered: "bg-green-100 text-green-700",
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

function VehiclesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicles"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/logistics/vehicles/${editing.id}`, data) : apiRequest("POST", "/api/logistics/vehicles", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/vehicles"] }); setShowForm(false); setEditing(null); toast({ title: "Vehicle saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/logistics/vehicles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/vehicles"] }); toast({ title: "Vehicle removed" }); },
  });

  const openForm = (v?: any) => { setEditing(v || null); setForm(v || {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-vehicle"><Plus className="h-4 w-4 mr-1" />Add Vehicle</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Vehicle No.</th><th className="text-left p-3">Type</th><th className="text-left p-3">Model</th><th className="text-left p-3">Driver</th><th className="text-left p-3">Capacity</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b hover-elevate" data-testid={`row-vehicle-${v.id}`}>
                  <td className="p-3 font-semibold">{v.vehicle_no}</td>
                  <td className="p-3">{v.vehicle_type || "-"}</td>
                  <td className="p-3 text-muted-foreground">{v.make_model || "-"}</td>
                  <td className="p-3">{v.driver_name || "-"}</td>
                  <td className="p-3">{v.capacity_tons ? `${v.capacity_tons} tons` : "-"}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[v.status] || "bg-gray-100"}`}>{v.status}</span></td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openForm(v)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(v.id)}><X className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No vehicles registered</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Vehicle Number *</Label><Input value={form.vehicle_no || ""} onChange={e => setForm({...form, vehicle_no: e.target.value})} placeholder="MH 01 AB 1234" /></div>
              <div><Label>Vehicle Type</Label><Input value={form.vehicle_type || ""} onChange={e => setForm({...form, vehicle_type: e.target.value})} placeholder="Truck, Tempo, etc." /></div>
              <div><Label>Make / Model</Label><Input value={form.make_model || ""} onChange={e => setForm({...form, make_model: e.target.value})} placeholder="Tata 407" /></div>
              <div><Label>Capacity (Tons)</Label><Input type="number" value={form.capacity_tons || ""} onChange={e => setForm({...form, capacity_tons: e.target.value})} /></div>
              <div><Label>Owner Name</Label><Input value={form.owner_name || ""} onChange={e => setForm({...form, owner_name: e.target.value})} /></div>
              <div><Label>Driver Name</Label><Input value={form.driver_name || ""} onChange={e => setForm({...form, driver_name: e.target.value})} /></div>
              <div><Label>Driver Phone</Label><Input value={form.driver_phone || ""} onChange={e => setForm({...form, driver_phone: e.target.value})} /></div>
              <div><Label>RC Expiry</Label><Input type="date" value={form.rc_expiry || ""} onChange={e => setForm({...form, rc_expiry: e.target.value})} /></div>
              <div><Label>Insurance Expiry</Label><Input type="date" value={form.insurance_expiry || ""} onChange={e => setForm({...form, insurance_expiry: e.target.value})} /></div>
              <div><Label>Fitness Expiry</Label><Input type="date" value={form.fitness_expiry || ""} onChange={e => setForm({...form, fitness_expiry: e.target.value})} /></div>
              {editing && <div><Label>Status</Label>
                <Select value={form.status || "active"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.vehicle_no} data-testid="button-save-vehicle">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TripsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: trips = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/trips"] });
  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicles"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/logistics/trips/${editing.id}`, data) : apiRequest("POST", "/api/logistics/trips", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/trips"] }); setShowForm(false); setEditing(null); toast({ title: "Trip saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/logistics/trips/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/trips"] }); toast({ title: "Trip deleted" }); },
  });

  const openForm = (t?: any) => { setEditing(t || null); setForm(t ? {...t} : { status: "planned", trip_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-trip"><Plus className="h-4 w-4 mr-1" />New Trip</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Trip No.</th><th className="text-left p-3">Vehicle</th><th className="text-left p-3">Route</th><th className="text-left p-3">Date</th><th className="text-right p-3">Freight (₹)</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id} className="border-b hover-elevate" data-testid={`row-trip-${t.id}`}>
                  <td className="p-3 font-mono text-xs">{t.trip_no}</td>
                  <td className="p-3">{t.vehicle_no || "-"}</td>
                  <td className="p-3">{t.from_location} → {t.to_location}</td>
                  <td className="p-3">{t.trip_date}</td>
                  <td className="p-3 text-right font-semibold">₹{Number(t.freight_amount || 0).toLocaleString()}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[t.status] || "bg-gray-100"}`}>{t.status}</span></td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openForm(t)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}><X className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No trips yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Trip" : "New Trip"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Vehicle</Label>
                <Select value={form.vehicle_id || ""} onValueChange={v => setForm({...form, vehicle_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicle_no} ({v.vehicle_type || "Vehicle"})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Driver Name</Label><Input value={form.driver_name || ""} onChange={e => setForm({...form, driver_name: e.target.value})} /></div>
              <div><Label>Trip Date *</Label><Input type="date" value={form.trip_date || ""} onChange={e => setForm({...form, trip_date: e.target.value})} /></div>
              <div><Label>From Location *</Label><Input value={form.from_location || ""} onChange={e => setForm({...form, from_location: e.target.value})} /></div>
              <div><Label>To Location *</Label><Input value={form.to_location || ""} onChange={e => setForm({...form, to_location: e.target.value})} /></div>
              <div><Label>Weight (Tons)</Label><Input type="number" value={form.weight_tons || ""} onChange={e => setForm({...form, weight_tons: e.target.value})} /></div>
              <div><Label>Freight Amount (₹)</Label><Input type="number" value={form.freight_amount || ""} onChange={e => setForm({...form, freight_amount: e.target.value})} /></div>
              <div><Label>Advance Paid (₹)</Label><Input type="number" value={form.advance_paid || ""} onChange={e => setForm({...form, advance_paid: e.target.value})} /></div>
              <div><Label>Trip Expenses (₹)</Label><Input type="number" value={form.expenses || ""} onChange={e => setForm({...form, expenses: e.target.value})} /></div>
              <div><Label>Return Date</Label><Input type="date" value={form.return_date || ""} onChange={e => setForm({...form, return_date: e.target.value})} /></div>
              {editing && <div><Label>Status</Label>
                <Select value={form.status || "planned"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>}
              <div className="col-span-2"><Label>Goods Description</Label><Textarea value={form.goods_description || ""} onChange={e => setForm({...form, goods_description: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.from_location || !form.to_location || !form.trip_date} data-testid="button-save-trip">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsignmentTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: notes = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/consignment-notes"] });
  const { data: trips = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/trips"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/logistics/consignment-notes", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/consignment-notes"] }); setShowForm(false); toast({ title: "LR created" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({}); setShowForm(true); }} data-testid="button-create-lr"><Plus className="h-4 w-4 mr-1" />Create LR</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">LR No.</th><th className="text-left p-3">Consignor</th><th className="text-left p-3">Consignee</th><th className="text-left p-3">Route</th><th className="text-right p-3">Freight (₹)</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {notes.map(n => (
                <tr key={n.id} className="border-b" data-testid={`row-lr-${n.id}`}>
                  <td className="p-3 font-mono text-xs">{n.lr_no}</td>
                  <td className="p-3">{n.consignor_name}</td>
                  <td className="p-3">{n.consignee_name}</td>
                  <td className="p-3 text-muted-foreground">{n.from_location && `${n.from_location} → ${n.to_location}`}</td>
                  <td className="p-3 text-right">₹{Number(n.freight_charges || 0).toLocaleString()}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[n.status] || "bg-gray-100"}`}>{n.status}</span></td>
                </tr>
              ))}
              {notes.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No consignment notes yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Consignment Note (LR)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Link to Trip</Label>
                <Select value={form.trip_id || ""} onValueChange={v => setForm({...form, trip_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select trip (optional)" /></SelectTrigger>
                  <SelectContent>{trips.map(t => <SelectItem key={t.id} value={t.id}>{t.trip_no} – {t.from_location} → {t.to_location}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Consignor Name *</Label><Input value={form.consignor_name || ""} onChange={e => setForm({...form, consignor_name: e.target.value})} /></div>
              <div><Label>Consignor Phone</Label><Input value={form.consignor_phone || ""} onChange={e => setForm({...form, consignor_phone: e.target.value})} /></div>
              <div><Label>Consignee Name *</Label><Input value={form.consignee_name || ""} onChange={e => setForm({...form, consignee_name: e.target.value})} /></div>
              <div><Label>Consignee Phone</Label><Input value={form.consignee_phone || ""} onChange={e => setForm({...form, consignee_phone: e.target.value})} /></div>
              <div><Label>Packages</Label><Input type="number" value={form.packages || "1"} onChange={e => setForm({...form, packages: e.target.value})} /></div>
              <div><Label>Weight (kg)</Label><Input type="number" value={form.weight_kg || ""} onChange={e => setForm({...form, weight_kg: e.target.value})} /></div>
              <div><Label>Freight Charges (₹)</Label><Input type="number" value={form.freight_charges || ""} onChange={e => setForm({...form, freight_charges: e.target.value})} /></div>
              <div><Label>Loading Charges (₹)</Label><Input type="number" value={form.loading_charges || ""} onChange={e => setForm({...form, loading_charges: e.target.value})} /></div>
              <div><Label>Expected Delivery</Label><Input type="date" value={form.delivery_date || ""} onChange={e => setForm({...form, delivery_date: e.target.value})} /></div>
              <div className="col-span-2"><Label>Goods Description</Label><Textarea value={form.goods_description || ""} onChange={e => setForm({...form, goods_description: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.consignor_name || !form.consignee_name} data-testid="button-save-lr">{saveMutation.isPending ? "Saving..." : "Create LR"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LogisticsPage() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/logistics/stats"] });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logistics & Transport</h1>
        <p className="text-muted-foreground mt-1">Manage vehicles, trips, freight billing, and consignment notes</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Active Vehicles" value={stats?.activeVehicles ?? 0} icon={Truck} color="bg-blue-100 text-blue-600" />
        <StatCard title="Active Trips" value={stats?.activeTrips ?? 0} icon={Route} color="bg-orange-100 text-orange-600" />
        <StatCard title="Monthly Freight" value={`₹${Number(stats?.monthlyFreight || 0).toLocaleString()}`} icon={IndianRupee} color="bg-green-100 text-green-600" />
      </div>

      <Tabs defaultValue="trips">
        <TabsList className="flex-wrap">
          <TabsTrigger value="trips" data-testid="tab-trips">Trips</TabsTrigger>
          <TabsTrigger value="vehicles" data-testid="tab-vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="lr" data-testid="tab-lr">Consignment Notes (LR)</TabsTrigger>
        </TabsList>
        <TabsContent value="trips" className="mt-4"><TripsTab /></TabsContent>
        <TabsContent value="vehicles" className="mt-4"><VehiclesTab /></TabsContent>
        <TabsContent value="lr" className="mt-4"><ConsignmentTab /></TabsContent>
      </Tabs>
    </div>
  );
}
