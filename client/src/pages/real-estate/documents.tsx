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

const DOC_TYPES = ["agreement", "registry", "noc", "approval", "layout", "other"];

export default function RealEstateDocumentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doc_name: "", doc_type: "agreement", project_id: "", unit_id: "", customer_id: "", doc_url: "" });

  const { data: documents = [] } = useQuery({ queryKey: ["/api/real-estate/documents"], queryFn: () => api("GET", "/api/real-estate/documents") });
  const { data: projects = [] } = useQuery({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });

  const addDoc = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/documents", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/documents"] }); setShowForm(false); toast({ title: "Document added" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Upload Document</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Document Name" value={form.doc_name} onChange={e => setForm({ ...form, doc_name: e.target.value })} />
              <Select value={form.doc_type} onValueChange={v => setForm({ ...form, doc_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Unit ID (optional)" value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })} />
              <Input placeholder="Customer ID (optional)" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} />
              <Input placeholder="Document URL" value={form.doc_url} onChange={e => setForm({ ...form, doc_url: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addDoc.mutate(form)}>Save Document</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Uploaded At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.doc_name}</TableCell>
                  <TableCell className="capitalize"><Badge variant="outline">{d.doc_type}</Badge></TableCell>
                  <TableCell>{d.project_name}</TableCell>
                  <TableCell>{d.unit_no || "-"}</TableCell>
                  <TableCell>{d.customer_name || "-"}</TableCell>
                  <TableCell>{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status || "active"}</Badge></TableCell>
                  <TableCell>
                    {d.doc_url && <Button size="sm" variant="outline" onClick={() => window.open(d.doc_url, "_blank")}>Download</Button>}
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
