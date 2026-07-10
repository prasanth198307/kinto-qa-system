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
import { Plus, Search, Building2, Home, FileText, BarChart3, Users, Receipt, Pencil, Trash2, X, Mail } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function F({ label, children }: any) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function SC({ title, value, icon: Icon, color }: any) {
  return <Card><CardContent className="p-5 flex items-center gap-4"><div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5"/></div><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}

function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/real-estate/stats"] });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <SC title="Total Projects" value={stats?.totalProjects ?? 0} icon={Building2} color="bg-blue-100 text-blue-600" />
      <SC title="Total Units" value={stats?.totalUnits ?? 0} icon={Home} color="bg-green-100 text-green-600" />
      <SC title="Available Units" value={stats?.availableUnits ?? 0} icon={Home} color="bg-teal-100 text-teal-600" />
      <SC title="Active Bookings" value={stats?.activeBookings ?? 0} icon={FileText} color="bg-orange-100 text-orange-600" />
      <SC title="Total Revenue" value={`₹${fmt(stats?.totalRevenue)}`} icon={Receipt} color="bg-purple-100 text-purple-600" />
    </div>
  );
}

function ProjectsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/real-estate/projects/${editing.id}`, d) : apiRequest("POST", "/api/real-estate/projects", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/projects"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/real-estate/projects/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/real-estate/projects"] }) });
  const openNew = () => { setEditing(null); setForm({ project_type: "residential", status: "planning" }); setShowForm(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ ...p, start_date: p.start_date?.split("T")[0], completion_date: p.completion_date?.split("T")[0] }); setShowForm(true); };
  const filtered = (projects as any[]).filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search projects..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Project</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p=>(
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.location}</p><Badge className="mt-1 capitalize">{p.project_type}</Badge></div>
                <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(p)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div><p className="text-muted-foreground text-xs">Total Units</p><p className="font-medium">{p.total_units_count||p.total_units||0}</p></div>
                <div><p className="text-muted-foreground text-xs">Available</p><p className="font-medium text-green-700">{p.available_units||0}</p></div>
                <div><p className="text-muted-foreground text-xs">Booked</p><p className="font-medium text-orange-700">{p.booked_units||0}</p></div>
                <div><p className="text-muted-foreground text-xs">Progress</p><p className="font-medium">{p.latest_progress||0}%</p></div>
              </div>
              <div className="mt-2 bg-muted rounded-full h-1.5"><div className="bg-primary rounded-full h-1.5 transition-all" style={{width:`${Math.min(100,p.latest_progress||0)}%`}}/></div>
              <Badge className={`mt-2 capitalize ${p.status==="completed"?"bg-green-100 text-green-700":p.status==="under_construction"?"bg-orange-100 text-orange-700":"bg-blue-100 text-blue-700"}`}>{p.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {!filtered.length&&<p className="col-span-3 text-center py-8 text-muted-foreground">No projects found</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Project</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Project Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <div className="col-span-2"><F label="Location"><Input value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})}/></F></div>
            <F label="Project Type"><Select value={form.project_type||"residential"} onValueChange={v=>setForm({...form,project_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["residential","commercial","mixed","industrial","plotted"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></F>
            <F label="Status"><Select value={form.status||"planning"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["planning","approved","under_construction","completed","on_hold"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <F label="Total Units"><Input type="number" value={form.total_units||""} onChange={e=>setForm({...form,total_units:e.target.value})}/></F>
            <F label="Total Area (sqft)"><Input type="number" value={form.total_area_sqft||""} onChange={e=>setForm({...form,total_area_sqft:e.target.value})}/></F>
            <F label="Start Date"><Input type="date" value={form.start_date||""} onChange={e=>setForm({...form,start_date:e.target.value})}/></F>
            <F label="Completion Date"><Input type="date" value={form.completion_date||""} onChange={e=>setForm({...form,completion_date:e.target.value})}/></F>
            <div className="col-span-2"><F label="Description"><Textarea rows={2} value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UnitsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [filterProject, setFilterProject] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: units = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/units"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/real-estate/units/${editing.id}`, d) : apiRequest("POST", "/api/real-estate/units", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/units"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/real-estate/units/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/real-estate/units"] }) });
  const openNew = () => { setEditing(null); setForm({ status: "available" }); setShowForm(true); };
  const openEdit = (u: any) => { setEditing(u); setForm({ ...u }); setShowForm(true); };
  const filtered = (units as any[]).filter(u => (!filterProject || String(u.project_id) === filterProject) && (u.unit_no?.toLowerCase().includes(search.toLowerCase()) || u.project_name?.toLowerCase().includes(search.toLowerCase())));
  const STATUS_C: Record<string, string> = { available: "bg-green-100 text-green-700", booked: "bg-orange-100 text-orange-700", sold: "bg-red-100 text-red-700", reserved: "bg-blue-100 text-blue-700" };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterProject||"__none__"} onValueChange={v=>setFilterProject(v==="__none__"?"":v)}><SelectTrigger className="w-44"><SelectValue placeholder="All Projects"/></SelectTrigger><SelectContent><SelectItem value="__none__">All Projects</SelectItem>{(projects as any[]).map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent></Select>
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search units..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Unit</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Unit No.","Project","Type","Floor","Area (sqft)","Base Price","Current Price","Facing","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(u=>(
          <tr key={u.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{u.unit_no}</td><td className="px-3 py-2">{u.project_name||"—"}</td><td className="px-3 py-2">{u.unit_type||"—"}</td>
            <td className="px-3 py-2">{u.floor_no != null ? u.floor_no : "—"}</td><td className="px-3 py-2">{u.area_sqft ? `${u.area_sqft} sqft` : "—"}</td>
            <td className="px-3 py-2">₹{fmt(u.base_price)}</td><td className="px-3 py-2 font-medium">₹{fmt(u.current_price)}</td>
            <td className="px-3 py-2">{u.facing||"—"}</td>
            <td className="px-3 py-2"><Badge className={STATUS_C[u.status]||""}>{u.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(u)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(u.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No units found</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Unit</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Project *"><Select value={String(form.project_id||"")} onValueChange={v=>setForm({...form,project_id:v})}><SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger><SelectContent>{(projects as any[]).map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Unit No. *"><Input placeholder="A101, B202..." value={form.unit_no||""} onChange={e=>setForm({...form,unit_no:e.target.value})}/></F>
            <F label="Unit Type"><Select value={form.unit_type||""} onValueChange={v=>setForm({...form,unit_type:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["1BHK","2BHK","3BHK","4BHK","Studio","Penthouse","Shop","Office","Plot"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></F>
            <F label="Floor No."><Input type="number" value={form.floor_no||""} onChange={e=>setForm({...form,floor_no:e.target.value})}/></F>
            <F label="Area (sqft)"><Input type="number" value={form.area_sqft||""} onChange={e=>setForm({...form,area_sqft:e.target.value})}/></F>
            <F label="Base Price (₹)"><Input type="number" value={form.base_price||""} onChange={e=>setForm({...form,base_price:e.target.value})}/></F>
            <F label="Current Price (₹)"><Input type="number" value={form.current_price||""} onChange={e=>setForm({...form,current_price:e.target.value})}/></F>
            <F label="Facing"><Select value={form.facing||""} onValueChange={v=>setForm({...form,facing:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["North","South","East","West","NE","NW","SE","SW"].map(f=><SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></F>
            <F label="Status"><Select value={form.status||"available"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["available","reserved","booked","sold"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Features"><Input placeholder="Balcony, Parking, Garden..." value={form.features||""} onChange={e=>setForm({...form,features:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({}); const [showPayments, setShowPayments] = useState<any>(null); const [payForm, setPayForm] = useState<any>({}); const [partialId, setPartialId] = useState<any>(null); const [partialAmt, setPartialAmt] = useState("");
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/bookings"] });
  const { data: units = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/units"] });
  const { data: brokers = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/brokers"] });
  const { data: schedules = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/payment-schedules", showPayments?.id], enabled: !!showPayments, queryFn: () => fetch(`/api/real-estate/payment-schedules/${showPayments.id}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/real-estate/bookings/${editing.id}`, d) : apiRequest("POST", "/api/real-estate/bookings", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/bookings"] }); queryClient.invalidateQueries({ queryKey: ["/api/real-estate/units"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const addSchedule = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/real-estate/payment-schedules", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/payment-schedules", showPayments?.id] }); toast({ title: "Schedule added" }); setPayForm({}); } });
  const updateSchedule = useMutation({ mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/real-estate/payment-schedules/${id}`, d), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/real-estate/payment-schedules", showPayments?.id] }) });
  const openNew = () => { setEditing(null); setForm({ booking_date: new Date().toISOString().split("T")[0], status: "booked" }); setShowForm(true); };
  const openEdit = (b: any) => { setEditing(b); setForm({ ...b, booking_date: b.booking_date?.split("T")[0], agreement_date: b.agreement_date?.split("T")[0], possession_date: b.possession_date?.split("T")[0] }); setShowForm(true); };
  const filtered = (bookings as any[]).filter(b => b.customer_name?.toLowerCase().includes(search.toLowerCase()) || b.booking_no?.includes(search));
  const availableUnits = (units as any[]).filter(u => u.status === "available" || (editing && String(u.id) === String(editing.unit_id)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search bookings..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>New Booking</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Booking No.","Customer","Unit","Project","Date","Total","Booking Amt","Broker","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(b=>(
          <tr key={b.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{b.booking_no}</td><td className="px-3 py-2 font-medium">{b.customer_name}</td>
            <td className="px-3 py-2">{b.unit_no||"—"}</td><td className="px-3 py-2">{b.project_name||"—"}</td>
            <td className="px-3 py-2">{b.booking_date?.split("T")[0]}</td>
            <td className="px-3 py-2">₹{fmt(b.total_amount)}</td><td className="px-3 py-2">₹{fmt(b.booking_amount)}</td>
            <td className="px-3 py-2">{b.broker_name||"—"}</td>
            <td className="px-3 py-2"><Badge className={b.status==="booked"?"bg-orange-100 text-orange-700":b.status==="sold"?"bg-red-100 text-red-700":"bg-gray-100 text-gray-700"}>{b.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>{setShowPayments(b);setPayForm({booking_id:b.id});}}>Payments</Button><Button size="icon" variant="ghost" onClick={()=>openEdit(b)}><Pencil className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No bookings</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit Booking":"New Booking"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Unit *"><Select value={String(form.unit_id||"")} onValueChange={v=>setForm({...form,unit_id:v})}><SelectTrigger><SelectValue placeholder="Select unit"/></SelectTrigger><SelectContent>{availableUnits.map((u:any)=><SelectItem key={u.id} value={String(u.id)}>{u.unit_no} — {u.project_name} — ₹{fmt(u.current_price)}</SelectItem>)}</SelectContent></Select></F></div>
            <div className="col-span-2"><F label="Customer Name *"><Input value={form.customer_name||""} onChange={e=>setForm({...form,customer_name:e.target.value})}/></F></div>
            <F label="Customer Phone"><Input value={form.customer_phone||""} onChange={e=>setForm({...form,customer_phone:e.target.value})}/></F>
            <F label="Customer Email"><Input value={form.customer_email||""} onChange={e=>setForm({...form,customer_email:e.target.value})}/></F>
            <F label="Booking Date"><Input type="date" value={form.booking_date||""} onChange={e=>setForm({...form,booking_date:e.target.value})}/></F>
            <F label="Total Amount (₹)"><Input type="number" value={form.total_amount||""} onChange={e=>setForm({...form,total_amount:e.target.value})}/></F>
            <F label="Booking Amount (₹)"><Input type="number" value={form.booking_amount||""} onChange={e=>setForm({...form,booking_amount:e.target.value})}/></F>
            <F label="Loan Amount (₹)"><Input type="number" value={form.loan_amount||""} onChange={e=>setForm({...form,loan_amount:e.target.value})}/></F>
            <F label="Bank Name"><Input value={form.bank_name||""} onChange={e=>setForm({...form,bank_name:e.target.value})}/></F>
            <F label="Broker"><Select value={form.broker_id?String(form.broker_id):"__none__"} onValueChange={v=>setForm({...form,broker_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{(brokers as any[]).map((b:any)=><SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Broker Commission (₹)"><Input type="number" value={form.broker_commission||""} onChange={e=>setForm({...form,broker_commission:e.target.value})}/></F>
            <F label="Agreement Date"><Input type="date" value={form.agreement_date||""} onChange={e=>setForm({...form,agreement_date:e.target.value})}/></F>
            <F label="Possession Date"><Input type="date" value={form.possession_date||""} onChange={e=>setForm({...form,possession_date:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"booked"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["booked","sold","cancelled"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!showPayments} onOpenChange={()=>setShowPayments(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Payment Schedule — {showPayments?.customer_name} · {showPayments?.unit_no}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Total: ₹{fmt(showPayments?.total_amount)} | Booking: ₹{fmt(showPayments?.booking_amount)}</p>
          <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Milestone","Due Date","Amount","Paid","Status",""].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>{(schedules as any[]).map(s=>(
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2 font-medium">{s.milestone}</td><td className="px-3 py-2">{s.due_date?.split("T")[0]||"—"}</td>
                <td className="px-3 py-2">₹{fmt(s.amount)}</td><td className="px-3 py-2">₹{fmt(s.paid_amount)}</td>
                <td className="px-3 py-2"><Badge className={s.status==="paid"?"bg-green-100 text-green-700":s.status==="partial"?"bg-orange-100 text-orange-700":"bg-gray-100 text-gray-700"}>{s.status||"pending"}</Badge></td>
                <td className="px-3 py-2">
                  {s.status!=="paid"&&(
                    partialId===s.id ? (
                      <div className="flex items-center gap-1">
                        <Input className="h-7 w-24 text-xs" type="number" placeholder={String(s.amount)} value={partialAmt} onChange={e=>setPartialAmt(e.target.value)}/>
                        <Button size="sm" onClick={()=>{const amt=Number(partialAmt)||Number(s.amount);const st=amt>=Number(s.amount)?"paid":"partial";updateSchedule.mutate({id:s.id,...s,paid_amount:amt,status:st,paid_date:new Date().toISOString().split("T")[0]});setPartialId(null);setPartialAmt("");}}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={()=>{setPartialId(null);setPartialAmt("");}}>✕</Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={()=>updateSchedule.mutate({id:s.id,...s,paid_amount:s.amount,status:"paid",paid_date:new Date().toISOString().split("T")[0]})}>Mark Paid</Button>
                        <Button size="sm" variant="ghost" onClick={()=>{setPartialId(s.id);setPartialAmt(String(s.paid_amount||""));}}>Partial</Button>
                      </div>
                    )
                  )}
                </td>
              </tr>
            ))}{!(schedules as any[]).length&&<tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No schedule entries</td></tr>}</tbody>
          </table></div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <F label="Milestone"><Input value={payForm.milestone||""} onChange={e=>setPayForm({...payForm,milestone:e.target.value})}/></F>
            <F label="Amount (₹)"><Input type="number" value={payForm.amount||""} onChange={e=>setPayForm({...payForm,amount:e.target.value})}/></F>
            <F label="Due Date"><Input type="date" value={payForm.due_date||""} onChange={e=>setPayForm({...payForm,due_date:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-1"><Button size="sm" onClick={()=>addSchedule.mutate({...payForm,booking_id:showPayments?.id})} disabled={addSchedule.isPending}><Plus className="h-3 w-3 mr-1"/>Add Milestone</Button><Button variant="outline" onClick={()=>setShowPayments(null)}>Close</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrokersTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: brokers = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/brokers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/real-estate/brokers/${editing.id}`, d) : apiRequest("POST", "/api/real-estate/brokers", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/brokers"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/real-estate/brokers/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/real-estate/brokers"] }) });
  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (b: any) => { setEditing(b); setForm({ ...b }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Broker</Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(brokers as any[]).map(b=>(
          <Card key={b.id}><CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div><p className="font-semibold">{b.name}</p><p className="text-sm text-muted-foreground">{b.firm_name||""}</p><p className="text-sm">{b.phone}</p>{b.rera_number&&<p className="text-xs text-muted-foreground">RERA: {b.rera_number}</p>}</div>
              <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(b)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(b.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div>
            </div>
            <p className="text-sm mt-2 font-medium">Commission: {b.commission_pct}%</p>
          </CardContent></Card>
        ))}
        {!(brokers as any[]).length&&<p className="col-span-3 text-center py-8 text-muted-foreground">No brokers</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Broker</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Firm Name"><Input value={form.firm_name||""} onChange={e=>setForm({...form,firm_name:e.target.value})}/></F>
            <F label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></F>
            <F label="Email"><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></F>
            <F label="Commission %"><Input type="number" value={form.commission_pct||""} onChange={e=>setForm({...form,commission_pct:e.target.value})}/></F>
            <div className="col-span-2"><F label="RERA Number"><Input value={form.rera_number||""} onChange={e=>setForm({...form,rera_number:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DemandLettersTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: letters = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/demand-letters"] });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/bookings"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/real-estate/demand-letters/${editing.id}`, d) : apiRequest("POST", "/api/real-estate/demand-letters", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/demand-letters"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/real-estate/demand-letters/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/real-estate/demand-letters"] }) });
  const markPaid = useMutation({ mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/real-estate/demand-letters/${id}`, d), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/real-estate/demand-letters"] }) });
  const openNew = () => { setEditing(null); setForm({ demand_date: new Date().toISOString().split("T")[0], status: "pending" }); setShowForm(true); };
  const openEdit = (l: any) => { setEditing(l); setForm({ ...l, demand_date: l.demand_date?.split("T")[0], due_date: l.due_date?.split("T")[0] }); setShowForm(true); };
  const onBooking = (id: string) => { const realId = id === "__none__" ? "" : id; const b = (bookings as any[]).find(b => String(b.id) === realId); setForm((f: any) => ({ ...f, booking_id: realId, customer_name: b?.customer_name || f.customer_name, unit_number: b?.unit_no || f.unit_number })); };
  const STATUS_C: Record<string, string> = { pending: "bg-orange-100 text-orange-700", paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700", partial: "bg-blue-100 text-blue-700" };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>New Demand Letter</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Demand No.","Customer","Unit","Milestone","Demand Date","Due Date","Amount","Paid","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(letters as any[]).map(l=>(
          <tr key={l.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{l.demand_number}</td><td className="px-3 py-2 font-medium">{l.customer_name||"—"}</td>
            <td className="px-3 py-2">{l.unit_number||"—"}</td><td className="px-3 py-2">{l.milestone||"—"}</td>
            <td className="px-3 py-2">{l.demand_date?.split("T")[0]}</td><td className="px-3 py-2">{l.due_date?.split("T")[0]||"—"}</td>
            <td className="px-3 py-2 font-medium">₹{fmt(l.amount)}</td><td className="px-3 py-2">₹{fmt(l.paid_amount)}</td>
            <td className="px-3 py-2"><Badge className={STATUS_C[l.status]||"bg-gray-100 text-gray-700"}>{l.status||"pending"}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1">
              {l.status!=="paid"&&<Button size="sm" variant="outline" onClick={()=>markPaid.mutate({id:l.id,...l,paid_amount:l.amount,status:"paid"})}>Mark Paid</Button>}
              <Button size="icon" variant="ghost" onClick={()=>openEdit(l)}><Pencil className="h-3.5 w-3.5"/></Button>
              <Button size="icon" variant="ghost" onClick={()=>delMut.mutate(l.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
            </div></td>
          </tr>
        ))}{!(letters as any[]).length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No demand letters</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"New"} Demand Letter</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Booking (optional)"><Select value={form.booking_id?String(form.booking_id):"__none__"} onValueChange={onBooking}><SelectTrigger><SelectValue placeholder="Select booking"/></SelectTrigger><SelectContent><SelectItem value="__none__">None / Manual</SelectItem>{(bookings as any[]).map((b:any)=><SelectItem key={b.id} value={String(b.id)}>{b.booking_no} — {b.customer_name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Customer Name *"><Input value={form.customer_name||""} onChange={e=>setForm({...form,customer_name:e.target.value})}/></F>
            <F label="Unit Number"><Input value={form.unit_number||""} onChange={e=>setForm({...form,unit_number:e.target.value})}/></F>
            <F label="Milestone / Description"><Input value={form.milestone||""} onChange={e=>setForm({...form,milestone:e.target.value})}/></F>
            <F label="Amount (₹) *"><Input type="number" value={form.amount||""} onChange={e=>setForm({...form,amount:e.target.value})}/></F>
            <F label="Demand Date"><Input type="date" value={form.demand_date||""} onChange={e=>setForm({...form,demand_date:e.target.value})}/></F>
            <F label="Due Date"><Input type="date" value={form.due_date||""} onChange={e=>setForm({...form,due_date:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"pending"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["pending","partial","paid","overdue"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <F label="Paid Amount (₹)"><Input type="number" value={form.paid_amount||""} onChange={e=>setForm({...form,paid_amount:e.target.value})}/></F>
            <div className="col-span-2"><F label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgressTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<any>({});
  const { data: progress = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/construction-progress"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"] });
  const saveMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/real-estate/construction-progress", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/construction-progress"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/real-estate/construction-progress/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/real-estate/construction-progress"] }) });
  const openNew = () => { setForm({ progress_date: new Date().toISOString().split("T")[0], percentage_complete: 0 }); setShowForm(true); };
  const onProject = (id: string) => { const p = (projects as any[]).find(p => String(p.id) === id); setForm({ ...form, project_id: id, project_name: p?.name || "" }); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Log Progress</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Project","Date","Stage","Completion","Description",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(progress as any[]).map(p=>(
          <tr key={p.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{p.project_name||"—"}</td><td className="px-3 py-2">{p.progress_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{p.stage}</td>
            <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="flex-1 bg-muted rounded-full h-1.5"><div className="bg-primary rounded-full h-1.5" style={{width:`${p.percentage_complete}%`}}/></div><span className="text-xs w-8">{p.percentage_complete}%</span></div></td>
            <td className="px-3 py-2 max-w-[200px] truncate">{p.description||"—"}</td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!(progress as any[]).length&&<tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No progress logs</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Log Construction Progress</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Project"><Select value={String(form.project_id||"")} onValueChange={onProject}><SelectTrigger><SelectValue placeholder="Select project"/></SelectTrigger><SelectContent>{(projects as any[]).map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Date"><Input type="date" value={form.progress_date||""} onChange={e=>setForm({...form,progress_date:e.target.value})}/></F>
            <F label="Stage"><Select value={form.stage||""} onValueChange={v=>setForm({...form,stage:v})}><SelectTrigger><SelectValue placeholder="Select stage"/></SelectTrigger><SelectContent>{["Foundation","Plinth","Superstructure","Slab","Brickwork","Plaster","Flooring","Finishing","Handover"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Completion %"><Input type="range" min={0} max={100} value={form.percentage_complete||0} onChange={e=>setForm({...form,percentage_complete:Number(e.target.value)})}/><p className="text-sm text-center">{form.percentage_complete||0}%</p></F></div>
            <div className="col-span-2"><F label="Description"><Textarea rows={2} value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RealEstatePage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Real Estate Management</h1><p className="text-muted-foreground text-sm mt-1">Projects, Units, Bookings, Payment Schedules, Brokers & Construction Progress</p></div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects"><Building2 className="h-3.5 w-3.5 mr-1"/>Projects</TabsTrigger>
          <TabsTrigger value="units"><Home className="h-3.5 w-3.5 mr-1"/>Units</TabsTrigger>
          <TabsTrigger value="bookings"><FileText className="h-3.5 w-3.5 mr-1"/>Bookings</TabsTrigger>
          <TabsTrigger value="brokers"><Users className="h-3.5 w-3.5 mr-1"/>Brokers</TabsTrigger>
          <TabsTrigger value="demand-letters"><Mail className="h-3.5 w-3.5 mr-1"/>Demand Letters</TabsTrigger>
          <TabsTrigger value="progress"><BarChart3 className="h-3.5 w-3.5 mr-1"/>Construction Progress</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab/></TabsContent>
          <TabsContent value="projects"><ProjectsTab/></TabsContent>
          <TabsContent value="units"><UnitsTab/></TabsContent>
          <TabsContent value="bookings"><BookingsTab/></TabsContent>
          <TabsContent value="brokers"><BrokersTab/></TabsContent>
          <TabsContent value="demand-letters"><DemandLettersTab/></TabsContent>
          <TabsContent value="progress"><ProgressTab/></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
