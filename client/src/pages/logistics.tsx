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
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { Plus, Search, Truck, Users, FileText, Fuel, Wrench, Receipt, Pencil, Trash2, Download, Map } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function F({ label, children }: any) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function SC({ title, value, icon: Icon, color }: any) {
  return <Card><CardContent className="p-5 flex items-center gap-4"><div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5"/></div><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}
const TRIP_STATUS: Record<string, string> = { planned: "bg-blue-100 text-blue-700", in_progress: "bg-orange-100 text-orange-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
const LR_STATUS: Record<string, string> = { in_transit: "bg-orange-100 text-orange-700", delivered: "bg-green-100 text-green-700", returned: "bg-red-100 text-red-700" };

function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/logistics/stats"] });
  const { currency_symbol: sym } = useTenantConfig();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <SC title="Active Vehicles" value={stats?.activeVehicles ?? 0} icon={Truck} color="bg-blue-100 text-blue-600" />
      <SC title="Active Drivers" value={stats?.activeDrivers ?? 0} icon={Users} color="bg-green-100 text-green-600" />
      <SC title="Active Trips" value={stats?.activeTrips ?? 0} icon={FileText} color="bg-orange-100 text-orange-600" />
      <SC title="Monthly Freight" value={`${sym}${fmt(stats?.monthlyFreight)}`} icon={Receipt} color="bg-purple-100 text-purple-600" />
    </div>
  );
}

function VehiclesTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicles"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/logistics/vehicles/${editing.id}`, d) : apiRequest("POST", "/api/logistics/vehicles", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/vehicles"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/logistics/vehicles/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/logistics/vehicles"] }) });
  const openNew = () => { setEditing(null); setForm({ status: "active" }); setShowForm(true); };
  const openEdit = (v: any) => { setEditing(v); setForm({ ...v, rc_expiry: v.rc_expiry?.split("T")[0], insurance_expiry: v.insurance_expiry?.split("T")[0], fitness_expiry: v.fitness_expiry?.split("T")[0] }); setShowForm(true); };
  const filtered = (vehicles as any[]).filter(v => v.vehicle_no?.toLowerCase().includes(search.toLowerCase()) || v.vehicle_type?.toLowerCase().includes(search.toLowerCase()));
  const isExpiring = (d: string) => { if (!d) return false; const diff = new Date(d).getTime() - Date.now(); return diff < 30 * 86400000; };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search vehicles..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Vehicle</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Vehicle No","Type","Make/Model","Capacity","Owner","Driver","RC Expiry","Insurance","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(v=>(
          <tr key={v.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium font-mono">{v.vehicle_no}</td><td className="px-3 py-2">{v.vehicle_type||"—"}</td><td className="px-3 py-2">{v.make_model||"—"}</td>
            <td className="px-3 py-2">{v.capacity_tons ? `${v.capacity_tons}T` : "—"}</td><td className="px-3 py-2">{v.owner_name||"—"}</td><td className="px-3 py-2">{v.driver_name||"—"}</td>
            <td className={`px-3 py-2 ${isExpiring(v.rc_expiry)?"text-red-600 font-medium":""}`}>{v.rc_expiry?.split("T")[0]||"—"}</td>
            <td className={`px-3 py-2 ${isExpiring(v.insurance_expiry)?"text-red-600 font-medium":""}`}>{v.insurance_expiry?.split("T")[0]||"—"}</td>
            <td className="px-3 py-2"><Badge className={v.status==="active"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}>{v.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(v)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(v.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No vehicles</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Vehicle</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Vehicle No. *"><Input placeholder="MH01AB1234" value={form.vehicle_no||""} onChange={e=>setForm({...form,vehicle_no:e.target.value})}/></F></div>
            <F label="Vehicle Type"><Select value={form.vehicle_type||""} onValueChange={v=>setForm({...form,vehicle_type:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["Truck","Mini Truck","Tempo","Trailer","Container","Tanker","Bus","Auto"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></F>
            <F label="Make/Model"><Input placeholder="Tata 407" value={form.make_model||""} onChange={e=>setForm({...form,make_model:e.target.value})}/></F>
            <F label="Capacity (tons)"><Input type="number" value={form.capacity_tons||""} onChange={e=>setForm({...form,capacity_tons:e.target.value})}/></F>
            <F label="Owner Name"><Input value={form.owner_name||""} onChange={e=>setForm({...form,owner_name:e.target.value})}/></F>
            <F label="Driver Name"><Input value={form.driver_name||""} onChange={e=>setForm({...form,driver_name:e.target.value})}/></F>
            <F label="Driver Phone"><Input value={form.driver_phone||""} onChange={e=>setForm({...form,driver_phone:e.target.value})}/></F>
            <F label="RC Expiry"><Input type="date" value={form.rc_expiry||""} onChange={e=>setForm({...form,rc_expiry:e.target.value})}/></F>
            <F label="Insurance Expiry"><Input type="date" value={form.insurance_expiry||""} onChange={e=>setForm({...form,insurance_expiry:e.target.value})}/></F>
            <F label="Fitness Expiry"><Input type="date" value={form.fitness_expiry||""} onChange={e=>setForm({...form,fitness_expiry:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"active"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">In Maintenance</SelectItem></SelectContent></Select></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DriversTab() {
  const { toast } = useToast();
  const { currency_symbol: sym } = useTenantConfig();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: drivers = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/drivers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/logistics/drivers/${editing.id}`, d) : apiRequest("POST", "/api/logistics/drivers", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/drivers"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/logistics/drivers/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/logistics/drivers"] }) });
  const openNew = () => { setEditing(null); setForm({ status: "active" }); setShowForm(true); };
  const openEdit = (d: any) => { setEditing(d); setForm({ ...d, date_of_joining: d.date_of_joining?.split("T")[0], license_expiry: d.license_expiry?.split("T")[0] }); setShowForm(true); };
  const filtered = (drivers as any[]).filter(d => d.name?.toLowerCase().includes(search.toLowerCase()) || d.license_number?.includes(search));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search drivers..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Driver</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Name","Phone","License No.","License Expiry","Salary","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(d=>(
          <tr key={d.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{d.driver_code}</td><td className="px-3 py-2 font-medium">{d.name}</td><td className="px-3 py-2">{d.phone||"—"}</td>
            <td className="px-3 py-2">{d.license_number||"—"}</td><td className="px-3 py-2">{d.license_expiry?.split("T")[0]||"—"}</td>
            <td className="px-3 py-2">{sym}{fmt(d.salary)}</td>
            <td className="px-3 py-2"><Badge className={d.status==="active"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}>{d.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(d)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(d.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No drivers</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Driver</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></F>
            <F label="License Number"><Input value={form.license_number||""} onChange={e=>setForm({...form,license_number:e.target.value})}/></F>
            <F label="License Expiry"><Input type="date" value={form.license_expiry||""} onChange={e=>setForm({...form,license_expiry:e.target.value})}/></F>
            <F label="Badge Number"><Input value={form.badge_number||""} onChange={e=>setForm({...form,badge_number:e.target.value})}/></F>
            <F label="Date of Joining"><Input type="date" value={form.date_of_joining||""} onChange={e=>setForm({...form,date_of_joining:e.target.value})}/></F>
            <F label={`Salary (${sym})`}><Input type="number" value={form.salary||""} onChange={e=>setForm({...form,salary:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"active"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></F>
            <div className="col-span-2"><F label="Address"><Textarea rows={2} value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TripsTab() {
  const { toast } = useToast();
  const { currency_symbol: sym } = useTenantConfig();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: trips = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/trips"] });
  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicles"] });
  const { data: drivers = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/drivers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/logistics/trips/${editing.id}`, d) : apiRequest("POST", "/api/logistics/trips", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/trips"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/logistics/trips/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/logistics/trips"] }) });
  const openNew = () => { setEditing(null); setForm({ trip_date: new Date().toISOString().split("T")[0], status: "planned" }); setShowForm(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ ...t, trip_date: t.trip_date?.split("T")[0], return_date: t.return_date?.split("T")[0] }); setShowForm(true); };
  const filtered = (trips as any[]).filter(t => t.vehicle_no?.toLowerCase().includes(search.toLowerCase()) || t.from_location?.toLowerCase().includes(search.toLowerCase()) || t.to_location?.toLowerCase().includes(search.toLowerCase()));
  const onVehicle = (id: string) => { const v = (vehicles as any[]).find(v => String(v.id) === id); setForm({ ...form, vehicle_id: id, driver_name: v?.driver_name || form.driver_name }); };
  const onDriver = (id: string) => { const d = (drivers as any[]).find(d => String(d.id) === id); setForm({ ...form, driver_id: id, driver_name: d?.name || "" }); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search trips..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>New Trip</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Trip No.","Vehicle","Driver","From","To","Date","Freight","Balance","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(t=>(
          <tr key={t.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{t.trip_no}</td><td className="px-3 py-2">{t.vehicle_no||"—"}</td><td className="px-3 py-2">{t.driver_name_ref||t.driver_name||"—"}</td>
            <td className="px-3 py-2">{t.from_location}</td><td className="px-3 py-2">{t.to_location}</td><td className="px-3 py-2">{t.trip_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{sym}{fmt(t.freight_amount)}</td><td className="px-3 py-2">{sym}{fmt(t.balance_amount)}</td>
            <td className="px-3 py-2"><Badge className={TRIP_STATUS[t.status]||"bg-gray-100 text-gray-700"}>{t.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(t)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(t.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No trips</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"New"} Trip</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <F label="Vehicle"><Select value={String(form.vehicle_id||"")} onValueChange={onVehicle}><SelectTrigger><SelectValue placeholder="Select vehicle"/></SelectTrigger><SelectContent>{(vehicles as any[]).map((v:any)=><SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no} — {v.vehicle_type}</SelectItem>)}</SelectContent></Select></F>
            <F label="Driver"><Select value={String(form.driver_id||"")} onValueChange={onDriver}><SelectTrigger><SelectValue placeholder="Select driver"/></SelectTrigger><SelectContent>{(drivers as any[]).map((d:any)=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="From Location *"><Input value={form.from_location||""} onChange={e=>setForm({...form,from_location:e.target.value})}/></F>
            <F label="To Location *"><Input value={form.to_location||""} onChange={e=>setForm({...form,to_location:e.target.value})}/></F>
            <F label="Trip Date"><Input type="date" value={form.trip_date||""} onChange={e=>setForm({...form,trip_date:e.target.value})}/></F>
            <F label="Return Date"><Input type="date" value={form.return_date||""} onChange={e=>setForm({...form,return_date:e.target.value})}/></F>
            <F label="Goods"><Input value={form.goods_description||""} onChange={e=>setForm({...form,goods_description:e.target.value})}/></F>
            <F label="Weight (tons)"><Input type="number" value={form.weight_tons||""} onChange={e=>setForm({...form,weight_tons:e.target.value})}/></F>
            <F label={`Freight Amount (${sym})`}><Input type="number" value={form.freight_amount||""} onChange={e=>setForm({...form,freight_amount:e.target.value})}/></F>
            <F label={`Advance Paid (${sym})`}><Input type="number" value={form.advance_paid||""} onChange={e=>setForm({...form,advance_paid:e.target.value})}/></F>
            <F label={`Expenses (${sym})`}><Input type="number" value={form.expenses||""} onChange={e=>setForm({...form,expenses:e.target.value})}/></F>
            <F label="Distance (km)"><Input type="number" value={form.distance_km||""} onChange={e=>setForm({...form,distance_km:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"planned"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["planned","in_progress","completed","cancelled"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsignmentTab() {
  const { toast } = useToast();
  const { currency_symbol: sym } = useTenantConfig();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: lrs = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/consignment-notes"] });
  const { data: trips = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/trips"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/logistics/consignment-notes/${editing.id}`, d) : apiRequest("POST", "/api/logistics/consignment-notes", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/consignment-notes"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (l: any) => { setEditing(l); setForm({ ...l }); setShowForm(true); };
  const filtered = (lrs as any[]).filter(l => l.lr_no?.includes(search) || l.consignor_name?.toLowerCase().includes(search.toLowerCase()) || l.consignee_name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search LR..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>New LR</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["LR No.","Trip","Consignor","Consignee","Packages","Weight (kg)","Freight","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(l=>(
          <tr key={l.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{l.lr_no}</td><td className="px-3 py-2">{l.trip_no||"—"}</td>
            <td className="px-3 py-2 font-medium">{l.consignor_name}</td><td className="px-3 py-2 font-medium">{l.consignee_name}</td>
            <td className="px-3 py-2">{l.packages}</td><td className="px-3 py-2">{l.weight_kg||"—"}</td>
            <td className="px-3 py-2">{sym}{fmt(l.freight_charges)}</td>
            <td className="px-3 py-2"><Badge className={LR_STATUS[l.status]||"bg-blue-100 text-blue-700"}>{l.status||"in_transit"}</Badge></td>
            <td className="px-3 py-2 flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(l)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" title="Download LR PDF" onClick={()=>window.open(`/api/logistics/consignment-notes/${l.id}/lr-pdf`,"_blank")}><Download className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No LRs</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit LR":"New LR"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Trip (optional)"><Select value={form.trip_id?String(form.trip_id):"__none__"} onValueChange={v=>setForm({...form,trip_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Select trip"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(trips as any[]).map((t:any)=><SelectItem key={t.id} value={String(t.id)}>{t.trip_no} — {t.from_location} to {t.to_location}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Consignor Name *"><Input value={form.consignor_name||""} onChange={e=>setForm({...form,consignor_name:e.target.value})}/></F>
            <F label="Consignor Phone"><Input value={form.consignor_phone||""} onChange={e=>setForm({...form,consignor_phone:e.target.value})}/></F>
            <F label="Consignee Name *"><Input value={form.consignee_name||""} onChange={e=>setForm({...form,consignee_name:e.target.value})}/></F>
            <F label="Consignee Phone"><Input value={form.consignee_phone||""} onChange={e=>setForm({...form,consignee_phone:e.target.value})}/></F>
            <F label="Packages"><Input type="number" value={form.packages||1} onChange={e=>setForm({...form,packages:e.target.value})}/></F>
            <F label="Weight (kg)"><Input type="number" value={form.weight_kg||""} onChange={e=>setForm({...form,weight_kg:e.target.value})}/></F>
            <F label={`Freight Charges (${sym})`}><Input type="number" value={form.freight_charges||""} onChange={e=>setForm({...form,freight_charges:e.target.value})}/></F>
            <F label={`Loading Charges (${sym})`}><Input type="number" value={form.loading_charges||""} onChange={e=>setForm({...form,loading_charges:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"in_transit"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["in_transit","delivered","returned"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Goods Description"><Input value={form.goods_description||""} onChange={e=>setForm({...form,goods_description:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FreightBillsTab() {
  const { toast } = useToast();
  const { currency_symbol: sym } = useTenantConfig();
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: bills = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/freight-bills"] });
  const { data: trips = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/trips"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/logistics/freight-bills/${editing.id}`, d) : apiRequest("POST", "/api/logistics/freight-bills", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/freight-bills"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/logistics/freight-bills/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/logistics/freight-bills"] }) });
  const openNew = () => { setEditing(null); setForm({ bill_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  const openEdit = (b: any) => { setEditing(b); setForm({ ...b, bill_date: b.bill_date?.split("T")[0] }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Create Freight Bill</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Bill No.","Customer","From","To","Date","Freight","Total","Paid","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(bills as any[]).map(b=>(
          <tr key={b.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{b.bill_number}</td><td className="px-3 py-2">{b.customer_name||"—"}</td>
            <td className="px-3 py-2">{b.from_location||"—"}</td><td className="px-3 py-2">{b.to_location||"—"}</td>
            <td className="px-3 py-2">{b.bill_date?.split("T")[0]||"—"}</td><td className="px-3 py-2">{sym}{fmt(b.freight_amount)}</td>
            <td className="px-3 py-2 font-medium">{sym}{fmt(b.total_amount)}</td><td className="px-3 py-2">{sym}{fmt(b.paid_amount)}</td>
            <td className="px-3 py-2"><Badge className={b.status==="paid"?"bg-green-100 text-green-700":b.status==="partial"?"bg-orange-100 text-orange-700":"bg-red-100 text-red-700"}>{b.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(b)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(b.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(bills as any[]).length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No freight bills</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"Create"} Freight Bill</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Trip"><Select value={form.trip_id?String(form.trip_id):"__none__"} onValueChange={v=>setForm({...form,trip_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Link to trip (optional)"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(trips as any[]).map((t:any)=><SelectItem key={t.id} value={String(t.id)}>{t.trip_no} — {t.from_location}→{t.to_location}</SelectItem>)}</SelectContent></Select></F></div>
            <div className="col-span-2"><F label="Customer Name"><Input value={form.customer_name||""} onChange={e=>setForm({...form,customer_name:e.target.value})}/></F></div>
            <F label="From Location"><Input value={form.from_location||""} onChange={e=>setForm({...form,from_location:e.target.value})}/></F>
            <F label="To Location"><Input value={form.to_location||""} onChange={e=>setForm({...form,to_location:e.target.value})}/></F>
            <F label="Bill Date"><Input type="date" value={form.bill_date||""} onChange={e=>setForm({...form,bill_date:e.target.value})}/></F>
            <F label="Weight"><Input type="number" value={form.weight||""} onChange={e=>setForm({...form,weight:e.target.value})}/></F>
            <F label={`Freight Amount (${sym})`}><Input type="number" value={form.freight_amount||""} onChange={e=>setForm({...form,freight_amount:e.target.value})}/></F>
            <F label={`Loading Charges (${sym})`}><Input type="number" value={form.loading_charges||""} onChange={e=>setForm({...form,loading_charges:e.target.value})}/></F>
            <F label={`Unloading Charges (${sym})`}><Input type="number" value={form.unloading_charges||""} onChange={e=>setForm({...form,unloading_charges:e.target.value})}/></F>
            <F label={`Paid Amount (${sym})`}><Input type="number" value={form.paid_amount||""} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FuelTab() {
  const { toast } = useToast();
  const { currency_symbol: sym } = useTenantConfig();
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<any>({});
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/fuel-records"] });
  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicles"] });
  const saveMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/logistics/fuel-records", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/fuel-records"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/logistics/fuel-records/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/logistics/fuel-records"] }) });
  const openNew = () => { setForm({ record_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  const totalCost = (records as any[]).reduce((s, r) => s + Number(r.amount || 0), 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">Total Fuel Cost: <strong className="text-foreground">{sym}{fmt(totalCost)}</strong></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Fuel Record</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Vehicle","Date","Liters","Rate/L","Amount","Odometer","Fuel Station",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(records as any[]).map(r=>(
          <tr key={r.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{r.vehicle_no||"—"}</td><td className="px-3 py-2">{r.record_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{r.liters}L</td><td className="px-3 py-2">{sym}{fmt(r.rate_per_liter)}</td>
            <td className="px-3 py-2 font-medium">{sym}{fmt(r.amount)}</td><td className="px-3 py-2">{r.odometer_reading ? `${r.odometer_reading} km` : "—"}</td>
            <td className="px-3 py-2">{r.fuel_station||"—"}</td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!(records as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No fuel records</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Fuel Record</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Vehicle *"><Select value={String(form.vehicle_id||"")} onValueChange={v=>setForm({...form,vehicle_id:v})}><SelectTrigger><SelectValue placeholder="Select vehicle"/></SelectTrigger><SelectContent>{(vehicles as any[]).map((v:any)=><SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Date"><Input type="date" value={form.record_date||""} onChange={e=>setForm({...form,record_date:e.target.value})}/></F>
            <F label="Liters"><Input type="number" value={form.liters||""} onChange={e=>setForm({...form,liters:e.target.value})}/></F>
            <F label={`Rate/Liter (${sym})`}><Input type="number" value={form.rate_per_liter||""} onChange={e=>setForm({...form,rate_per_liter:e.target.value,amount:((Number(e.target.value)||0)*(Number(form.liters)||0)).toFixed(2)})}/></F>
            <F label={`Amount (${sym})`}><Input type="number" value={form.amount||""} onChange={e=>setForm({...form,amount:e.target.value})}/></F>
            <F label="Odometer (km)"><Input type="number" value={form.odometer_reading||""} onChange={e=>setForm({...form,odometer_reading:e.target.value})}/></F>
            <F label="Fuel Station"><Input value={form.fuel_station||""} onChange={e=>setForm({...form,fuel_station:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaintenanceTab() {
  const { toast } = useToast();
  const { currency_symbol: sym } = useTenantConfig();
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<any>({});
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicle-maintenance"] });
  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicles"] });
  const saveMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/logistics/vehicle-maintenance", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/logistics/vehicle-maintenance"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/logistics/vehicle-maintenance/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/logistics/vehicle-maintenance"] }) });
  const openNew = () => { setForm({ maintenance_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Maintenance Log</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Vehicle","Date","Type","Description","Cost","Vendor","Next Service",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(records as any[]).map(r=>(
          <tr key={r.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{r.vehicle_no||"—"}</td><td className="px-3 py-2">{r.maintenance_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{r.maintenance_type||"—"}</td><td className="px-3 py-2 max-w-[200px] truncate">{r.description||"—"}</td>
            <td className="px-3 py-2 font-medium">{sym}{fmt(r.cost)}</td><td className="px-3 py-2">{r.vendor_name||"—"}</td>
            <td className="px-3 py-2">{r.next_service_date?.split("T")[0]||"—"}</td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!(records as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No maintenance records</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Maintenance Log</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Vehicle *"><Select value={String(form.vehicle_id||"")} onValueChange={v=>setForm({...form,vehicle_id:v})}><SelectTrigger><SelectValue placeholder="Select vehicle"/></SelectTrigger><SelectContent>{(vehicles as any[]).map((v:any)=><SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Date"><Input type="date" value={form.maintenance_date||""} onChange={e=>setForm({...form,maintenance_date:e.target.value})}/></F>
            <F label="Type"><Select value={form.maintenance_type||""} onValueChange={v=>setForm({...form,maintenance_type:v})}><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger><SelectContent>{["Oil Change","Tyre","Brakes","Engine","Electrical","AC","Body Work","Other"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></F>
            <F label={`Cost (${sym})`}><Input type="number" value={form.cost||""} onChange={e=>setForm({...form,cost:e.target.value})}/></F>
            <F label="Vendor Name"><Input value={form.vendor_name||""} onChange={e=>setForm({...form,vendor_name:e.target.value})}/></F>
            <F label="Odometer (km)"><Input type="number" value={form.odometer_reading||""} onChange={e=>setForm({...form,odometer_reading:e.target.value})}/></F>
            <F label="Next Service Date"><Input type="date" value={form.next_service_date||""} onChange={e=>setForm({...form,next_service_date:e.target.value})}/></F>
            <div className="col-span-2"><F label="Description"><Textarea rows={2} value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FleetMapTab() {
  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/logistics/vehicles/live-map"], refetchInterval: 30000 });
  const fmtTime = (t: any) => t ? new Date(t).toLocaleString("en-IN") : "No data";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Map className="h-4 w-4"/><span className="text-sm text-muted-foreground">Live positions (refreshed every 30s). GPS data requires driver app posting positions.</span></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Vehicle No","Type","Driver","Lat","Lon","Speed (km/h)","Engine","Last Update"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {(vehicles as any[]).map((v: any) => (
            <tr key={v.id} className="border-t hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{v.vehicle_no}</td>
              <td className="px-3 py-2">{v.vehicle_type||"—"}</td>
              <td className="px-3 py-2">{v.driver_name||"—"}</td>
              <td className="px-3 py-2 font-mono text-xs">{v.latitude ? Number(v.latitude).toFixed(4) : "—"}</td>
              <td className="px-3 py-2 font-mono text-xs">{v.longitude ? Number(v.longitude).toFixed(4) : "—"}</td>
              <td className="px-3 py-2">{v.speed != null ? Number(v.speed).toFixed(1) : "—"}</td>
              <td className="px-3 py-2"><Badge className={v.engine_status==="on" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{v.engine_status||"unknown"}</Badge></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{fmtTime(v.recorded_at)}</td>
            </tr>
          ))}
          {!(vehicles as any[]).length && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No vehicles found. Add vehicles and have drivers post GPS positions.</td></tr>}
        </tbody>
      </table></div>
      <div className="text-xs text-muted-foreground p-2 border rounded bg-muted/30">
        <strong>Driver App GPS Integration:</strong> Drivers can POST location to <code>/api/logistics/vehicles/:id/location</code> with latitude, longitude, speed, heading, engine_status fields. Set <code>TRACCAR_URL</code> + <code>TRACCAR_TOKEN</code> env vars to use Traccar GPS server.
      </div>
    </div>
  );
}

export default function LogisticsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Logistics Management</h1><p className="text-muted-foreground text-sm mt-1">Vehicles, Drivers, Trips, Freight Bills, Fuel & Maintenance</p></div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles"><Truck className="h-3.5 w-3.5 mr-1"/>Vehicles</TabsTrigger>
          <TabsTrigger value="drivers"><Users className="h-3.5 w-3.5 mr-1"/>Drivers</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="lr"><FileText className="h-3.5 w-3.5 mr-1"/>Consignment (LR)</TabsTrigger>
          <TabsTrigger value="freight"><Receipt className="h-3.5 w-3.5 mr-1"/>Freight Bills</TabsTrigger>
          <TabsTrigger value="fuel"><Fuel className="h-3.5 w-3.5 mr-1"/>Fuel</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-3.5 w-3.5 mr-1"/>Maintenance</TabsTrigger>
          <TabsTrigger value="fleet-map"><Map className="h-3.5 w-3.5 mr-1"/>Fleet Map</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab/></TabsContent>
          <TabsContent value="vehicles"><VehiclesTab/></TabsContent>
          <TabsContent value="drivers"><DriversTab/></TabsContent>
          <TabsContent value="trips"><TripsTab/></TabsContent>
          <TabsContent value="lr"><ConsignmentTab/></TabsContent>
          <TabsContent value="freight"><FreightBillsTab/></TabsContent>
          <TabsContent value="fuel"><FuelTab/></TabsContent>
          <TabsContent value="maintenance"><MaintenanceTab/></TabsContent>
          <TabsContent value="fleet-map"><FleetMapTab/></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
