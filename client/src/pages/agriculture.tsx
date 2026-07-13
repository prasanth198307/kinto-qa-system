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
import { Plus, Search, Leaf, MapPin, ShoppingBag, TrendingUp, Users, FlaskConical, Pencil, Trash2, Receipt } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function F({ label, children }: any) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function SC({ title, value, icon: Icon, color }: any) {
  return <Card><CardContent className="p-5 flex items-center gap-4"><div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5"/></div><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}
const CROP_STATUS: Record<string, string> = { sown: "bg-blue-100 text-blue-700", growing: "bg-green-100 text-green-700", harvested: "bg-orange-100 text-orange-700", failed: "bg-red-100 text-red-700" };

function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/agriculture/stats"] });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <SC title="Total Farms" value={stats?.totalFarms ?? 0} icon={MapPin} color="bg-green-100 text-green-600" />
      <SC title="Total Farmers" value={stats?.totalFarmers ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
      <SC title="Active Crops" value={stats?.activeCycles ?? 0} icon={Leaf} color="bg-teal-100 text-teal-600" />
      <SC title="Monthly Procurement" value={`${sym}${fmt(stats?.monthlyProcurement)}`} icon={ShoppingBag} color="bg-orange-100 text-orange-600" />
      <SC title="Monthly Harvest" value={`${sym}${fmt(stats?.monthlyHarvestValue)}`} icon={TrendingUp} color="bg-purple-100 text-purple-600" />
    </div>
  );
}

function FarmsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { data: farms = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farms"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/agriculture/farms/${editing.id}`, d) : apiRequest("POST", "/api/agriculture/farms", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/farms"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/agriculture/farms/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agriculture/farms"] }) });
  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (f: any) => { setEditing(f); setForm({ ...f }); setShowForm(true); };
  const filtered = (farms as any[]).filter(f => f.name?.toLowerCase().includes(search.toLowerCase()) || f.location?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search farms..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Farm</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(f=>(
          <Card key={f.id}><CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div><p className="font-semibold">{f.name}</p><p className="text-sm text-muted-foreground">{f.location||"—"}</p><p className="text-xs text-muted-foreground font-mono">{f.farm_code}</p></div>
              <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(f)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(f.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {f.area_acres&&<div><p className="text-xs text-muted-foreground">Area</p><p>{f.area_acres} acres</p></div>}
              {f.soil_type&&<div><p className="text-xs text-muted-foreground">Soil</p><p>{f.soil_type}</p></div>}
              {f.water_source&&<div><p className="text-xs text-muted-foreground">Water</p><p>{f.water_source}</p></div>}
              {f.owner_name&&<div><p className="text-xs text-muted-foreground">Owner</p><p>{f.owner_name}</p></div>}
            </div>
          </CardContent></Card>
        ))}
        {!filtered.length&&<p className="col-span-3 text-center py-8 text-muted-foreground">No farms found</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Farm</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Farm Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <div className="col-span-2"><F label="Location"><Input value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})}/></F></div>
            <F label="Area (acres)"><Input type="number" value={form.area_acres||""} onChange={e=>setForm({...form,area_acres:e.target.value})}/></F>
            <F label="Owner Name"><Input value={form.owner_name||""} onChange={e=>setForm({...form,owner_name:e.target.value})}/></F>
            <F label="Contact Phone"><Input value={form.contact_phone||""} onChange={e=>setForm({...form,contact_phone:e.target.value})}/></F>
            <F label="Soil Type"><Select value={form.soil_type||""} onValueChange={v=>setForm({...form,soil_type:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["Alluvial","Black","Red","Laterite","Desert","Mountain","Clay","Sandy","Loam"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></F>
            <F label="Water Source"><Select value={form.water_source||""} onValueChange={v=>setForm({...form,water_source:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["Rain-fed","Canal","Borewell","River","Pond","Tank","Drip Irrigation"].map(w=><SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FarmersTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: farmers = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farmers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/agriculture/farmers/${editing.id}`, d) : apiRequest("POST", "/api/agriculture/farmers", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/farmers"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/agriculture/farmers/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agriculture/farmers"] }) });
  const openNew = () => { setEditing(null); setForm({ land_area_unit: "acre" }); setShowForm(true); };
  const openEdit = (f: any) => { setEditing(f); setForm({ ...f }); setShowForm(true); };
  const filtered = (farmers as any[]).filter(f => f.name?.toLowerCase().includes(search.toLowerCase()) || f.phone?.includes(search) || f.village?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search farmers..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Farmer</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Name","Phone","Village","District","Land Area","Bank",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(f=>(
          <tr key={f.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{f.farmer_code}</td><td className="px-3 py-2 font-medium">{f.name}</td>
            <td className="px-3 py-2">{f.phone||"—"}</td><td className="px-3 py-2">{f.village||"—"}</td><td className="px-3 py-2">{f.district||"—"}</td>
            <td className="px-3 py-2">{f.land_area ? `${f.land_area} ${f.land_area_unit}` : "—"}</td>
            <td className="px-3 py-2">{f.bank_name||"—"}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(f)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(f.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No farmers found</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Farmer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></F>
            <F label="Village"><Input value={form.village||""} onChange={e=>setForm({...form,village:e.target.value})}/></F>
            <F label="Taluka"><Input value={form.taluka||""} onChange={e=>setForm({...form,taluka:e.target.value})}/></F>
            <F label="District"><Input value={form.district||""} onChange={e=>setForm({...form,district:e.target.value})}/></F>
            <F label="State"><Input value={form.state||""} onChange={e=>setForm({...form,state:e.target.value})}/></F>
            <F label="Land Area"><Input type="number" value={form.land_area||""} onChange={e=>setForm({...form,land_area:e.target.value})}/></F>
            <F label="Area Unit"><Select value={form.land_area_unit||"acre"} onValueChange={v=>setForm({...form,land_area_unit:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["acre","hectare","bigha","gunta"].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></F>
            <F label="Bank Name"><Input value={form.bank_name||""} onChange={e=>setForm({...form,bank_name:e.target.value})}/></F>
            <F label="Bank Account"><Input value={form.bank_account||""} onChange={e=>setForm({...form,bank_account:e.target.value})}/></F>
            <F label="IFSC Code"><Input value={form.ifsc_code||""} onChange={e=>setForm({...form,ifsc_code:e.target.value})}/></F>
            <F label="Aadhar Number"><Input value={form.aadhar_number||""} onChange={e=>setForm({...form,aadhar_number:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CropCyclesTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({}); const [showInputs, setShowInputs] = useState<any>(null); const [inputForm, setInputForm] = useState<any>({});
  const { data: cycles = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/crop-cycles"] });
  const { data: farms = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farms"] });
  const { data: farmers = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farmers"] });
  const { data: inputs = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/crop-inputs", showInputs?.id], enabled: !!showInputs, queryFn: () => fetch(`/api/agriculture/crop-inputs?crop_cycle_id=${showInputs.id}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/agriculture/crop-cycles/${editing.id}`, d) : apiRequest("POST", "/api/agriculture/crop-cycles", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/crop-cycles"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const addInput = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/agriculture/crop-inputs", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/crop-inputs", showInputs?.id] }); toast({ title: "Input added" }); setInputForm({}); } });
  const delInput = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/agriculture/crop-inputs/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agriculture/crop-inputs", showInputs?.id] }) });
  const openNew = () => { setEditing(null); setForm({ status: "sown", area_unit: "acre" }); setShowForm(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ ...c, sowing_date: c.sowing_date?.split("T")[0], expected_harvest_date: c.expected_harvest_date?.split("T")[0], actual_harvest_date: c.actual_harvest_date?.split("T")[0] }); setShowForm(true); };
  const filtered = (cycles as any[]).filter(c => c.crop_name?.toLowerCase().includes(search.toLowerCase()) || c.farm_name?.toLowerCase().includes(search.toLowerCase()) || c.farmer_name?.toLowerCase().includes(search.toLowerCase()));
  const totalCost = (c: any) => (Number(c.fertilizer_cost||0)+Number(c.labor_cost||0)+Number(c.other_cost||0));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search crop cycles..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Crop Cycle</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Crop","Variety","Farm","Farmer","Season","Sowing","Harvest","Area","Cost","Yield","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(c=>(
          <tr key={c.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{c.crop_name}</td><td className="px-3 py-2">{c.variety||"—"}</td>
            <td className="px-3 py-2">{c.farm_name||"—"}</td><td className="px-3 py-2">{c.farmer_name||"—"}</td><td className="px-3 py-2">{c.season||"—"}</td>
            <td className="px-3 py-2">{c.sowing_date?.split("T")[0]||"—"}</td><td className="px-3 py-2">{c.expected_harvest_date?.split("T")[0]||"—"}</td>
            <td className="px-3 py-2">{c.area_acres||c.area ? `${c.area_acres||c.area} ${c.area_unit||"ac"}` : "—"}</td>
            <td className="px-3 py-2">{sym}{fmt(totalCost(c))}</td>
            <td className="px-3 py-2">{c.yield_qty_tons||c.actual_yield ? `${c.yield_qty_tons||c.actual_yield}T` : "—"}</td>
            <td className="px-3 py-2"><Badge className={CROP_STATUS[c.status]||"bg-gray-100 text-gray-700"}>{c.status}</Badge></td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>{setShowInputs(c);setInputForm({crop_cycle_id:c.id,application_date:new Date().toISOString().split("T")[0]});}}>Inputs</Button><Button size="icon" variant="ghost" onClick={()=>openEdit(c)}><Pencil className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={12} className="px-3 py-6 text-center text-muted-foreground">No crop cycles</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Crop Cycle</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Crop Name *"><Input value={form.crop_name||""} onChange={e=>setForm({...form,crop_name:e.target.value})}/></F></div>
            <F label="Variety"><Input value={form.variety||""} onChange={e=>setForm({...form,variety:e.target.value})}/></F>
            <F label="Season"><Select value={form.season||""} onValueChange={v=>setForm({...form,season:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["Kharif","Rabi","Zaid","Perennial"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <F label="Farm"><Select value={String(form.farm_id||"")} onValueChange={v=>setForm({...form,farm_id:v})}><SelectTrigger><SelectValue placeholder="Select farm"/></SelectTrigger><SelectContent>{(farms as any[]).map((f:any)=><SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Farmer"><Select value={String(form.farmer_id||"")} onValueChange={v=>setForm({...form,farmer_id:v})}><SelectTrigger><SelectValue placeholder="Select farmer"/></SelectTrigger><SelectContent>{(farmers as any[]).map((f:any)=><SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}</SelectContent></Select></F>
            <F label="Area"><Input type="number" value={form.area||form.area_acres||""} onChange={e=>setForm({...form,area:e.target.value,area_acres:e.target.value})}/></F>
            <F label="Area Unit"><Select value={form.area_unit||"acre"} onValueChange={v=>setForm({...form,area_unit:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["acre","hectare","bigha","gunta"].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></F>
            <F label="Sowing Date"><Input type="date" value={form.sowing_date||""} onChange={e=>setForm({...form,sowing_date:e.target.value})}/></F>
            <F label="Expected Harvest"><Input type="date" value={form.expected_harvest_date||""} onChange={e=>setForm({...form,expected_harvest_date:e.target.value})}/></F>
            {editing&&<F label="Actual Harvest"><Input type="date" value={form.actual_harvest_date||""} onChange={e=>setForm({...form,actual_harvest_date:e.target.value})}/></F>}
            <F label="Fertilizer Cost "><Input type="number" value={form.fertilizer_cost||""} onChange={e=>setForm({...form,fertilizer_cost:e.target.value})}/></F>
            <F label="Labour Cost "><Input type="number" value={form.labor_cost||""} onChange={e=>setForm({...form,labor_cost:e.target.value})}/></F>
            <F label="Other Cost "><Input type="number" value={form.other_cost||""} onChange={e=>setForm({...form,other_cost:e.target.value})}/></F>
            {editing&&<><F label="Yield (tons)"><Input type="number" value={form.yield_qty_tons||form.actual_yield||""} onChange={e=>setForm({...form,yield_qty_tons:e.target.value,actual_yield:e.target.value})}/></F>
            <F label="Selling Price/ton (${sym})"><Input type="number" value={form.selling_price_per_ton||""} onChange={e=>setForm({...form,selling_price_per_ton:e.target.value})}/></F></>}
            <F label="Status"><Select value={form.status||"sown"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["sown","growing","harvested","failed"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!showInputs} onOpenChange={()=>setShowInputs(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Crop Inputs — {showInputs?.crop_name} ({showInputs?.season})</DialogTitle></DialogHeader>
          <div className="rounded-md border overflow-x-auto mb-3"><table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Type","Input","Qty","Unit","Cost/Unit","Total","Date",""].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>{(inputs as any[]).map(i=>(
              <tr key={i.id} className="border-t"><td className="px-3 py-2">{i.input_type}</td><td className="px-3 py-2 font-medium">{i.input_name}</td><td className="px-3 py-2">{i.quantity||"—"}</td><td className="px-3 py-2">{i.unit||"—"}</td><td className="px-3 py-2">{sym}{fmt(i.cost_per_unit)}</td><td className="px-3 py-2 font-medium">{sym}{fmt(i.total_cost)}</td><td className="px-3 py-2">{i.application_date?.split("T")[0]||"—"}</td><td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delInput.mutate(i.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td></tr>
            ))}{!(inputs as any[]).length&&<tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No inputs logged</td></tr>}</tbody>
          </table></div>
          <div className="grid grid-cols-3 gap-2">
            <F label="Type"><Select value={inputForm.input_type||""} onValueChange={v=>setInputForm({...inputForm,input_type:v})}><SelectTrigger><SelectValue placeholder="Type"/></SelectTrigger><SelectContent>{["Seed","Fertilizer","Pesticide","Herbicide","Labour","Water","Equipment","Other"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></F>
            <F label="Input Name"><Input value={inputForm.input_name||""} onChange={e=>setInputForm({...inputForm,input_name:e.target.value})}/></F>
            <F label="Qty"><Input type="number" value={inputForm.quantity||""} onChange={e=>setInputForm({...inputForm,quantity:e.target.value})}/></F>
            <F label="Unit"><Input placeholder="kg, litre..." value={inputForm.unit||""} onChange={e=>setInputForm({...inputForm,unit:e.target.value})}/></F>
            <F label="Cost/Unit (${sym})"><Input type="number" value={inputForm.cost_per_unit||""} onChange={e=>setInputForm({...inputForm,cost_per_unit:e.target.value})}/></F>
            <F label="Date"><Input type="date" value={inputForm.application_date||""} onChange={e=>setInputForm({...inputForm,application_date:e.target.value})}/></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowInputs(null)}>Close</Button><Button size="sm" onClick={()=>addInput.mutate({...inputForm,crop_cycle_id:showInputs?.id})} disabled={addInput.isPending}><Plus className="h-3 w-3 mr-1"/>Add Input</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HarvestTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: harvests = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/harvest-records"] });
  const { data: cycles = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/crop-cycles"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/agriculture/harvest-records/${editing.id}`, d) : apiRequest("POST", "/api/agriculture/harvest-records", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/harvest-records"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/agriculture/harvest-records/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agriculture/harvest-records"] }) });
  const openNew = () => { setEditing(null); setForm({ harvest_date: new Date().toISOString().split("T")[0], unit: "kg" }); setShowForm(true); };
  const openEdit = (h: any) => { setEditing(h); setForm({ ...h, harvest_date: h.harvest_date?.split("T")[0] }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Record Harvest</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Crop","Date","Quantity","Quality","Moisture","Market Price","Total Value","Storage",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(harvests as any[]).map(h=>(
          <tr key={h.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{h.crop_name||"—"}</td><td className="px-3 py-2">{h.harvest_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{h.quantity} {h.unit}</td><td className="px-3 py-2">{h.quality_grade||"—"}</td>
            <td className="px-3 py-2">{h.moisture_pct ? `${h.moisture_pct}%` : "—"}</td>
            <td className="px-3 py-2">{sym}{fmt(h.market_price)}</td><td className="px-3 py-2 font-medium">{sym}{fmt(h.total_value)}</td>
            <td className="px-3 py-2">{h.storage_location||"—"}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(h)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(h.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!(harvests as any[]).length&&<tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No harvest records</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit":"Record"} Harvest</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Crop Cycle"><Select value={String(form.crop_cycle_id||"")} onValueChange={v=>setForm({...form,crop_cycle_id:v})}><SelectTrigger><SelectValue placeholder="Select crop"/></SelectTrigger><SelectContent>{(cycles as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.crop_name} — {c.farm_name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Harvest Date"><Input type="date" value={form.harvest_date||""} onChange={e=>setForm({...form,harvest_date:e.target.value})}/></F>
            <F label="Quantity"><Input type="number" value={form.quantity||""} onChange={e=>setForm({...form,quantity:e.target.value})}/></F>
            <F label="Unit"><Select value={form.unit||"kg"} onValueChange={v=>setForm({...form,unit:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["kg","quintal","ton","litre","bag"].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></F>
            <F label="Quality Grade"><Select value={form.quality_grade||""} onValueChange={v=>setForm({...form,quality_grade:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["A","B","C","Premium","Standard","Below Standard"].map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></F>
            <F label="Moisture %"><Input type="number" value={form.moisture_pct||""} onChange={e=>setForm({...form,moisture_pct:e.target.value})}/></F>
            <F label="Market Price "><Input type="number" value={form.market_price||""} onChange={e=>setForm({...form,market_price:e.target.value})}/></F>
            <div className="col-span-2"><F label="Storage Location"><Input value={form.storage_location||""} onChange={e=>setForm({...form,storage_location:e.target.value})}/></F></div>
            <div className="col-span-2"><F label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProcurementTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: procs = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/procurement"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/agriculture/procurement/${editing.id}`, d) : apiRequest("POST", "/api/agriculture/procurement", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/procurement"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const openNew = () => { setEditing(null); setForm({ procurement_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ ...p, procurement_date: p.procurement_date?.split("T")[0] }); setShowForm(true); };
  const filtered = (procs as any[]).filter(p => p.farmer_name?.toLowerCase().includes(search.toLowerCase()) || p.commodity?.toLowerCase().includes(search.toLowerCase()) || p.procurement_no?.includes(search));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search procurement..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>New Procurement</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["No.","Farmer","Commodity","Variety","Qty (tons)","Rate/ton","Total","Date","Quality","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(p=>(
          <tr key={p.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{p.procurement_no}</td><td className="px-3 py-2 font-medium">{p.farmer_name}</td>
            <td className="px-3 py-2">{p.commodity}</td><td className="px-3 py-2">{p.variety||"—"}</td>
            <td className="px-3 py-2">{p.quantity_tons}</td><td className="px-3 py-2">{sym}{fmt(p.rate_per_ton)}</td>
            <td className="px-3 py-2 font-medium">{sym}{fmt(p.total_amount)}</td><td className="px-3 py-2">{p.procurement_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{p.quality_grade||"—"}</td>
            <td className="px-3 py-2"><Badge className={p.status==="paid"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}>{p.status||"received"}</Badge></td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>openEdit(p)}><Pencil className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">No procurement records</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?"Edit":"New"} Procurement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Farmer Name *"><Input value={form.farmer_name||""} onChange={e=>setForm({...form,farmer_name:e.target.value})}/></F></div>
            <F label="Farmer Phone"><Input value={form.farmer_phone||""} onChange={e=>setForm({...form,farmer_phone:e.target.value})}/></F>
            <F label="Commodity *"><Input value={form.commodity||""} onChange={e=>setForm({...form,commodity:e.target.value})}/></F>
            <F label="Variety"><Input value={form.variety||""} onChange={e=>setForm({...form,variety:e.target.value})}/></F>
            <F label="Quantity (tons)"><Input type="number" value={form.quantity_tons||""} onChange={e=>setForm({...form,quantity_tons:e.target.value})}/></F>
            <F label="Rate/ton (${sym})"><Input type="number" value={form.rate_per_ton||""} onChange={e=>setForm({...form,rate_per_ton:e.target.value})}/></F>
            <F label="Procurement Date"><Input type="date" value={form.procurement_date||""} onChange={e=>setForm({...form,procurement_date:e.target.value})}/></F>
            <F label="Quality Grade"><Select value={form.quality_grade||""} onValueChange={v=>setForm({...form,quality_grade:v})}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{["A","B","C","Premium","Standard"].map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></F>
            <F label="Moisture %"><Input type="number" value={form.moisture_pct||""} onChange={e=>setForm({...form,moisture_pct:e.target.value})}/></F>
            <F label="Status"><Select value={form.status||"received"} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["received","graded","paid"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommodityPricesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<any>({});
  const { data: prices = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/commodity-prices"] });
  const saveMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/agriculture/commodity-prices", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/commodity-prices"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/agriculture/commodity-prices/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agriculture/commodity-prices"] }) });
  const openNew = () => { setForm({ price_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Price</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Commodity","Variety","Market","Date","Min (${sym}/q)","Max (${sym}/q)","Modal (${sym}/q)","Source",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(prices as any[]).map(p=>(
          <tr key={p.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{p.commodity_name}</td><td className="px-3 py-2">{p.variety||"—"}</td>
            <td className="px-3 py-2">{p.market_name||"—"}</td><td className="px-3 py-2">{p.price_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{p.min_price ? `${sym}${fmt(p.min_price)}` : "—"}</td>
            <td className="px-3 py-2">{p.max_price ? `${sym}${fmt(p.max_price)}` : "—"}</td>
            <td className="px-3 py-2 font-medium">{sym}{fmt(p.price_per_quintal)}</td><td className="px-3 py-2">{p.source||"—"}</td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!(prices as any[]).length&&<tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No price data</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Commodity Price</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Commodity *"><Input value={form.commodity_name||""} onChange={e=>setForm({...form,commodity_name:e.target.value})}/></F></div>
            <F label="Variety"><Input value={form.variety||""} onChange={e=>setForm({...form,variety:e.target.value})}/></F>
            <F label="Market Name"><Input value={form.market_name||""} onChange={e=>setForm({...form,market_name:e.target.value})}/></F>
            <F label="Price Date"><Input type="date" value={form.price_date||""} onChange={e=>setForm({...form,price_date:e.target.value})}/></F>
            <F label="Modal Price (${sym}/q) *"><Input type="number" value={form.price_per_quintal||""} onChange={e=>setForm({...form,price_per_quintal:e.target.value})}/></F>
            <F label="Min Price (${sym}/q)"><Input type="number" value={form.min_price||""} onChange={e=>setForm({...form,min_price:e.target.value})}/></F>
            <F label="Max Price (${sym}/q)"><Input type="number" value={form.max_price||""} onChange={e=>setForm({...form,max_price:e.target.value})}/></F>
            <div className="col-span-2"><F label="Source"><Input placeholder="APMC, Agmarknet..." value={form.source||""} onChange={e=>setForm({...form,source:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SoilTestsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<any>({});
  const { data: tests = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/soil-tests"] });
  const { data: farms = [] } = useQuery<any[]>({ queryKey: ["/api/agriculture/farms"] });
  const saveMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/agriculture/soil-tests", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/agriculture/soil-tests"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/agriculture/soil-tests/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/agriculture/soil-tests"] }) });
  const openNew = () => { setForm({ test_date: new Date().toISOString().split("T")[0] }); setShowForm(true); };
  const onFarm = (id: string) => { const f = (farms as any[]).find(f => String(f.id) === id); setForm({ ...form, farm_id: id, farm_name: f?.name || "" }); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Soil Test</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Farm","Date","N","P","K","pH","OC%","EC","Recommendations",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(tests as any[]).map(t=>(
          <tr key={t.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-medium">{t.farm_name||t.farm_name_ref||"—"}</td><td className="px-3 py-2">{t.test_date?.split("T")[0]}</td>
            <td className="px-3 py-2">{t.nitrogen||"—"}</td><td className="px-3 py-2">{t.phosphorus||"—"}</td><td className="px-3 py-2">{t.potassium||"—"}</td>
            <td className="px-3 py-2">{t.ph_value||"—"}</td><td className="px-3 py-2">{t.organic_carbon||"—"}</td><td className="px-3 py-2">{t.ec_value||"—"}</td>
            <td className="px-3 py-2 max-w-[200px] truncate">{t.recommendations||"—"}</td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(t.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!(tests as any[]).length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No soil tests</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Add Soil Test</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Farm"><Select value={String(form.farm_id||"")} onValueChange={onFarm}><SelectTrigger><SelectValue placeholder="Select farm"/></SelectTrigger><SelectContent>{(farms as any[]).map((f:any)=><SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Test Date"><Input type="date" value={form.test_date||""} onChange={e=>setForm({...form,test_date:e.target.value})}/></F>
            <F label="Tested By"><Input value={form.tested_by||""} onChange={e=>setForm({...form,tested_by:e.target.value})}/></F>
            <F label="Nitrogen (N) kg/ha"><Input type="number" value={form.nitrogen||""} onChange={e=>setForm({...form,nitrogen:e.target.value})}/></F>
            <F label="Phosphorus (P) kg/ha"><Input type="number" value={form.phosphorus||""} onChange={e=>setForm({...form,phosphorus:e.target.value})}/></F>
            <F label="Potassium (K) kg/ha"><Input type="number" value={form.potassium||""} onChange={e=>setForm({...form,potassium:e.target.value})}/></F>
            <F label="pH Value"><Input type="number" step="0.1" value={form.ph_value||""} onChange={e=>setForm({...form,ph_value:e.target.value})}/></F>
            <F label="Organic Carbon (%)"><Input type="number" step="0.01" value={form.organic_carbon||""} onChange={e=>setForm({...form,organic_carbon:e.target.value})}/></F>
            <F label="EC (dS/m)"><Input type="number" step="0.01" value={form.ec_value||""} onChange={e=>setForm({...form,ec_value:e.target.value})}/></F>
            <div className="col-span-2"><F label="Recommendations"><Textarea rows={3} value={form.recommendations||""} onChange={e=>setForm({...form,recommendations:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AgriculturePage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Agriculture Management</h1><p className="text-muted-foreground text-sm mt-1">Farms, Farmers, Crop Cycles, Harvest, Procurement, Commodity Prices & Soil Tests</p></div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="farms"><MapPin className="h-3.5 w-3.5 mr-1"/>Farms</TabsTrigger>
          <TabsTrigger value="farmers"><Users className="h-3.5 w-3.5 mr-1"/>Farmers</TabsTrigger>
          <TabsTrigger value="crops"><Leaf className="h-3.5 w-3.5 mr-1"/>Crop Cycles</TabsTrigger>
          <TabsTrigger value="harvest">Harvest Records</TabsTrigger>
          <TabsTrigger value="procurement"><ShoppingBag className="h-3.5 w-3.5 mr-1"/>Procurement</TabsTrigger>
          <TabsTrigger value="prices"><TrendingUp className="h-3.5 w-3.5 mr-1"/>Commodity Prices</TabsTrigger>
          <TabsTrigger value="soil"><FlaskConical className="h-3.5 w-3.5 mr-1"/>Soil Tests</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab/></TabsContent>
          <TabsContent value="farms"><FarmsTab/></TabsContent>
          <TabsContent value="farmers"><FarmersTab/></TabsContent>
          <TabsContent value="crops"><CropCyclesTab/></TabsContent>
          <TabsContent value="harvest"><HarvestTab/></TabsContent>
          <TabsContent value="procurement"><ProcurementTab/></TabsContent>
          <TabsContent value="prices"><CommodityPricesTab/></TabsContent>
          <TabsContent value="soil"><SoilTestsTab/></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
