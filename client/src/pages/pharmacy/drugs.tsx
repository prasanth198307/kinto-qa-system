import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Plus, X, Search } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const SCHEDULES = ["OTC", "H", "H1", "X", "G"];
const SCHEDULE_COLORS: Record<string, string> = { OTC: "bg-green-100 text-green-800", H: "bg-yellow-100 text-yellow-800", H1: "bg-orange-100 text-orange-800", X: "bg-red-100 text-red-800", G: "bg-purple-100 text-purple-800" };
const EMPTY = { name: "", generic_name: "", manufacturer: "", schedule: "OTC", hsn_code: "", gst_rate: "12", mrp: "", composition: "", pack_size: "" };

export default function DrugsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"], queryFn: () => api("GET", "/api/pharmacy/drugs") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/pharmacy/drugs", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/drugs"] }); close(); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/pharmacy/drugs/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/drugs"] }); close(); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/pharmacy/drugs/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pharmacy/drugs"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const close = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }); };
  const openEdit = (d: any) => { setEditing(d); setForm({ name: d.name || "", generic_name: d.generic_name || "", manufacturer: d.manufacturer || "", schedule: d.schedule || "OTC", hsn_code: d.hsn_code || "", gst_rate: (d.gst_rate ?? 12).toString(), mrp: (d.mrp ?? "").toString(), composition: d.composition || "", pack_size: d.pack_size || "" }); setShowForm(true); };

  const arr = Array.isArray(drugs) ? drugs : [];
  const filtered = arr.filter((d: any) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.generic_name?.toLowerCase().includes(search.toLowerCase()) || d.manufacturer?.toLowerCase().includes(search.toLowerCase()));
  const scheduled = arr.filter((d: any) => d.schedule && d.schedule !== "OTC").length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drug Master</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Add Drug</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Pill className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total Drugs</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Scheduled Drugs (H/H1/X/G)</p><p className="text-2xl font-bold text-orange-600">{scheduled}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">OTC</p><p className="text-2xl font-bold text-green-600">{arr.length - scheduled}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="w-4 h-4 text-gray-400" />
        <Input placeholder="Search by brand, generic, manufacturer…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit Drug" : "Add Drug"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={close}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Brand Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} /></div>
            <div><Label>Generic Name</Label><Input value={form.generic_name} onChange={e => f("generic_name", e.target.value)} /></div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => f("manufacturer", e.target.value)} /></div>
            <div><Label>Schedule</Label>
              <Select value={form.schedule} onValueChange={v => f("schedule", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCHEDULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>HSN Code</Label><Input value={form.hsn_code} onChange={e => f("hsn_code", e.target.value)} placeholder="3004" /></div>
            <div><Label>GST Rate (%)</Label>
              <Select value={form.gst_rate} onValueChange={v => f("gst_rate", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["0","5","12","18"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>MRP (₹)</Label><Input type="number" value={form.mrp} onChange={e => f("mrp", e.target.value)} /></div>
            <div><Label>Pack Size</Label><Input value={form.pack_size} onChange={e => f("pack_size", e.target.value)} placeholder="10 tablets" /></div>
            <div><Label>Composition</Label><Input value={form.composition} onChange={e => f("composition", e.target.value)} placeholder="Paracetamol 500mg" /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => { const b = { ...form, gst_rate: parseFloat(form.gst_rate), mrp: parseFloat(form.mrp) }; editing ? update.mutate({ id: editing.id, b }) : create.mutate(b); }}>{editing ? "Save" : "Add Drug"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">{["Brand", "Generic", "Manufacturer", "Schedule", "HSN", "GST", "MRP", "Pack", "Actions"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{d.name}</td>
                <td className="p-2">{d.generic_name}</td>
                <td className="p-2">{d.manufacturer}</td>
                <td className="p-2"><Badge className={SCHEDULE_COLORS[d.schedule] ?? "bg-gray-100"}>{d.schedule ?? "OTC"}</Badge></td>
                <td className="p-2">{d.hsn_code}</td>
                <td className="p-2">{d.gst_rate}%</td>
                <td className="p-2">₹{d.mrp}</td>
                <td className="p-2">{d.pack_size}</td>
                <td className="p-2"><div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(d.id)}>Del</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No drugs found.</p>}
      </div>
    </div>
  );
}
