import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, LayoutList, Kanban, Pencil, Trash2, Phone, Mail, Building2, Calendar, User, Tag } from "lucide-react";

const STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { value: "interested", label: "Interested", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { value: "converted", label: "Converted", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
];

const SOURCES = ["Walk-in", "Reference", "Website", "Cold Call", "Exhibition", "Social Media", "LinkedIn", "Other"];

const statusMeta = (val: string) => STATUSES.find(s => s.value === val) || STATUSES[0];

const EMPTY_FORM = { name: "", company: "", phone: "", email: "", source: "", productInterest: "", assignedTo: "", status: "new", notes: "", nextFollowUp: "" };

function LeadForm({ form, setForm, onSave, onCancel, isSaving, users }: any) {
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));
  const s = (k: string) => (v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const cls = "h-9";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Name <span className="text-destructive">*</span></Label>
          <Input className={cls} value={form.name} onChange={f("name")} placeholder="Lead name" data-testid="input-lead-name" />
        </div>
        <div className="space-y-1.5">
          <Label>Company</Label>
          <Input className={cls} value={form.company} onChange={f("company")} placeholder="Company name" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input className={cls} value={form.phone} onChange={f("phone")} placeholder="Phone number" data-testid="input-lead-phone" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input className={cls} value={form.email} onChange={f("email")} placeholder="Email address" type="email" data-testid="input-lead-email" />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={form.source} onValueChange={s("source")}>
            <SelectTrigger className={cls} data-testid="select-lead-source"><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>{SOURCES.map(src => <SelectItem key={src} value={src}>{src}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={s("status")}>
            <SelectTrigger className={cls} data-testid="select-lead-status"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assigned To</Label>
          <Select value={form.assignedTo || "__none__"} onValueChange={v => s("assignedTo")(v === "__none__" ? "" : v)}>
            <SelectTrigger className={cls}><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {(users || []).map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Next Follow-up</Label>
          <Input className={cls} type="date" value={form.nextFollowUp} onChange={f("nextFollowUp")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Product / Service Interest</Label>
        <Input className={cls} value={form.productInterest} onChange={f("productInterest")} placeholder="What are they interested in?" data-testid="input-lead-product" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={f("notes")} placeholder="Any additional notes..." rows={3} data-testid="textarea-lead-notes" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} disabled={isSaving || !form.name.trim()} data-testid="btn-save-lead">
          {isSaving ? "Saving..." : "Save Lead"}
        </Button>
      </div>
    </div>
  );
}

function LeadCard({ lead, onEdit, onDelete, onStatusChange }: any) {
  const meta = statusMeta(lead.status);
  return (
    <Card className="mb-2 hover-elevate cursor-pointer" data-testid={`card-lead-${lead.id}`}>
      <CardContent className="pt-3 pb-3 px-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm leading-tight">{lead.name}</p>
            {lead.company && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="h-3 w-3" />{lead.company}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(lead)}><Pencil className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(lead.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
        {lead.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>}
        {lead.product_interest && <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />{lead.product_interest}</p>}
        {lead.next_follow_up && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />Follow-up: {new Date(lead.next_follow_up).toLocaleDateString("en-IN")}
          </p>
        )}
        {lead.assigned_to_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{lead.assigned_to_name}</p>}
        <div className="flex flex-wrap gap-1 pt-1">
          {STATUSES.filter(s => s.value !== lead.status).map(s => (
            <button key={s.value} onClick={() => onStatusChange(lead.id, s.value)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80">
              → {s.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CRMLeadsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"table" | "kanban">("kanban");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: leads = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/crm/leads"] });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        return apiRequest("PUT", `/api/crm/leads/${editing.id}`, data).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
      }
      return apiRequest("POST", "/api/crm/leads", data).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      toast({ title: editing ? "Lead updated" : "Lead created" });
      setDialogOpen(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/crm/leads/${id}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      toast({ title: "Lead deleted" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, lead }: any) => apiRequest("PUT", `/api/crm/leads/${id}`, {
      name: lead.name, company: lead.company, phone: lead.phone, email: lead.email,
      source: lead.source, productInterest: lead.product_interest,
      assignedTo: lead.assigned_to || null, notes: lead.notes,
      nextFollowUp: lead.next_follow_up ? lead.next_follow_up.split("T")[0] : null,
      status,
    }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] }),
  });

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
  const openEdit = (lead: any) => {
    setEditing(lead);
    setForm({
      name: lead.name || "", company: lead.company || "", phone: lead.phone || "",
      email: lead.email || "", source: lead.source || "", productInterest: lead.product_interest || "",
      assignedTo: lead.assigned_to ? String(lead.assigned_to) : "", status: lead.status || "new",
      notes: lead.notes || "", nextFollowUp: lead.next_follow_up ? lead.next_follow_up.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({ ...form, assignedTo: form.assignedTo || null });
  };

  const filtered = (leads as any[]).filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.phone?.includes(q);
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats
  const statsByStatus = STATUSES.map(s => ({ ...s, count: leads.filter((l: any) => l.status === s.value).length }));

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Lead Management</h1>
          <p className="text-sm text-muted-foreground">Track and manage your sales pipeline</p>
        </div>
        <Button onClick={openAdd} data-testid="btn-add-lead"><Plus className="h-4 w-4 mr-1.5" />Add Lead</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {statsByStatus.map(s => (
          <Card key={s.value} className="cursor-pointer hover-elevate" onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-bold">{s.count}</p>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-leads" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border overflow-hidden">
          <button onClick={() => setView("kanban")} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <Kanban className="h-3.5 w-3.5" />Kanban
          </button>
          <button onClick={() => setView("table")} className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <LayoutList className="h-3.5 w-3.5" />Table
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
          {STATUSES.map(col => {
            const colLeads = filtered.filter((l: any) => l.status === col.value);
            return (
              <div key={col.value} className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-muted-foreground font-medium">{colLeads.length}</span>
                </div>
                {colLeads.length === 0 && (
                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">No leads</div>
                )}
                {colLeads.map((lead: any) => (
                  <LeadCard key={lead.id} lead={lead}
                    onEdit={openEdit}
                    onDelete={(id: number) => { if (confirm("Delete this lead?")) deleteMutation.mutate(id); }}
                    onStatusChange={(id: number, status: string) => statusMutation.mutate({ id, status, lead })}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    {["Lead No", "Name", "Company", "Phone", "Source", "Product Interest", "Status", "Assigned To", "Follow-up", "Actions"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">Loading...</td></tr>}
                  {!isLoading && filtered.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No leads found</td></tr>}
                  {filtered.map((lead: any) => {
                    const meta = statusMeta(lead.status);
                    return (
                      <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors" data-testid={`row-lead-${lead.id}`}>
                        <td className="px-3 py-2 font-mono text-xs">{lead.lead_no}</td>
                        <td className="px-3 py-2 font-medium">{lead.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{lead.company || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{lead.phone || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{lead.source || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{lead.product_interest || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{lead.assigned_to_name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(lead)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this lead?")) deleteMutation.mutate(lead.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditing(null); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          </DialogHeader>
          <LeadForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setDialogOpen(false)} isSaving={saveMutation.isPending} users={users} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
