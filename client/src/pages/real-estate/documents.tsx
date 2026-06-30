import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STATUS_COLORS: Record<string, any> = { pending: "secondary", received: "default", submitted: "outline" };
const DOC_TYPES = ["agreement", "registry", "noc", "completion", "allotment", "possession"];
const emptyForm = { unit_number: "", customer_name: "", doc_type: "", status: "pending", remarks: "" };

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: projects } = useQuery({ queryKey: ["re-projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const projectList = Array.isArray(projects) ? projects : [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["re-documents", projectFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectFilter !== "all") params.set("project_id", projectFilter);
      return api("GET", `/api/real-estate/documents?${params}`);
    },
  });

  const docs = Array.isArray(data) ? data : [];

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api("PUT", `/api/real-estate/documents/${editing.id}`, payload)
        : api("POST", "/api/real-estate/documents", { ...payload, project_id: projectFilter !== "all" ? Number(projectFilter) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-documents"] }); setOpen(false); },
  });

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(d: any) {
    setEditing(d);
    setForm({ unit_number: d.unit_number, customer_name: d.customer_name, doc_type: d.doc_type, status: d.status, remarks: d.remarks || "" });
    setOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Document Management</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Document</Button>
      </div>

      <div className="flex gap-3">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectList.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
          {isError && <div className="p-8 text-center text-destructive">Failed to load documents.</div>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No documents found.</TableCell></TableRow>}
                {docs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.unit_number}</TableCell>
                    <TableCell>{d.customer_name}</TableCell>
                    <TableCell className="capitalize">{d.doc_type}</TableCell>
                    <TableCell><Badge variant={STATUS_COLORS[d.status] ?? "secondary"}>{d.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.remarks || "—"}</TableCell>
                    <TableCell className="text-sm">{d.updated_at ? new Date(d.updated_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Update Document" : "Add Document"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Unit Number" value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
              <Input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
              <SelectTrigger><SelectValue placeholder="Document Type" /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Remarks (optional)" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
