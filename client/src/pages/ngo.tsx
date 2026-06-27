import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Heart, Users, FolderOpen, UserCheck, FileText, Award, Pencil, Trash2, X, TrendingUp, Target } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}

function FieldRow({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ProgressBar({ value, max, color = "bg-green-500" }: any) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground"><span>₹{fmt(value)}</span><span>₹{fmt(max)}</span></div>
      <div className="h-2 bg-muted rounded-full"><div className={`h-2 ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>
      <div className="text-xs text-right text-muted-foreground">{pct.toFixed(0)}%</div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/ngo/stats"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/projects"] });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Donors" value={stats?.totalDonors ?? 0} icon={Heart} color="bg-red-100 text-red-600" />
        <StatCard title="Total Donated" value={`₹${fmt(stats?.totalDonated)}`} icon={TrendingUp} color="bg-green-100 text-green-600" />
        <StatCard title="Active Projects" value={stats?.activeProjects ?? 0} icon={FolderOpen} color="bg-blue-100 text-blue-600" />
        <StatCard title="Beneficiaries" value={stats?.totalBeneficiaries ?? 0} icon={Users} color="bg-purple-100 text-purple-600" />
      </div>
      {projects.filter((p: any) => p.status === 'active').length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Active Projects — Fund Utilization</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {projects.filter((p: any) => p.status === 'active').map((p: any) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1"><p className="font-medium text-sm">{p.name}</p><Badge variant="outline" className="text-xs">{p.project_type}</Badge></div>
                <ProgressBar value={p.funds_received || 0} max={p.target_amount || 1} color="bg-green-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Donors Tab ────────────────────────────────────────────────────────────────
function DonorsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [viewDonor, setViewDonor] = useState<any>(null);

  const { data: donors = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/donors"] });
  const { data: donorDonations = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/donors", viewDonor?.id, "donations"], queryFn: () => viewDonor ? fetch(`/api/ngo/donors/${viewDonor.id}/donations`).then(r => r.json()) : Promise.resolve([]), enabled: !!viewDonor });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ngo/donors/${editing.id}`, data) : apiRequest("POST", "/api/ngo/donors", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/donors"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/ngo/donors/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/donors"] }); toast({ title: "Deleted" }); } });

  const filtered = donors.filter((d: any) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase()) || d.pan?.toLowerCase().includes(search.toLowerCase()));
  const openForm = (d?: any) => { setEditing(d || null); setForm(d ? { ...d } : { donor_type: 'individual' }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search donors…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Donor</Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Donor", "Type", "PAN", "Phone", "Total Donated", "Donations", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2"><p className="font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.email || "—"}</p></td>
                <td className="px-3 py-2"><Badge variant="outline">{d.donor_type}</Badge></td>
                <td className="px-3 py-2">{d.pan || "—"}</td>
                <td className="px-3 py-2">{d.phone || "—"}</td>
                <td className="px-3 py-2 font-bold text-green-600">₹{fmt(d.total_donated)}</td>
                <td className="px-3 py-2">{d.donation_count || 0}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setViewDonor(d)}>History</Button><Button size="sm" variant="ghost" onClick={() => openForm(d)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No donors</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Donor" : "Add Donor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Type"><Select value={form.donor_type || "individual"} onValueChange={v => setForm((p: any) => ({ ...p, donor_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["individual","corporate","trust","foreign"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="PAN"><Input value={form.pan || ""} onChange={e => setForm((p: any) => ({ ...p, pan: e.target.value }))} /></FieldRow>
            <FieldRow label="Email"><Input value={form.email || ""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Address"><Textarea value={form.address || ""} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewDonor} onOpenChange={v => { if (!v) setViewDonor(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Donation History — {viewDonor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {donorDonations.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-2 border rounded text-sm">
                <div><p className="font-medium">{d.receipt_number}</p><p className="text-xs text-muted-foreground">{d.project_name || "General"} · {d.donation_date}</p></div>
                <span className="font-bold text-green-600">₹{fmt(d.amount)}</span>
              </div>
            ))}
            {donorDonations.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No donations yet</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Donations Tab ─────────────────────────────────────────────────────────────
function DonationsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: donations = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/donations"] });
  const { data: donors = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/donors"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/projects"] });

  const save = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ngo/donations", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/donations"] }); queryClient.invalidateQueries({ queryKey: ["/api/ngo/donors"] }); queryClient.invalidateQueries({ queryKey: ["/api/ngo/projects"] }); queryClient.invalidateQueries({ queryKey: ["/api/ngo/stats"] }); setShowForm(false); setForm({}); toast({ title: "Donation recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Record Donation</Button></div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Receipt #", "Donor", "Project", "Amount", "Mode", "Date", "80G"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {donations.slice(0, 100).map((d: any) => (
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{d.receipt_number}</td>
                <td className="px-3 py-2">{d.donor_name || "—"}</td>
                <td className="px-3 py-2">{d.project_name || "General"}</td>
                <td className="px-3 py-2 font-bold text-green-600">₹{fmt(d.amount)}</td>
                <td className="px-3 py-2"><Badge variant="outline">{d.payment_mode}</Badge></td>
                <td className="px-3 py-2">{d.donation_date ? new Date(d.donation_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2"><Badge className={d.is_80g_eligible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{d.is_80g_eligible ? "Eligible" : "N/A"}</Badge></td>
              </tr>
            ))}
            {donations.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No donations</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Donation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Donor *"><Select value={form.donor_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, donor_id: v }))}><SelectTrigger><SelectValue placeholder="Donor" /></SelectTrigger><SelectContent>{donors.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent></Select></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Project"><Select value={form.project_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, project_id: v }))}><SelectTrigger><SelectValue placeholder="General Fund" /></SelectTrigger><SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></FieldRow></div>
            <FieldRow label="Amount *"><Input type="number" value={form.amount || ""} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Date *"><Input type="date" value={form.donation_date || ""} onChange={e => setForm((p: any) => ({ ...p, donation_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Payment Mode"><Select value={form.payment_mode || "bank_transfer"} onValueChange={v => setForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","cheque","bank_transfer","upi","neft","rtgs"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Transaction Ref"><Input value={form.transaction_ref || ""} onChange={e => setForm((p: any) => ({ ...p, transaction_ref: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.donor_id || !form.amount || !form.donation_date}>Save</Button><Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────────
function ProjectsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/projects"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ngo/projects/${editing.id}`, data) : apiRequest("POST", "/api/ngo/projects", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/projects"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/ngo/projects/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/projects"] }); toast({ title: "Deleted" }); } });

  const openForm = (p?: any) => { setEditing(p || null); setForm(p ? { ...p } : { status: 'active', project_type: 'education' }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Project</Button></div>
      <div className="grid sm:grid-cols-2 gap-4">
        {projects.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-medium">{p.name}</p><div className="flex gap-1 mt-1"><Badge variant="outline" className="text-xs">{p.project_type}</Badge><Badge className={p.status === 'active' ? "bg-green-100 text-green-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>{p.status}</Badge></div></div>
                <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(p)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button></div>
              </div>
              {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Target</span><span className="font-medium">₹{fmt(p.target_amount)}</span></div>
                <ProgressBar value={p.funds_received || 0} max={p.target_amount || 1} />
              </div>
              {(p.start_date || p.end_date) && <p className="text-xs text-muted-foreground mt-2">{p.start_date} → {p.end_date || "Ongoing"}</p>}
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No projects</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Type"><Select value={form.project_type || "education"} onValueChange={v => setForm((p: any) => ({ ...p, project_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["education","health","livelihood","environment","water","relief","other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Status"><Select value={form.status || "active"} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["active","completed","paused","planned"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Target Amount"><Input type="number" value={form.target_amount || ""} onChange={e => setForm((p: any) => ({ ...p, target_amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Location"><Input value={form.location || ""} onChange={e => setForm((p: any) => ({ ...p, location: e.target.value }))} /></FieldRow>
            <FieldRow label="Start Date"><Input type="date" value={form.start_date || ""} onChange={e => setForm((p: any) => ({ ...p, start_date: e.target.value }))} /></FieldRow>
            <FieldRow label="End Date"><Input type="date" value={form.end_date || ""} onChange={e => setForm((p: any) => ({ ...p, end_date: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Description"><Textarea value={form.description || ""} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Beneficiaries Tab ─────────────────────────────────────────────────────────
function BeneficiariesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: beneficiaries = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/beneficiaries"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/projects"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ngo/beneficiaries/${editing.id}`, data) : apiRequest("POST", "/api/ngo/beneficiaries", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/beneficiaries"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/ngo/beneficiaries/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/beneficiaries"] }); toast({ title: "Deleted" }); } });

  const openForm = (b?: any) => { setEditing(b || null); setForm(b ? { ...b } : { gender: 'male' }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Beneficiary</Button></div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Name", "Project", "Gender", "Age", "Location", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {beneficiaries.map((b: any) => (
              <tr key={b.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{b.name}</td>
                <td className="px-3 py-2">{b.project_name || "—"}</td>
                <td className="px-3 py-2">{b.gender}</td>
                <td className="px-3 py-2">{b.age || "—"}</td>
                <td className="px-3 py-2">{b.location || "—"}</td>
                <td className="px-3 py-2"><Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(b)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(b.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
            {beneficiaries.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No beneficiaries</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Beneficiary" : "Add Beneficiary"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Project"><Select value={form.project_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, project_id: v }))}><SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger><SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Gender"><Select value={form.gender || "male"} onValueChange={v => setForm((p: any) => ({ ...p, gender: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["male","female","other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Age"><Input type="number" value={form.age || ""} onChange={e => setForm((p: any) => ({ ...p, age: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Location"><Input value={form.location || ""} onChange={e => setForm((p: any) => ({ ...p, location: e.target.value }))} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Grants Tab ────────────────────────────────────────────────────────────────
function GrantsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: grants = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/grants"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/projects"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ngo/grants/${editing.id}`, data) : apiRequest("POST", "/api/ngo/grants", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/grants"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/ngo/grants/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/grants"] }); toast({ title: "Deleted" }); } });

  const openForm = (g?: any) => { setEditing(g || null); setForm(g ? { ...g } : { status: 'applied' }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Grant</Button></div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Grant Name", "Grantor", "Project", "Amount", "Received", "Status", "Deadline", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {grants.map((g: any) => (
              <tr key={g.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{g.grant_name}</td>
                <td className="px-3 py-2">{g.grantor_name}</td>
                <td className="px-3 py-2">{g.project_name || "—"}</td>
                <td className="px-3 py-2">₹{fmt(g.amount)}</td>
                <td className="px-3 py-2 text-green-600">₹{fmt(g.amount_received)}</td>
                <td className="px-3 py-2"><Badge className={g.status === 'approved' ? "bg-green-100 text-green-700" : g.status === 'rejected' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}>{g.status}</Badge></td>
                <td className="px-3 py-2">{g.report_due_date || "—"}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(g)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(g.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
            {grants.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No grants</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Grant" : "Add Grant"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Grant Name *"><Input value={form.grant_name || ""} onChange={e => setForm((p: any) => ({ ...p, grant_name: e.target.value }))} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Grantor *"><Input value={form.grantor_name || ""} onChange={e => setForm((p: any) => ({ ...p, grantor_name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Project"><Select value={form.project_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, project_id: v }))}><SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger><SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Status"><Select value={form.status || "applied"} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["applied","approved","rejected","disbursed","closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Amount"><Input type="number" value={form.amount || ""} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Amount Received"><Input type="number" value={form.amount_received || ""} onChange={e => setForm((p: any) => ({ ...p, amount_received: e.target.value }))} /></FieldRow>
            <FieldRow label="Start Date"><Input type="date" value={form.start_date || ""} onChange={e => setForm((p: any) => ({ ...p, start_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Report Due"><Input type="date" value={form.report_due_date || ""} onChange={e => setForm((p: any) => ({ ...p, report_due_date: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.grant_name || !form.grantor_name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Volunteers Tab ────────────────────────────────────────────────────────────
function VolunteersTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: volunteers = [] } = useQuery<any[]>({ queryKey: ["/api/ngo/volunteers"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ngo/volunteers/${editing.id}`, data) : apiRequest("POST", "/api/ngo/volunteers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/volunteers"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/ngo/volunteers/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ngo/volunteers"] }); toast({ title: "Deleted" }); } });

  const openForm = (v?: any) => { setEditing(v || null); setForm(v ? { ...v } : {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Volunteer</Button></div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {volunteers.map((v: any) => (
          <Card key={v.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.skills || "—"}</p></div>
                <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(v)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(v.id)}><Trash2 className="h-3 w-3" /></Button></div>
              </div>
              {v.email && <p className="text-xs mt-1">{v.email}</p>}
              {v.phone && <p className="text-xs">{v.phone}</p>}
              <div className="flex items-center justify-between mt-2"><Badge variant={v.is_active ? "default" : "secondary"}>{v.is_active ? "Active" : "Inactive"}</Badge><span className="text-xs text-muted-foreground">{v.total_hours || 0} hrs</span></div>
            </CardContent>
          </Card>
        ))}
        {volunteers.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No volunteers</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Volunteer" : "Add Volunteer"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Email"><Input value={form.email || ""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Skills"><Input value={form.skills || ""} onChange={e => setForm((p: any) => ({ ...p, skills: e.target.value }))} placeholder="e.g. teaching, driving, IT" /></FieldRow></div>
            <FieldRow label="Join Date"><Input type="date" value={form.join_date || ""} onChange={e => setForm((p: any) => ({ ...p, join_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Total Hours"><Input type="number" value={form.total_hours || ""} onChange={e => setForm((p: any) => ({ ...p, total_hours: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NGOPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Heart className="h-6 w-6 text-green-600" /></div>
        <div><h1 className="text-2xl font-bold">NGO / Trust ERP</h1><p className="text-sm text-muted-foreground">Donors, donations, projects & beneficiaries</p></div>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
          <TabsTrigger value="grants">Grants</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="donors"><DonorsTab /></TabsContent>
        <TabsContent value="donations"><DonationsTab /></TabsContent>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
        <TabsContent value="beneficiaries"><BeneficiariesTab /></TabsContent>
        <TabsContent value="grants"><GrantsTab /></TabsContent>
        <TabsContent value="volunteers"><VolunteersTab /></TabsContent>
      </Tabs>
    </div>
  );
}
