import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const EMPTY = { company_name: "", contact_person: "", phone: "", email: "", gst_no: "", address: "", negotiated_rate: "", credit_limit: "", credit_days: "30", contract_from: "", contract_to: "" };

export default function HotelCorporatePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/corporate"], queryFn: () => api("GET", "/api/hotel/corporate") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/corporate", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/corporate"] }); setShowForm(false); setForm({ ...EMPTY }); } });
  const update = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/hotel/corporate/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/corporate"] }); setEditing(null); setShowForm(false); } });
  const remove = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/hotel/corporate/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/corporate"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const arr = Array.isArray(accounts) ? accounts : [];

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({ company_name: a.company_name || "", contact_person: a.contact_person || "", phone: a.phone || "", email: a.email || "", gst_no: a.gst_no || "", address: a.address || "", negotiated_rate: String(a.negotiated_rate || ""), credit_limit: String(a.credit_limit || ""), credit_days: String(a.credit_days || "30"), contract_from: a.contract_from?.slice(0, 10) || "", contract_to: a.contract_to?.slice(0, 10) || "" });
    setShowForm(true);
  };

  const handleSave = () => {
    const b = { ...form, negotiated_rate: parseFloat(form.negotiated_rate || "0"), credit_limit: parseFloat(form.credit_limit || "0"), credit_days: parseInt(form.credit_days || "30") };
    editing ? update.mutate({ id: editing.id, b }) : create.mutate(b);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-blue-600" />Corporate Accounts</h1>
        <Button onClick={() => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Corporate Account</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Total Accounts</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Active Contracts</p><p className="text-2xl font-bold">{arr.filter((a: any) => { const now = new Date(); return (!a.contract_to || new Date(a.contract_to) >= now); }).length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Total Credit Limit</p><p className="text-2xl font-bold">₹{arr.reduce((s: number, a: any) => s + Number(a.credit_limit ?? 0), 0).toLocaleString("en-IN")}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{editing ? "Edit Corporate Account" : "New Corporate Account"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Company Name</Label><Input value={form.company_name} onChange={e => f("company_name", e.target.value)} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => f("contact_person", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => f("email", e.target.value)} /></div>
            <div><Label>GST Number</Label><Input value={form.gst_no} onChange={e => f("gst_no", e.target.value)} /></div>
            <div><Label>Negotiated Rate (₹/night)</Label><Input type="number" value={form.negotiated_rate} onChange={e => f("negotiated_rate", e.target.value)} /></div>
            <div><Label>Credit Limit (₹)</Label><Input type="number" value={form.credit_limit} onChange={e => f("credit_limit", e.target.value)} /></div>
            <div><Label>Credit Days</Label>
              <Select value={form.credit_days} onValueChange={v => f("credit_days", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["7", "15", "30", "45", "60", "90"].map(d => <SelectItem key={d} value={d}>{d} days</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Contract From</Label><Input type="date" value={form.contract_from} onChange={e => f("contract_from", e.target.value)} /></div>
            <div><Label>Contract To</Label><Input type="date" value={form.contract_to} onChange={e => f("contract_to", e.target.value)} /></div>
            <div className="col-span-3"><Label>Address</Label><Input value={form.address} onChange={e => f("address", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {arr.map((a: any) => {
          const isActive = !a.contract_to || new Date(a.contract_to) >= new Date();
          return (
            <Card key={a.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{a.company_name}</p>
                    <p className="text-sm text-gray-600">{a.contact_person} · {a.phone}</p>
                    {a.gst_no && <p className="text-xs text-gray-500">GST: {a.gst_no}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{isActive ? "Active" : "Expired"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div><p className="text-xs text-gray-500">Negotiated Rate</p><p className="font-medium">₹{Number(a.negotiated_rate ?? 0).toLocaleString("en-IN")}/night</p></div>
                  <div><p className="text-xs text-gray-500">Credit Limit</p><p className="font-medium">₹{Number(a.credit_limit ?? 0).toLocaleString("en-IN")}</p></div>
                  <div><p className="text-xs text-gray-500">Credit Days</p><p className="font-medium">{a.credit_days} days</p></div>
                </div>
                {a.contract_from && <p className="text-xs text-gray-400 mb-2">{a.contract_from?.slice(0, 10)} → {a.contract_to?.slice(0, 10)}</p>}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove.mutate(a.id)}>Del</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {arr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-8 text-center">No corporate accounts. Add one to enable negotiated rates and credit billing.</p>}
      </div>
    </div>
  );
}
