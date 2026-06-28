import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUSES = ["new", "contacted", "site-visit", "negotiation", "booked", "lost"];
const statusColor = (s: string): any => ({ new: "default", contacted: "secondary", "site-visit": "outline", negotiation: "outline", booked: "default", lost: "destructive" }[s] || "outline");

export default function RealEstateCRMPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ lead_name: "", phone: "", email: "", project_id: "", budget_min: "", budget_max: "", source: "", notes: "" });

  const { data: leads = [] } = useQuery({ queryKey: ["/api/real-estate/leads"], queryFn: () => api("GET", "/api/real-estate/leads") });
  const { data: projects = [] } = useQuery({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });

  const addLead = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/leads", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/leads"] }); setShowForm(false); toast({ title: "Lead added" }); }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", "/api/real-estate/leads/" + id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/leads"] }); toast({ title: "Status updated" }); }
  });

  const filtered = filterStatus === "all" ? leads : leads.filter((l: any) => l.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales CRM</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Lead</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", ...STATUSES].map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)} className="capitalize">{s}</Button>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Lead</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Lead Name" value={form.lead_name} onChange={e => setForm({ ...form, lead_name: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Project Interest" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Budget Min" type="number" value={form.budget_min} onChange={e => setForm({ ...form, budget_min: e.target.value })} />
              <Input placeholder="Budget Max" type="number" value={form.budget_max} onChange={e => setForm({ ...form, budget_max: e.target.value })} />
              <Input placeholder="Source (walk-in/online/broker)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addLead.mutate(form)}>Save Lead</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Leads ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Project Interest</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Followup</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.lead_name}</TableCell>
                  <TableCell>{l.phone}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell>{l.project_name || l.project_interest}</TableCell>
                  <TableCell>₹{fmt(l.budget_min)} - ₹{fmt(l.budget_max)}</TableCell>
                  <TableCell>{l.source}</TableCell>
                  <TableCell>{l.assigned_to}</TableCell>
                  <TableCell><Badge variant={statusColor(l.status)}>{l.status}</Badge></TableCell>
                  <TableCell>{l.next_followup ? new Date(l.next_followup).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell>
                    <Select onValueChange={v => updateStatus.mutate({ id: l.id, status: v })}>
                      <SelectTrigger className="w-32"><SelectValue placeholder="Move to" /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
