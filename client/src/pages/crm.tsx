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
import { Plus, Search, Target, Users, Building2, Activity, CheckSquare, BarChart3, Pencil, Trash2, X, DollarSign, Phone, Mail } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  open_task: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-700",
};

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

// ── Pipeline Kanban ───────────────────────────────────────────────────────────
function PipelineTab() {
  const { toast } = useToast();
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [showOppForm, setShowOppForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [dragging, setDragging] = useState<any>(null);

  const { data: pipelines = [] } = useQuery<any[]>({ queryKey: ["/api/crm/pipelines"] });
  const { data: stages = [] } = useQuery<any[]>({ queryKey: ["/api/crm/stages"], select: (d: any[]) => d.filter(s => !selectedPipeline || s.pipeline_id?.toString() === selectedPipeline) });
  const { data: opportunities = [] } = useQuery<any[]>({ queryKey: ["/api/crm/opportunities"] });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"] });
  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/accounts"] });

  const saveOpp = useMutation({
    mutationFn: (data: any) => editingOpp
      ? apiRequest("PUT", `/api/crm/opportunities/${editingOpp.id}`, data)
      : apiRequest("POST", "/api/crm/opportunities", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/opportunities"] }); setShowOppForm(false); setEditingOpp(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const moveOpp = useMutation({
    mutationFn: ({ id, stage_id }: any) => apiRequest("PATCH", `/api/crm/opportunities/${id}/stage`, { stage_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm/opportunities"] }),
  });

  const deleteOpp = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/crm/opportunities/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/opportunities"] }); toast({ title: "Deleted" }); },
  });

  const pipelineStages = stages.filter((s: any) => !selectedPipeline || s.pipeline_id?.toString() === selectedPipeline);
  const filteredOpps = opportunities.filter((o: any) => !selectedPipeline || o.pipeline_id?.toString() === selectedPipeline);

  const openForm = (opp?: any) => { setEditingOpp(opp || null); setForm(opp ? { ...opp } : { pipeline_id: selectedPipeline }); setShowOppForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Pipelines" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Pipelines</SelectItem>
            {pipelines.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Opportunity</Button>
        <PipelineManager />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {pipelineStages.length === 0 && (
          <div className="flex-1 text-center py-12 text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2" />
            <p>No stages. Create a pipeline with stages first.</p>
          </div>
        )}
        {pipelineStages.map((stage: any) => {
          const stageOpps = filteredOpps.filter((o: any) => o.stage_id?.toString() === stage.id.toString());
          const stageValue = stageOpps.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
          return (
            <div key={stage.id} className="flex-shrink-0 w-64 bg-muted/40 rounded-lg p-3"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (dragging) { moveOpp.mutate({ id: dragging, stage_id: stage.id }); setDragging(null); } }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{stage.name}</h3>
                <Badge variant="outline" className="text-xs">{stageOpps.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">₹{fmt(stageValue)}</p>
              <div className="space-y-2">
                {stageOpps.map((opp: any) => (
                  <Card key={opp.id} draggable onDragStart={() => setDragging(opp.id)} className="cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm leading-tight">{opp.name}</p>
                        <div className="flex gap-1 ml-1">
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => openForm(opp)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-600" onClick={() => deleteOpp.mutate(opp.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{opp.account_name || opp.contact_name || "—"}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-green-600">₹{fmt(opp.amount)}</span>
                        <span className="text-xs text-muted-foreground">{opp.probability}%</span>
                      </div>
                      {opp.expected_close_date && <p className="text-xs text-muted-foreground mt-1">Close: {opp.expected_close_date}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="w-full mt-2 text-xs" onClick={() => { setForm({ pipeline_id: selectedPipeline, stage_id: stage.id.toString() }); setEditingOpp(null); setShowOppForm(true); }}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
          );
        })}
      </div>

      <Dialog open={showOppForm} onOpenChange={v => { if (!v) { setShowOppForm(false); setEditingOpp(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingOpp ? "Edit Opportunity" : "New Opportunity"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Pipeline">
              <Select value={form.pipeline_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, pipeline_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pipeline" /></SelectTrigger>
                <SelectContent>{pipelines.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Stage">
              <Select value={form.stage_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, stage_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>{stages.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Contact">
              <Select value={form.contact_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, contact_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Contact" /></SelectTrigger>
                <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Account">
              <Select value={form.account_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Amount"><Input type="number" value={form.amount || ""} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Probability (%)"><Input type="number" value={form.probability || ""} onChange={e => setForm((p: any) => ({ ...p, probability: e.target.value }))} /></FieldRow>
            <FieldRow label="Expected Close"><Input type="date" value={form.expected_close_date || ""} onChange={e => setForm((p: any) => ({ ...p, expected_close_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Status">
              <Select value={form.status || "open"} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["open", "won", "lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveOpp.mutate(form)} disabled={!form.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowOppForm(false); setEditingOpp(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PipelineManager() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [stageForm, setStageForm] = useState<any>({});

  const { data: pipelines = [] } = useQuery<any[]>({ queryKey: ["/api/crm/pipelines"] });
  const { data: stages = [] } = useQuery<any[]>({ queryKey: ["/api/crm/stages"] });

  const savePipeline = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/crm/pipelines", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/pipelines"] }); setForm({}); toast({ title: "Pipeline created" }); },
  });

  const saveStage = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/crm/stages", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/stages"] }); setStageForm({}); toast({ title: "Stage created" }); },
  });

  const delPipeline = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/crm/pipelines/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm/pipelines"] }) });
  const delStage = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/crm/stages/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm/stages"] }) });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Manage Pipelines</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pipelines & Stages</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Pipelines</h4>
              <div className="space-y-1 mb-3">
                {pipelines.map((p: any) => <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm"><span>{p.name}</span><Button size="sm" variant="ghost" className="text-red-600 h-6 w-6 p-0" onClick={() => delPipeline.mutate(p.id)}><X className="h-3 w-3" /></Button></div>)}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Pipeline name" value={form.name || ""} onChange={e => setForm({ name: e.target.value })} className="text-sm" />
                <Button size="sm" onClick={() => savePipeline.mutate(form)} disabled={!form.name}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Stages</h4>
              <div className="space-y-1 mb-3">
                {stages.map((s: any) => <div key={s.id} className="flex items-center justify-between p-2 border rounded text-sm"><span>{s.name}</span><Button size="sm" variant="ghost" className="text-red-600 h-6 w-6 p-0" onClick={() => delStage.mutate(s.id)}><X className="h-3 w-3" /></Button></div>)}
              </div>
              <div className="space-y-2">
                <Select value={stageForm.pipeline_id?.toString() || ""} onValueChange={v => setStageForm((p: any) => ({ ...p, pipeline_id: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Pipeline" /></SelectTrigger>
                  <SelectContent>{pipelines.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input placeholder="Stage name" value={stageForm.name || ""} onChange={e => setStageForm((p: any) => ({ ...p, name: e.target.value }))} className="text-sm" />
                  <Button size="sm" onClick={() => saveStage.mutate(stageForm)} disabled={!stageForm.name || !stageForm.pipeline_id}><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Contacts Tab ──────────────────────────────────────────────────────────────
function ContactsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"] });
  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/accounts"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/crm/contacts/${editing.id}`, data) : apiRequest("POST", "/api/crm/contacts", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/crm/contacts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] }); toast({ title: "Deleted" }); },
  });

  const filtered = contacts.filter((c: any) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));
  const openForm = (c?: any) => { setEditing(c || null); setForm(c ? { ...c } : {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search contacts…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Contact</Button>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.title || "—"} · {c.account_name || "No account"}</p></div>
                <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(c)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button></div>
              </div>
              {c.email && <p className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</p>}
              {c.phone && <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No contacts</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Title"><Input value={form.title || ""} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} /></FieldRow>
            <FieldRow label="Account">
              <Select value={form.account_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Email"><Input value={form.email || ""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Department"><Input value={form.department || ""} onChange={e => setForm((p: any) => ({ ...p, department: e.target.value }))} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Accounts Tab ──────────────────────────────────────────────────────────────
function AccountsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/accounts"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/crm/accounts/${editing.id}`, data) : apiRequest("POST", "/api/crm/accounts", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/accounts"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/crm/accounts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/accounts"] }); toast({ title: "Deleted" }); },
  });

  const filtered = accounts.filter((a: any) => a.name?.toLowerCase().includes(search.toLowerCase()));
  const openForm = (a?: any) => { setEditing(a || null); setForm(a ? { ...a } : {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search accounts…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Account</Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Account", "Industry", "Phone", "Revenue", "Employees", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((a: any) => (
              <tr key={a.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2"><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.website || "—"}</p></td>
                <td className="px-3 py-2">{a.industry || "—"}</td>
                <td className="px-3 py-2">{a.phone || "—"}</td>
                <td className="px-3 py-2">₹{fmt(a.annual_revenue)}</td>
                <td className="px-3 py-2">{a.employee_count || "—"}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(a)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No accounts</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Industry"><Input value={form.industry || ""} onChange={e => setForm((p: any) => ({ ...p, industry: e.target.value }))} /></FieldRow>
            <FieldRow label="Website"><Input value={form.website || ""} onChange={e => setForm((p: any) => ({ ...p, website: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Email"><Input value={form.email || ""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></FieldRow>
            <FieldRow label="Annual Revenue"><Input type="number" value={form.annual_revenue || ""} onChange={e => setForm((p: any) => ({ ...p, annual_revenue: e.target.value }))} /></FieldRow>
            <FieldRow label="Employees"><Input type="number" value={form.employee_count || ""} onChange={e => setForm((p: any) => ({ ...p, employee_count: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Activities Tab ────────────────────────────────────────────────────────────
function ActivitiesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: activities = [] } = useQuery<any[]>({ queryKey: ["/api/crm/activities"] });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"] });
  const { data: opportunities = [] } = useQuery<any[]>({ queryKey: ["/api/crm/opportunities"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/crm/activities/${editing.id}`, data) : apiRequest("POST", "/api/crm/activities", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/activities"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/crm/activities/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/activities"] }); toast({ title: "Deleted" }); } });

  const openForm = (a?: any) => { setEditing(a || null); setForm(a ? { ...a } : { activity_type: 'call', activity_date: new Date().toISOString().slice(0, 10) }); setShowForm(true); };
  const TYPE_ICONS: Record<string, string> = { call: "📞", email: "📧", meeting: "🤝", demo: "💻", note: "📝" };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Log Activity</Button></div>
      <div className="space-y-2">
        {activities.slice(0, 50).map((a: any) => (
          <Card key={a.id}>
            <CardContent className="p-3 flex items-start gap-3">
              <span className="text-2xl">{TYPE_ICONS[a.activity_type] || "📌"}</span>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div><p className="font-medium text-sm">{a.subject}</p><p className="text-xs text-muted-foreground">{a.contact_name || a.opportunity_name || "—"} · {a.activity_date}</p></div>
                  <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(a)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button></div>
                </div>
                {a.outcome && <p className="text-xs text-muted-foreground mt-1">Outcome: {a.outcome}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {activities.length === 0 && <div className="text-center py-8 text-muted-foreground">No activities</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Activity" : "Log Activity"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Type">
              <Select value={form.activity_type || "call"} onValueChange={v => setForm((p: any) => ({ ...p, activity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["call", "email", "meeting", "demo", "note"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Subject *"><Input value={form.subject || ""} onChange={e => setForm((p: any) => ({ ...p, subject: e.target.value }))} /></FieldRow>
            <FieldRow label="Contact">
              <Select value={form.contact_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, contact_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Contact" /></SelectTrigger>
                <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Opportunity">
              <Select value={form.opportunity_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, opportunity_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Opportunity" /></SelectTrigger>
                <SelectContent>{opportunities.map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Date"><Input type="date" value={form.activity_date || ""} onChange={e => setForm((p: any) => ({ ...p, activity_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Duration (min)"><Input type="number" value={form.duration_minutes || ""} onChange={e => setForm((p: any) => ({ ...p, duration_minutes: e.target.value }))} /></FieldRow>
            <FieldRow label="Outcome"><Textarea value={form.outcome || ""} onChange={e => setForm((p: any) => ({ ...p, outcome: e.target.value }))} rows={2} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.subject}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
function TasksTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/crm/tasks"] });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"] });
  const { data: opportunities = [] } = useQuery<any[]>({ queryKey: ["/api/crm/opportunities"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/crm/tasks/${editing.id}`, data) : apiRequest("POST", "/api/crm/tasks", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/tasks"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/crm/tasks/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/tasks"] }); toast({ title: "Deleted" }); } });
  const complete = useMutation({
    mutationFn: (task: any) => apiRequest("PUT", `/api/crm/tasks/${task.id}`, { ...task, status: 'completed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm/tasks"] }),
  });

  const openForm = (t?: any) => { setEditing(t || null); setForm(t ? { ...t } : { priority: 'medium', status: 'open' }); setShowForm(true); };
  const open = tasks.filter((t: any) => t.status !== 'completed');
  const done = tasks.filter((t: any) => t.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Task</Button></div>
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Open ({open.length})</h3>
        {open.map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <button onClick={() => complete.mutate(t)} className="h-5 w-5 rounded border-2 border-muted-foreground hover:border-green-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div><p className="font-medium text-sm">{t.title}</p><p className="text-xs text-muted-foreground">{t.contact_name || t.opportunity_name || "—"} · Due: {t.due_date || "—"}</p></div>
                  <div className="flex items-center gap-2"><Badge className={STATUS_COLORS[t.priority] || ""}>{t.priority}</Badge><Button size="sm" variant="ghost" onClick={() => openForm(t)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {open.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No open tasks</p>}
        {done.length > 0 && <><h3 className="font-semibold text-sm text-muted-foreground mt-4">Completed ({done.length})</h3>{done.slice(0, 10).map((t: any) => <div key={t.id} className="text-sm line-through text-muted-foreground px-2">{t.title}</div>)}</>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Title *"><Input value={form.title || ""} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} /></FieldRow>
            <FieldRow label="Contact">
              <Select value={form.contact_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, contact_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Contact" /></SelectTrigger>
                <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Opportunity">
              <Select value={form.opportunity_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, opportunity_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Opportunity" /></SelectTrigger>
                <SelectContent>{opportunities.map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Due Date"><Input type="date" value={form.due_date || ""} onChange={e => setForm((p: any) => ({ ...p, due_date: e.target.value }))} /></FieldRow>
              <FieldRow label="Priority">
                <Select value={form.priority || "medium"} onValueChange={v => setForm((p: any) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low", "medium", "high"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Description"><Textarea value={form.description || ""} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={2} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.title}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/crm/pipeline-stats"] });
  const { data: opportunities = [] } = useQuery<any[]>({ queryKey: ["/api/crm/opportunities"] });
  const won = opportunities.filter((o: any) => o.status === 'won');
  const lost = opportunities.filter((o: any) => o.status === 'lost');
  const wonValue = won.reduce((s: number, o: any) => s + Number(o.amount || 0), 0);
  const pipelineValue = opportunities.filter((o: any) => o.status === 'open').reduce((s: number, o: any) => s + Number(o.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Contacts" value={stats?.contacts ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
        <StatCard title="Accounts" value={stats?.accounts ?? 0} icon={Building2} color="bg-purple-100 text-purple-600" />
        <StatCard title="Open Opportunities" value={stats?.openOpportunities ?? 0} icon={Target} color="bg-orange-100 text-orange-600" />
        <StatCard title="Pipeline Value" value={`₹${fmt(stats?.pipelineValue)}`} icon={DollarSign} color="bg-green-100 text-green-600" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Won Deals</p><p className="text-2xl font-bold text-green-600">{won.length}</p><p className="text-sm">₹{fmt(wonValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Lost Deals</p><p className="text-2xl font-bold text-red-600">{lost.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Open Tasks</p><p className="text-2xl font-bold">{stats?.openTasks ?? 0}</p></CardContent></Card>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CRMPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Target className="h-6 w-6 text-blue-600" /></div>
        <div><h1 className="text-2xl font-bold">CRM Pipeline</h1><p className="text-sm text-muted-foreground">Contacts, accounts, deals & activities</p></div>
      </div>
      <Tabs defaultValue="pipeline">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline"><PipelineTab /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="accounts"><AccountsTab /></TabsContent>
        <TabsContent value="activities"><ActivitiesTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
