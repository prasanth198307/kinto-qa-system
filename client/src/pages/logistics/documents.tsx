import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Upload, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const empty = { vehicle_number: "", doc_type: "RC", expiry_date: "", document_number: "", issuing_authority: "" };

function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 9999;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function expiryClass(days: number): string {
  if (days < 0) return "text-red-600 font-semibold";
  if (days < 30) return "text-orange-500 font-semibold";
  return "";
}

function docStatus(days: number): { label: string; variant: "destructive" | "default" | "outline" | "secondary" } {
  if (days < 0) return { label: "Expired", variant: "destructive" };
  if (days < 30) return { label: "Expiring Soon", variant: "default" };
  return { label: "Valid", variant: "outline" };
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-documents"], queryFn: () => api("GET", "/api/logistics/documents") });
  const docs: any[] = Array.isArray(data) ? data : [];

  const save = useMutation({
    mutationFn: (body: any) => editing ? api("PUT", `/api/logistics/documents/${editing.id}`, body) : api("POST", "/api/logistics/documents", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-documents"] }); setOpen(false); setEditing(null); setForm(empty); },
  });

  const expiringSoon = docs.filter((d) => { const days = getDaysUntil(d.expiry_date); return days >= 0 && days < 30; });
  const expired = docs.filter((d) => getDaysUntil(d.expiry_date) < 0);

  function openAdd() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(d: any) { setEditing(d); setForm({ ...d }); setOpen(true); }
  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Document Tracker</h1>
        <Button onClick={openAdd}><Upload className="w-4 h-4 mr-2" />Upload / Add Document</Button>
      </div>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            {expired.length > 0 && <p className="text-red-600 font-semibold">{expired.length} document(s) have expired.</p>}
            {expiringSoon.length > 0 && <p className="text-orange-600">{expiringSoon.length} document(s) expiring within 30 days.</p>}
          </div>
        </div>
      )}

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load documents.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle No.</TableHead>
                <TableHead>Doc Type</TableHead>
                <TableHead>Document No.</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No documents found.</TableCell></TableRow>}
              {docs.map((d) => {
                const days = getDaysUntil(d.expiry_date);
                const status = docStatus(days);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.vehicle_number}</TableCell>
                    <TableCell>{d.doc_type}</TableCell>
                    <TableCell>{d.document_number || "—"}</TableCell>
                    <TableCell className={expiryClass(days)}>{d.expiry_date}</TableCell>
                    <TableCell className={expiryClass(days)}>{days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}</TableCell>
                    <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Update Document" : "Add Document"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Vehicle Number</label><Input value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Document Type</label>
              <Select value={form.doc_type} onValueChange={(v) => set("doc_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="RC">RC</SelectItem><SelectItem value="Insurance">Insurance</SelectItem><SelectItem value="Fitness">Fitness</SelectItem><SelectItem value="Permit">Permit</SelectItem><SelectItem value="PUC">PUC</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
            </div>
            <div><label className="text-sm font-medium">Document Number</label><Input value={form.document_number} onChange={(e) => set("document_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Expiry Date</label><Input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Issuing Authority</label><Input value={form.issuing_authority} onChange={(e) => set("issuing_authority", e.target.value)} /></div>
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
