import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, X, Search } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TYPES = ["Customer", "Prospect", "Partner", "Vendor", "Competitor"];
const INDUSTRIES = ["Technology", "Manufacturing", "Healthcare", "Education", "Retail", "Finance", "Real Estate", "Hospitality", "Logistics", "Agriculture", "Other"];
const EMPTY = { name: "", type: "Prospect", industry: "", website: "", phone: "", email: "", gst_no: "", address: "", city: "", annual_revenue: "", employee_count: "", notes: "" };

export default function CRMAccountsPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/accounts"], queryFn: () => api("GET", "/api/crm/accounts") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/accounts", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/accounts"] }); setShowForm(false); setForm({ ...EMPTY }); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/crm/accounts/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/accounts"] }); setEditing(null); setShowForm(false); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/crm/accounts/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/accounts"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const arr = Array.isArray(accounts) ? accounts : [];

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({ name: a.name||"", type: a.type||"Prospect", industry: a.industry||"", website: a.website||"", phone: a.phone||"", email: a.email||"", gst_no: a.gst_no||"", address: a.address||"", city: a.city||"", annual_revenue: String(a.annual_revenue||""), employee_count: String(a.employee_count||""), notes: a.notes||"" });
    setShowForm(true);
  };

  const filtered = arr.filter((a: any) => {
    const ms = !search || (a.name ?? "").toLowerCase().includes(search.toLowerCase()) || (a.city ?? "").toLowerCase().includes(search.toLowerCase());
    const mt = !typeFilter || a.type === typeFilter;
    return ms && mt;
  });

  const TYPE_COLOR: Record<string, string> = { Customer: "bg-green-100 text-green-800", Prospect: "bg-blue-100 text-blue-800", Partner: "bg-purple-100 text-purple-800", Vendor: "bg-orange-100 text-orange-800", Competitor: "bg-red-100 text-red-800" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-blue-600" />Accounts</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Account</Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {TYPES.map(t => (
          <Card key={t}><CardContent className="pt-3"><p className="text-xs text-gray-500">{t}</p><p className="text-2xl font-bold">{arr.filter((a: any) => a.type === t).length}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search account name or city..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent><SelectItem value="">All</SelectItem>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit Account" : "New Account"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Account Name *</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Industry</Label>
              <Select value={form.industry} onValueChange={v => f("industry", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => f("email", e.target.value)} /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={e => f("website", e.target.value)} /></div>
            <div><Label>GST Number</Label><Input value={form.gst_no} onChange={e => f("gst_no", e.target.value)} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={e => f("city", e.target.value)} /></div>
            <div><Label>Annual Revenue (₹)</Label><Input type="number" value={form.annual_revenue} onChange={e => f("annual_revenue", e.target.value)} /></div>
            <div><Label>Employee Count</Label><Input type="number" value={form.employee_count} onChange={e => f("employee_count", e.target.value)} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => f("address", e.target.value)} /></div>
            <div className="col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={() => { const b = { ...form, annual_revenue: parseFloat(form.annual_revenue||"0")||undefined, employee_count: parseInt(form.employee_count||"0")||undefined }; editing ? update.mutate({ id: editing.id, b }) : create.mutate(b); }}>{editing ? "Save" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{a.name}</p>
                  {a.industry && <p className="text-xs text-gray-500">{a.industry}</p>}
                  {a.city && <p className="text-xs text-gray-400">{a.city}</p>}
                </div>
                <Badge className={TYPE_COLOR[a.type] ?? "bg-gray-100"}>{a.type}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-2">
                {a.phone && <span>{a.phone}</span>}
                {a.email && <span className="col-span-2">{a.email}</span>}
                {a.annual_revenue > 0 && <span>Rev: {sym}{Number(a.annual_revenue).toLocaleString("en-IN")}</span>}
                {a.employee_count > 0 && <span>{a.employee_count} employees</span>}
                {a.gst_no && <span>GST: {a.gst_no}</span>}
              </div>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => openEdit(a)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => remove.mutate(a.id)}>Del</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-8 text-center">No accounts found.</p>}
      </div>
    </div>
  );
}
