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

const DOC_TYPES = ["RC", "Insurance", "Fitness", "Permit", "PUC"];

const docStatus = (validUpto: string) => {
  if (!validUpto) return { label: "unknown", variant: "outline" as const };
  const d = new Date(validUpto);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: "expired", variant: "destructive" as const };
  if (diff <= 30) return { label: "expiring-soon", variant: "secondary" as const };
  return { label: "valid", variant: "default" as const };
};

export default function LogisticsDocumentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", doc_type: "RC", doc_number: "", valid_from: "", valid_upto: "", issuing_authority: "" });

  const { data: documents = [] } = useQuery({ queryKey: ["/api/logistics/vehicle-documents"], queryFn: () => api("GET", "/api/logistics/vehicle-documents") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });

  const addDoc = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/vehicle-documents", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/vehicle-documents"] }); setShowForm(false); toast({ title: "Document added" }); }
  });

  const today = new Date();
  const expiringSoon = documents.filter((d: any) => {
    if (!d.valid_upto) return false;
    const diff = (new Date(d.valid_upto).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vehicle Documents</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Document</Button>
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader><CardTitle className="text-yellow-700">Expiring in 30 Days ({expiringSoon.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {expiringSoon.map((d: any) => (
                <div key={d.id} className="border border-yellow-300 rounded px-3 py-2 text-sm">
                  <span className="font-bold">{d.vehicle_no}</span> — {d.doc_type} expires {new Date(d.valid_upto).toLocaleDateString("en-IN")}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Vehicle Document</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.vehicle_no || v.vehicle_number}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.doc_type} onValueChange={v => setForm({ ...form, doc_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Document Number" value={form.doc_number} onChange={e => setForm({ ...form, doc_number: e.target.value })} />
              <Input type="date" placeholder="Valid From" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} />
              <Input type="date" placeholder="Valid Upto" value={form.valid_upto} onChange={e => setForm({ ...form, valid_upto: e.target.value })} />
              <Input placeholder="Issuing Authority" value={form.issuing_authority} onChange={e => setForm({ ...form, issuing_authority: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addDoc.mutate(form)}>Save Document</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Vehicle Documents</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle No</TableHead>
                <TableHead>Doc Type</TableHead>
                <TableHead>Doc Number</TableHead>
                <TableHead>Valid Upto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issuing Authority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d: any) => {
                const s = docStatus(d.valid_upto);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.vehicle_no}</TableCell>
                    <TableCell>{d.doc_type}</TableCell>
                    <TableCell>{d.doc_no || d.doc_number}</TableCell>
                    <TableCell>{d.valid_upto ? new Date(d.valid_upto).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell>{d.issuing_authority || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
