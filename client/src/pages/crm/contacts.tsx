import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X, Search, Phone, Mail } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const SOURCES = ["Website", "Referral", "LinkedIn", "Cold Call", "Email", "Trade Show", "Google Ads", "Facebook", "Walk-in", "Other"];
const TAGS = ["VIP", "Hot Lead", "Cold", "Follow-up", "Customer", "Prospect", "Partner"];
const EMPTY = { name: "", phone: "", email: "", company: "", designation: "", source: "", tag: "", city: "", notes: "" };

export default function CRMContactsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("_all");

  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"], queryFn: () => api("GET", "/api/crm/contacts") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/contacts", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/contacts"] }); setShowForm(false); setForm({ ...EMPTY }); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/crm/contacts/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/contacts"] }); setEditing(null); setShowForm(false); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/crm/contacts/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/contacts"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const arr = Array.isArray(contacts) ? contacts : [];

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name || "", phone: c.phone || "", email: c.email || "", company: c.company || "", designation: c.designation || "", source: c.source || "", tag: c.tag || "", city: c.city || "", notes: c.notes || "" });
    setShowForm(true);
  };

  const filtered = arr.filter((c: any) => {
    const ms = !search || [c.name, c.phone, c.email, c.company].some(v => (v ?? "").toLowerCase().includes(search.toLowerCase()));
    const mt = tagFilter === "_all" || c.tag === tagFilter;
    return ms && mt;
  });

  const TAG_COLOR: Record<string, string> = { VIP: "bg-purple-100 text-purple-800", "Hot Lead": "bg-red-100 text-red-800", Cold: "bg-blue-100 text-blue-800", "Follow-up": "bg-yellow-100 text-yellow-800", Customer: "bg-green-100 text-green-800", Prospect: "bg-orange-100 text-orange-800", Partner: "bg-indigo-100 text-indigo-800" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-blue-600" />Contacts</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Contact</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        {["Hot Lead", "Customer", "VIP"].map(t => (
          <Card key={t}><CardContent className="pt-3"><p className="text-xs text-gray-500">{t}</p><p className="text-2xl font-bold">{arr.filter((c: any) => c.tag === t).length}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search name, phone, email, company..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All tags" /></SelectTrigger>
          <SelectContent><SelectItem value="_all">All</SelectItem>{TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit Contact" : "New Contact"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => f("email", e.target.value)} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={e => f("company", e.target.value)} /></div>
            <div><Label>Designation</Label><Input value={form.designation} onChange={e => f("designation", e.target.value)} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={e => f("city", e.target.value)} /></div>
            <div><Label>Source</Label>
              <Select value={form.source} onValueChange={v => f("source", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tag</Label>
              <Select value={form.tag} onValueChange={v => f("tag", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={() => editing ? update.mutate({ id: editing.id, b: form }) : create.mutate(form)}>{editing ? "Save" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        {filtered.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  {c.designation && <p className="text-xs text-gray-500">{c.designation}{c.company ? ` · ${c.company}` : ""}</p>}
                </div>
                {c.tag && <Badge className={TAG_COLOR[c.tag] ?? "bg-gray-100"}>{c.tag}</Badge>}
              </div>
              {c.phone && <p className="text-sm flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" />{c.phone}</p>}
              {c.email && <p className="text-sm flex items-center gap-1 text-gray-600"><Mail className="w-3 h-3" />{c.email}</p>}
              {c.city && <p className="text-xs text-gray-400 mt-1">{c.city}</p>}
              {c.source && <p className="text-xs text-gray-400">Source: {c.source}</p>}
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => openEdit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => remove.mutate(c.id)}>Del</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-8 text-center">No contacts found.</p>}
      </div>
    </div>
  );
}
